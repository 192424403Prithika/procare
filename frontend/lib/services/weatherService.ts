import { PropertyRecord, updateProperty } from "./propertyService";

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  resolvedAddress?: string;
  source: string;
}

export interface HourlyForecastItem {
  time: string;
  formattedTime: string;
  temperature: number;
  relativeHumidity: number;
  dewPoint: number;
  precipitationProbability?: number;
  tempToDewDiff: number;
  condensationRisk: "Severe" | "High" | "Elevated" | "Low";
}

export interface WeatherForecastData {
  propertyId: string;
  propertyName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  current: {
    temperature: number;
    relativeHumidity: number;
    dewPoint: number;
    apparentTemperature?: number;
    precipitation?: number;
    windSpeed?: number;
    weatherCode?: number;
    weatherDescription?: string;
    timestamp: string;
  };
  dewPointAnalysis: {
    magnusDewPoint: number;
    apiDewPoint: number;
    tempToDewDiff: number;
    condensationRisk: "Severe" | "High" | "Elevated" | "Low";
    riskExplanation: string;
    disclaimer: string;
  };
  hourly: HourlyForecastItem[];
  metadata: {
    source: string;
    fetchedAt: string;
    isCached: boolean;
  };
}

const STORAGE_PREFIX = "propcare_weather_cache_";

// Weather code mapping (WMO standard)
export function getWeatherDescription(code?: number): string {
  if (code === undefined || code === null) return "Overcast / Typical regional conditions";
  switch (code) {
    case 0:
      return "Clear sky";
    case 1:
    case 2:
    case 3:
      return "Mainly clear, partly cloudy, and overcast";
    case 45:
    case 48:
      return "Fog and depositing rime fog";
    case 51:
    case 53:
    case 55:
      return "Drizzle: light, moderate, and dense intensity";
    case 61:
    case 63:
    case 65:
      return "Rain: slight, moderate and heavy intensity";
    case 71:
    case 73:
    case 75:
      return "Snow fall: slight, moderate, and heavy intensity";
    case 80:
    case 81:
    case 82:
      return "Rain showers: slight, moderate, and violent";
    case 95:
      return "Thunderstorm: slight or moderate";
    default:
      return "Regional weather conditions";
  }
}

/**
 * Calculates Dew Point using the Magnus-Tetens formula:
 * a = 17.27, b = 237.7
 * alpha(T, RH) = (a * T) / (b + T) + ln(RH / 100)
 * T_dew = (b * alpha) / (a - alpha)
 */
export function calculateMagnusDewPoint(tempC: number, relativeHumidityPercent: number): number {
  const a = 17.27;
  const b = 237.7;
  const rhClamped = Math.max(1, Math.min(100, relativeHumidityPercent));
  const alpha = (a * tempC) / (b + tempC) + Math.log(rhClamped / 100);
  const dewPoint = (b * alpha) / (a - alpha);
  return Math.round(dewPoint * 10) / 10;
}

/**
 * Determines condensation vulnerability based on temperature-to-dew-point margin:
 * Delta T = Ambient Temperature - Dew Point
 */
export function evaluateCondensationVulnerability(
  ambientTemp: number,
  dewPoint: number
): { risk: "Severe" | "High" | "Elevated" | "Low"; explanation: string } {
  const diff = Math.round((ambientTemp - dewPoint) * 10) / 10;

  if (diff <= 1.0) {
    return {
      risk: "Severe",
      explanation:
        "Ambient air is within 1.0°C of saturation point (near 100% RH). Any wall surface or thermal bridge at or below this temperature will experience immediate surface condensation.",
    };
  } else if (diff <= 2.5) {
    return {
      risk: "High",
      explanation:
        "High moisture vulnerability. External uninsulated masonry, window reveals, and lintels are at imminent risk of dropping below dew point during night-time cooling.",
    };
  } else if (diff <= 4.5) {
    return {
      risk: "Elevated",
      explanation:
        "Moderate-to-elevated moisture saturation. Adequate background heating and ventilation are required to prevent interstitial condensation on cooler perimeter walls.",
    };
  } else {
    return {
      risk: "Low",
      explanation:
        "Substantial dew margin (> 4.5°C). Air retains sufficient moisture-carrying capacity; condensation risk on intact thermal envelopes is low.",
    };
  }
}

