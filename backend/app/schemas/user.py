from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    organization: str
    role: str
    title: Optional[str] = ""
    is_active: bool = True
    created_at: str

class UserUpdateInput(BaseModel):
    full_name: Optional[str] = None
    organization: Optional[str] = None
    title: Optional[str] = None

class UserRoleUpdateInput(BaseModel):
    role: str = Field(pattern="^(admin|manager|inspector|contractor)$")
