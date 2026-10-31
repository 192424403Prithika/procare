from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x1: float = Field(description="Top-left X coordinate in pixels")
    y1: float = Field(description="Top-left Y coordinate in pixels")
    x2: float = Field(description="Bottom-right X coordinate in pixels")
    y2: float = Field(description="Bottom-right Y coordinate in pixels")
    width: float = Field(description="Width in pixels")
    height: float = Field(description="Height in pixels")

class DefectDetection(BaseModel):
    class_id: int = Field(description="YOLO numeric class index")
    class_name: str = Field(description="Machine-readable defect key, e.g. 'visible_mould'")
    label: str = Field(description="Human-readable defect title, e.g. 'Visible Mould-Like Growth'")
    confidence: float = Field(description="Model detection confidence between 0.0 and 1.0")
    bbox: BoundingBox = Field(description="Bounding box coordinates")
    area_percentage: float = Field(description="Estimated surface coverage relative to total frame area (%)")
    severity: str = Field(description="Defect severity: low | medium | high | critical")

class MoistureDetectRequest(BaseModel):
    inspection_id: Optional[str] = Field(default=None, description="Associated inspection identifier")
    property_id: Optional[str] = Field(default=None, description="Associated property identifier")
    image_url: Optional[str] = Field(default=None, description="Storage URL or relative path to photograph")
    image_base64: Optional[str] = Field(default=None, description="Base64 encoded image string (optional)")
    conf_threshold: Optional[float] = Field(default=None, ge=0.05, le=0.95, description="Confidence threshold override")

class MoistureDetectResponse(BaseModel):
    result_id: str = Field(description="Unique MongoDB result ID")
    inspection_id: Optional[str] = None
    property_id: Optional[str] = None
    status: str = Field(description="completed | unconfigured | failed")
    model_configured: bool = Field(description="Whether trained weights are loaded")
    model_name: str = Field(default="Ultralytics YOLO Moisture Detector")
    model_version: str = Field(default="1.0.0")
    original_image_url: str = Field(description="Reference to original inspection photo")
    annotated_image_url: Optional[str] = Field(default=None, description="Reference to annotated image with bounding boxes")
    detections: List[DefectDetection] = Field(default_factory=list)
    total_defects: int = Field(default=0)
    defect_counts: Dict[str, int] = Field(default_factory=dict)
    total_affected_area_percentage: float = Field(default=0.0)
    risk_classification: str = Field(default="low", description="low | moderate | high | critical")
    risk_score: float = Field(default=0.0, description="Composite score between 0.0 and 100.0")
    risk_rationale: List[str] = Field(default_factory=list)
    recommendation: str = Field(description="Recommended surveyor or maintenance follow-up")
    moisture_sensor_caveat: str = Field(
        default=(
            "TECHNICAL DISCLAIMER: RGB optical computer vision detects visual surface damage patterns. "
            "True substrate moisture content (H2O percentage) cannot be measured by camera optics and "
            "strictly requires physical probe calibration with a calibrated protimeter or pin-type moisture meter."
        )
    )
    message: Optional[str] = None
    timestamp: str = Field(description="ISO-8601 analysis timestamp")
    inspector_id: Optional[str] = None

class ModelStatusResponse(BaseModel):
    configured: bool = Field(description="Whether weights exist and model is ready for inference")
    model_name: str
    weights_path: str
    weights_exist: bool
    classes: List[str]
    device: str
    instructions: str
