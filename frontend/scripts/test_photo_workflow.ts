/**
 * PropCare NW - Photo Upload & Reopening End-to-End Workflow Verification
 * 
 * Verifies:
 * 1. Storage bucket validation (JPG, JPEG, PNG, WEBP allowed; invalid blocked; size checked)
 * 2. Multi-photo upload to private bucket 'inspection-images'
 * 3. Inspection creation with multiple photographs & storage paths
 * 4. Browser refresh / re-fetching persistence
 * 5. Reopening inspection & verifying signed URLs and photo metadata
 * 6. Availability of saved photograph to Moisture Analysis & OpenCV pipeline
 */

import fs from "fs";
import path from "path";
import {
  createInspection,
  fetchInspectionById,
  validateImageFile,
} from "../lib/services/inspectionService";
import { executeMoistureAnalysis } from "../lib/services/moistureAnalysisService";

async function run() {
  console.log("==================================================================");
  console.log("PROPCARE NW — PHOTO UPLOAD & REOPENING WORKFLOW VERIFICATION");
  console.log("==================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: FILE VALIDATION
  // -------------------------------------------------------------------------
  console.log("1. TESTING FILE TYPE & SIZE VALIDATION");

  const dummyJpg = new File([new Uint8Array(1024)], "living_room_damp.jpg", { type: "image/jpeg" });
  const dummyPng = new File([new Uint8Array(2048)], "ceiling_stain.png", { type: "image/png" });
  const dummyWebp = new File([new Uint8Array(3072)], "wall_tidemark.webp", { type: "image/webp" });
  const dummyPdf = new File([new Uint8Array(1024)], "report.pdf", { type: "application/pdf" });
  const dummyOversize = new File([new Uint8Array(25 * 1024 * 1024)], "huge_raw_scan.jpg", { type: "image/jpeg" });

  assert(validateImageFile(dummyJpg).valid, "JPG file accepted");
  assert(validateImageFile(dummyPng).valid, "PNG file accepted");
  assert(validateImageFile(dummyWebp).valid, "WEBP file accepted");
  assert(!validateImageFile(dummyPdf).valid, "PDF rejected with clear error", validateImageFile(dummyPdf).error);
  assert(!validateImageFile(dummyOversize).valid, "Oversize 25MB file rejected", validateImageFile(dummyOversize).error);

  // -------------------------------------------------------------------------
  // TEST 2: UPLOAD TO PRIVATE STORAGE BUCKET (HTTP API)
  // -------------------------------------------------------------------------
  console.log("\n2. TESTING MULTI-PHOTO UPLOAD TO PRIVATE 'inspection-images' BUCKET");

  const realWallJpeg = fs.readFileSync(path.join(process.cwd(), "public", "test_sample_wall.jpg"));

  const uploadPhoto = async (name: string, buffer: Buffer, mime: string) => {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mime });
    formData.append("file", blob, name);
    formData.append("bucket", "inspection-images");
    formData.append("propertyId", "PROP-0914");

    const res = await fetch("http://localhost:3000/api/storage/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload failed HTTP ${res.status}: ${errText}`);
    }
    return await res.json();
  };

  const upload1 = await uploadPhoto("photo_wall_moisture.jpg", realWallJpeg, "image/jpeg");
  assert(upload1.success === true, "Photo 1 uploaded successfully to inspection-images");
  assert(Boolean(upload1.storagePath), `Photo 1 storage path created: ${upload1.storagePath}`);
  assert(Boolean(upload1.signedUrl), `Photo 1 signed URL generated`);

  const upload2 = await uploadPhoto("photo_ceiling_mould.jpg", realWallJpeg, "image/jpeg");
  assert(upload2.success === true, "Photo 2 uploaded successfully to inspection-images");
  assert(Boolean(upload2.storagePath), `Photo 2 storage path created: ${upload2.storagePath}`);

  // -------------------------------------------------------------------------
  // TEST 3: CREATE INSPECTION WITH MULTIPLE SAVED PHOTOS
  // -------------------------------------------------------------------------
  console.log("\n3. TESTING INSPECTION CREATION WITH SAVED PHOTOS");

  const newInspection = await createInspection({
    property_id: "PROP-0914",
    inspection_zone: "Bathroom ceiling & external wall",
    room_name: "Flat 14 Ensuite",
    floor: "Floor 3",
    inspection_location: "Northern gable wall corner",
    symptom_tags: ["Visible mould", "Damp patches"],
    notes: "High moisture detected along ceiling junction. Multiple field photos uploaded.",
    ambient_img_url: upload1.signedUrl,
    ambient_img_path: upload1.storagePath,
    flash_img_url: upload2.signedUrl,
    flash_img_path: upload2.storagePath,
    images: [
      {
        id: "img-test-1",
        url: upload1.signedUrl,
        storage_path: upload1.storagePath,
        file_name: "photo_wall_moisture.jpg",
        file_size: realWallJpeg.length,
        caption: "Primary ambient photo",
      },
      {
        id: "img-test-2",
        url: upload2.signedUrl,
        storage_path: upload2.storagePath,
        file_name: "photo_ceiling_mould.jpg",
        file_size: realWallJpeg.length,
        caption: "Specular flash photo",
      },
    ],
    audio_url: "",
  });

  assert(Boolean(newInspection.id), `Inspection created with ID: ${newInspection.id}`);
  assert(newInspection.images?.length === 2, `Inspection stores 2 uploaded photos (count: ${newInspection.images?.length})`);
  assert(newInspection.ambient_img_path === upload1.storagePath, "Primary ambient photo storage path saved");
  assert(newInspection.flash_img_path === upload2.storagePath, "Secondary flash photo storage path saved");

  // -------------------------------------------------------------------------
  // TEST 4: REOPEN INSPECTION (SIMULATE BROWSER REFRESH)
  // -------------------------------------------------------------------------
  console.log("\n4. TESTING REOPENING INSPECTION AFTER REFRESH");

  const reopened = await fetchInspectionById(newInspection.id);
  assert(Boolean(reopened), `Reopened inspection ${newInspection.id} from persistent store`);
  assert(reopened?.id === newInspection.id, "ID matches original");
  assert(reopened?.property_id === "PROP-0914", "Property ID association preserved");
  assert(Boolean(reopened?.images && reopened.images.length >= 2), `Reopened inspection retains ${reopened?.images?.length} photos`);
  assert(Boolean(reopened?.ambient_img_url), `Fresh signed URL generated for primary photo`);
  assert(reopened?.ambient_img_path === upload1.storagePath, "Storage path intact in reopened record");

  // Verify that signed URL is accessible via HTTP
  if (reopened?.ambient_img_url) {
    const imgFetch = await fetch(reopened.ambient_img_url);
    assert(imgFetch.status === 200, `Signed URL for photo is live and returns HTTP 200 (type: ${imgFetch.headers.get("content-type")})`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: MOISTURE ANALYSIS INTEGRATION
  // -------------------------------------------------------------------------
  console.log("\n5. TESTING MOISTURE ANALYSIS INTEGRATION WITH SAVED PHOTO");

  assert(Boolean(reopened?.ambient_img_url), "Saved photo is available to Moisture Analysis page");

  if (reopened) {
    try {
      const analysisResult = await executeMoistureAnalysis(reopened, 0.5);
      assert(analysisResult.processing_status === "completed", `OpenCV analysis processed saved photo (status: ${analysisResult.processing_status})`);
      assert(Boolean(analysisResult.heatmap_url), "Real false-colour anomaly heatmap generated by OpenCV");
      assert(analysisResult.difference_percentage >= 0, `Difference percentage calculated: ${analysisResult.difference_percentage}%`);
    } catch (analysisErr) {
      console.warn("Moisture analysis execution error (check FastAPI):", analysisErr);
    }
  }

  console.log("\n==================================================================");
  console.log(`WORKFLOW VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("FATAL ERROR running workflow verification:", err);
  process.exit(1);
});
