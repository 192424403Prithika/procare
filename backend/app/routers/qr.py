import io
import base64
import hmac
import hashlib
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from bson import ObjectId
import qrcode
from PIL import Image

from app.core.config import settings
from app.core.database import get_db
from app.core.rbac import require_any_authenticated

router = APIRouter(prefix="/api/v1/qr", tags=["QR-Based Property Inspection"])

class QRResolutionRequest(BaseModel):
    token: str = Field(..., description="Encrypted or HMAC-signed QR token scanned from property tag")

def generate_property_qr_token(property_id: str) -> str:
    """
    Generates a secure, tamper-evident token for a property without exposing private data.
    Format: {property_id}.{timestamp}.{hmac_signature}
    """
    ts = str(int(time.time()))
    payload = f"{property_id}:{ts}"
    sig = hmac.new(settings.JWT_SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:24]
    return f"{property_id}.{ts}.{sig}"

def verify_property_qr_token(token: str) -> str:
    """
    Verifies HMAC signature of scanned QR token and returns property_id.
    Raises ValueError if signature is altered or invalid.
    """
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise ValueError("Invalid QR token structure.")
    prop_id, ts, sig = parts
    expected_sig = hmac.new(settings.JWT_SECRET_KEY.encode(), f"{prop_id}:{ts}".encode(), hashlib.sha256).hexdigest()[:24]
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("QR token verification failed: invalid signature or tampering detected.")
    return prop_id

@router.get("/properties/{property_id}")
async def get_property_qr_code(
    property_id: str,
    db = Depends(get_db),
    current_user: dict = Depends(require_any_authenticated),
):
    """
    Generates a cryptographically signed QR code for physical property tagging.
    Does not expose private tenant or property data in the QR content.
    """
    # Find property
    query = {"_id": ObjectId(property_id)} if ObjectId.is_valid(property_id) else {"_id": property_id}
    prop = await db.properties.find_one(query)
    if not prop:
        prop = await db.properties.find_one({"id": property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    prop_id_str = str(prop.get("id") or prop.get("_id"))
    token = generate_property_qr_token(prop_id_str)

    # Resolution URL that mobile scanner opens
    scan_url = f"{settings.FRONTEND_URL}/app/scan?token={token}"

    # Generate QR Code image with lavender/navy branding
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(scan_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#493344", back_color="#FFFFFF").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_qr = base64.b64encode(buf.getvalue()).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64_qr}"

    # Store QR token record
    await db.property_qr_codes.update_one(
        {"property_id": prop_id_str},
        {
            "$set": {
                "property_id": prop_id_str,
                "token": token,
                "scan_url": scan_url,
                "generated_at": time.time(),
            }
        },
        upsert=True
    )

    return {
        "property_id": prop_id_str,
        "property_name": prop.get("property_name", ""),
        "uprn": prop.get("uprn", ""),
        "postcode": prop.get("postcode", ""),
        "qr_token": token,
        "scan_url": scan_url,
        "qr_code_image": data_uri,
        "disclaimer": "Secure tamper-evident QR identifier. Protects tenant privacy by preventing exposure of private records in raw QR data.",
    }

@router.post("/resolve")
async def resolve_scanned_qr(
    payload: QRResolutionRequest,
    db = Depends(get_db),
    current_user: dict = Depends(require_any_authenticated),
):
    """
    Resolves a scanned QR token to its authorized property record.
    Enforces authentication and prevents spoofing.
    """
    try:
        prop_id = verify_property_qr_token(payload.token)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    query = {"_id": ObjectId(prop_id)} if ObjectId.is_valid(prop_id) else {"_id": prop_id}
    prop = await db.properties.find_one(query)
    if not prop:
        prop = await db.properties.find_one({"id": prop_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Associated property not found.")

    prop_id_str = str(prop.get("id") or prop.get("_id"))

    # Fetch latest inspection info
    latest_insp = await db.inspections.find_one(
        {"property_id": prop_id_str},
        sort=[("inspection_date", -1)]
    )

    return {
        "verified": True,
        "property_id": prop_id_str,
        "property_name": prop.get("property_name", ""),
        "address": prop.get("address", ""),
        "postcode": prop.get("postcode", ""),
        "uprn": prop.get("uprn", ""),
        "building_type": prop.get("building_type", "Residential Social Housing"),
        "last_inspection_date": latest_insp.get("inspection_date") if latest_insp else "No inspections recorded",
        "last_inspection_id": latest_insp.get("id") if latest_insp else None,
        "can_start_inspection": True,
        "start_inspection_url": f"/app/inspections/new?property_id={prop_id_str}",
    }
