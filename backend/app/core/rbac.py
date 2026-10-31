from typing import List, Optional
from fastapi import Depends, HTTPException, Security, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import jwt

from app.core.config import settings
from app.core.security import decode_token
from app.core.database import get_db

security_bearer = HTTPBearer(auto_error=False)

class UserRole:
    ADMIN = "admin"
    MANAGER = "manager"
    INSPECTOR = "inspector"
    CONTRACTOR = "contractor"

    ALL_ROLES = [ADMIN, MANAGER, INSPECTOR, CONTRACTOR]

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db = Depends(get_db),
) -> dict:
    """
    Validates JWT token from Bearer header or HTTP-only cookie and fetches authenticated user from MongoDB.
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif "propcare_access_token" in request.cookies:
        token = request.cookies.get("propcare_access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type: access token required.",
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject identity.",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please refresh your session.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or malformed authentication token.",
        )

    # Fetch user from database
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    user = await db.users.find_one(query)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists.",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact system administrator.",
        )

    # Attach stringified id
    user["id"] = str(user["_id"])
    return user

def require_roles(allowed_roles: List[str]):
    """
    Dependency factory to enforce role-based access control.
    ADMIN role always possesses unrestricted access across all endpoints.
    """
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role == UserRole.ADMIN:
            return current_user
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: role '{user_role}' is not authorized to access this resource.",
            )
        return current_user
    return role_checker

# Predefined role dependencies
require_admin = require_roles([UserRole.ADMIN])
require_manager = require_roles([UserRole.ADMIN, UserRole.MANAGER])
require_inspector = require_roles([UserRole.ADMIN, UserRole.INSPECTOR])
require_contractor = require_roles([UserRole.ADMIN, UserRole.CONTRACTOR])
require_staff = require_roles([UserRole.ADMIN, UserRole.MANAGER, UserRole.INSPECTOR])
require_any_authenticated = require_roles(UserRole.ALL_ROLES)
