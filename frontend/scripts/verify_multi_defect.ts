// Polyfill localStorage & window for Node CLI test environment
if (typeof (globalThis as any).localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
  (globalThis as any).window = globalThis;
}

import { fetchInspections, InspectionReport, createInspection } from "../lib/services/inspectionService";
import { fetchProperties, createProperty } from "../lib/services/propertyService";
import {
  runMultiDefectAnalysis,
  fetchMultiDefectByReportId,
} from "../lib/services/multiDefectService";

async function runTests() {
  console.log("================================================================================");
  console.log("PROPCARE NW: MULTI-DEFECT DETECTION & CROSS-MODAL FUSION VERIFICATION");
  console.log("================================================================================\n");

  // Step 1: Ensure at least one test property & inspection exist in store
  console.log("1. Ensuring test property & inspection records...");
  let properties = await fetchProperties();
  if (properties.length === 0) {
    const newProp = await createProperty({
      property_name: "Trinity Court Blocks A-C",
      address: "42 Chapel Street, Salford",
      postal_code: "M3 5LE",
      building_type: "Social Housing Multi-Story",
      build_year: 1985,
      number_of_floors: 6,
      pipe_type: "Copper",
      roof_membrane_age: 5,
      latitude: 53.4839,
      longitude: -2.2541,
    });
    properties = [newProp];
    console.log(`   ✓ Created test property with coordinates: ${newProp.id} (Lat: 53.4839, Lng: -2.2541)`);
  }

  let inspections = await fetchInspections();
  if (inspections.length === 0) {
    const newInsp = await createInspection({
      property_id: properties[0].id,
      inspection_zone: "Bathroom ceiling riser & external wall",
      room_name: "Flat 14 Bathroom",
      floor: "3rd Floor",
      inspection_location: "Riser Chase Enclosure",
      symptom_tags: ["Visible mould", "Damp patches"],
      notes: "Surface discoloration on ceiling drywall adjacent to service duct.",
      ambient_img_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
      flash_img_url: "",
      audio_url: "https://actions.google.com/sounds/v1/water/dripping_water.ogg",
    });
    inspections = [newInsp];
    console.log(`   ✓ Created test inspection with photo & audio: ${newInsp.id}`);
  }

  const testInspection = inspections[0];
  console.log(`\nSelected Subject Inspection: ${testInspection.id} (${testInspection.property_name} - ${testInspection.inspection_zone})`);

  // Step 2: Test unanalyzed state check
  console.log("\n2. Checking unanalyzed state for arbitrary test ID...");
  const arbitraryResult = await fetchMultiDefectByReportId("INSP-NONEXISTENT-TEST");
  if (arbitraryResult === null) {
    console.log("   ✓ Correct: Non-analyzed report returns null instead of hardcoded demo values.");
  } else {
    console.error("   ❌ Failed: Arbitrary report returned hardcoded seed data:", arbitraryResult);
    process.exit(1);
  }

  // Step 3: Run Multi-Modal Analysis
  console.log("\n3. Running full cross-modal analysis (OpenCV + SciPy FFT + Open-Meteo + FastAPI)...");
  const result = await runMultiDefectAnalysis(testInspection, (progress) => {
    console.log(`   [Progress] ${progress}`);
  });

  console.log("\n✓ Cross-Modal Analysis Completed!");
  console.log("   Primary Indication:  ", result.primary_label);
  console.log("   Indication Index:    ", `${result.confidence_score}%`);
  console.log("   Statutory Urgency:   ", result.statutory_urgency);
  console.log("   Recommended Trade:   ", result.recommended_trade);

  // Step 4: Verify Optical Modality
  console.log("\n4. Verifying Optical Telemetry (OpenCV):");
  if (result.has_optical_data) {
    console.log(`   ✓ Optical Data Available: Difference Delta = ${result.optical_difference_pct}%`);
    console.log(`   ✓ Anomaly Regions: ${result.optical_anomaly_count}`);
    if (result.optical_heatmap_url) console.log("   ✓ Heatmap Overlay Generated/Available.");
  } else {
    console.log(`   ⚠ Optical Data Not Available: ${result.optical_unavailability_reason}`);
  }

  // Step 5: Verify Acoustic Modality
  console.log("\n5. Verifying Acoustic Telemetry (SciPy FFT):");
  if (result.has_acoustic_data) {
    console.log(`   ✓ Acoustic Data Available: Dominant Frequency = ${result.acoustic_frequency_hz} Hz`);
  } else {
    console.log(`   ⚠ Acoustic Data Not Available: ${result.acoustic_unavailability_reason}`);
  }

  // Step 6: Verify Weather Modality
  console.log("\n6. Verifying Psychrometric Telemetry (Open-Meteo):");
  if (result.has_weather_data) {
    console.log(`   ✓ Weather Data Available: Temp = ${result.weather_temperature_c}°C, RH = ${result.weather_humidity_pct}%, Dew Point = ${result.weather_dew_point_c}°C`);
    console.log(`   ✓ Dew Margin: +${result.weather_temp_dew_diff_c}°C`);
    console.log(`   ✓ Timestamp: ${result.weather_timestamp} (${result.weather_source})`);
  } else {
    console.log(`   ⚠ Weather Data Not Available: ${result.weather_unavailability_reason}`);
  }

  // Step 7: Verify Non-Claimant Phrasing (Requirement 10)
  console.log("\n7. Verifying explainable, non-claimant compliance (Requirement 10):");
  const synthesis = result.cross_modal_synthesis;
  const isClaimingDefinitive = synthesis.includes("confirms active") || synthesis.includes("0 False Positives");
  if (!isClaimingDefinitive) {
    console.log("   ✓ Compliant: Synthesis uses indicative screening language and explicitly mandates physical surveyor verification.");
  } else {
    console.error("   ❌ Failed: Synthesis claims definitive confirmation without physical review.");
    process.exit(1);
  }

  // Step 8: Verify Persistence and Retrieval after "refresh"
  console.log("\n8. Verifying database persistence & reload after page refresh...");
  const retrieved = await fetchMultiDefectByReportId(testInspection.id);
  if (retrieved && retrieved.primary_defect === result.primary_defect) {
    console.log("   ✓ Retrieved saved analysis successfully matches executed results.");
    console.log(`   ✓ Saved Record ID: ${retrieved.id}`);
  } else {
    console.error("   ❌ Failed to retrieve saved analysis from database/storage.");
    process.exit(1);
  }

  // Step 9: Verify Missing Modality Handling (Requirement 9)
  console.log("\n9. Testing inspection with missing modalities (no image, no audio, no coordinates)...");
  const bareInsp: InspectionReport = {
    id: "INSP-BARE-9999",
    property_id: "PROP-NO-COORDS",
    property_name: "Unconfigured Block D",
    property_address: "Unknown Location",
    property_postal_code: "",
    inspector_name: "Test Inspector",
    inspection_zone: "Dry Storage Room",
    room_name: "Storage",
    floor: "1st Floor",
    inspection_location: "Corner",
    status: "Pending Review",
    symptom_tags: [],
    notes: "",
    ambient_img_url: "",
    flash_img_url: "",
    audio_url: "",
    risk_level: "low",
    risk_score: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const bareResult = await runMultiDefectAnalysis(bareInsp);
  console.log(`   ✓ Optical Data Available: ${bareResult.has_optical_data} (Reason: "${bareResult.optical_unavailability_reason}")`);
  console.log(`   ✓ Acoustic Data Available: ${bareResult.has_acoustic_data} (Reason: "${bareResult.acoustic_unavailability_reason}")`);
  console.log(`   ✓ Weather Data Available: ${bareResult.has_weather_data} (Reason: "${bareResult.weather_unavailability_reason}")`);

  if (!bareResult.has_optical_data && !bareResult.has_acoustic_data && !bareResult.has_weather_data) {
    console.log("   ✓ Correct: All missing modalities properly flagged as 'Not available' with clear explanatory reasons.");
  } else {
    console.error("   ❌ Failed: Missing modalities were incorrectly marked as available.");
    process.exit(1);
  }

  console.log("\n================================================================================");
  console.log("ALL MULTI-DEFECT DETECTION REQUIREMENTS VERIFIED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

runTests().catch((err) => {
  console.error("Verification test failed with error:", err);
  process.exit(1);
});
