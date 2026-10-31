import math
import time
import datetime
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

def calculate_magnus_dew_point(temp_c: float, relative_humidity_pct: float) -> float:
    """
    Calculates Dew Point using the Magnus-Tetens empirical equation:
    a = 17.27, b = 237.7
    alpha(T, RH) = (a * T) / (b + T) + ln(RH / 100)
    T_dew = (b * alpha) / (a - alpha)
    """
    if relative_humidity_pct <= 0:
        return temp_c - 30.0
    a = 17.27
    b = 237.7
    rh_fraction = max(0.01, min(100.0, relative_humidity_pct)) / 100.0
    alpha = ((a * temp_c) / (b + temp_c)) + math.log(rh_fraction)
    dew_point = (b * alpha) / (a - alpha)
    return round(dew_point, 2)

def evaluate_condensation_risk(temp_c: float, dew_point_c: float) -> Dict[str, str]:
    """
    Evaluates condensation risk based on surface/air temperature margin to dew point.
    """
    diff = round(temp_c - dew_point_c, 2)
    if diff <= 1.0:
        return {
            "risk": "Severe",
            "explanation": f"Critical condensation hazard ({diff:.1f}°C margin). Relative humidity is near 100% saturation. Immediate dew accumulation and spore germination risk.",
            "disclaimer": "Condensation potential is an environmental atmospheric indicator, not physical proof of concealed plumbing leaks."
        }
    elif diff <= 2.5:
        return {
            "risk": "High",
            "explanation": f"Elevated condensation likelihood ({diff:.1f}°C margin). Cold thermal bridges and uninsulated exterior wall surfaces are vulnerable.",
            "disclaimer": "Atmospheric dew-point margin represents thermodynamic risk, requiring physical surface temperature verification."
        }
    elif diff <= 4.0:
        return {
            "risk": "Elevated",
            "explanation": f"Moderate margin ({diff:.1f}°C margin). Risk remains contained unless thermal envelope or air exchange drops significantly.",
            "disclaimer": "Micro-climatic conditions within unventilated rooms may vary."
        }
    else:
        return {
            "risk": "Low",
            "explanation": f"Normal ambient buffer ({diff:.1f}°C margin). Ambient moisture is comfortably below the saturation envelope.",
            "disclaimer": "Continuous baseline monitoring recommended during cold weather spikes."
        }

async def fetch_open_meteo_weather(latitude: float, longitude: float, db=None, property_id: Optional[str] = None, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetches real hourly and current weather data from Open-Meteo, with MongoDB caching.
    """
    # 1. Check MongoDB cache if db is available
    if db is not None and property_id and not force_refresh:
        cached = await db.weather_records.find_one(
            {"property_id": property_id},
            sort=[("fetched_at", -1)]
        )
        if cached:
            # Check if cache is still fresh (< 1 hour)
            cached_time = cached.get("fetched_at")
            if isinstance(cached_time, str):
                try:
                    dt = datetime.datetime.fromisoformat(cached_time)
                    age_seconds = (datetime.datetime.now(datetime.timezone.utc) - dt).total_seconds()
                    if age_seconds < settings.WEATHER_CACHE_TTL_SECONDS:
                        cached["is_cached"] = True
                        return cached
                except Exception:
                    pass

    # 2. Call Open-Meteo API
    url = (
        f"{settings.OPEN_METEO_BASE_URL}?"
        f"latitude={latitude}&longitude={longitude}"
        f"&current=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m"
        f"&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability"
        f"&timezone=Europe/London"
        f"&forecast_days=2"
    )

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            raise RuntimeError(f"Open-Meteo API returned HTTP {resp.status_code}: {resp.text}")
        data = resp.json()

    current_data = data.get("current", {})
    hourly_data = data.get("hourly", {})

    temp_c = float(current_data.get("temperature_2m", 12.0))
    rh_pct = float(current_data.get("relative_humidity_2m", 75.0))
    api_dew_point = float(current_data.get("dew_point_2m", calculate_magnus_dew_point(temp_c, rh_pct)))
    calc_dew_point = calculate_magnus_dew_point(temp_c, rh_pct)
    diff = round(temp_c - calc_dew_point, 2)
    risk_info = evaluate_condensation_risk(temp_c, calc_dew_point)

    # Process hourly slice (first 24 hours)
    hourly_items = []
    times = hourly_data.get("time", [])[:24]
    temps = hourly_data.get("temperature_2m", [])[:24]
    rhs = hourly_data.get("relative_humidity_2m", [])[:24]
    dps = hourly_data.get("dew_point_2m", [])[:24]
    precips = hourly_data.get("precipitation_probability", [])[:24]

    for i in range(len(times)):
        t_val = float(temps[i]) if i < len(temps) else temp_c
        rh_val = float(rhs[i]) if i < len(rhs) else rh_pct
        dp_val = float(dps[i]) if i < len(dps) else calculate_magnus_dew_point(t_val, rh_val)
        t_diff = round(t_val - dp_val, 2)
        h_risk = evaluate_condensation_risk(t_val, dp_val)["risk"]
        hourly_items.append({
            "time": times[i],
            "temperature": t_val,
            "relative_humidity": rh_val,
            "dew_point": dp_val,
            "temp_to_dew_diff": t_diff,
            "precipitation_probability": float(precips[i]) if i < len(precips) else 0.0,
            "condensation_risk": h_risk,
        })

    result = {
        "property_id": property_id,
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "current": {
            "temperature": temp_c,
            "relative_humidity": rh_pct,
            "dew_point": calc_dew_point,
            "api_dew_point": api_dew_point,
            "apparent_temperature": current_data.get("apparent_temperature"),
            "precipitation": current_data.get("precipitation"),
            "wind_speed": current_data.get("wind_speed_10m"),
            "weather_code": current_data.get("weather_code"),
            "timestamp": current_data.get("time"),
        },
        "dew_point_analysis": {
            "magnus_dew_point": calc_dew_point,
            "api_dew_point": api_dew_point,
            "temp_to_dew_diff": diff,
            "condensation_risk": risk_info["risk"],
            "risk_explanation": risk_info["explanation"],
            "disclaimer": risk_info["disclaimer"],
        },
        "hourly": hourly_items,
        "metadata": {
            "source": "Open-Meteo API (WMO Weather Stations)",
            "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "is_cached": False,
        }
    }

    # Store in MongoDB weather_records
    if db is not None and property_id:
        try:
            await db.weather_records.insert_one({
                "property_id": property_id,
                "latitude": latitude,
                "longitude": longitude,
                "temperature": temp_c,
                "relative_humidity": rh_pct,
                "dew_point": calc_dew_point,
                "temp_to_dew_diff": diff,
                "condensation_risk": risk_info["risk"],
                "data": result,
                "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            })
        except Exception:
            pass

    return result
