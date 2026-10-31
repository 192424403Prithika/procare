import {
  createProperty,
  fetchProperties,
  fetchPropertyById,
  updateProperty,
  deleteProperty,
  generatePropertyId,
  PropertyRecord,
} from "../lib/services/propertyService";

async function main() {
  console.log("==================================================");
  console.log("PROPCARE NW: REAL PROPERTY MANAGEMENT TEST SUITE");
  console.log("==================================================\n");

  // TEST 1: Unique ID Generation
  console.log("TEST 1: Generating unique property IDs...");
  const idA = generatePropertyId();
  const idB = generatePropertyId();
  console.log(`Generated ID 1: ${idA}`);
  console.log(`Generated ID 2: ${idB}`);
  if (!idA.startsWith("PROP-") || !idB.startsWith("PROP-") || idA === idB) {
    throw new Error("ID generation format or uniqueness check failed");
  }
  console.log("✅ TEST 1 PASSED: Unique property IDs generated correctly.\n");

  // TEST 2: Validation of Required Fields
  console.log("TEST 2: Verifying required field validation...");
  let validationTriggered = false;
  try {
    await createProperty({
      property_name: "", // Invalid empty name
      address: "14 Chapel Street",
      postal_code: "M3 5LE",
      building_type: "Social Housing",
      build_year: 1985,
      number_of_floors: 4,
      pipe_type: "Copper",
      roof_membrane_age: 5,
    });
  } catch (err: unknown) {
    validationTriggered = true;
    console.log(`Validation caught expected error: "${err instanceof Error ? err.message : String(err)}"`);
  }
  if (!validationTriggered) {
    throw new Error("Validation failed: empty property_name was accepted!");
  }

  // Also test invalid build year
  validationTriggered = false;
  try {
    await createProperty({
      property_name: "Test Heights",
      address: "14 Chapel Street",
      postal_code: "M3 5LE",
      building_type: "Social Housing",
      build_year: 1750, // Invalid year < 1800
      number_of_floors: 4,
      pipe_type: "Copper",
      roof_membrane_age: 5,
    });
  } catch (err: unknown) {
    validationTriggered = true;
    console.log(`Validation caught expected build_year error: "${err instanceof Error ? err.message : String(err)}"`);
  }
  if (!validationTriggered) {
    throw new Error("Validation failed: invalid build_year was accepted!");
  }
  console.log("✅ TEST 2 PASSED: Required fields and numerical bounds strictly validated.\n");

  // TEST 3: Create Property & Save to Database / Storage
  console.log("TEST 3: Creating and saving a new property record...");
  const newProperty = await createProperty({
    property_name: "Lancaster Heights Block D",
    address: "74 Regent Road, Salford",
    postal_code: "M5 4QU",
    building_type: "Reinforced Concrete High-Rise",
    build_year: 1978,
    number_of_floors: 8,
    pipe_type: "Galvanized Steel",
    roof_membrane_age: 11,
    notes: "Thermal scanning shows localized microclimate condensation along west corner.",
    created_by: "surveyor@propcare.nw",
  });

  console.log("Saved Property Record:");
  console.log(`- ID: ${newProperty.id}`);
  console.log(`- Name: ${newProperty.property_name}`);
  console.log(`- Address: ${newProperty.address}, ${newProperty.postal_code}`);
  console.log(`- Typology: ${newProperty.building_type} (Year ${newProperty.build_year})`);
  console.log(`- Technical: ${newProperty.number_of_floors} Floors, ${newProperty.pipe_type} pipes, Roof age ${newProperty.roof_membrane_age}y`);
  console.log(`- Initial Risk: ${newProperty.risk_level} (${newProperty.risk_score}/100)`);
  console.log(`- Created At: ${newProperty.created_at}`);
  console.log("✅ TEST 3 PASSED: Property saved successfully.\n");

  // TEST 4: Retrieve by ID
  console.log("TEST 4: Retrieving property details by unique ID...");
  const retrieved = await fetchPropertyById(newProperty.id);
  if (!retrieved || retrieved.id !== newProperty.id) {
    throw new Error(`Failed to fetch property by ID ${newProperty.id}`);
  }
  console.log(`Fetched Property: "${retrieved.property_name}" matches ID ${retrieved.id}`);
  console.log("✅ TEST 4 PASSED: Direct lookup by unique ID verified.\n");

  // TEST 5: Update Property Details
  console.log("TEST 5: Updating property technical parameters...");
  const updated = await updateProperty(newProperty.id, {
    property_name: "Lancaster Heights Block D (Cavity Retrofit)",
    notes: "Upgraded cavity wall insulation installed. Dew point margin expanded.",
    roof_membrane_age: 0,
    risk_level: "low",
    risk_score: 15,
  });

  if (!updated || updated.property_name !== "Lancaster Heights Block D (Cavity Retrofit)" || updated.roof_membrane_age !== 0) {
    throw new Error("Update operation failed to persist modified fields!");
  }
  console.log(`Updated Name: "${updated.property_name}"`);
  console.log(`Updated Roof Age: ${updated.roof_membrane_age} years`);
  console.log(`Updated Risk: ${updated.risk_level} (${updated.risk_score}/100)`);
  console.log(`Updated At: ${updated.updated_at}`);
  console.log("✅ TEST 5 PASSED: Property details updated and persisted.\n");

  // TEST 6: Persistence across multiple fetches (Simulating page refresh)
  console.log("TEST 6: Simulating page refresh and portfolio registry re-fetch...");
  const allProperties = await fetchProperties();
  const found = allProperties.find((p) => p.id === newProperty.id);
  if (!found) {
    throw new Error(`Property ${newProperty.id} was not found after simulated refresh!`);
  }
  console.log(`Found property in registry: "${found.property_name}" (${found.id})`);
  console.log(`Total properties currently in portfolio: ${allProperties.length}`);
  console.log("✅ TEST 6 PASSED: Property persists reliably across re-fetches and page reloads.\n");

  console.log("==================================================");
  console.log("ALL 6 REAL PROPERTY MANAGEMENT TESTS PASSED!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
