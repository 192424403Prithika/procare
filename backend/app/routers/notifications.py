import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId

from app.core.database import get_db
from app.core.rbac import get_current_user, require_any_authenticated, require_manager
from app.schemas.report import NotificationResponse, NotificationCreateInput

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications & Alerts"])

@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Returns total unread notifications count for the authenticated user.
    """
    user_id = current_user["id"]
    count = await db.notifications.count_documents({
        "$or": [{"user_id": user_id}, {"user_id": None}],
        "is_read": False,
    })
    return {"unread_count": count}

@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    category: Optional[str] = Query(None, description="all | critical | warning | info | success"),
    unread_only: bool = Query(False),
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Retrieves notifications relevant to the current user (broadcast or personal),
    with optional filtering by category and read status.
    """
    user_id = current_user["id"]
    query: dict = {
        "$or": [
            {"user_id": user_id},
            {"user_id": None},
        ]
    }
    if unread_only:
        query["is_read"] = False
    if category and category != "all":
        query["type"] = category

    notifications = []
    async for doc in db.notifications.find(query).sort("created_at", -1).limit(50):
        notifications.append(
            NotificationResponse(
                id=str(doc["_id"]),
                user_id=doc.get("user_id"),
                title=doc.get("title", "Notification"),
                message=doc.get("message", ""),
                type=doc.get("type", "info"),
                is_read=doc.get("is_read", False),
                link=doc.get("link"),
                action_text=doc.get("action_text"),
                created_at=doc.get("created_at", ""),
            )
        )

    # If database notifications collection is empty, generate initial baseline alerts from system status
    if not notifications and not unread_only and (not category or category == "all"):
        await generate_system_alerts_internal(db, user_id)
        async for doc in db.notifications.find(query).sort("created_at", -1).limit(50):
            notifications.append(
                NotificationResponse(
                    id=str(doc["_id"]),
                    user_id=doc.get("user_id"),
                    title=doc.get("title", "Notification"),
                    message=doc.get("message", ""),
                    type=doc.get("type", "info"),
                    is_read=doc.get("is_read", False),
                    link=doc.get("link"),
                    action_text=doc.get("action_text"),
                    created_at=doc.get("created_at", ""),
                )
            )

    return notifications

async def generate_system_alerts_internal(db, user_id: Optional[str] = None):
    """
    Generates real database-backed notifications from active properties,
    inspections, deadlines, and weather records.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    alerts = []

    # 1. Critical findings check
    critical_insp = await db.inspections.find_one({"risk_level": "critical"})
    if critical_insp:
        prop_id = critical_insp.get("property_id")
        prop = await db.properties.find_one({"$or": [{"_id": ObjectId(prop_id) if ObjectId.is_valid(prop_id) else None}, {"id": prop_id}]})
        prop_name = prop.get("property_name", "Monitored Unit") if prop else "Monitored Unit"
        alerts.append({
            "user_id": None,
            "title": f"Awaab's Law 24h Investigation Notice: {prop_name}",
            "message": f"Critical moisture findings recorded in {critical_insp.get('room', 'inspection zone')}. Section 10A statutory 24-hour investigation deadline active.",
            "type": "critical",
            "is_read": False,
            "link": f"/app/inspections/{critical_insp.get('id', str(critical_insp['_id']))}",
            "action_text": "View Critical Inspection",
            "created_at": now_iso,
        })

    # 2. Weather alert check
    weather_doc = await db.weather_records.find_one(sort=[("fetched_at", -1)])
    if weather_doc and "data" in weather_doc:
        w = weather_doc["data"]
        rh = w.get("relative_humidity_pct", 0)
        dew_margin = w.get("dew_point_margin_c", 5.0)
        if rh >= 85 or dew_margin <= 1.5:
            alerts.append({
                "user_id": None,
                "title": f"Severe Condensation Warning: RH {rh:.0f}%",
                "message": f"External psychrometric conditions indicate nocturnal condensation hazard. Surface temperature margin is {dew_margin:.1f}°C to dew point.",
                "type": "warning",
                "is_read": False,
                "link": "/app/weather",
                "action_text": "Open Weather Model",
                "created_at": now_iso,
            })

    # 3. Work order updates
    active_wo = await db.work_orders.find_one({"status": "Completed"})
    if active_wo:
        alerts.append({
            "user_id": None,
            "title": f"Work Order Ready for Sign-Off: {active_wo.get('order_number', 'WO')}",
            "message": f"Remediation contractor completed repair on '{active_wo.get('title', 'Work Order')}'. Completion evidence submitted.",
            "type": "success",
            "is_read": False,
            "link": "/app/work-orders",
            "action_text": "Review Sign-Off",
            "created_at": now_iso,
        })

    # Fallback default baseline if nothing in DB yet
    if not alerts:
        alerts.append({
            "user_id": None,
            "title": "PropCare NW Statutory Monitoring Active",
            "message": "Continuous multi-modal monitoring active across registered North West social housing units.",
            "type": "info",
            "is_read": False,
            "link": "/app/dashboard",
            "action_text": "View Dashboard",
            "created_at": now_iso,
        })

    await db.notifications.insert_many(alerts)

@router.post("/generate-alerts")
async def trigger_generate_alerts(
    current_user: dict = Depends(require_manager),
    db = Depends(get_db),
):
    """
    Manually triggers alert generation from real telemetry records.
    """
    await generate_system_alerts_internal(db, current_user.get("id"))
    return {"status": "success", "message": "Alert evaluation completed."}

@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Marks a single notification as read.
    """
    query = {"_id": ObjectId(notification_id)} if ObjectId.is_valid(notification_id) else {"_id": notification_id}
    await db.notifications.update_one(query, {"$set": {"is_read": True}})
    return {"status": "success", "message": "Marked as read."}

@router.put("/read-all")
async def mark_all_notifications_as_read(
    current_user: dict = Depends(require_any_authenticated),
    db = Depends(get_db),
):
    """
    Marks all notifications for current user as read.
    """
    user_id = current_user["id"]
    await db.notifications.update_many(
        {"$or": [{"user_id": user_id}, {"user_id": None}], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"status": "success", "message": "All notifications marked as read."}
