import os
import shutil
import datetime
from pathlib import Path
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status

from app.core.database import get_db
from app.core.rbac import get_current_user, require_staff, require_any_authenticated, UserRole
from app.schemas.yolo_breakage import (
    BreakageDetectRequest,
    BreakageDetectResponse,
    BreakageModelStatusResponse,
    CombinedInspectionAnalysisResponse,
)
from app.services.yolo_breakage_service import get_breakage_detector

router = APIRouter(prefix="/api/v1/analysis/breakage", tags=["YOLO Structural Breakage AI"])
compat_router = APIRouter(prefix="/api/analysis/breakage", tags=["YOLO Structural Breakage AI (Compat)"])

MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]

def validate_image_file(filename: str, content_type: Optional[str], file_size: int):
    """Enforces format, extension, and payload bounds for uploaded inspection imagery."""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image file extension '{ext}'. Only JPG, JPEG, PNG, and WEBP formats are accepted.",
        )
    if content_type and content_type.lower() not in ALLOWED_MIME_TYPES and "image" not in content_type.lower():
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported MIME type '{content_type}'. Must be an image format.",
        )
    if file_size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({round(file_size / (1024 * 1024), 2)} MB) exceeds statutory 20 MB limit.",
        )

@router.get("/model-status", response_model=BreakageModelStatusResponse)
@compat_router.get("/model-status", response_model=BreakageModelStatusResponse)
async def check_breakage_model_status():
    """
    Returns the real-time operational status of the YOLO structural breakage detector.
    Reports whether custom trained weights exist or need configuration.
    """
    detector = get_breakage_detector()
    return detector.get_status()

