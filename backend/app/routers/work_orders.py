import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from bson import ObjectId

from app.core.database import get_db
from app.core.storage import validate_and_save_image, generate_signed_url
from app.core.rbac import (
    get_current_user,
    require_manager,
    require_contractor,
    require_any_authenticated,
    UserRole,
)
from app.schemas.work_order import (
    WorkOrderCreateInput,
    WorkOrderUpdateInput,
    WorkOrderEvidenceInput,
    WorkOrderResponse,
)

router = APIRouter(prefix="/api/v1/work-orders", tags=["Work Order Lifecycle"])

async def serialize_work_order(doc: dict, db) -> WorkOrderResponse:
    doc_id = str(doc["_id"])
    prop_name = doc.get("property_name", "")
    
    if not prop_name and doc.get("property_id"):
        p_query = {"_id": ObjectId(doc["property_id"])} if ObjectId.is_valid(doc["property_id"]) else {"_id": doc["property_id"]}
        prop = await db.properties.find_one(p_query)
        if prop:
            prop_name = prop.get("property_name", "")

    evidence_url = ""
    evidence_path = doc.get("completion_evidence", "")
    if evidence_path and "/" in evidence_path:
        evidence_url = generate_signed_url("inspection-images", evidence_path)
    else:
        evidence_url = evidence_path

    return WorkOrderResponse(
        id=doc_id,
        property_id=str(doc.get("property_id", "")),
        property_name=prop_name,
        report_id=doc.get("report_id"),
        zone=doc.get("zone", "Primary Zone"),
        contractor_id=doc.get("contractor_id"),
        contractor_name=doc.get("contractor_name", "Unassigned"),
        trade_type=doc.get("trade_type", "Damp Remediation"),
        priority=doc.get("priority", "Urgent 7d"),
        status=doc.get("status", "Pending Dispatch"),
        issue_description=doc.get("issue_description", ""),
        cost_estimate=float(doc.get("cost_estimate", 0.0)),
        actual_cost=float(doc["actual_cost"]) if doc.get("actual_cost") is not None else None,
        created_date=doc.get("created_date", doc.get("created_at", "")),
        deadline_date=doc.get("deadline_date", ""),
        completed_date=doc.get("completed_date"),
        completion_evidence=evidence_url,
        notes=doc.get("notes", ""),
        created_at=doc.get("created_at", datetime.datetime.now(datetime.timezone.utc).isoformat()),
        updated_at=doc.get("updated_at", datetime.datetime.now(datetime.timezone.utc).isoformat()),
    )

