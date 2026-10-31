from typing import Optional, List
from pydantic import BaseModel, Field

class ReportGenerateInput(BaseModel):
    property_id: str
    inspection_id: Optional[str] = None
    report_type: str = Field(default="Executive Summary")  # 'Executive Summary', 'Technical Dossier', 'Awaab Compliance'

class ReportResponse(BaseModel):
    id: str
    property_id: str
    property_name: str
    inspection_id: Optional[str] = None
    report_type: str
    title: str
    file_path: str
    download_url: str
    file_size_bytes: int
    generated_by: str
    generated_at: str

class NotificationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    message: str
    type: str  # 'critical', 'warning', 'success', 'info'
    is_read: bool
    link: Optional[str] = None
    action_text: Optional[str] = None
    created_at: str

class NotificationCreateInput(BaseModel):
    user_id: Optional[str] = None
    title: str
    message: str
    type: str = "info"
    link: Optional[str] = None
    action_text: Optional[str] = None
