from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId

from app.core.database import get_db
from app.services.weather_service import fetch_open_meteo_weather
from app.schemas.weather import WeatherResponse

router = APIRouter(prefix="/api/v1/weather", tags=["Weather Intelligence"])

@router.get("", response_model=WeatherResponse)
async def get_weather(
    property_id: Optional[str] = Query(None, description="Property ID to look up coordinates"),
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0),
    refresh: bool = Query(False, description="Force refresh from Open-Meteo API"),
    db = Depends(get_db),
):
    """
    Fetches real-time psychrometric weather telemetry from Open-Meteo.
    Calculates Magnus-Tetens dew point and evaluates condensation risk.
    """
    prop_name = None
    lat = latitude
    lng = longitude

    # 1. If property_id is provided, retrieve its actual latitude & longitude
    if property_id:
        query = {"_id": ObjectId(property_id)} if ObjectId.is_valid(property_id) else {"_id": property_id}
        prop = await db.properties.find_one(query)
        if not prop:
            prop = await db.properties.find_one({"id": property_id})
        if not prop:
            raise HTTPException(status_code=404, detail=f"Property '{property_id}' not found.")

        prop_name = prop.get("property_name")
        if prop.get("latitude") is not None and prop.get("longitude") is not None:
            lat = float(prop["latitude"])
            lng = float(prop["longitude"])
        elif lat is None or lng is None:
            # Fallback to Greater Manchester regional coordinates if property has unassigned coords
            lat = 53.4808
            lng = -2.2426

    if lat is None or lng is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either property_id or both latitude and longitude must be provided.",
        )

    try:
        data = await fetch_open_meteo_weather(
            latitude=lat,
            longitude=lng,
            db=db,
            property_id=property_id,
            force_refresh=refresh,
        )
        if prop_name:
            data["property_name"] = prop_name
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Open-Meteo weather intelligence query failure: {str(e)}",
        )
