from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class TriageFactor(BaseModel):
    name: str
    weight: float
    raw_value: Any
    normalized_score: float
    description: str

class RiskAssessmentInput(BaseModel):
    property_id: str
    inspection_id: Optional[str] = None
    optical_difference_pct: Optional[float] = None
    acoustic_frequency_hz: Optional[float] = None
    acoustic_score: Optional[float] = None
    dew_point_margin_c: Optional[float] = None
    build_year: Optional[int] = None
    symptoms: List[str] = Field(default_factory=list)
    inspector_notes: Optional[str] = ""

class RiskApprovalInput(BaseModel):
    review_status: str = Field(pattern="^(Approved|Requires Follow-Up|Rejected)$")
    review_notes: Optional[str] = ""

class RiskAssessmentResponse(BaseModel):
    id: str
    property_id: str
    property_name: Optional[str] = ""
    inspection_id: Optional[str] = None
    risk_category: str  # critical, high, moderate, low
    risk_score: int  # 0 - 100
    factors: List[TriageFactor]
    evidence_references: List[str]
    calculation_details: Dict[str, Any]
    recommendations: List[str]
    review_status: str  # Pending, Approved, Requires Follow-Up, Rejected
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str
    disclaimer: str
