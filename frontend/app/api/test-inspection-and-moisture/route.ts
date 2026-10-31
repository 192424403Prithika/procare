import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  createInspection,
  fetchInspections,
  fetchInspectionById,
  validateImageFile,
} from "@/lib/services/inspectionService";
import { fetchProperties, createProperty } from "@/lib/services/propertyService";
import {
  executeMoistureAnalysis,
  fetchAnalysisByReportId,
} from "@/lib/services/moistureAnalysisService";

export async function GET() {
  const log: string[] = [];

  try {
    // Step 1: Ensure an existing property exists to link the inspection to
    let properties = await fetchProperties();
    if (properties.length === 0) {
      const newProp = await createProperty({
        property_name: "Lancaster Heights Block D",
        address: "74 Regent Road, Salford",
        postal_code: "M5 4QU",
        building_type: "Reinforced Concrete High-Rise",
        build_year: 1978,
        number_of_floors: 8,
        pipe_type: "Galvanized Steel",
        roof_membrane_age: 11,
        notes: "Thermal scanning shows localized microclimate condensation along west corner.",
      });
      properties = [newProp];
      log.push(`Auto-enrolled property for inspection linkage: ${newProp.property_name} (${newProp.id})`);
    }

    const testProperty = properties[0];
    log.push(`Selected existing property: ${testProperty.property_name} (${testProperty.id})`);

    // Step 2: Validate file formats (accept JPEG, PNG, WebP; reject disallowed)
    const validFile = new File([new Uint8Array(100)], "wall_scan.jpg", { type: "image/jpeg" });
    const invalidFile = new File([new Uint8Array(100)], "malicious_script.exe", { type: "application/x-msdownload" });
    const oversizeFile = new File([new Uint8Array(25 * 1024 * 1024)], "oversized.jpg", { type: "image/jpeg" });

    const valValid = validateImageFile(validFile);
    const valInvalid = validateImageFile(invalidFile);
    const valOversize = validateImageFile(oversizeFile);

    if (!valValid.valid || valInvalid.valid || valOversize.valid) {
      return NextResponse.json(
        { success: false, error: "Validation logic failed to enforce image formats and size bounds." },
        { status: 400 }
      );
    }
    log.push("File validation correctly accepted JPEG and rejected disallowed executable / oversized files.");

    // Step 3: Test Real Image Storage Upload to private bucket inspection-images
    // Use the actual test photograph from public folder
    const sampleImagePath = path.join(process.cwd(), "public", "test_ambient.jpg");
    if (!fs.existsSync(sampleImagePath)) {
      return NextResponse.json(
        { success: false, error: "Test image public/test_ambient.jpg does not exist." },
        { status: 500 }
      );
    }
    const imageBytes = fs.readFileSync(sampleImagePath);
    const imageBlob = new Blob([imageBytes], { type: "image/jpeg" });
    const uploadForm = new FormData();
    uploadForm.append("file", imageBlob, "test_ambient.jpg");
    uploadForm.append("bucket", "inspection-images");
    uploadForm.append("propertyId", testProperty.id);

    const uploadRes = await fetch("http://localhost:3000/api/storage/upload", {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json(
        { success: false, error: `Upload to /api/storage/upload failed: ${errText}` },
        { status: 500 }
      );
    }

    const uploadData = await uploadRes.json();
    if (!uploadData.success || !uploadData.storagePath || !uploadData.signedUrl) {
      return NextResponse.json(
        { success: false, error: "Upload response missing signedUrl or storagePath" },
        { status: 500 }
      );
    }
    log.push(`Uploaded photograph to private bucket [${uploadData.bucket}]. Storage path: ${uploadData.storagePath}`);
    log.push(`Generated secure signed URL: ${uploadData.signedUrl.substring(0, 80)}...`);

    // Step 4: Verify retrieval using the signed URL
    const fetchSignedRes = await fetch(uploadData.signedUrl);
    if (!fetchSignedRes.ok) {
      return NextResponse.json(
        { success: false, error: `Fetching signed URL returned status ${fetchSignedRes.status}` },
        { status: 500 }
      );
    }
    const retrievedBytes = await fetchSignedRes.arrayBuffer();
    if (retrievedBytes.byteLength !== imageBytes.length) {
      return NextResponse.json(
        { success: false, error: "Retrieved image bytes length does not match original photograph." },
        { status: 500 }
      );
    }
    log.push(`Successfully retrieved original image using secure signed URL (${retrievedBytes.byteLength} bytes).`);

    // Step 5: Save actual inspection record linking to the property in PostgreSQL / persistent store
    const createdInspection = await createInspection({
      property_id: testProperty.id,
      inspector_id: null,
      inspector_name: "Eleanor Vance, MRICS",
      inspector_email: "e.vance@propcare.nw",
      inspection_zone: "External Bathroom Wall & Cavity Junction",
      room_name: "Master Suite Bathroom",
      floor: "Floor 2",
      inspection_location: "Behind bath panel and extractor ducting",
      symptom_tags: ["Damp patches", "Musty odour", "Peeling plaster"],
      notes: "Surface discoloration observed along lower skirting. Substrate cold to touch.",
      ambient_img_url: uploadData.signedUrl,
      ambient_img_path: uploadData.storagePath,
      flash_img_url: "",
      flash_img_path: "",
      audio_url: "",
      audio_path: "",
    });

    log.push(`Saved real inspection record: ${createdInspection.id} linked to property ${testProperty.id}`);

    // Step 6: Verify retrieval and refresh persistence
    const retrievedInspection = await fetchInspectionById(createdInspection.id);
    if (!retrievedInspection || retrievedInspection.id !== createdInspection.id) {
      return NextResponse.json(
        { success: false, error: `fetchInspectionById failed for ID ${createdInspection.id}` },
        { status: 500 }
      );
    }
    if (!retrievedInspection.ambient_img_url || !retrievedInspection.ambient_img_path) {
      return NextResponse.json(
        { success: false, error: "Retrieved inspection missing signed URL or storage path." },
        { status: 500 }
      );
    }
    log.push(`Retrieved inspection after refresh with fresh signed URL: ${retrievedInspection.ambient_img_path}`);

    // Step 7: Execute Real OpenCV Moisture Anomaly Analysis via FastAPI
    log.push("Executing OpenCV Moisture Anomaly Analysis on uploaded photograph via FastAPI...");
    const analysisResult = await executeMoistureAnalysis(retrievedInspection, 0.5);

    if (analysisResult.processing_status !== "completed") {
      return NextResponse.json(
        { success: false, error: `Analysis failed: ${analysisResult.unsuitability_reason}` },
        { status: 500 }
      );
    }

    if (!analysisResult.heatmap_url || !analysisResult.processed_image_url) {
      return NextResponse.json(
        { success: false, error: "Analysis result missing processed image or anomaly heatmap." },
        { status: 500 }
      );
    }

    log.push(`OpenCV Analysis Completed in ${analysisResult.execution_time_ms}ms.`);
    log.push(`Anomaly Surface Coverage: ${analysisResult.difference_percentage}%, Connected Clusters: ${analysisResult.anomaly_count}`);
    log.push(`Identified Visual Observations: ${analysisResult.visual_observations.join(" | ")}`);
    log.push(`Recommended Manual Actions: ${analysisResult.recommended_actions.slice(0, 2).join(" | ")}`);

    // Step 8: Verify analysis results persist and can be fetched by report_id
    const retrievedAnalysis = await fetchAnalysisByReportId(createdInspection.id);
    if (!retrievedAnalysis || retrievedAnalysis.report_id !== createdInspection.id) {
      return NextResponse.json(
        { success: false, error: "fetchAnalysisByReportId failed to retrieve stored analysis record." },
        { status: 500 }
      );
    }
    log.push(`Verified analysis record stored in PostgreSQL / persistent cache for report ${createdInspection.id}`);

    return NextResponse.json({
      success: true,
      message: "All Real Inspection Image Upload & OpenCV Moisture Analysis Tests Passed!",
      test_property_id: testProperty.id,
      inspection_id: createdInspection.id,
      analysis_id: analysisResult.id,
      difference_percentage: analysisResult.difference_percentage,
      anomaly_count: analysisResult.anomaly_count,
      visual_observations: analysisResult.visual_observations,
      recommended_actions: analysisResult.recommended_actions,
      log,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Test execution failed";
    return NextResponse.json({ success: false, error: msg, log }, { status: 500 });
  }
}
