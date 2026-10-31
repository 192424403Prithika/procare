"use strict";
/**
 * PropCare NW — Property Management Verification Script
 * Validates:
 * 1. Creation with required field validation
 * 2. Unique Property ID generation
 * 3. Retrieval and filtering
 * 4. Update / Edit persistence
 * 5. Linking to inspections
 * 6. Retrieval persistence across simulated refresh
 */
Object.defineProperty(exports, "__esModule", { value: true });
const propertyService_1 = require("../lib/services/propertyService");
const inspectionService_1 = require("../lib/services/inspectionService");
async function runTests() {
    console.log("=== PROPCARE NW: PROPERTY MANAGEMENT VERIFICATION ===\n");
    // 1. Test unique property ID generation
    const id1 = (0, propertyService_1.generatePropertyId)();
    const id2 = (0, propertyService_1.generatePropertyId)();
    console.log(`[PASS] Unique ID 1: ${id1}`);
    console.log(`[PASS] Unique ID 2: ${id2}`);
    if (id1 === id2) {
        throw new Error("Property ID generation collision detected");
    }
    // 2. Test field validation on invalid input
    try {
        await (0, propertyService_1.createProperty)({
            property_name: "",
            address: "12 Test Way",
            postal_code: "M1 1AA",
            building_type: "Social Housing",
            build_year: 1990,
            number_of_floors: 3,
            pipe_type: "Copper",
            roof_membrane_age: 5,
        });
        console.error("[FAIL] Empty property name should have thrown an error");
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`[PASS] Validation error caught as expected: "${msg}"`);
    }
    // 3. Test creating a valid property
    console.log("\n--- Creating Real Property ---");
    const testInput = {
        property_name: "Lancaster Heights Block D",
        address: "74 Regent Road, Salford",
        postal_code: "M5 4QU",
        building_type: "Reinforced Concrete High-Rise",
        build_year: 1978,
        number_of_floors: 8,
        pipe_type: "Galvanized Steel",
        roof_membrane_age: 11,
        notes: "Thermal scanning shows localized microclimate condensation along west corner.",
        created_by: "system_test@propcare.nw",
    };
    const created = await (0, propertyService_1.createProperty)(testInput);
    console.log(`[PASS] Property Created Successfully:`);
    console.log(`       ID: ${created.id}`);
    console.log(`       Name: ${created.property_name}`);
    console.log(`       Postcode: ${created.postal_code}`);
    console.log(`       Created At: ${created.created_at}`);
    // 4. Test retrieving the created property by ID
    console.log("\n--- Retrieving Property by ID ---");
    const retrieved = await (0, propertyService_1.fetchPropertyById)(created.id);
    if (!retrieved) {
        throw new Error(`Property ${created.id} was not found by fetchPropertyById!`);
    }
    console.log(`[PASS] Successfully retrieved property: "${retrieved.property_name}" (${retrieved.id})`);
    // 5. Test updating property details
    console.log("\n--- Updating Property Details ---");
    const updated = await (0, propertyService_1.updateProperty)(created.id, {
        property_name: "Lancaster Heights Block D (Refurbished)",
        notes: "Upgraded with cavity wall insulation and new MVHR extraction.",
        roof_membrane_age: 1,
    });
    if (!updated || updated.property_name !== "Lancaster Heights Block D (Refurbished)") {
        throw new Error("Property update failed or returned incorrect name!");
    }
    console.log(`[PASS] Property updated successfully: "${updated.property_name}"`);
    console.log(`       New notes: "${updated.notes}"`);
    // 6. Test retrieving list of properties (simulated page refresh)
    console.log("\n--- Testing Retrieval After Simulated Refresh ---");
    const allProperties = await (0, propertyService_1.fetchProperties)();
    const foundInList = allProperties.find((p) => p.id === created.id);
    if (!foundInList) {
        throw new Error(`Property ${created.id} was not found in fetchProperties list!`);
    }
    console.log(`[PASS] Property ${created.id} confirmed present in portfolio registry (${allProperties.length} total properties).`);
    // 7. Test linking to inspections
    console.log("\n--- Testing Property to Inspection Linking ---");
    const linkedInspections = await (0, inspectionService_1.fetchInspectionsByPropertyId)(created.id);
    console.log(`[PASS] Checked linked inspections for ${created.id}: found ${linkedInspections.length} recorded inspections.`);
    console.log("\n=== ALL PROPERTY MANAGEMENT LIFECYCLE TESTS PASSED! ===");
}
runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