/**
 * Geocodes a UK or international address to latitude/longitude coordinates.
 * Tries postcodes.io first for UK postcodes, then Open-Meteo Geocoding API.
 */
export async function geocodePropertyLocation(
  address: string,
  postalCode?: string
): Promise<GeocodingResult | null> {
  // 1. UK Postcode Geocoding via postcodes.io (free, official OS data)
  if (postalCode?.trim()) {
    const cleanPostcode = postalCode.trim().replace(/\s+/g, "");
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 200 && data.result?.latitude && data.result?.longitude) {
          return {
            latitude: Number(data.result.latitude),
            longitude: Number(data.result.longitude),
            resolvedAddress: `${data.result.admin_ward || ""}, ${data.result.admin_district || ""}, ${data.result.country || "UK"}`.trim(),
            source: "postcodes.io (Ordnance Survey UK)",
          };
        }
      }
    } catch (err) {
      console.warn("postcodes.io geocoding failed, trying fallback:", err);
    }
  }

  // 2. Fallback: Open-Meteo Geocoding API
  const query = (postalCode || address).trim();
  if (query) {
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=1&language=en&format=json`;
      const res = await fetch(geoUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          return {
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
            resolvedAddress: `${item.name}, ${item.admin1 || ""}, ${item.country || ""}`.trim(),
            source: "Open-Meteo Geocoding Service",
          };
        }
      }
    } catch (err) {
      console.warn("Open-Meteo geocoding search failed:", err);
    }
  }

  return null;
}

/**
 * Fetches real weather and dew-point telemetry from Open-Meteo API for given coordinates.
 */
export async function fetchOpenMeteoForecast(
  latitude: number,
  longitude: number
): Promise<{
  current: {
    temperature: number;
    relativeHumidity: number;
    dewPoint: number;
    apparentTemperature?: number;
    precipitation?: number;
    windSpeed?: number;
    weatherCode?: number;
    timestamp: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    dew_point_2m: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
  };
}> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=2`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Open-Meteo Weather API responded with HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (!data.current || !data.hourly) {
    throw new Error("Invalid meteorological response structure returned from Open-Meteo.");
  }

  return {
    current: {
      temperature: Number(data.current.temperature_2m),
      relativeHumidity: Number(data.current.relative_humidity_2m),
      dewPoint: Number(data.current.dew_point_2m),
      apparentTemperature: data.current.apparent_temperature !== undefined ? Number(data.current.apparent_temperature) : undefined,
      precipitation: data.current.precipitation !== undefined ? Number(data.current.precipitation) : undefined,
      windSpeed: data.current.wind_speed_10m !== undefined ? Number(data.current.wind_speed_10m) : undefined,
      weatherCode: data.current.weather_code !== undefined ? Number(data.current.weather_code) : undefined,
      timestamp: String(data.current.time || new Date().toISOString()),
    },
    hourly: {
      time: Array.isArray(data.hourly.time) ? data.hourly.time : [],
      temperature_2m: Array.isArray(data.hourly.temperature_2m) ? data.hourly.temperature_2m.map(Number) : [],
      relative_humidity_2m: Array.isArray(data.hourly.relative_humidity_2m) ? data.hourly.relative_humidity_2m.map(Number) : [],
      dew_point_2m: Array.isArray(data.hourly.dew_point_2m) ? data.hourly.dew_point_2m.map(Number) : [],
      precipitation_probability: Array.isArray(data.hourly.precipitation_probability) ? data.hourly.precipitation_probability.map(Number) : undefined,
      weather_code: Array.isArray(data.hourly.weather_code) ? data.hourly.weather_code.map(Number) : undefined,
    },
  };
}

/**
 * Retrieve cached weather data from storage if available.
 */
export function getCachedWeatherForProperty(propertyId: string): WeatherForecastData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${propertyId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.current && parsed.coordinates) {
      return { ...parsed, metadata: { ...parsed.metadata, isCached: true } };
    }
  } catch {
    // Ignore cache parse error
  }
  return null;
}

/**
 * Save weather result to property cache.
 */