@router.post("/detect", response_model=BreakageDetectResponse)
@compat_router.post("/detect", response_model=BreakageDetectResponse)
async def detect_structural_breakage(
    file: Optional[UploadFile] = File(None),
    inspection_id: Optional[str] = Form(None),
    property_id: Optional[str] = Form(None),
    image_url: Optional[str] = Form(None),
    conf_threshold: Optional[float] = Form(None),
    current_user: dict = Depends(require_staff),
    db = Depends(get_db),
):
    """
    Executes YOLO structural breakage detection on uploaded inspection imagery.
    Saves bounding boxes, structural vs cosmetic classification, and explainable severity scores to MongoDB Atlas.
    """
    detector = get_breakage_detector()
    user_id = str(current_user["id"])
    target_inspection_id = inspection_id or "INSP-ADHOC"

    # Image Acquisition
    image_bytes: bytes = b""
    raw_image_url: str = ""

    if file and file.filename:
        file_bytes = await file.read()
        validate_image_file(file.filename, file.content_type, len(file_bytes))
        image_bytes = file_bytes

        # Save uploaded image locally
        save_dir = Path("uploads/storage/inspection-images")
        if inspection_id:
            save_dir = save_dir / str(inspection_id)
        save_dir.mkdir(parents=True, exist_ok=True)

        safe_name = f"breakage_raw_{int(datetime.datetime.now().timestamp())}_{file.filename}"
        local_path = save_dir / safe_name
        with open(local_path, "wb") as f:
            f.write(file_bytes)

        if inspection_id:
            raw_image_url = f"/uploads/storage/inspection-images/{inspection_id}/{safe_name}"
        else:
            raw_image_url = f"/uploads/storage/inspection-images/{safe_name}"

    elif image_url:
        raw_image_url = image_url
        clean_path = image_url.lstrip("/")
        if clean_path.startswith("uploads/"):
            disk_path = Path(clean_path)
            if disk_path.is_file():
                with open(disk_path, "rb") as f:
                    image_bytes = f.read()
            else:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Image not found at path: {image_url}")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image source URL format.")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either a multi-part image 'file' or 'image_url' must be supplied for breakage analysis.",
        )

    # Execute YOLO Detection
    detection_response = detector.run_detection(
        image_bytes=image_bytes,
        original_image_url=raw_image_url,
        inspection_id=inspection_id,
        property_id=property_id,
        inspector_id=user_id,
        conf_threshold=conf_threshold,
    )

    # Persist in MongoDB Atlas Collection `breakage_analysis`
    record_dict = detection_response.model_dump()
    record_dict["_id"] = ObjectId(detection_response.result_id)
    record_dict["user_id"] = user_id
    record_dict["created_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    try:
        await db.breakage_analysis.insert_one(record_dict)
    except Exception as exc:
        # Non-fatal if database is temporarily unavailable in memory
        pass

    return detection_response

@router.get("/combined/{inspection_id}", response_model=CombinedInspectionAnalysisResponse)
@compat_router.get("/combined/{inspection_id}", response_model=CombinedInspectionAnalysisResponse)
async def get_combined_inspection_summary(
    inspection_id: str,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Produces a unified multi-modal inspection analysis combining moisture findings and breakage findings.
    Avoids duplicate uploads and provides an integrated maintenance roadmap.
    """
    # 1. Fetch latest moisture detection record
    moisture_record = await db.moisture_ai_detections.find_one(
        {"inspection_id": inspection_id},
        sort=[("timestamp", -1)],
    )

    # 2. Fetch latest breakage detection record
    breakage_record = await db.breakage_analysis.find_one(
        {"inspection_id": inspection_id},
        sort=[("timestamp", -1)],
    )

    moist_clean = None
    if moisture_record:
        moist_clean = {
            "result_id": str(moisture_record.get("_id", "")),
            "status": moisture_record.get("status"),
            "total_defects": moisture_record.get("total_defects", 0),
            "defect_counts": moisture_record.get("defect_counts", {}),
            "risk_classification": moisture_record.get("risk_classification", "low"),
            "risk_score": moisture_record.get("risk_score", 0.0),
            "annotated_image_url": moisture_record.get("annotated_image_url"),
            "recommendation": moisture_record.get("recommendation", ""),
        }

    break_clean = None
    if breakage_record:
        break_clean = {
            "result_id": str(breakage_record.get("_id", "")),
            "status": breakage_record.get("status"),
            "total_defects": breakage_record.get("total_defects", 0),
            "structural_defect_count": breakage_record.get("structural_defect_count", 0),
            "cosmetic_defect_count": breakage_record.get("cosmetic_defect_count", 0),
            "severity_classification": breakage_record.get("severity_classification", "minor"),
            "severity_score": breakage_record.get("severity_score", 0.0),
            "structural_engineer_required": breakage_record.get("structural_engineer_required", False),
            "annotated_image_url": breakage_record.get("annotated_image_url"),
            "recommendation": breakage_record.get("recommendation", ""),
        }

    combined_count = (
        (moist_clean.get("total_defects", 0) if moist_clean else 0) +
        (break_clean.get("total_defects", 0) if break_clean else 0)
    )

    # Determine highest severity
    severities = []
    if moist_clean:
        severities.append(moist_clean.get("risk_classification", "low").lower())
    if break_clean:
        severities.append(break_clean.get("severity_classification", "minor").lower())

    severity_rank = {"critical": 4, "major": 3, "high": 3, "moderate": 2, "minor": 1, "low": 1}
    highest_severity = "low"
    max_rank = 0
    for s in severities:
        rank = severity_rank.get(s, 1)
        if rank > max_rank:
            max_rank = rank
            highest_severity = s

    # Unified recommendation
    recs = []
    if moist_clean and moist_clean.get("recommendation"):
        recs.append(f"Moisture Pathology: {moist_clean['recommendation']}")
    if break_clean and break_clean.get("recommendation"):
        recs.append(f"Structural Pathology: {break_clean['recommendation']}")

    combined_rec = " | ".join(recs) if recs else "Cyclical routine property monitoring schedule."

    return CombinedInspectionAnalysisResponse(
        inspection_id=inspection_id,
        property_id=moisture_record.get("property_id") if moisture_record else (breakage_record.get("property_id") if breakage_record else "PROP-UNKNOWN"),
        moisture_findings=moist_clean,
        breakage_findings=break_clean,
        combined_defect_count=combined_count,
        highest_severity=highest_severity,
        combined_recommendation=combined_rec,
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    )

@router.get("/result/{result_id}", response_model=BreakageDetectResponse)
@compat_router.get("/result/{result_id}", response_model=BreakageDetectResponse)
async def get_breakage_result(
    result_id: str,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Retrieves a specific structural breakage detection record from MongoDB Atlas.
    """
    filter_query = {}
    try:
        filter_query = {"_id": ObjectId(result_id)}
    except Exception:
        filter_query = {"result_id": result_id}

    doc = await db.breakage_analysis.find_one(filter_query)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Breakage analysis record with ID '{result_id}' was not found.",
        )

    doc["result_id"] = str(doc.get("_id", result_id))
    return BreakageDetectResponse(**doc)

@router.get("/{inspection_id}", response_model=List[BreakageDetectResponse])
@compat_router.get("/{inspection_id}", response_model=List[BreakageDetectResponse])
async def get_inspection_breakage_history(
    inspection_id: str,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Retrieves all historical structural breakage AI detection records associated with an inspection ID.
    """
    cursor = db.breakage_analysis.find({"inspection_id": inspection_id}).sort("timestamp", -1)
    results = await cursor.to_list(length=100)

    out = []
    for r in results:
        r["result_id"] = str(r.get("_id", ""))
        out.append(BreakageDetectResponse(**r))
    return out
