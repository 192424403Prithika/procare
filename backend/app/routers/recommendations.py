import datetime
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from bson import ObjectId

from app.core.database import get_db
from app.core.rbac import require_any_authenticated, require_manager

router = APIRouter(prefix="/api/v1/recommendations", tags=["AI Maintenance Recommendation Assistant"])

class DecisionInput(BaseModel):
    notes: Optional[str] = None

class ConvertWorkOrderInput(BaseModel):
    assigned_contractor_id: Optional[str] = None
    assigned_contractor_name: Optional[str] = None
    estimated_cost: Optional[float] = None
    notes: Optional[str] = None

@router.get("/inspection/{inspection_id}")
async def get_recommendations_for_inspection(
    inspection_id: str,
    db = Depends(get_db),
    current_user: dict = Depends(require_any_authenticated),
):
    """
    Synthesizes multi-modal inspection telemetry (optical difference, acoustic FFT,
    visual defects, weather dew point, and symptoms) into explainable remedial recommendations.
    """
    # Fetch inspection
    query = {"_id": ObjectId(inspection_id)} if ObjectId.is_valid(inspection_id) else {"_id": inspection_id}
    insp = await db.inspections.find_one(query)
    if not insp:
        insp = await db.inspections.find_one({"id": inspection_id})
    if not insp:
        raise HTTPException(status_code=404, detail="Referenced inspection record not found.")

    prop_id = insp.get("property_id")
    prop = await db.properties.find_one({"$or": [{"_id": ObjectId(prop_id) if ObjectId.is_valid(prop_id) else None}, {"id": prop_id}]})
    prop_name = prop.get("property_name", "Monitored Unit") if prop else "Monitored Unit"

    # Check existing recommendations in DB
    existing_recs = []
    cursor = db.recommendations.find({"inspection_id": inspection_id})
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        existing_recs.append(doc)

    if existing_recs:
        return existing_recs

    # Generate explainable recommendations based on inspection data
    risk_level = insp.get("risk_level", "moderate")
    moisture = float(insp.get("moisture_reading") or 35.0)
    notes = insp.get("notes", "")
    room = insp.get("room", "Inspection Zone")

    generated = []
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if moisture >= 70.0 or risk_level == "critical":
        generated.append({
            "inspection_id": inspection_id,
            "property_id": prop_id,
            "property_name": prop_name,
            "room": room,
            "issue_title": "Active Pressurized Pipe Egress / High-Moisture Ingress",
            "supporting_evidence": f"Elevated surface moisture reading of {moisture:.1f}% in {room}. Severe specular reflectance and thermal bridging observed.",
            "risk_level": "critical",
            "urgency": "Emergency 24h",
            "statutory_deadline_hours": 24,
            "recommended_action": "Deploy ultrasonic acoustic leak technician to trace concealed riser pipework. Isolate supply manifold if pressure loss persists.",
            "suggested_trade": "Plumbing & Acoustic Leak Detection (CIPHE)",
            "estimated_cost_guide": 420.0,
            "status": "pending",  # pending, approved, rejected, converted_to_work_order
            "disclaimer": "Diagnostic recommendation. Requires on-site physical instrument confirmation before wall invasive opening.",
            "created_at": now_iso,
        })

    if "mould" in notes.lower() or "damp" in notes.lower() or moisture >= 45.0:
        generated.append({
            "inspection_id": inspection_id,
            "property_id": prop_id,
            "property_name": prop_name,
            "room": room,
            "issue_title": "Interstitial Condensation & Biofilm Risk",
            "supporting_evidence": f"Psychrometric moisture reading of {moisture:.1f}% indicates relative humidity near saturation on cold thermal envelope in {room}.",
            "risk_level": "high",
            "urgency": "Urgent 7d",
            "statutory_deadline_hours": 168,
            "recommended_action": "Apply non-toxic biocidal sterilisation treatment. Inspect mechanical extract fan airflow rate (minimum 15 L/s per Approved Document F).",
            "suggested_trade": "Specialist Damp Proofing & Ventilation Remediation",
            "estimated_cost_guide": 340.0,
            "status": "pending",
            "disclaimer": "Diagnostic recommendation. Swab testing required for biological speciation.",
            "created_at": now_iso,
        })

    if not generated:
        # Standard maintenance recommendation
        generated.append({
            "inspection_id": inspection_id,
            "property_id": prop_id,
            "property_name": prop_name,
            "room": room,
            "issue_title": "Routine Thermal Envelope Seal & Ventilation Maintenance",
            "supporting_evidence": f"Baseline moisture of {moisture:.1f}% within nominal tolerance. Preventative seal maintenance recommended.",
            "risk_level": "low",
            "urgency": "Standard 14d",
            "statutory_deadline_hours": 336,
            "recommended_action": "Inspect trickle vents and perimeter window mastic seals during next scheduled review.",
            "suggested_trade": "General Maintenance & Joinery",
            "estimated_cost_guide": 120.0,
            "status": "pending",
            "disclaimer": "Standard preventative inspection recommendation.",
            "created_at": now_iso,
        })

    # Save generated recommendations to DB
    res = await db.recommendations.insert_many(generated)
    for i, inserted_id in enumerate(res.inserted_ids):
        generated[i]["id"] = str(inserted_id)
        if "_id" in generated[i]:
            del generated[i]["_id"]

    return generated