export function cacheWeatherForProperty(data: WeatherForecastData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${data.propertyId}`, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to cache weather data for property", err);
  }
}

/**
 * Main service method: Fetches real weather and dew-point analysis for a property.
 * If coordinates are missing, attempts geocoding and updates property.
 * If coordinates cannot be obtained, throws Error requiring location.
 */
export async function fetchRealWeatherForProperty(
  property: PropertyRecord,
  forceRefresh: boolean = false
): Promise<WeatherForecastData> {
  // Check cache first if not forcing refresh
  if (!forceRefresh) {
    const cached = getCachedWeatherForProperty(property.id);
    if (cached) {
      return cached;
    }
  }

  let lat = property.latitude;
  let lng = property.longitude;

  // 1. If coordinates are missing or zero, attempt automatic geocoding
  if (!lat || !lng || (lat === 0 && lng === 0)) {
    const geo = await geocodePropertyLocation(property.address, property.postal_code);
    if (geo) {
      lat = geo.latitude;
      lng = geo.longitude;
      // Persist the resolved coordinates to the property record
      try {
        await updateProperty(property.id, { latitude: lat, longitude: lng });
      } catch (saveErr) {
        console.warn("Could not persist geocoded coordinates to property record:", saveErr);
      }
    } else {
      throw new Error(
        `Location required: Coordinates (latitude/longitude) are missing for ${property.property_name}. Please geocode or add coordinates for address "${property.address}, ${property.postal_code}".`
      );
    }
  }

  // 2. Fetch real weather data from Open-Meteo
  const rawMeteo = await fetchOpenMeteoForecast(lat, lng);

  // 3. Calculate Dew Point using Magnus Formula & API value
  const magnusDewPoint = calculateMagnusDewPoint(rawMeteo.current.temperature, rawMeteo.current.relativeHumidity);
  const apiDewPoint = Math.round(rawMeteo.current.dewPoint * 10) / 10;
  const tempToDewDiff = Math.round((rawMeteo.current.temperature - apiDewPoint) * 10) / 10;
  const { risk, explanation } = evaluateCondensationVulnerability(rawMeteo.current.temperature, apiDewPoint);

  // 4. Construct Hourly 24h Horizon
  const hourlyItems: HourlyForecastItem[] = [];
  const maxHours = Math.min(24, rawMeteo.hourly.time.length);
  for (let i = 0; i < maxHours; i++) {
    const timeIso = rawMeteo.hourly.time[i];
    const temp = rawMeteo.hourly.temperature_2m[i];
    const rh = rawMeteo.hourly.relative_humidity_2m[i];
    const dp = rawMeteo.hourly.dew_point_2m[i];
    const diff = Math.round((temp - dp) * 10) / 10;
    const { risk: hourRisk } = evaluateCondensationVulnerability(temp, dp);

    const dateObj = new Date(timeIso);
    const formattedTime = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : timeIso.substring(11, 16) || timeIso;

    hourlyItems.push({
      time: timeIso,
      formattedTime,
      temperature: temp,
      relativeHumidity: rh,
      dewPoint: dp,
      precipitationProbability: rawMeteo.hourly.precipitation_probability?.[i],
      tempToDewDiff: diff,
      condensationRisk: hourRisk,
    });
  }

  const result: WeatherForecastData = {
    propertyId: property.id,
    propertyName: property.property_name,
    coordinates: {
      latitude: lat,
      longitude: lng,
    },
    current: {
      temperature: rawMeteo.current.temperature,
      relativeHumidity: rawMeteo.current.relativeHumidity,
      dewPoint: apiDewPoint,
      apparentTemperature: rawMeteo.current.apparentTemperature,
      precipitation: rawMeteo.current.precipitation,
      windSpeed: rawMeteo.current.windSpeed,
      weatherCode: rawMeteo.current.weatherCode,
      weatherDescription: getWeatherDescription(rawMeteo.current.weatherCode),
      timestamp: rawMeteo.current.timestamp,
    },
    dewPointAnalysis: {
      magnusDewPoint,
      apiDewPoint,
      tempToDewDiff,
      condensationRisk: risk,
      riskExplanation: explanation,
      disclaimer:
        "Meteorological dew-point telemetry provides ambient microclimate context. It does not prove internal wall moisture, pipe leakage, or biological mould growth without on-site diagnostic measurement.",
    },
    hourly: hourlyItems,
    metadata: {
      source: "Open-Meteo Weather Forecast API",
      fetchedAt: new Date().toISOString(),
      isCached: false,
    },
  };

  // Cache for instant reload
  cacheWeatherForProperty(result);

  return result;
}

