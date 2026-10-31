from fastapi import APIRouter, HTTPException
from typing import Optional, List
from pydantic import BaseModel, Field

from app.services.multi_defect_processing import (
    classify_multi_defect,
    MultiDefectAnalysisResponse,
)

router = APIRouter(prefix="/api/v1/analyze/multi-defect", tags=["Multi-Defect Classification"])

class MultiDefectRequest(BaseModel):
    report_id: Optional[str] = None
    property_id: Optional[str] = None
    optical_difference_pct: Optional[float] = Field(None, description="OpenCV specular difference percentage (0-100)")
    acoustic_frequency_hz: Optional[float] = Field(None, description="SciPy FFT dominant frequency in Hz")
    acoustic_anomaly_score: Optional[float] = Field(None, description="Acoustic leak probability score (0-100)")
    dew_point_margin_c: Optional[float] = Field(None, description="Temperature margin above dew point in °C")
    zone_description: str = Field("", description="Room, floor, and zone location description")
    symptom_tags: List[str] = Field(default_factory=list, description="Clinical symptom tags recorded by surveyor")
    has_image: bool = Field(True, description="Whether an inspection image was provided")
    has_audio: bool = Field(True, description="Whether an acoustic recording was provided")
    has_weather: bool = Field(True, description="Whether weather telemetry was obtained")

@router.get("/health")
def multi_defect_health():
    return {
        "status": "online",
        "service": "PropCare NW Multi-Defect Cross-Modal Analytical Engine",
        "classifications": [
            "pressurized_pipe_pinhole",
            "interstitial_condensation_biofilm",
            "rising_damp_salt_migration",
            "thermal_envelope_seal_gap",
        ],
        "compliance": "Awaab's Law Section 10A & HHSRS Category 1",
    }

@router.post("", response_model=MultiDefectAnalysisResponse)
def analyze_multi_defect(payload: MultiDefectRequest):
    try:
        response = classify_multi_defect(
            optical_diff_pct=payload.optical_difference_pct,
            acoustic_freq_hz=payload.acoustic_frequency_hz,
            acoustic_score=payload.acoustic_anomaly_score,
            dew_point_margin_c=payload.dew_point_margin_c,
            zone_description=payload.zone_description,
            symptom_tags=payload.symptom_tags,
            report_id=payload.report_id,
            property_id=payload.property_id,
            has_image=payload.has_image,
            has_audio=payload.has_audio,
            has_weather=payload.has_weather,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-defect processing failure: {str(e)}")
