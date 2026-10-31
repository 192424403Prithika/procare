from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int

class Centroid(BaseModel):
    x: int
    y: int

class AnomalousRegion(BaseModel):
    id: int
    area_pixels: int
    area_percentage: float
    bounding_box: BoundingBox
    centroid: Centroid
    mean_intensity: float
    pattern_type: str = Field(default="surface_anomaly", description="stain | discoloration | peeling_paint | specular_sheen")
    severity: str = Field(description="critical | high | moderate | minor")

class ImageDimensions(BaseModel):
    width: int
    height: int
    channels: int

class MoistureAnalysisRequest(BaseModel):
    report_id: Optional[str] = None
    property_id: Optional[str] = None
    ambient_image: str = Field(description="Original primary inspection photograph (URL, disk path, or Base64)")
    flash_image: Optional[str] = Field(default=None, description="Optional on-axis flash photo for dual-frame specular analysis")
    sensitivity: Optional[float] = Field(default=0.5, ge=0.1, le=1.0)
    save_to_supabase: Optional[bool] = False

class MoistureAnalysisResponse(BaseModel):
    status: str = Field(description="completed | failed")
    report_id: Optional[str] = None
    is_suitable: bool = Field(default=True, description="Whether the photo meets illumination and sharpness criteria for optical evaluation")
    unsuitability_reason: Optional[str] = None
    image_dimensions: Optional[ImageDimensions] = None
    alignment_quality: float = Field(default=0.0, description="SIFT feature inlier score for dual-frame alignments")
    alignment_method: str = Field(default="Single Frame Optical Pipeline", description="SIFT Homography | Single Frame Texture & Chromatic Analysis")
    difference_percentage: float = Field(default=0.0, description="Percentage of surface with anomalous visual indicators")
    anomaly_count: int = Field(default=0, description="Number of detected anomalous regions")
    regions: List[AnomalousRegion] = []
    original_image_url: Optional[str] = None
    processed_image_base64: Optional[str] = Field(default=None, description="Normalized, contrast-equalized processed optical image")
    heatmap_base64: Optional[str] = Field(default=None, description="False-colour anomaly heatmap composite overlay")
    diff_mask_base64: Optional[str] = None
    aligned_flash_base64: Optional[str] = None
    visual_observations: List[str] = Field(default=[], description="Specific explainable visual observations (water stains, discoloration, peeling paint)")
    recommended_actions: List[str] = Field(default=[], description="Surveyor manual inspection next steps (meter probe readings, cavity check)")
    result_summary: str
    limitations: List[str] = []
    execution_time_ms: float = 0.0
    metadata: Dict[str, Any] = {}
