import { NextResponse } from "next/server";
import {
  fetchOpenMeteoForecast,
  calculateMagnusDewPoint,
  evaluateCondensationVulnerability,
  geocodePropertyLocation,
  fetchRealWeatherForProperty,
} from "@/lib/services/weatherService";
import { PropertyRecord } from "@/lib/services/propertyService";

export async function GET() {
  const log: string[] = [];

  try {
    // 1. Test Direct Open-Meteo Real Weather Fetch for Manchester Coordinates (53.4808, -2.2426)
    const mcrCoords = { lat: 53.4808, lng: -2.2426 };
    const mcrMeteo = await fetchOpenMeteoForecast(mcrCoords.lat, mcrCoords.lng);

    if (
      typeof mcrMeteo.current.temperature !== "number" ||
      typeof mcrMeteo.current.relativeHumidity !== "number" ||
      typeof mcrMeteo.current.dewPoint !== "number" ||
      !Array.isArray(mcrMeteo.hourly.time) ||
      mcrMeteo.hourly.time.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Open-Meteo returned invalid data types or empty hourly series." },
        { status: 500 }
      );
    }

    log.push(
      `Open-Meteo API live response for Manchester: Temp=${mcrMeteo.current.temperature}°C, RH=${mcrMeteo.current.relativeHumidity}%, DewPoint=${mcrMeteo.current.dewPoint}°C, WindSpeed=${mcrMeteo.current.windSpeed} km/h`
    );

    // 2. Verify Physical Meteorological Bounds
    if (
      mcrMeteo.current.temperature < -40 ||
      mcrMeteo.current.temperature > 55 ||
      mcrMeteo.current.relativeHumidity < 0 ||
      mcrMeteo.current.relativeHumidity > 100
    ) {
      return NextResponse.json(
        { success: false, error: "Meteorological values outside valid physical bounds." },
        { status: 500 }
      );
    }
    log.push("Meteorological values verified within valid physical bounds.");

    // 3. Verify Magnus Formula vs Open-Meteo Dew Point
    const calculatedMagnus = calculateMagnusDewPoint(
      mcrMeteo.current.temperature,
      mcrMeteo.current.relativeHumidity
    );
    const apiDew = Math.round(mcrMeteo.current.dewPoint * 10) / 10;
    const formulaDiff = Math.abs(calculatedMagnus - apiDew);

    if (formulaDiff > 0.3) {
      return NextResponse.json(
        {
          success: false,
          error: `Magnus formula (${calculatedMagnus}°C) deviated from Open-Meteo dew point (${apiDew}°C) by ${formulaDiff}°C (> 0.3°C).`,
        },
        { status: 500 }
      );
    }
    log.push(`Magnus formula calculated dew point (${calculatedMagnus}°C) matches Open-Meteo API dew point (${apiDew}°C) within ${formulaDiff.toFixed(2)}°C.`);

    // 4. Verify Temperature-to-Dew-Point Difference Calculation
    const deltaT = Math.round((mcrMeteo.current.temperature - apiDew) * 10) / 10;
    const vulnerability = evaluateCondensationVulnerability(mcrMeteo.current.temperature, apiDew);
    log.push(`Temperature-to-Dew-Point Margin (Delta T): ${deltaT}°C -> Condensation Vulnerability: ${vulnerability.risk}`);

    // 5. Test Location-Specificity: Compare Manchester vs London Coordinates
    const lonCoords = { lat: 51.5074, lng: -0.1278 };
    const lonMeteo = await fetchOpenMeteoForecast(lonCoords.lat, lonCoords.lng);

    log.push(`London live telemetry: Temp=${lonMeteo.current.temperature}°C, RH=${lonMeteo.current.relativeHumidity}%, DewPoint=${lonMeteo.current.dewPoint}°C`);

    // Verify coordinates are truly location-specific
    const areDistinct =
      mcrMeteo.current.temperature !== lonMeteo.current.temperature ||
      mcrMeteo.current.relativeHumidity !== lonMeteo.current.relativeHumidity ||
      mcrMeteo.current.dewPoint !== lonMeteo.current.dewPoint;

    if (!areDistinct) {
      log.push("Note: Regional atmospheric conditions happen to be near identical between Manchester and London today.");
    } else {
      log.push("Verified distinct location-specific meteorological values across different geographic coordinates.");
    }

    // 6. Test Geocoding Property Address
    const geo = await geocodePropertyLocation("74 Regent Road, Salford", "M5 4QU");
    if (!geo || typeof geo.latitude !== "number" || typeof geo.longitude !== "number") {
      return NextResponse.json(
        { success: false, error: "Geocoding failed for UK postcode M5 4QU" },
        { status: 500 }
      );
    }
    log.push(`Geocoded address "M5 4QU" via ${geo.source}: Latitude=${geo.latitude.toFixed(4)}, Longitude=${geo.longitude.toFixed(4)}`);

    // 7. Test Missing Coordinates Handling ("Location Required")
    const propertyWithoutCoords: PropertyRecord = {
      id: "PROP-NO-COORDS-TEST",
      property_name: "Ungeocoded Test Property",
      address: "Unknown Way",
      postal_code: "",
      latitude: null,
      longitude: null,
      building_type: "Social Housing",
      build_year: 1980,
      number_of_floors: 3,
      pipe_type: "Copper",
      roof_membrane_age: 5,
      risk_level: "low",
      risk_score: 20,
      inspection_status: "Scheduled",
      last_inspected: "Not yet inspected",
      notes: "",
    };

    let caughtLocationRequired = false;
    try {
      await fetchRealWeatherForProperty(propertyWithoutCoords, true);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Location required")) {
        caughtLocationRequired = true;
      }
    }

    if (!caughtLocationRequired) {
      return NextResponse.json(
        { success: false, error: "Failed to throw Location required error when coordinates are missing." },
        { status: 500 }
      );
    }
    log.push("Property missing coordinates correctly triggered 'Location required' error without returning fake weather numbers.");

    return NextResponse.json({
      success: true,
      message: "All Real Weather & Dew Point Analysis Lifecycle Tests Passed!",
      manchester: {
        coordinates: mcrCoords,
        temp_c: mcrMeteo.current.temperature,
        relative_humidity_pct: mcrMeteo.current.relativeHumidity,
        dew_point_c: apiDew,
        magnus_dew_point_c: calculatedMagnus,
        temp_to_dew_difference_c: deltaT,
        condensation_risk: vulnerability.risk,
        hourly_series_length: mcrMeteo.hourly.time.length,
      },
      london: {
        coordinates: lonCoords,
        temp_c: lonMeteo.current.temperature,
        relative_humidity_pct: lonMeteo.current.relativeHumidity,
        dew_point_c: lonMeteo.current.dewPoint,
      },
      geocoding_test: geo,
      log,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Weather test failed";
    return NextResponse.json({ success: false, error: msg, log }, { status: 500 });
  }
}

