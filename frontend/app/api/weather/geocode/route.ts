import { NextRequest, NextResponse } from "next/server";
import { geocodePropertyLocation } from "@/lib/services/weatherService";
import { updateProperty } from "@/lib/services/propertyService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, address, postalCode } = body;

    if (!address && !postalCode) {
      return NextResponse.json(
        { success: false, error: "Address or postal code required for geocoding." },
        { status: 400 }
      );
    }

    const result = await geocodePropertyLocation(address || "", postalCode || "");
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Could not resolve geographic coordinates for the provided address." },
        { status: 404 }
      );
    }

    // If propertyId provided, save to PostgreSQL / storage
    if (propertyId) {
      try {
        await updateProperty(propertyId, {
          latitude: result.latitude,
          longitude: result.longitude,
        });
      } catch (saveErr) {
        console.warn("Could not persist geocoded coordinates to property record:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      coordinates: {
        latitude: result.latitude,
        longitude: result.longitude,
      },
      resolvedAddress: result.resolvedAddress,
      source: result.source,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Geocoding failure";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

