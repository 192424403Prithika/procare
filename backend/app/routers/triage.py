import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.core.database import get_db
from app.core.rbac import get_current_user, require_manager, require_any_authenticated
from app.schemas.triage import (
    RiskAssessmentInput,
    RiskAssessmentResponse,
    RiskApprovalInput,
)
from app.services.triage_service import compute_explainable_risk_assessment

router = APIRouter(prefix="/api/v1/triage", tags=["Risk Triage & Verification"])

@router.post("/calculate", response_model=RiskAssessmentResponse)
async def calculate_triage_risk(
    payload: RiskAssessmentInput,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Computes an explainable, multi-modal risk score and creates a reviewable assessment record in MongoDB.
    """
    prop_query = {"_id": ObjectId(payload.property_id)} if ObjectId.is_valid(payload.property_id) else {"_id": payload.property_id}
    prop = await db.properties.find_one(prop_query)
    if not prop:
        prop = await db.properties.find_one({"id": payload.property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Referenced property not found.")

    # Execute explainable triage calculation
    result = compute_explainable_risk_assessment(
        property_data=prop,
        optical_difference_pct=payload.optical_difference_pct,
        acoustic_frequency_hz=payload.acoustic_frequency_hz,
        acoustic_score=payload.acoustic_score,
        dew_point_margin_c=payload.dew_point_margin_c,
        symptoms=payload.symptoms,
        inspector_notes=payload.inspector_notes,
    )

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    assessment_doc = {
        "property_id": str(prop["_id"]),
        "property_name": prop.get("property_name", ""),
        "inspection_id": payload.inspection_id,
        "risk_category": result["risk_category"],
        "risk_score": result["risk_score"],
        "factors": result["factors"],
        "evidence_references": result["evidence_references"],
        "calculation_details": result["calculation_details"],
        "recommendations": result["recommendations"],
        "review_status": "Pending",
        "reviewed_by": None,
        "reviewed_at": None,
        "disclaimer": result["disclaimer"],
        "created_by": current_user["id"],
        "created_at": now_str,
    }

    insert_res = await db.risk_assessments.insert_one(assessment_doc)
    doc_id = str(insert_res.inserted_id)

    # Automatically update property risk score and risk level
    await db.properties.update_one(
        prop_query,
        {
            "$set": {
                "risk_level": result["risk_category"],
                "risk_score": result["risk_score"],
                "updated_at": now_str,
            }
        }
    )

    # If critical risk, dispatch automatic notification
    if result["risk_category"] == "critical":
        await db.notifications.insert_one({
            "user_id": None,  # Broadcast to managers/admins
            "title": f"Awaab's Law SLA Trigger: {prop.get('property_name')}",
            "message": f"Critical risk score ({result['risk_score']}/100) calculated. Statutory 24-hour investigation required.",
            "type": "critical",
            "is_read": False,
            "link": f"/app/risk-triage",
            "action_text": "Review Triage Assessment",
            "created_at": now_str,
        })

    return RiskAssessmentResponse(
        id=doc_id,
        property_id=str(prop["_id"]),
        property_name=prop.get("property_name", ""),
        inspection_id=payload.inspection_id,
        risk_category=result["risk_category"],
        risk_score=result["risk_score"],
        factors=result["factors"],
        evidence_references=result["evidence_references"],
        calculation_details=result["calculation_details"],
        recommendations=result["recommendations"],
        review_status="Pending",
        created_at=now_str,
        disclaimer=result["disclaimer"],
    )

@router.post("/{assessment_id}/review", response_model=RiskAssessmentResponse)
async def review_triage_assessment(
    assessment_id: str,
    payload: RiskApprovalInput,
    current_user: dict = Depends(require_manager),
    db = Depends(get_db),
):
    """
    Human verification and approval/rejection endpoint for Property Managers and Admins.
    """
    query = {"_id": ObjectId(assessment_id)} if ObjectId.is_valid(assessment_id) else {"_id": assessment_id}
    assessment = await db.risk_assessments.find_one(query)
    if not assessment:
        raise HTTPException(status_code=404, detail="Risk assessment record not found.")

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    update_fields = {
        "review_status": payload.review_status,
        "reviewed_by": current_user.get("full_name") or current_user["id"],
        "reviewed_at": now_str,
        "review_notes": payload.review_notes,
    }

    await db.risk_assessments.update_one(query, {"$set": update_fields})

    # Log audit trail
    await db.audit_logs.insert_one({
        "user_id": current_user["id"],
        "action": "risk_assessment_reviewed",
        "target_collection": "risk_assessments",
        "target_id": assessment_id,
        "details": {"status": payload.review_status, "reviewer": update_fields["reviewed_by"]},
        "created_at": now_str,
    })

    updated = await db.risk_assessments.find_one(query)
    return RiskAssessmentResponse(
        id=str(updated["_id"]),
        property_id=updated.get("property_id", ""),
        property_name=updated.get("property_name", ""),
        inspection_id=updated.get("inspection_id"),
        risk_category=updated.get("risk_category", "low"),
        risk_score=updated.get("risk_score", 0),
        factors=updated.get("factors", []),
        evidence_references=updated.get("evidence_references", []),
        calculation_details=updated.get("calculation_details", {}),
        recommendations=updated.get("recommendations", []),
        review_status=updated.get("review_status", "Pending"),
        reviewed_by=updated.get("reviewed_by"),
        reviewed_at=updated.get("reviewed_at"),
        created_at=updated.get("created_at", now_str),
        disclaimer=updated.get("disclaimer", ""),
    )
