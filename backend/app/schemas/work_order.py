from typing import Optional
from pydantic import BaseModel, Field

class WorkOrderCreateInput(BaseModel):
    property_id: str
    report_id: Optional[str] = None
    contractor_id: Optional[str] = None
    contractor_name: str
    trade_type: str
    priority: str = Field(default="Urgent 7d")
    issue_description: str
    zone: str = Field(default="Primary Zone")
    cost_estimate: float = Field(default=0.0, ge=0.0)
    deadline_date: str
    notes: Optional[str] = ""

class WorkOrderUpdateInput(BaseModel):
    contractor_id: Optional[str] = None
    contractor_name: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    issue_description: Optional[str] = None
    cost_estimate: Optional[float] = None
    actual_cost: Optional[float] = None
    deadline_date: Optional[str] = None
    completed_date: Optional[str] = None
    completion_evidence: Optional[str] = None
    notes: Optional[str] = None

class WorkOrderEvidenceInput(BaseModel):
    completion_evidence_note: str = Field(min_length=2)
    evidence_image_path: Optional[str] = None

class WorkOrderResponse(BaseModel):
    id: str
    property_id: str
    property_name: Optional[str] = ""
    report_id: Optional[str] = None
    zone: str
    contractor_id: Optional[str] = None
    contractor_name: str
    trade_type: str
    priority: str
    status: str
    issue_description: str
    cost_estimate: float
    actual_cost: Optional[float] = None
    created_date: str
    deadline_date: str
    completed_date: Optional[str] = None
    completion_evidence: Optional[str] = ""
    notes: Optional[str] = ""
    created_at: str
    updated_at: str
