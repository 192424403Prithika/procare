import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.core.database import get_db
from app.core.rbac import get_current_user, require_admin, UserRole
from app.schemas.user import UserResponse, UserUpdateInput, UserRoleUpdateInput

router = APIRouter(prefix="/api/v1/users", tags=["User Management"])

@router.get("", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(require_admin), db = Depends(get_db)):
    """
    List all registered users. Restricted to PLATFORM ADMIN only.
    """
    users = []
    async for doc in db.users.find().sort("created_at", -1):
        users.append(
            UserResponse(
                id=str(doc["_id"]),
                email=doc["email"],
                full_name=doc.get("full_name", ""),
                organization=doc.get("organization", ""),
                role=doc.get("role", UserRole.MANAGER),
                title=doc.get("title", ""),
                is_active=doc.get("is_active", True),
                created_at=doc.get("created_at", datetime.datetime.now(datetime.timezone.utc).isoformat()),
            )
        )
    return users

@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdateInput,
    current_user: dict = Depends(require_admin),
    db = Depends(get_db),
):
    """
    Assigns or updates a user's role.
    Strictly enforced: Only an authorized Admin can execute this.
    Prevents self-demoting the last active administrator.
    """
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    target_user = await db.users.find_one(query)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    # Guard against removing the last admin
    if target_user.get("role") == UserRole.ADMIN and payload.role != UserRole.ADMIN:
        admin_count = await db.users.count_documents({"role": UserRole.ADMIN, "is_active": True})
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the only remaining platform administrator.",
            )

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    old_role = target_user.get("role")
    await db.users.update_one(
        query,
        {"$set": {"role": payload.role, "updated_at": now_str}}
    )

    # Record audit log
    await db.audit_logs.insert_one({
        "user_id": current_user["id"],
        "action": "role_changed",
        "target_collection": "users",
        "target_id": user_id,
        "details": {"old_role": old_role, "new_role": payload.role},
        "created_at": now_str,
    })

    updated_user = await db.users.find_one(query)
    return UserResponse(
        id=str(updated_user["_id"]),
        email=updated_user["email"],
        full_name=updated_user.get("full_name", ""),
        organization=updated_user.get("organization", ""),
        role=updated_user.get("role", payload.role),
        title=updated_user.get("title", ""),
        is_active=updated_user.get("is_active", True),
        created_at=updated_user.get("created_at", now_str),
    )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user_profile(
    user_id: str,
    payload: UserUpdateInput,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Updates profile details. Users can update their own profile; Admins can update any.
    """
    if current_user["id"] != user_id and current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to edit other profiles.")

    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    target_user = await db.users.find_one(query)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_fields = {}
    if payload.full_name is not None:
        update_fields["full_name"] = payload.full_name.strip()
    if payload.organization is not None:
        update_fields["organization"] = payload.organization.strip()
    if payload.title is not None:
        update_fields["title"] = payload.title.strip()

    if update_fields:
        update_fields["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        await db.users.update_one(query, {"$set": update_fields})

    updated_user = await db.users.find_one(query)
    return UserResponse(
        id=str(updated_user["_id"]),
        email=updated_user["email"],
        full_name=updated_user.get("full_name", ""),
        organization=updated_user.get("organization", ""),
        role=updated_user.get("role", UserRole.MANAGER),
        title=updated_user.get("title", ""),
        is_active=updated_user.get("is_active", True),
        created_at=updated_user.get("created_at", ""),
    )
