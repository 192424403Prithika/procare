import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.rbac import require_any_authenticated, require_inspector
from app.services.multi_defect_processing import (
    classify_multi_defect,
    MultiDefectAnalysisResponse,
)
from app.services.image_defect_detector import (
    detect_visual_defects,
    ImageDefectAnalysisResult,
)

router = APIRouter(prefix="/api/v1/analyze/multi-defect", tags=["Multi-Defect Classification"])

class MultiDefectRequest(BaseModel):
    report_id: Optional[str] = None
    property_id: Optional[str] = None
    optical_difference_pct: Optional[float] = Field(None, description="OpenCV specular difference percentage (0-100)")
    acoustic_frequency_hz: Optional[float] = Field(None, description="SciPy FFT dominant frequency in Hz")
    acoustic_anomaly_score: Optional[float] = Field(None, description="Acoustic leak probability score (0-100)")
    dew_point_margin_c: Optional[float] = Field(None, description="Temperature margin above dew point in °C")
    zone_description: str = Field("", description="Room, floor, and zone location description")
    symptom_tags: List[str] = Field(default_factory=list, description="Clinical symptom tags recorded by surveyor")
    has_image: bool = Field(True, description="Whether an inspection image was provided")
    has_audio: bool = Field(True, description="Whether an acoustic recording was provided")
    has_weather: bool = Field(True, description="Whether weather telemetry was obtained")

class ImageDetectionRequest(BaseModel):
    image: str = Field(..., description="Base64 data URI, image URL, or server file path")
    report_id: Optional[str] = None
    property_id: Optional[str] = None

class DefectConfirmationInput(BaseModel):
    defect_id: str
    report_id: Optional[str] = None
    property_id: Optional[str] = None
    category: str
    decision: str = Field(..., description="'confirmed' or 'rejected'")
    inspector_notes: Optional[str] = None

@router.get("/health")
def multi_defect_health():
    return {
        "status": "online",
        "service": "PropCare NW Multi-Defect Cross-Modal Analytical Engine",
        "classifications": [
            "pressurized_pipe_pinhole",
            "interstitial_condensation_biofilm",
            "rising_damp_salt_migration",
            "thermal_envelope_seal_gap",
            "visible_wall_crack",
            "peeling_paint",
            "water_stain",
            "mould_pattern",
            "surface_deterioration",
        ],
        "compliance": "Awaab's Law Section 10A & HHSRS Category 1",
    }

@router.post("", response_model=MultiDefectAnalysisResponse)
def analyze_multi_defect(payload: MultiDefectRequest):
    """
    Classifies structural and plumbing pathology across optical, acoustic, and psychrometric vectors.
    """
    try:
        response = classify_multi_defect(
            optical_diff_pct=payload.optical_difference_pct,
            acoustic_freq_hz=payload.acoustic_frequency_hz,
            acoustic_score=payload.acoustic_anomaly_score,
            dew_point_margin_c=payload.dew_point_margin_c,
            zone_description=payload.zone_description,
            symptom_tags=payload.symptom_tags,
            report_id=payload.report_id,
            property_id=payload.property_id,
            has_image=payload.has_image,
            has_audio=payload.has_audio,
            has_weather=payload.has_weather,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-defect processing failure: {str(e)}")

@router.post("/detect", response_model=ImageDefectAnalysisResult)
async def detect_image_defects_endpoint(
    payload: ImageDetectionRequest,
    db = Depends(get_db),
    current_user: dict = Depends(require_any_authenticated),
):
    """
    Executes computer vision detection for visible wall cracks, peeling paint,
    water stains, mould-like visual patterns, and surface deterioration.
    """
    try:
        result = detect_visual_defects(payload.image)

        # Store detection record in MongoDB
        doc = result.model_dump()
        doc["report_id"] = payload.report_id
        doc["property_id"] = payload.property_id
        doc["user_id"] = current_user.get("id")
        await db.image_defect_detections.insert_one(doc)

        return result
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Computer vision defect analysis failed: {str(e)}")

@router.post("/confirm", status_code=status.HTTP_201_CREATED)
async def confirm_or_reject_defect(
    payload: DefectConfirmationInput,
    db = Depends(get_db),
    current_user: dict = Depends(require_inspector),
):
    """
    Allows authorized inspectors to confirm or reject suggested CV defect detections.
    """
    record = {
        "defect_id": payload.defect_id,
        "report_id": payload.report_id,
        "property_id": payload.property_id,
        "category": payload.category,
        "decision": payload.decision,
        "inspector_notes": payload.inspector_notes,
        "inspector_id": current_user.get("id"),
        "inspector_name": current_user.get("full_name") or current_user.get("email"),
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    res = await db.defect_confirmations.insert_one(record)
    record["id"] = str(res.inserted_id)
    if "_id" in record:
        del record["_id"]
    return record

@router.get("/confirmations/{report_id}")
async def get_defect_confirmations(
    report_id: str,
    db = Depends(get_db),
    current_user: dict = Depends(require_any_authenticated),
):
    """
    Retrieves inspector confirmation / rejection decisions for an inspection.
    """
    items = []
    cursor = db.defect_confirmations.find({"report_id": report_id}).sort("created_at", -1)
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        items.append(doc)
    return items
