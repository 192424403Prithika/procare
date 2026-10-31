from typing import Optional, List
from pydantic import BaseModel, Field

class InspectionImageItem(BaseModel):
    id: str
    url: str
    storage_path: str
    file_name: str
    file_size: int
    mime_type: Optional[str] = "image/jpeg"
    caption: Optional[str] = ""
    is_flash: bool = False
    created_at: str

class InspectionAudioItem(BaseModel):
    id: str
    url: str
    storage_path: str
    file_name: str
    file_size: int
    duration_seconds: Optional[float] = 0.0
    mime_type: Optional[str] = "audio/wav"
    created_at: str

class InspectionCreateInput(BaseModel):
    property_id: str
    inspector_id: Optional[str] = None
    inspector_name: Optional[str] = None
    inspection_zone: str = Field(min_length=2)
    room_name: str = Field(default="")
    floor: str = Field(default="Ground Floor")
    inspection_location: str = Field(default="")
    status: str = Field(default="Pending Review")
    symptom_tags: List[str] = Field(default_factory=list)
    notes: str = Field(default="")
    ambient_img_path: Optional[str] = None
    flash_img_path: Optional[str] = None
    audio_path: Optional[str] = None

class InspectionUpdateInput(BaseModel):
    inspection_zone: Optional[str] = None
    room_name: Optional[str] = None
    floor: Optional[str] = None
    inspection_location: Optional[str] = None
    status: Optional[str] = None
    symptom_tags: Optional[List[str]] = None
    notes: Optional[str] = None
    risk_level: Optional[str] = None
    risk_score: Optional[int] = None

class InspectionResponse(BaseModel):
    id: str
    property_id: str
    property_name: Optional[str] = ""
    property_address: Optional[str] = ""
    property_postal_code: Optional[str] = ""
    inspector_id: Optional[str] = None
    inspector_name: str = "Diagnostic Surveyor"
    inspector_email: Optional[str] = ""
    inspection_zone: str
    room_name: str
    floor: str
    inspection_location: str
    status: str
    symptom_tags: List[str]
    notes: str
    ambient_img_url: Optional[str] = ""
    ambient_img_path: Optional[str] = ""
    flash_img_url: Optional[str] = ""
    flash_img_path: Optional[str] = ""
    images: List[InspectionImageItem] = Field(default_factory=list)
    audio_url: Optional[str] = ""
    audio_path: Optional[str] = ""
    audio_duration_seconds: Optional[float] = 0.0
    audio_file_size: Optional[int] = 0
    risk_level: str = "pending"
    risk_score: int = 0
    ambient_moisture_index: Optional[float] = None
    flash_reflection_score: Optional[float] = None
    acoustic_leak_frequency_hz: Optional[float] = None
    created_at: str
    updated_at: str
