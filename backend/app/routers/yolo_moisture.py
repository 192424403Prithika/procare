import os
import shutil
import datetime
from pathlib import Path
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status

from app.core.database import get_db
from app.core.rbac import get_current_user, require_inspector, require_staff, UserRole
from app.schemas.yolo_moisture import (
    MoistureDetectRequest,
    MoistureDetectResponse,
    ModelStatusResponse,
)
from app.services.yolo_moisture_service import get_yolo_detector

router = APIRouter(prefix="/api/v1/analysis/moisture", tags=["YOLO Moisture & Water Damage AI"])
compat_router = APIRouter(prefix="/api/analysis/moisture", tags=["YOLO Moisture & Water Damage AI (Compat)"])

MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]

def validate_image_file(filename: str, content_type: Optional[str], file_size: int):
    ext = Path(filename).suffix.lower()
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

@router.get("/model/status", response_model=ModelStatusResponse)
@compat_router.get("/model/status", response_model=ModelStatusResponse)
async def check_model_status():
    """
    Returns the real-time operational status of the YOLO moisture detector.
    Reports whether custom trained weights exist or need configuration.
    """
    detector = get_yolo_detector()
    return detector.get_status()

@router.post("/detect", response_model=MoistureDetectResponse)
@compat_router.post("/detect", response_model=MoistureDetectResponse)
async def detect_moisture(
    file: Optional[UploadFile] = File(None),
    inspection_id: Optional[str] = Form(None),
    property_id: Optional[str] = Form(None),
    image_url: Optional[str] = Form(None),
    conf_threshold: Optional[float] = Form(None),
    current_user: dict = Depends(require_staff),
    db = Depends(get_db),
):
    """
    Executes YOLO moisture and water damage detection on uploaded inspection imagery.
    Saves detection bounding boxes, area coverage estimates, and explainable risk scores to MongoDB Atlas.
    """
    detector = get_yolo_detector()
    user_id = str(current_user["id"])
    target_inspection_id = inspection_id or "INSP-ADHOC"

    # 1. Resolve image bytes and original URL
    if file:
        file_bytes = await file.read()
        validate_image_file(file.filename, file.content_type, len(file_bytes))

        # Save original file to disk storage
        storage_dir = Path("uploads/storage/inspection-images")
        if inspection_id:
            storage_dir = storage_dir / str(inspection_id)
        storage_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(file.filename).suffix.lower()
        orig_filename = f"orig_{int(datetime.datetime.now().timestamp())}_{file.filename}"
        orig_path = storage_dir / orig_filename
        with open(orig_path, "wb") as f:
            f.write(file_bytes)

        if inspection_id:
            resolved_orig_url = f"/uploads/storage/inspection-images/{inspection_id}/{orig_filename}"
        else:
            resolved_orig_url = f"/uploads/storage/inspection-images/{orig_filename}"
    elif image_url:
        # Load from disk or local path
        local_path = image_url.lstrip("/")
        if not os.path.exists(local_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Referenced inspection image was not found at '{image_url}'.",
            )
        with open(local_path, "rb") as f:
            file_bytes = f.read()
        validate_image_file(local_path, None, len(file_bytes))
        resolved_orig_url = image_url
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either an image file upload or an existing 'image_url' must be provided.",
        )

    # 2. Run YOLO Detection Pipeline
    try:
        response_data = detector.run_detection(
            image_bytes=file_bytes,
            original_image_url=resolved_orig_url,
            inspection_id=target_inspection_id,
            property_id=property_id,
            inspector_id=user_id,
            conf_threshold=conf_threshold,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(exc)}",
        )

    # 3. Persist detection record into MongoDB Atlas collection 'moisture_ai_detections'
    doc_to_save = response_data.model_dump()
    doc_to_save["_id"] = ObjectId(response_data.result_id)
    doc_to_save["created_at"] = response_data.timestamp

    try:
        await db.moisture_ai_detections.insert_one(doc_to_save)
    except Exception as db_err:
        # Non-fatal logging if already saved or duplicate key
        pass

    return response_data

@router.get("/result/{result_id}", response_model=MoistureDetectResponse)
@compat_router.get("/result/{result_id}", response_model=MoistureDetectResponse)
async def get_detection_result(
    result_id: str,
    current_user: dict = Depends(require_staff),
    db = Depends(get_db),
):
    """
    Retrieves a specific moisture detection result from MongoDB Atlas by result ID.
    """
    filter_query = {}
    try:
        filter_query = {"_id": ObjectId(result_id)}
    except Exception:
        filter_query = {"result_id": result_id}

    doc = await db.moisture_ai_detections.find_one(filter_query)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Moisture detection record with ID '{result_id}' was not found.",
        )

    doc["result_id"] = str(doc.get("_id", result_id))
    return MoistureDetectResponse(**doc)

@router.get("/{inspection_id}", response_model=List[MoistureDetectResponse])
@compat_router.get("/{inspection_id}", response_model=List[MoistureDetectResponse])
async def get_inspection_detections(
    inspection_id: str,
    current_user: dict = Depends(require_staff),
    db = Depends(get_db),
):
    """
    Retrieves all historical moisture AI detection records associated with an inspection ID.
    """
    cursor = db.moisture_ai_detections.find({"inspection_id": inspection_id}).sort("timestamp", -1)
    results = await cursor.to_list(length=100)

    out = []
    for r in results:
        r["result_id"] = str(r.get("_id", ""))
        out.append(MoistureDetectResponse(**r))
    return out