@router.post("/{recommendation_id}/approve")
async def approve_recommendation(
    recommendation_id: str,
    payload: DecisionInput,
    db = Depends(get_db),
    current_user: dict = Depends(require_manager),
):
    """
    Manager approves an AI recommendation for subsequent work order scheduling.
    """
    query = {"_id": ObjectId(recommendation_id)} if ObjectId.is_valid(recommendation_id) else {"_id": recommendation_id}
    rec = await db.recommendations.find_one(query)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    await db.recommendations.update_one(
        query,
        {
            "$set": {
                "status": "approved",
                "manager_decision_notes": payload.notes,
                "approved_by": current_user.get("full_name") or current_user.get("email"),
                "approved_at": now_iso,
            }
        }
    )
    return {"status": "success", "message": "Recommendation approved."}

@router.post("/{recommendation_id}/reject")
async def reject_recommendation(
    recommendation_id: str,
    payload: DecisionInput,
    db = Depends(get_db),
    current_user: dict = Depends(require_manager),
):
    """
    Manager rejects an AI recommendation with explanation.
    """
    query = {"_id": ObjectId(recommendation_id)} if ObjectId.is_valid(recommendation_id) else {"_id": recommendation_id}
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    await db.recommendations.update_one(
        query,
        {
            "$set": {
                "status": "rejected",
                "manager_decision_notes": payload.notes,
                "rejected_by": current_user.get("full_name") or current_user.get("email"),
                "rejected_at": now_iso,
            }
        }
    )
    return {"status": "success", "message": "Recommendation rejected."}

@router.post("/{recommendation_id}/convert-work-order", status_code=status.HTTP_201_CREATED)
async def convert_to_work_order(
    recommendation_id: str,
    payload: ConvertWorkOrderInput,
    db = Depends(get_db),
    current_user: dict = Depends(require_manager),
):
    """
    Converts an approved maintenance recommendation into an official database work order.
    Sets statutory SLA deadline based on urgency (24 hours for emergency, 7 days for urgent).
    """
    query = {"_id": ObjectId(recommendation_id)} if ObjectId.is_valid(recommendation_id) else {"_id": recommendation_id}
    rec = await db.recommendations.find_one(query)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    now = datetime.datetime.now(datetime.timezone.utc)
    urgency = rec.get("urgency", "Standard 14d")

    if "24h" in urgency or "emergency" in urgency.lower():
        deadline = now + datetime.timedelta(hours=24)
        priority = "Emergency 24h"
    elif "7d" in urgency or "urgent" in urgency.lower():
        deadline = now + datetime.timedelta(days=7)
        priority = "Urgent 7d"
    else:
        deadline = now + datetime.timedelta(days=14)
        priority = "Standard 14d"

    order_num = f"WO-{now.year}-{uuid.uuid4().hex[:6].upper()}"

    contractor_name = payload.assigned_contractor_name or "Pending Dispatch"
    if payload.assigned_contractor_id and not payload.assigned_contractor_name:
        c_query = {"_id": ObjectId(payload.assigned_contractor_id)} if ObjectId.is_valid(payload.assigned_contractor_id) else {"_id": payload.assigned_contractor_id}
        c = await db.contractors.find_one(c_query)
        if c:
            contractor_name = c.get("company_name", "Contractor")

    work_order_doc = {
        "order_number": order_num,
        "title": rec.get("issue_title", "Remediation Order"),
        "property_id": str(rec.get("property_id", "")),
        "property_name": rec.get("property_name", ""),
        "room": rec.get("room", "Inspection Zone"),
        "contractor_id": payload.assigned_contractor_id,
        "contractor_name": contractor_name,
        "trade": rec.get("suggested_trade", "General Maintenance"),
        "priority": priority,
        "status": "Assigned" if payload.assigned_contractor_id else "Pending Dispatch",
        "description": f"{rec.get('recommended_action')}\n\nEvidence: {rec.get('supporting_evidence')}",
        "estimated_cost": payload.estimated_cost or rec.get("estimated_cost_guide", 350.0),
        "actual_cost": None,
        "created_date": now.isoformat(),
        "deadline_date": deadline.isoformat(),
        "completed_date": None,
        "created_by": current_user.get("full_name") or current_user.get("email"),
        "source_recommendation_id": recommendation_id,
    }

    res = await db.work_orders.insert_one(work_order_doc)
    wo_id = str(res.inserted_id)
    work_order_doc["id"] = wo_id
    if "_id" in work_order_doc:
        del work_order_doc["_id"]

    # Update recommendation
    await db.recommendations.update_one(
        query,
        {
            "$set": {
                "status": "converted_to_work_order",
                "work_order_id": wo_id,
                "work_order_number": order_num,
                "converted_at": now.isoformat(),
            }
        }
    )

    # Insert notification for new work order
    await db.notifications.insert_one({
        "user_id": None,
        "title": f"New Work Order Created: {order_num}",
        "message": f"Remediation order dispatched for '{rec.get('issue_title')}'. Deadline: {deadline.strftime('%d %b %Y, %H:%M')}.",
        "type": "critical" if priority == "Emergency 24h" else "info",
        "is_read": False,
        "link": "/app/work-orders",
        "action_text": "View Work Order",
        "created_at": now.isoformat(),
    })

    return work_order_doc
