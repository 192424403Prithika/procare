import datetime
import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId

from app.core.database import get_db
from app.core.rbac import (
    get_current_user,
    require_manager,
    require_admin,
    require_any_authenticated,
    UserRole,
)
from app.schemas.property import (
    PropertyCreateInput,
    PropertyUpdateInput,
    PropertyResponse,
    PropertyRiskSummary,
)
from app.models.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/properties", tags=["Property Management"])

def serialize_property(doc: dict) -> PropertyResponse:
    return PropertyResponse(
        id=str(doc["_id"]),
        property_name=doc.get("property_name", ""),
        address=doc.get("address", ""),
        postal_code=doc.get("postal_code", ""),
        building_type=doc.get("building_type", "Social Housing"),
        build_year=doc.get("build_year", 1980),
        number_of_floors=doc.get("number_of_floors", 3),
        pipe_type=doc.get("pipe_type", "Copper"),
        roof_membrane_age=doc.get("roof_membrane_age", 5),
        latitude=doc.get("latitude"),
        longitude=doc.get("longitude"),
        description=doc.get("description", ""),
        notes=doc.get("notes", ""),
        organization_id=doc.get("organization_id"),
        organization=doc.get("organization", "Greater Manchester Housing Trust"),
        risk_level=doc.get("risk_level", "low"),
        risk_score=doc.get("risk_score", 20),
        inspection_status=doc.get("inspection_status", "Scheduled"),
        last_inspected=doc.get("last_inspected", "Not yet inspected"),
        created_by=doc.get("created_by"),
        created_at=doc.get("created_at", datetime.datetime.now(datetime.timezone.utc).isoformat()),
        updated_at=doc.get("updated_at", datetime.datetime.now(datetime.timezone.utc).isoformat()),
    )

@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    payload: PropertyCreateInput,
    current_user: dict = Depends(require_manager),
    db = Depends(get_db),
):
    """
    Creates a new property record. Authorized for Property Managers and Admins.
    """
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    doc = payload.model_dump()
    doc["created_by"] = current_user["id"]
    doc["organization"] = payload.organization or current_user.get("organization", "Greater Manchester Housing Trust")
    doc["created_at"] = now_str
    doc["updated_at"] = now_str
    doc["is_archived"] = False

    result = await db.properties.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Audit log
    await db.audit_logs.insert_one({
        "user_id": current_user["id"],
        "action": "property_created",
        "target_collection": "properties",
        "target_id": str(result.inserted_id),
        "details": {"property_name": doc["property_name"], "postal_code": doc["postal_code"]},
        "created_at": now_str,
    })

    return serialize_property(doc)

@router.get("", response_model=PaginatedResponse[PropertyResponse])
async def list_properties(
    search: Optional[str] = Query(None, description="Search by name, address, or postal code"),
    building_type: Optional[str] = Query(None, description="Filter by building archetype"),
    risk_level: Optional[str] = Query(None, description="Filter by critical, high, moderate, low"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Retrieves authorized properties with pagination, search, and filtering.
    """
    filter_query: dict = {"is_archived": {"$ne": True}}

    # Organization-level isolation for non-admins
    if current_user.get("role") == UserRole.MANAGER:
        user_org = current_user.get("organization")
        if user_org:
            filter_query["organization"] = user_org

    if search:
        search_regex = {"$regex": search.strip(), "$options": "i"}
        filter_query["$or"] = [
            {"property_name": search_regex},
            {"address": search_regex},
            {"postal_code": search_regex},
        ]

    if building_type:
        filter_query["building_type"] = building_type

    if risk_level:
        filter_query["risk_level"] = risk_level

    total = await db.properties.count_documents(filter_query)
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    skip = (page - 1) * page_size

    cursor = db.properties.find(filter_query).sort("created_at", -1).skip(skip).limit(page_size)
    items = []
    async for doc in cursor:
        items.append(serialize_property(doc))

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items,
    )

@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property_by_id(
    property_id: str,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Retrieves a single property by its MongoDB ObjectId or property code.
    """
    query = {"_id": ObjectId(property_id)} if ObjectId.is_valid(property_id) else {"_id": property_id}
    doc = await db.properties.find_one(query)
    if not doc:
        # Fallback query if id field was stored as string
        doc = await db.properties.find_one({"id": property_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Property '{property_id}' not found.")

    return serialize_property(doc)

@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: str,
    payload: PropertyUpdateInput,
    current_user: dict = Depends(require_manager),
    db = Depends(get_db),
):
    """
    Updates property metadata and risk parameters.
    """
    query = {"_id": ObjectId(property_id)} if ObjectId.is_valid(property_id) else {"_id": property_id}
    existing = await db.properties.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found.")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        await db.properties.update_one(query, {"$set": update_data})

    updated_doc = await db.properties.find_one(query)
    return serialize_property(updated_doc)

@router.delete("/{property_id}")
async def archive_or_delete_property(
    property_id: str,
    current_user: dict = Depends(require_admin),
    db = Depends(get_db),
):
    """
    Safely archives a property. Restricted strictly to PLATFORM ADMIN.
    """
    query = {"_id": ObjectId(property_id)} if ObjectId.is_valid(property_id) else {"_id": property_id}
    existing = await db.properties.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found.")

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    await db.properties.update_one(
        query,
        {"$set": {"is_archived": True, "archived_at": now_str, "archived_by": current_user["id"]}}
    )

    await db.audit_logs.insert_one({
        "user_id": current_user["id"],
        "action": "property_archived",
        "target_collection": "properties",
        "target_id": property_id,
        "details": {"property_name": existing.get("property_name")},
        "created_at": now_str,
    })

    return {"status": "success", "message": f"Property '{property_id}' archived successfully."}

@router.get("/{property_id}/risk-summary", response_model=PropertyRiskSummary)
async def get_property_risk_summary(
    property_id: str,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Aggregates property risk level, active inspections, open work orders, and weather metrics.
    """
    query = {"_id": ObjectId(property_id)} if ObjectId.is_valid(property_id) else {"_id": property_id}
    doc = await db.properties.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Property not found.")

    # Count inspections and open work orders
    insp_count = await db.inspections.count_documents({"property_id": str(doc["_id"])})
    wo_count = await db.work_orders.count_documents({
        "property_id": str(doc["_id"]),
        "status": {"$in": ["Pending", "Assigned", "In Progress", "Pending Dispatch"]}
    })

    # Latest weather record for dew point margin
    weather = await db.weather_records.find_one(
        {"property_id": str(doc["_id"])},
        sort=[("fetched_at", -1)]
    )
    dew_margin = weather.get("temp_to_dew_diff") if weather else None

    return PropertyRiskSummary(
        property_id=str(doc["_id"]),
        property_name=doc.get("property_name", ""),
        risk_level=doc.get("risk_level", "low"),
        risk_score=doc.get("risk_score", 20),
        total_inspections=insp_count,
        open_work_orders=wo_count,
        dew_point_margin_c=dew_margin,
        last_inspected=doc.get("last_inspected", "Not yet inspected"),
    )
