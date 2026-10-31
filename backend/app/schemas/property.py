from typing import Optional, List
from pydantic import BaseModel, Field

class PropertyCreateInput(BaseModel):
    property_name: str = Field(min_length=2, max_length=255)
    address: str = Field(min_length=2, max_length=500)
    postal_code: str = Field(min_length=2, max_length=20)
    building_type: str = Field(default="Social Housing")
    build_year: int = Field(default=1980, ge=1800, le=2100)
    number_of_floors: int = Field(default=3, ge=1, le=100)
    pipe_type: str = Field(default="Copper")
    roof_membrane_age: int = Field(default=5, ge=0, le=100)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    description: Optional[str] = Field(default="")
    notes: Optional[str] = Field(default="")
    organization_id: Optional[str] = None
    organization: Optional[str] = Field(default="Greater Manchester Housing Trust")
    risk_level: Optional[str] = Field(default="low", pattern="^(critical|high|moderate|low)$")
    risk_score: Optional[int] = Field(default=20, ge=0, le=100)
    inspection_status: Optional[str] = Field(default="Scheduled")

class PropertyUpdateInput(BaseModel):
    property_name: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    building_type: Optional[str] = None
    build_year: Optional[int] = None
    number_of_floors: Optional[int] = None
    pipe_type: Optional[str] = None
    roof_membrane_age: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    organization: Optional[str] = None
    risk_level: Optional[str] = None
    risk_score: Optional[int] = None
    inspection_status: Optional[str] = None
    last_inspected: Optional[str] = None

class PropertyResponse(BaseModel):
    id: str
    property_name: str
    address: str
    postal_code: str
    building_type: str
    build_year: int
    number_of_floors: int
    pipe_type: str
    roof_membrane_age: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = ""
    notes: Optional[str] = ""
    organization_id: Optional[str] = None
    organization: Optional[str] = "Greater Manchester Housing Trust"
    risk_level: str
    risk_score: int
    inspection_status: str
    last_inspected: Optional[str] = "Not yet inspected"
    created_by: Optional[str] = None
    created_at: str
    updated_at: str

class PropertyRiskSummary(BaseModel):
    property_id: str
    property_name: str
    risk_level: str
    risk_score: int
    total_inspections: int
    open_work_orders: int
    dew_point_margin_c: Optional[float] = None
    last_inspected: Optional[str] = None
