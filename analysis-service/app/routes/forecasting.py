from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel, Field

from app.services.forecasting import (
    compute_property_forecast,
    PropertyForecastResponse,
)

router = APIRouter(prefix="/api/v1/forecast", tags=["Predictive Maintenance Forecasting"])

class PropertyForecastRequest(BaseModel):
    property_id: str
    property_name: str
    construction_year: int = Field(1974, description="Year built")
    building_type: str = Field("Multi-Storey Social Housing", description="Structural archetype")
    pipe_type: str = Field("Copper", description="Plumbing material (Copper, Lead, Iron, PEX)")
    roof_age_years: int = Field(8, description="Age of roof waterproofing membrane in years")
    current_risk_score: int = Field(40, description="Current baseline risk score (0-100)")
    dew_point_margin_c: float = Field(2.0, description="Temperature margin to dew point")
    has_acoustic_anomaly: bool = Field(False, description="Whether active fluid acoustic resonance was detected")

@router.get("/health")
def forecasting_engine_health():
    return {
        "status": "online",
        "service": "PropCare NW Weibull Reliability & Psychrometric Degradation Engine",
        "model": "Weibull Hazard & Magnus-Tetens Condensation Coupling",
    }

@router.post("/property", response_model=PropertyForecastResponse)
def get_property_forecast(payload: PropertyForecastRequest):
    try:
        response = compute_property_forecast(
            property_id=payload.property_id,
            property_name=payload.property_name,
            construction_year=payload.construction_year,
            building_type=payload.building_type,
            pipe_type=payload.pipe_type,
            roof_age_years=payload.roof_age_years,
            current_risk_score=payload.current_risk_score,
            dew_point_margin_c=payload.dew_point_margin_c,
            has_acoustic_anomaly=payload.has_acoustic_anomaly,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting engine error: {str(e)}")
