import { NextRequest, NextResponse } from "next/server";
import { fetchPropertyById, fetchProperties } from "@/lib/services/propertyService";
import {
  fetchRealWeatherForProperty,
  fetchOpenMeteoForecast,
  calculateMagnusDewPoint,
  evaluateCondensationVulnerability,
  getWeatherDescription,
  geocodePropertyLocation,
} from "@/lib/services/weatherService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    const latParam = searchParams.get("latitude");
    const lngParam = searchParams.get("longitude");
    const forceRefresh = searchParams.get("refresh") === "true";

    // 1. Fetch by Property ID
    if (propertyId) {
      const property = await fetchPropertyById(propertyId);
      if (!property) {
        return NextResponse.json(
          { success: false, error: `Property ${propertyId} not found.` },
          { status: 404 }
        );
      }

      if (!property.latitude || !property.longitude) {
        // Attempt geocoding on the fly
        const geo = await geocodePropertyLocation(property.address, property.postal_code);
        if (!geo) {
          return NextResponse.json(
            {
              success: false,
              locationRequired: true,
              error: `Location required: Coordinates missing for ${property.property_name}. Please geocode address "${property.address}".`,
            },
            { status: 422 }
          );
        }
        property.latitude = geo.latitude;
        property.longitude = geo.longitude;
      }

      const weather = await fetchRealWeatherForProperty(property, forceRefresh);
      return NextResponse.json({ success: true, weather });
    }

    // 2. Fetch directly by coordinates
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json(
          { success: false, error: "Invalid coordinate bounds. Latitude must be between -90 and 90, Longitude between -180 and 180." },
          { status: 400 }
        );
      }

      const raw = await fetchOpenMeteoForecast(lat, lng);
      const magnus = calculateMagnusDewPoint(raw.current.temperature, raw.current.relativeHumidity);
      const apiDew = Math.round(raw.current.dewPoint * 10) / 10;
      const diff = Math.round((raw.current.temperature - apiDew) * 10) / 10;
      const { risk, explanation } = evaluateCondensationVulnerability(raw.current.temperature, apiDew);

      return NextResponse.json({
        success: true,
        weather: {
          coordinates: { latitude: lat, longitude: lng },
          current: {
            ...raw.current,
            dewPoint: apiDew,
            weatherDescription: getWeatherDescription(raw.current.weatherCode),
          },
          dewPointAnalysis: {
            magnusDewPoint: magnus,
            apiDewPoint: apiDew,
            tempToDewDiff: diff,
            condensationRisk: risk,
            riskExplanation: explanation,
            disclaimer:
              "Meteorological dew-point telemetry provides ambient microclimate context. It does not prove internal wall moisture or pipe leaks without on-site sensor verification.",
          },
          hourly: raw.hourly,
          metadata: {
            source: "Open-Meteo Weather Forecast API",
            fetchedAt: new Date().toISOString(),
            isCached: false,
          },
        },
      });
    }

    // If neither propertyId nor coordinates provided, try first enrolled property or return list
    const properties = await fetchProperties();
    if (properties.length === 0) {
      return NextResponse.json(
        { success: false, error: "No properties enrolled. Please register a property first." },
        { status: 404 }
      );
    }

    const firstProp = properties[0];
    const weather = await fetchRealWeatherForProperty(firstProp, forceRefresh);
    return NextResponse.json({ success: true, weather });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Weather service error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

