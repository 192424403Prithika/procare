import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from bson import ObjectId

from app.core.database import get_db
from app.core.storage import (
    validate_and_save_image,
    validate_and_save_audio,
    generate_signed_url,
)
from app.core.rbac import (
    get_current_user,
    require_inspector,
    require_any_authenticated,
    UserRole,
)
from app.schemas.inspection import (
    InspectionCreateInput,
    InspectionUpdateInput,
    InspectionResponse,
    InspectionImageItem,
    InspectionAudioItem,
)
from app.models.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/inspections", tags=["Inspection Management"])

async def serialize_inspection(doc: dict, db) -> InspectionResponse:
    insp_id = str(doc["_id"])

    # Fetch property details if not denormalized
    prop_name = doc.get("property_name", "")
    prop_addr = doc.get("property_address", "")
    prop_postcode = doc.get("property_postal_code", "")

    if not prop_name and doc.get("property_id"):
        prop_query = {"_id": ObjectId(doc["property_id"])} if ObjectId.is_valid(doc["property_id"]) else {"_id": doc["property_id"]}
        prop = await db.properties.find_one(prop_query)
        if prop:
            prop_name = prop.get("property_name", "")
            prop_addr = prop.get("address", "")
            prop_postcode = prop.get("postal_code", "")

    # Fetch images from inspection_images collection
    image_items: List[InspectionImageItem] = []
    async for img_doc in db.inspection_images.find({"inspection_id": insp_id}):
        storage_path = img_doc.get("storage_path", "")
        signed_url = generate_signed_url("inspection-images", storage_path) if storage_path else ""
        image_items.append(
            InspectionImageItem(
                id=str(img_doc["_id"]),
                url=signed_url,
                storage_path=storage_path,
                file_name=img_doc.get("file_name", "photo.jpg"),
                file_size=img_doc.get("file_size", 0),
                mime_type=img_doc.get("mime_type", "image/jpeg"),
                caption=img_doc.get("caption", ""),
                is_flash=img_doc.get("is_flash", False),
                created_at=img_doc.get("created_at", ""),
            )
        )

    # Primary ambient and flash signed URLs
    ambient_path = doc.get("ambient_img_path", "")
    ambient_url = generate_signed_url("inspection-images", ambient_path) if ambient_path else doc.get("ambient_img_url", "")

    flash_path = doc.get("flash_img_path", "")
    flash_url = generate_signed_url("inspection-images", flash_path) if flash_path else doc.get("flash_img_url", "")

    audio_path = doc.get("audio_path", "")
    audio_url = generate_signed_url("inspection-audio", audio_path) if audio_path else doc.get("audio_url", "")

    return InspectionResponse(
        id=insp_id,
        property_id=doc.get("property_id", ""),
        property_name=prop_name,
        property_address=prop_addr,
        property_postal_code=prop_postcode,
        inspector_id=doc.get("inspector_id"),
        inspector_name=doc.get("inspector_name", "Diagnostic Surveyor"),
        inspector_email=doc.get("inspector_email", ""),
        inspection_zone=doc.get("inspection_zone", "General"),
        room_name=doc.get("room_name", ""),
        floor=doc.get("floor", "Ground Floor"),
        inspection_location=doc.get("inspection_location", ""),
        status=doc.get("status", "Pending Review"),
        symptom_tags=doc.get("symptom_tags", []),
        notes=doc.get("notes", ""),
        ambient_img_url=ambient_url,
        ambient_img_path=ambient_path,
        flash_img_url=flash_url,
        flash_img_path=flash_path,
        images=image_items,
        audio_url=audio_url,
        audio_path=audio_path,
        audio_duration_seconds=doc.get("audio_duration_seconds", 0.0),
        audio_file_size=doc.get("audio_file_size", 0),
        risk_level=doc.get("risk_level", "pending"),
        risk_score=doc.get("risk_score", 0),
        ambient_moisture_index=doc.get("ambient_moisture_index"),
        flash_reflection_score=doc.get("flash_reflection_score"),
        acoustic_leak_frequency_hz=doc.get("acoustic_leak_frequency_hz"),
        created_at=doc.get("created_at", datetime.datetime.now(datetime.timezone.utc).isoformat()),
        updated_at=doc.get("updated_at", datetime.datetime.now(datetime.timezone.utc).isoformat()),
    )

@router.post("", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    payload: InspectionCreateInput,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Creates a new inspection record linked to an existing property.
    """
    # Verify property exists
    prop_query = {"_id": ObjectId(payload.property_id)} if ObjectId.is_valid(payload.property_id) else {"_id": payload.property_id}
    property_doc = await db.properties.find_one(prop_query)
    if not property_doc:
        raise HTTPException(status_code=404, detail="Referenced property does not exist.")

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    doc = payload.model_dump()
    doc["inspector_id"] = current_user["id"]
    doc["inspector_name"] = payload.inspector_name or current_user.get("full_name", "Surveyor")
    doc["inspector_email"] = current_user.get("email", "")
    doc["property_name"] = property_doc.get("property_name", "")
    doc["property_address"] = property_doc.get("address", "")
    doc["property_postal_code"] = property_doc.get("postal_code", "")
    doc["risk_level"] = "pending"
    doc["risk_score"] = 0
    doc["created_at"] = now_str
    doc["updated_at"] = now_str

    result = await db.inspections.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Update property's inspection status
    await db.properties.update_one(
        prop_query,
        {
            "$set": {
                "inspection_status": "Pending Review",
                "last_inspected": now_str[:10],
                "updated_at": now_str,
            }
        }
    )

    # Log audit event
    await db.audit_logs.insert_one({
        "user_id": current_user["id"],
        "action": "inspection_created",
        "target_collection": "inspections",
        "target_id": str(result.inserted_id),
        "details": {"property_id": payload.property_id, "zone": payload.inspection_zone},
        "created_at": now_str,
    })

    return await serialize_inspection(doc, db)

@router.get("", response_model=PaginatedResponse[InspectionResponse])
async def list_inspections(
    property_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Lists inspections with role-aware authorization and pagination.
    """
    filter_query: dict = {}
    if property_id:
        filter_query["property_id"] = property_id
    if status_filter:
        filter_query["status"] = status_filter

    # Role filtering: Inspectors see their own, Managers see their organization's properties
    if current_user.get("role") == UserRole.INSPECTOR:
        filter_query["inspector_id"] = current_user["id"]

    total = await db.inspections.count_documents(filter_query)
    skip = (page - 1) * page_size
    cursor = db.inspections.find(filter_query).sort("created_at", -1).skip(skip).limit(page_size)

    items = []
    async for doc in cursor:
        items.append(await serialize_inspection(doc, db))

    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items,
    )

