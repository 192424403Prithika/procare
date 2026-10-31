from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class ContractorRegisterInput(BaseModel):
    company_name: str = Field(min_length=2, max_length=255)
    contact_person: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=5, max_length=30)
    location: str = Field(min_length=2, max_length=120)
    trade: str = Field(min_length=2, max_length=120)
    accreditation_details: str = Field(min_length=2, max_length=500)

class ContractorUpdateInput(BaseModel):
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    trade: Optional[str] = None
    accreditation_details: Optional[str] = None
    availability: Optional[str] = None

class ContractorVerifyInput(BaseModel):
    verification_status: str = Field(pattern="^(Approved|Rejected|Pending Verification)$")
    admin_notes: Optional[str] = ""

class ContractorResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    company_name: str
    contact_person: str
    email: str
    phone: str
    location: str
    trade: str
    accreditation_details: str
    accreditation_verified: bool
    verification_status: str
    document_url: Optional[str] = ""
    document_path: Optional[str] = ""
    admin_notes: Optional[str] = ""
    rating: Optional[float] = None
    active_jobs: int = 0
    created_at: str
    updated_at: str
