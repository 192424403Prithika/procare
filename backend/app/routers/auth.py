import datetime
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from bson import ObjectId

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.rbac import get_current_user, UserRole
from app.schemas.auth import (
    UserRegisterInput,
    UserLoginInput,
    TokenResponse,
    RefreshTokenInput,
    PasswordResetRequest,
    PasswordResetConfirm,
    CurrentUserResponse,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegisterInput, response: Response, db = Depends(get_db)):
    """
    Public registration endpoint.
    IMPORTANT: Public registration CANNOT choose an administrative role.
    Role is strictly defaulted to 'manager' or requires Admin approval.
    """
    normalized_email = payload.email.lower().strip()
    
    # Check if user already exists
    existing = await db.users.find_one({"email": normalized_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    # Securely hash password using Argon2id
    pwd_hash = hash_password(payload.password)
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_user_doc = {
        "email": normalized_email,
        "password_hash": pwd_hash,
        "full_name": payload.full_name.strip(),
        "organization": payload.organization.strip() if payload.organization else "PropCare NW Partner",
        "role": UserRole.MANAGER,  # Strictly fixed default, never trusted from client
        "title": payload.title.strip() if payload.title else "Housing Officer",
        "is_active": True,
        "created_at": now_str,
        "updated_at": now_str,
    }

    insert_result = await db.users.insert_one(new_user_doc)
    user_id = str(insert_result.inserted_id)

    # Log audit event
    await db.audit_logs.insert_one({
        "user_id": user_id,
        "action": "user_registered",
        "target_collection": "users",
        "target_id": user_id,
        "details": {"email": normalized_email, "role": UserRole.MANAGER},
        "created_at": now_str,
    })

    # Create tokens
    access_token = create_access_token(subject=user_id, role=UserRole.MANAGER)
    refresh_token = create_refresh_token(subject=user_id, role=UserRole.MANAGER)

    # Store refresh token hash in DB
    await db.users.update_one(
        {"_id": insert_result.inserted_id},
        {"$set": {"refresh_token": hash_password(refresh_token)}}
    )

    # Set secure cookie
    response.set_cookie(
        key="propcare_access_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=not settings.DEBUG,
    )

    user_info = {
        "id": user_id,
        "email": normalized_email,
        "full_name": new_user_doc["full_name"],
        "organization": new_user_doc["organization"],
        "role": UserRole.MANAGER,
        "title": new_user_doc["title"],
    }

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_info,
    )

@router.post("/login", response_model=TokenResponse)
async def login_user(payload: UserLoginInput, response: Response, db = Depends(get_db)):
    """
    Authenticates user credentials and issues JWT access and refresh tokens.
    """
    normalized_email = payload.email.lower().strip()
    user = await db.users.find_one({"email": normalized_email})
    
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact your system administrator.",
        )

    user_id = str(user["_id"])
    role = user.get("role", UserRole.MANAGER)

    access_token = create_access_token(subject=user_id, role=role)
    refresh_token = create_refresh_token(subject=user_id, role=role)

    # Update refresh token in database
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "refresh_token": hash_password(refresh_token),
                "last_login": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
        }
    )

    # Set secure cookie
    response.set_cookie(
        key="propcare_access_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=not settings.DEBUG,
    )

    user_info = {
        "id": user_id,
        "email": user["email"],
        "full_name": user.get("full_name", ""),
        "organization": user.get("organization", "PropCare NW Partner"),
        "role": role,
        "title": user.get("title", ""),
    }

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_info,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(payload: RefreshTokenInput, response: Response, db = Depends(get_db)):
    """
    Rotates access token using a valid refresh token.
    """
    try:
        decoded = decode_token(payload.refresh_token)
        if decoded.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type: refresh token expected.")
        user_id = decoded.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Refresh token has expired or is invalid.")

    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    user = await db.users.find_one(query)
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is invalid or deactivated.")

    # Check stored refresh token hash
    stored_hash = user.get("refresh_token")
    if not stored_hash or not verify_password(payload.refresh_token, stored_hash):
        raise HTTPException(status_code=401, detail="Refresh token has been revoked or replaced.")

    role = user.get("role", UserRole.MANAGER)
    new_access_token = create_access_token(subject=user_id, role=role)
    new_refresh_token = create_refresh_token(subject=user_id, role=role)

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token": hash_password(new_refresh_token)}}
    )

    response.set_cookie(
        key="propcare_access_token",
        value=new_access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=not settings.DEBUG,
    )

    user_info = {
        "id": user_id,
        "email": user["email"],
        "full_name": user.get("full_name", ""),
        "organization": user.get("organization", ""),
        "role": role,
        "title": user.get("title", ""),
    }

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_info,
    )

@router.post("/logout")
async def logout_user(response: Response, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """
    Revokes the current user's refresh token and clears cookie session.
    """
    user_id = current_user.get("id")
    if user_id:
        query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
        await db.users.update_one(query, {"$unset": {"refresh_token": ""}})

    response.delete_cookie(key="propcare_access_token")
    return {"status": "success", "message": "Successfully logged out."}

@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Returns verified profile information of the current authenticated user.
    """
    return CurrentUserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user.get("full_name", ""),
        organization=current_user.get("organization", "PropCare NW Partner"),
        role=current_user.get("role", UserRole.MANAGER),
        title=current_user.get("title", ""),
        is_active=current_user.get("is_active", True),
        created_at=current_user.get("created_at"),
    )

@router.post("/forgot-password")
async def forgot_password(payload: PasswordResetRequest, db = Depends(get_db)):
    """
    Generates a secure password reset token for the given email.
    """
    normalized_email = payload.email.lower().strip()
    user = await db.users.find_one({"email": normalized_email})
    if user:
        reset_token = uuid.uuid4().hex
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=2)
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "reset_token": reset_token,
                    "reset_token_expires": expires_at.isoformat(),
                }
            }
        )
    # Always return 200 to prevent email enumeration attacks
    return {
        "status": "success",
        "message": "If an account exists with this email, password reset instructions have been dispatched.",
    }

@router.post("/reset-password")
async def reset_password(payload: PasswordResetConfirm, db = Depends(get_db)):
    """
    Applies new password using a verified reset token.
    """
    user = await db.users.find_one({"reset_token": payload.token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token.")

    expires_str = user.get("reset_token_expires")
    if expires_str:
        expires_dt = datetime.datetime.fromisoformat(expires_str)
        if datetime.datetime.now(datetime.timezone.utc) > expires_dt:
            raise HTTPException(status_code=400, detail="Password reset token has expired.")

    new_hash = hash_password(payload.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": new_hash,
                "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            },
            "$unset": {"reset_token": "", "reset_token_expires": "", "refresh_token": ""},
        }
    )
    return {"status": "success", "message": "Password successfully updated. You may now log in."}