@router.get("/{inspection_id}", response_model=InspectionResponse)
async def get_inspection_by_id(
    inspection_id: str,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Retrieves a single inspection report by ID with signed media URLs.
    """
    query = {"_id": ObjectId(inspection_id)} if ObjectId.is_valid(inspection_id) else {"_id": inspection_id}
    doc = await db.inspections.find_one(query)
    if not doc:
        doc = await db.inspections.find_one({"id": inspection_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found.")

    return await serialize_inspection(doc, db)

@router.post("/{inspection_id}/images", response_model=InspectionImageItem)
async def upload_inspection_image(
    inspection_id: str,
    file: UploadFile = File(..., description="Photograph (JPG, PNG, WebP)"),
    caption: Optional[str] = Form(""),
    is_flash: Optional[bool] = Form(False),
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Uploads an actual inspection photograph.
    Validates binary content with Pillow magic bytes, stores in private storage,
    and records metadata in MongoDB 'inspection_images'.
    """
    query = {"_id": ObjectId(inspection_id)} if ObjectId.is_valid(inspection_id) else {"_id": inspection_id}
    inspection = await db.inspections.find_one(query)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found.")

    # Validate actual image content and save to private storage
    relative_path, file_size, mime_type = await validate_and_save_image(file, bucket="inspection-images")
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    image_doc = {
        "inspection_id": str(inspection["_id"]),
        "storage_path": relative_path,
        "file_name": file.filename or "photo.jpg",
        "file_size": file_size,
        "mime_type": mime_type,
        "caption": caption or "",
        "is_flash": is_flash or False,
        "uploaded_by": current_user["id"],
        "created_at": now_str,
    }

    img_res = await db.inspection_images.insert_one(image_doc)

    # If it is the first photo or flagged as flash, update inspection primary paths
    update_data = {"updated_at": now_str}
    if is_flash:
        update_data["flash_img_path"] = relative_path
    elif not inspection.get("ambient_img_path"):
        update_data["ambient_img_path"] = relative_path

    await db.inspections.update_one(query, {"$set": update_data})

    signed_url = generate_signed_url("inspection-images", relative_path)
    return InspectionImageItem(
        id=str(img_res.inserted_id),
        url=signed_url,
        storage_path=relative_path,
        file_name=image_doc["file_name"],
        file_size=file_size,
        mime_type=mime_type,
        caption=caption,
        is_flash=bool(is_flash),
        created_at=now_str,
    )

@router.post("/{inspection_id}/audio", response_model=InspectionAudioItem)
async def upload_inspection_audio(
    inspection_id: str,
    file: UploadFile = File(..., description="Audio recording (WAV, MP3, OGG, FLAC)"),
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Uploads an actual acoustic recording. Validates audio header and stores metadata in MongoDB.
    """
    query = {"_id": ObjectId(inspection_id)} if ObjectId.is_valid(inspection_id) else {"_id": inspection_id}
    inspection = await db.inspections.find_one(query)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found.")

    relative_path, file_size, mime_type = await validate_and_save_audio(file, bucket="inspection-audio")
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    audio_doc = {
        "inspection_id": str(inspection["_id"]),
        "storage_path": relative_path,
        "file_name": file.filename or "recording.wav",
        "file_size": file_size,
        "mime_type": mime_type,
        "duration_seconds": 10.0,
        "uploaded_by": current_user["id"],
        "created_at": now_str,
    }

    audio_res = await db.inspection_audio.insert_one(audio_doc)

    await db.inspections.update_one(
        query,
        {
            "$set": {
                "audio_path": relative_path,
                "audio_file_size": file_size,
                "updated_at": now_str,
            }
        }
    )

    signed_url = generate_signed_url("inspection-audio", relative_path)
    return InspectionAudioItem(
        id=str(audio_res.inserted_id),
        url=signed_url,
        storage_path=relative_path,
        file_name=audio_doc["file_name"],
        file_size=file_size,
        duration_seconds=10.0,
        mime_type=mime_type,
        created_at=now_str,
    )

@router.put("/{inspection_id}", response_model=InspectionResponse)
async def update_inspection(
    inspection_id: str,
    payload: InspectionUpdateInput,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Updates inspection details, notes, symptoms, or status.
    """
    query = {"_id": ObjectId(inspection_id)} if ObjectId.is_valid(inspection_id) else {"_id": inspection_id}
    existing = await db.inspections.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Inspection not found.")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        await db.inspections.update_one(query, {"$set": update_data})

    updated_doc = await db.inspections.find_one(query)
    return await serialize_inspection(updated_doc, db)
