from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class HourlyWeatherPoint(BaseModel):
    time: str
    temperature: float
    relative_humidity: float
    dew_point: float
    temp_to_dew_diff: float
    precipitation_probability: Optional[float] = 0.0
    condensation_risk: str

class DewPointAnalysis(BaseModel):
    magnus_dew_point: float
    api_dew_point: float
    temp_to_dew_diff: float
    condensation_risk: str
    risk_explanation: str
    disclaimer: str

class WeatherResponse(BaseModel):
    property_id: Optional[str] = None
    property_name: Optional[str] = None
    coordinates: Dict[str, float]
    current: Dict[str, Any]
    dew_point_analysis: DewPointAnalysis
    hourly: List[HourlyWeatherPoint]
    metadata: Dict[str, Any]