@router.post("", response_model=WorkOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_work_order(
    payload: WorkOrderCreateInput,
    current_user: dict = Depends(require_manager),
    db = Depends(get_db),
):
    """
    Creates a new statutory work order dispatched to a contractor.
    """
    prop_query = {"_id": ObjectId(payload.property_id)} if ObjectId.is_valid(payload.property_id) else {"_id": payload.property_id}
    prop = await db.properties.find_one(prop_query)
    if not prop:
        raise HTTPException(status_code=404, detail="Referenced property not found.")

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    order_doc = payload.model_dump()
    order_doc["property_name"] = prop.get("property_name", "")
    order_doc["created_date"] = now_str
    order_doc["created_by"] = current_user["id"]
    order_doc["created_at"] = now_str
    order_doc["updated_at"] = now_str
    order_doc["status"] = "Pending Dispatch"

    res = await db.work_orders.insert_one(order_doc)
    order_doc["_id"] = res.inserted_id

    # Create notification for contractor / manager
    await db.notifications.insert_one({
        "user_id": payload.contractor_id,
        "title": f"New Work Order Assigned: {prop.get('property_name')}",
        "message": f"Priority: {payload.priority}. Issue: {payload.issue_description[:80]}",
        "type": "warning" if "Emergency" in payload.priority else "info",
        "is_read": False,
        "link": "/app/work-orders",
        "action_text": "Review Work Order",
        "created_at": now_str,
    })

    return await serialize_work_order(order_doc, db)

@router.get("", response_model=List[WorkOrderResponse])
async def list_work_orders(
    property_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    contractor_name: Optional[str] = Query(None),
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Lists work orders with role-based filtering.
    Contractors only see work orders dispatched to their company or user ID.
    """
    filter_query: dict = {}
    if property_id:
        filter_query["property_id"] = property_id
    if status_filter:
        filter_query["status"] = status_filter

    # Role enforcement: Contractors strictly isolated to their own assignments
    if current_user.get("role") == UserRole.CONTRACTOR:
        user_org = current_user.get("organization") or current_user.get("full_name")
        filter_query["$or"] = [
            {"contractor_id": current_user["id"]},
            {"contractor_name": user_org},
            {"contractor_name": current_user.get("full_name")},
        ]
    elif contractor_name:
        filter_query["contractor_name"] = contractor_name

    orders = []
    async for doc in db.work_orders.find(filter_query).sort("created_at", -1):
        orders.append(await serialize_work_order(doc, db))

    return orders

@router.get("/{order_id}", response_model=WorkOrderResponse)
async def get_work_order(
    order_id: str,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Retrieves work order by ID.
    """
    query = {"_id": ObjectId(order_id)} if ObjectId.is_valid(order_id) else {"_id": order_id}
    doc = await db.work_orders.find_one(query)
    if not doc:
        doc = await db.work_orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Work order not found.")

    return await serialize_work_order(doc, db)

@router.put("/{order_id}/status", response_model=WorkOrderResponse)
async def update_work_order_status(
    order_id: str,
    payload: WorkOrderUpdateInput,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Transitions work order status with role verification.
    """
    query = {"_id": ObjectId(order_id)} if ObjectId.is_valid(order_id) else {"_id": order_id}
    order = await db.work_orders.find_one(query)
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found.")

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_data["updated_at"] = now_str

    if payload.status == "Completed":
        update_data["completed_date"] = now_str
        # Record in maintenance_records collection
        await db.maintenance_records.insert_one({
            "property_id": order.get("property_id"),
            "work_order_id": str(order["_id"]),
            "contractor_name": order.get("contractor_name"),
            "trade_type": order.get("trade_type"),
            "action_taken": order.get("issue_description"),
            "completed_at": now_str,
            "cost": payload.actual_cost or order.get("cost_estimate"),
        })

    await db.work_orders.update_one(query, {"$set": update_data})

    # Log audit entry
    await db.audit_logs.insert_one({
        "user_id": current_user["id"],
        "action": "work_order_updated",
        "target_collection": "work_orders",
        "target_id": order_id,
        "details": {"new_status": payload.status},
        "created_at": now_str,
    })

    updated = await db.work_orders.find_one(query)
    return await serialize_work_order(updated, db)

@router.post("/{order_id}/evidence", response_model=WorkOrderResponse)
async def upload_work_order_evidence(
    order_id: str,
    note: str = Form(..., description="Contractor completion observations and remediation summary"),
    image_file: Optional[UploadFile] = File(None, description="Completion photographic evidence"),
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Contractor evidence submission endpoint.
    Uploads photographic evidence and updates work order to 'Awaiting Review' / 'Completed'.
    """
    query = {"_id": ObjectId(order_id)} if ObjectId.is_valid(order_id) else {"_id": order_id}
    order = await db.work_orders.find_one(query)
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found.")

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    evidence_path = ""

    if image_file:
        relative_path, _, _ = await validate_and_save_image(image_file, bucket="inspection-images")
        evidence_path = relative_path

    await db.work_orders.update_one(
        query,
        {
            "$set": {
                "completion_evidence": evidence_path or note,
                "notes": f"Contractor Completion Note: {note}",
                "status": "Awaiting Signoff",
                "completed_date": now_str,
                "updated_at": now_str,
            }
        }
    )

    # Notify property manager that job is awaiting review
    await db.notifications.insert_one({
        "user_id": None,
        "title": f"Work Order Completed: {order.get('property_name', 'Property')}",
        "message": f"Contractor uploaded completion evidence for '{order.get('issue_description', '')[:60]}'. Signoff required.",
        "type": "success",
        "is_read": False,
        "link": "/app/work-orders",
        "action_text": "Review & Sign Off",
        "created_at": now_str,
    })

    updated = await db.work_orders.find_one(query)
    return await serialize_work_order(updated, db)
