import { NextResponse } from "next/server";
import {
  createProperty,
  fetchProperties,
  fetchPropertyById,
  updateProperty,
  deleteProperty,
  generatePropertyId,
} from "@/lib/services/propertyService";
import { fetchInspectionsByPropertyId } from "@/lib/services/inspectionService";

export async function GET() {
  const log: string[] = [];

  try {
    // 1. Generate unique property IDs
    const id1 = generatePropertyId();
    const id2 = generatePropertyId();
    if (!id1.startsWith("PROP-") || !id2.startsWith("PROP-") || id1 === id2) {
      return NextResponse.json({ success: false, error: "Unique ID generation failed" }, { status: 500 });
    }
    log.push(`Generated unique property IDs: ${id1}, ${id2}`);

    // 2. Validate required fields
    let validationPassed = false;
    try {
      await createProperty({
        property_name: "", // empty should fail
        address: "14 Chapel Street",
        postal_code: "M3 5LE",
        building_type: "Social Housing",
        build_year: 1985,
        number_of_floors: 4,
        pipe_type: "Copper",
        roof_membrane_age: 5,
      });
    } catch {
      validationPassed = true;
      log.push("Field validation successfully rejected empty property name");
    }

    if (!validationPassed) {
      return NextResponse.json({ success: false, error: "Validation failed to reject empty property_name" }, { status: 400 });
    }

    // 3. Create a real property
    const created = await createProperty({
      property_name: "Lancaster Heights Block D",
      address: "74 Regent Road, Salford",
      postal_code: "M5 4QU",
      building_type: "Reinforced Concrete High-Rise",
      build_year: 1978,
      number_of_floors: 8,
      pipe_type: "Galvanized Steel",
      roof_membrane_age: 11,
      notes: "Thermal scanning shows localized microclimate condensation along west corner.",
      created_by: "system_verification@propcare.nw",
    });
    log.push(`Created property: ${created.property_name} with unique ID: ${created.id}`);

    // 4. Retrieve by ID
    const retrieved = await fetchPropertyById(created.id);
    if (!retrieved || retrieved.id !== created.id) {
      return NextResponse.json({ success: false, error: `fetchPropertyById failed for ID ${created.id}` }, { status: 500 });
    }
    log.push(`Retrieved property by ID: ${retrieved.id}`);

    // 5. Update property
    const updated = await updateProperty(created.id, {
      property_name: "Lancaster Heights Block D (Cavity Retrofit)",
      roof_membrane_age: 0,
      notes: "New membrane installed. 100% weather-sealed.",
    });

    if (!updated || updated.property_name !== "Lancaster Heights Block D (Cavity Retrofit)") {
      return NextResponse.json({ success: false, error: "updateProperty failed to update property_name" }, { status: 500 });
    }
    log.push(`Updated property: ${updated.property_name}, roof age: ${updated.roof_membrane_age}y`);

    // 6. Check retrieval across multiple fetches (simulated refresh)
    const all = await fetchProperties();
    const found = all.find((p) => p.id === created.id);
    if (!found) {
      return NextResponse.json({ success: false, error: "Property not found in all properties after refresh" }, { status: 500 });
    }
    log.push(`Verified property exists in portfolio registry (${all.length} total properties)`);

    // 7. Check linked inspections
    const inspections = await fetchInspectionsByPropertyId(created.id);
    log.push(`Checked linked inspections: ${inspections.length} inspections linked to ${created.id}`);

    return NextResponse.json({
      success: true,
      message: "All Property Management Lifecycle Tests Passed!",
      test_property: updated,
      log,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      log,
    }, { status: 500 });
  }
}

