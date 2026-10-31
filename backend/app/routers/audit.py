from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from app.core.database import get_db
from app.core.rbac import require_admin

router = APIRouter(prefix="/api/v1/audit-logs", tags=["Audit Trail"])

@router.get("")
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
    current_user: dict = Depends(require_admin),
    db = Depends(get_db),
):
    """
    Retrieves platform audit trail. Restricted strictly to PLATFORM ADMIN.
    """
    query: dict = {}
    if action:
        query["action"] = action

    logs = []
    async for doc in db.audit_logs.find(query).sort("created_at", -1).limit(limit):
        logs.append({
            "id": str(doc["_id"]),
            "user_id": doc.get("user_id"),
            "action": doc.get("action"),
            "target_collection": doc.get("target_collection"),
            "target_id": doc.get("target_id"),
            "details": doc.get("details", {}),
            "created_at": doc.get("created_at"),
        })
    return logs
