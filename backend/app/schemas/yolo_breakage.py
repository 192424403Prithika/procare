from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BreakageBoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left X coordinate in pixels")
    y1: float = Field(..., description="Top-left Y coordinate in pixels")
    x2: float = Field(..., description="Bottom-right X coordinate in pixels")
    y2: float = Field(..., description="Bottom-right Y coordinate in pixels")
    width: float = Field(..., description="Bounding box width in pixels")
    height: float = Field(..., description="Bounding box height in pixels")

class BreakageDefectDetection(BaseModel):
    class_id: int = Field(..., description="Integer class identifier (0-11)")
    class_name: str = Field(..., description="Standardized snake_case defect category key")
    label: str = Field(..., description="Human-readable defect title")
    confidence: float = Field(..., description="YOLO model detection confidence (0.0 - 1.0)")
    bbox: BreakageBoundingBox = Field(..., description="Localized spatial coordinates")
    area_percentage: float = Field(..., description="Damage bounding box area relative to total image surface (0.0 - 100.0%)")
    damage_type: str = Field(default="cosmetic", description="'cosmetic' surface damage or 'structural' suspected damage")
    severity: str = Field(default="moderate", description="Calculated defect severity: minor, moderate, major, critical")

class BreakageDetectRequest(BaseModel):
    inspection_id: Optional[str] = Field(default=None, description="Optional target inspection ID")
    property_id: Optional[str] = Field(default=None, description="Optional target property ID")
    image_url: Optional[str] = Field(default=None, description="Direct URL to existing inspection image")
    conf_threshold: Optional[float] = Field(default=None, description="Override confidence threshold")

class BreakageDetectResponse(BaseModel):
    result_id: str = Field(..., description="Unique breakage analysis result ID")
    inspection_id: Optional[str] = Field(default=None, description="Associated inspection ID")
    property_id: Optional[str] = Field(default=None, description="Associated property ID")
    status: str = Field(default="completed", description="'completed', 'unconfigured', or 'failed'")
    model_configured: bool = Field(..., description="Whether real trained YOLO breakage weights are active")
    model_name: str = Field(default="Ultralytics YOLO Structural Breakage Detector")
    model_version: str = Field(default="1.0.0")
    original_image_url: str = Field(..., description="URL to raw inspection photograph")
    annotated_image_url: Optional[str] = Field(default=None, description="URL to OpenCV annotated image with bounding boxes")
    detections: List[BreakageDefectDetection] = Field(default_factory=list, description="Localized damage detections")
    total_defects: int = Field(default=0, description="Total count of damage areas detected")
    defect_counts: Dict[str, int] = Field(default_factory=dict, description="Count breakdown by defect class")
    structural_defect_count: int = Field(default=0, description="Count of suspected structural fractures, spalling, or masonry damage")
    cosmetic_defect_count: int = Field(default=0, description="Count of cosmetic surface cracks or broken tiles")
    total_affected_area_percentage: float = Field(default=0.0, description="Aggregate damaged surface area percentage")
    severity_classification: str = Field(default="minor", description="'minor', 'moderate', 'major', or 'critical'")
    severity_score: float = Field(default=0.0, description="Explainable severity index (0.0 - 100.0)")
    severity_rationale: List[str] = Field(default_factory=list, description="Rule-based pathology explanation")
    recommendation: str = Field(default="", description="Recommended engineering or maintenance triage action")
    structural_engineer_required: bool = Field(default=False, description="Flag indicating urgent qualified structural engineer assessment needed")
    disclaimer: str = Field(
        default="AI image analysis identifies visible damage indicators. It does not establish structural integrity or determine whether a building is safe. Major or critical findings require assessment by a qualified structural engineer."
    )
    timestamp: str = Field(..., description="ISO 8601 UTC analysis timestamp")
    inspector_id: Optional[str] = Field(default=None, description="ID of surveyor who initiated analysis")
    message: Optional[str] = Field(default=None, description="Optional diagnostic or unconfigured status notice")

class BreakageModelStatusResponse(BaseModel):
    configured: bool = Field(..., description="True if trained breakage weights are loaded and active")
    model_name: str = Field(default="Ultralytics YOLO Structural Breakage Detector")
    weights_path: str = Field(..., description="Configured file path for weights")
    weights_exist: bool = Field(..., description="True if weights file exists on disk")
    classes: List[str] = Field(default_factory=list, description="List of supported defect classes")
    device: str = Field(default="cpu", description="Execution device (cpu or cuda)")
    instructions: str = Field(..., description="Setup or weights placement instructions")

class CombinedInspectionAnalysisResponse(BaseModel):
    inspection_id: str = Field(..., description="Inspection identifier")
    property_id: str = Field(..., description="Property identifier")
    moisture_findings: Optional[Dict[str, Any]] = Field(default=None, description="Latest moisture YOLO analysis findings")
    breakage_findings: Optional[Dict[str, Any]] = Field(default=None, description="Latest structural breakage YOLO analysis findings")
    combined_defect_count: int = Field(default=0, description="Total defect count across both modalities")
    highest_severity: str = Field(default="low", description="Highest severity classification across moisture and breakage")
    combined_recommendation: str = Field(default="", description="Unified pathology and remediation recommendation")
    timestamp: str = Field(..., description="Report generation timestamp")
