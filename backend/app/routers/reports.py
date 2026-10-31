import os
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import FileResponse
from bson import ObjectId

from app.core.config import settings
from app.core.database import get_db
from app.core.storage import generate_signed_url, verify_signed_token, ensure_upload_dirs
from app.core.rbac import get_current_user, require_manager, require_inspector, require_staff, require_any_authenticated
from app.schemas.report import ReportGenerateInput, ReportResponse
from app.services.pdf_service import generate_inspection_pdf

router = APIRouter(prefix="/api/v1/reports", tags=["Forensic Reports & PDF Generation"])

@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def generate_report(
    payload: ReportGenerateInput,
    current_user: dict = Depends(require_inspector),
    db = Depends(get_db),
):
    """
    Generates an official court-admissible PDF report dossier using ReportLab.
    Saves PDF file in secure storage and records entry in MongoDB 'reports' collection.
    """
    ensure_upload_dirs()

    # Fetch property details
    prop_query = {"_id": ObjectId(payload.property_id)} if ObjectId.is_valid(payload.property_id) else {"_id": payload.property_id}
    prop = await db.properties.find_one(prop_query)
    if not prop:
        prop = await db.properties.find_one({"id": payload.property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Referenced property not found.")

    # Fetch inspection details if provided
    insp = None
    if payload.inspection_id:
        insp_query = {"_id": ObjectId(payload.inspection_id)} if ObjectId.is_valid(payload.inspection_id) else {"_id": payload.inspection_id}
        insp = await db.inspections.find_one(insp_query)

    # Fetch latest weather record for property
    weather = await db.weather_records.find_one(
        {"property_id": str(prop["_id"])},
        sort=[("fetched_at", -1)]
    )

    # Fetch latest risk assessment for property
    triage = await db.risk_assessments.find_one(
        {"property_id": str(prop["_id"])},
        sort=[("created_at", -1)]
    )

    # Generate ReportLab PDF
    pdf_bytes = generate_inspection_pdf(
        property_data=prop,
        inspection_data=insp,
        weather_data=weather.get("data") if weather else None,
        triage_data=triage,
        report_title=f"{payload.report_type}: {prop.get('property_name', 'Property')}",
    )

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    filename = f"report_{uuid.uuid4().hex[:12]}.pdf"
    relative_path = f"reports/{filename}"
    full_path = os.path.join(settings.STORAGE_LOCAL_DIR, relative_path)

    with open(full_path, "wb") as f:
        f.write(pdf_bytes)

    doc = {
        "property_id": str(prop["_id"]),
        "property_name": prop.get("property_name", ""),
        "inspection_id": payload.inspection_id,
        "report_type": payload.report_type,
        "title": f"{payload.report_type} - {prop.get('property_name')}",
        "file_path": relative_path,
        "file_size_bytes": len(pdf_bytes),
        "generated_by": current_user.get("full_name") or current_user["email"],
        "generated_at": now_str,
    }

    res = await db.reports.insert_one(doc)
    doc_id = str(res.inserted_id)

    signed_download_url = generate_signed_url("reports", relative_path)

    return ReportResponse(
        id=doc_id,
        property_id=str(prop["_id"]),
        property_name=prop.get("property_name", ""),
        inspection_id=payload.inspection_id,
        report_type=payload.report_type,
        title=doc["title"],
        file_path=relative_path,
        download_url=signed_download_url,
        file_size_bytes=len(pdf_bytes),
        generated_by=doc["generated_by"],
        generated_at=now_str,
    )

@router.get("", response_model=List[ReportResponse])
async def list_reports(
    property_id: Optional[str] = None,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Lists all generated compliance and technical reports.
    """
    filter_query: dict = {}
    if property_id:
        filter_query["property_id"] = property_id

    reports = []
    async for doc in db.reports.find(filter_query).sort("generated_at", -1):
        rel_path = doc.get("file_path", "")
        signed_url = generate_signed_url("reports", rel_path) if rel_path else ""
        reports.append(
            ReportResponse(
                id=str(doc["_id"]),
                property_id=doc.get("property_id", ""),
                property_name=doc.get("property_name", ""),
                inspection_id=doc.get("inspection_id"),
                report_type=doc.get("report_type", "Summary"),
                title=doc.get("title", "Forensic Dossier"),
                file_path=rel_path,
                download_url=signed_url,
                file_size_bytes=doc.get("file_size_bytes", 0),
                generated_by=doc.get("generated_by", "PropCare NW"),
                generated_at=doc.get("generated_at", ""),
            )
        )
    return reports
