from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserRegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    full_name: str = Field(min_length=2, max_length=120)
    organization: Optional[str] = Field(default="PropCare NW Partner")
    title: Optional[str] = Field(default="")
    # Note: Public registration NEVER allows setting privileged roles! Role defaults strictly to 'manager' or unassigned.

class UserLoginInput(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict

class RefreshTokenInput(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8)

class CurrentUserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    organization: str
    role: str
    title: Optional[str] = ""
    is_active: bool = True
    created_at: Optional[str] = None
