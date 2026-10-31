import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { InspectionReport } from "@/lib/services/inspectionService";

export interface AnomalousRegion {
  id: number;
  area_pixels: number;
  area_percentage: number;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  centroid: {
    x: number;
    y: number;
  };
  mean_intensity: number;
  pattern_type?: string;
  severity: "critical" | "high" | "moderate" | "minor";
}

interface FastAPIMoistureResult {
  status: "completed" | "failed";
  report_id?: string;
  is_suitable?: boolean;
  unsuitability_reason?: string;
  alignment_quality?: number;
  alignment_method?: string;
  difference_percentage?: number;
  anomaly_count?: number;
  result_summary?: string;
  processed_image_base64?: string;
  heatmap_base64?: string;
  diff_mask_base64?: string;
  aligned_flash_base64?: string;
  visual_observations?: string[];
  recommended_actions?: string[];
  regions?: AnomalousRegion[];
  limitations?: string[];
  execution_time_ms?: number;
  metadata?: Record<string, unknown>;
}

export interface MoistureAnalysisRecord {
  id: string;
  report_id: string;
  property_id?: string;
  property_name?: string;
  inspection_zone?: string;
  processing_status: "completed" | "failed" | "processing" | "pending";
  is_suitable: boolean;
  unsuitability_reason?: string | null;
  alignment_quality: number;
  alignment_method: string;
  difference_percentage: number;
  anomaly_count: number;
  result_summary: string;
  original_image_url?: string;
  processed_image_url?: string;
  heatmap_url: string;
  diff_mask_url?: string;
  aligned_flash_url?: string;
  visual_observations: string[];
  recommended_actions: string[];
  regions: AnomalousRegion[];
  limitations: string[];
  execution_time_ms: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = "propcare_moisture_analysis_store_v2";
const FASTAPI_ENDPOINT =
  process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000/api/v1/analyze/moisture";

let memoryAnalysisStore: MoistureAnalysisRecord[] = [];

function getLocalStore(): MoistureAnalysisRecord[] {
  if (typeof window === "undefined") return memoryAnalysisStore;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryAnalysisStore;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : memoryAnalysisStore;
  } catch {
    return memoryAnalysisStore;
  }
}

function saveLocalStore(records: MoistureAnalysisRecord[]) {
  memoryAnalysisStore = [...records];
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Failed to save moisture analysis to localStorage", err);
  }
}

/**
 * Executes actual OpenCV Moisture & Surface Defect Analysis via the Python FastAPI backend
 * using the real uploaded inspection photographs.
 */
export async function executeMoistureAnalysis(
  inspection: InspectionReport,
  sensitivity: number = 0.5
): Promise<MoistureAnalysisRecord> {
  const supabase = createClient();
  const startTime = Date.now();
  const newId = `MOIST-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  // Ensure an actual uploaded image exists
  const targetImage = inspection.ambient_img_url || inspection.ambient_img_path;
  if (!targetImage) {
    throw new Error("No photographic evidence found for this inspection. An actual photograph is required for analysis.");
  }

  let apiResult: FastAPIMoistureResult | null = null;
  let fetchFailed = false;

  try {
    const response = await fetch(FASTAPI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        report_id: inspection.id,
        property_id: inspection.property_id,
        ambient_image: targetImage,
        flash_image: inspection.flash_img_url || inspection.flash_img_path || null,
        sensitivity: sensitivity,
      }),
    });

    if (response.ok) {
      apiResult = await response.json();
    } else {
      const errText = await response.text();
      console.warn("FastAPI analysis returned HTTP error:", response.status, errText);
      fetchFailed = true;
    }
  } catch (err) {
    console.warn("Could not reach FastAPI service directly:", err);
    fetchFailed = true;
  }

  if (fetchFailed || !apiResult) {
    throw new Error(
      "Optical analysis service (FastAPI on http://127.0.0.1:8000) could not be contacted. Please verify that the analytical backend is running."
    );
  }

  // Handle unsuitable image safely without fabricating defects
  if (apiResult.status === "failed" || apiResult.is_suitable === false) {
    const failedRecord: MoistureAnalysisRecord = {
      id: newId,
      report_id: inspection.id,
      property_id: inspection.property_id,
      property_name: inspection.property_name,
      inspection_zone: inspection.inspection_zone,
      processing_status: "failed",
      is_suitable: false,
      unsuitability_reason: apiResult.unsuitability_reason || "Photograph does not meet diagnostic illumination or sharpness requirements.",
      alignment_quality: 0,
      alignment_method: "None",
      difference_percentage: 0,
      anomaly_count: 0,
      result_summary: apiResult.result_summary || "Analysis aborted: photograph is unsuitable for optical defect evaluation.",
      original_image_url: inspection.ambient_img_url,
      heatmap_url: inspection.ambient_img_url,
      visual_observations: ["Image Unsuitable: Illumination or focus level does not meet optical diagnostic standards."],
      recommended_actions: [
        "Retake inspection photograph with steady focus and balanced ambient lighting.",
        "Perform direct physical inspection with calibrated pin-type moisture meter."
      ],
      regions: [],
      limitations: apiResult.limitations || ["Optical analysis requires clear, in-focus, and adequately illuminated photographic evidence."],
      execution_time_ms: apiResult.execution_time_ms || (Date.now() - startTime),
      created_at: new Date().toISOString(),
      metadata: apiResult.metadata || {},
    };

    const current = getLocalStore();
    saveLocalStore([failedRecord, ...current.filter((r) => r.report_id !== inspection.id)]);
    return failedRecord;
  }

  // Construct completed analysis record from real OpenCV findings
  const record: MoistureAnalysisRecord = {
    id: newId,
    report_id: inspection.id,
    property_id: inspection.property_id,
    property_name: inspection.property_name,
    inspection_zone: inspection.inspection_zone,
    processing_status: "completed",
    is_suitable: true,
    unsuitability_reason: null,
    alignment_quality: apiResult.alignment_quality || 0,
    alignment_method: apiResult.alignment_method || "Single Frame Optical Pipeline",
    difference_percentage: apiResult.difference_percentage || 0,
    anomaly_count: apiResult.anomaly_count || apiResult.regions?.length || 0,
    result_summary: apiResult.result_summary || "OpenCV optical analysis complete.",
    original_image_url: inspection.ambient_img_url,
    processed_image_url: apiResult.processed_image_base64 || inspection.ambient_img_url,
    heatmap_url: apiResult.heatmap_base64 || inspection.ambient_img_url,
    diff_mask_url: apiResult.diff_mask_base64,
    aligned_flash_url: apiResult.aligned_flash_base64,
    visual_observations: apiResult.visual_observations && apiResult.visual_observations.length > 0
      ? apiResult.visual_observations
      : ["No anomalous discoloration or surface texture disruptions identified."],
    recommended_actions: apiResult.recommended_actions && apiResult.recommended_actions.length > 0
      ? apiResult.recommended_actions
      : [
          "Conduct non-destructive pinless moisture scan across inspected zone.",
          "Check relative humidity (RH%) with thermo-hygrometer."
        ],
    regions: apiResult.regions || [],
    limitations: apiResult.limitations || [
      "VISUAL ANOMALY ONLY: This algorithm evaluates surface chromatic variations, texture irregularities, and reflectance.",
      "NOT A DIRECT SUB-SURFACE DETECTOR: Optical inspection cannot penetrate dry plasterboard or impermeable tiles.",
      "MANDATORY PROTOCOL: Treat detected anomalies as indicators requiring human verification with calibrated moisture meters."
    ],
    execution_time_ms: apiResult.execution_time_ms || (Date.now() - startTime),
    created_at: new Date().toISOString(),
    metadata: apiResult.metadata || {},
  };

  // 2. Persist to PostgreSQL (moisture_analysis table) if Supabase is configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("moisture_analysis")
        .insert([
          {
            report_id: inspection.id,
            processing_status: "completed",
            alignment_quality: record.alignment_quality,
            difference_percentage: record.difference_percentage,
            anomaly_count: record.anomaly_count,
            result_summary: record.result_summary,
            heatmap_url: record.heatmap_url,
            analysis_metadata: {
              regions: record.regions,
              visual_observations: record.visual_observations,
              recommended_actions: record.recommended_actions,
              execution_time_ms: record.execution_time_ms,
              limitations: record.limitations,
              alignment_method: record.alignment_method,
            },
          },
        ])
        .select()
        .single();

      if (!error && data) {
        record.id = data.id;
        record.created_at = data.created_at;
      }
    } catch (dbErr) {
      console.warn("Could not insert into Supabase moisture_analysis, keeping persistent local store", dbErr);
    }

    // Update parent pathology_report with computed metrics and review status
    try {
      await supabase
        .from("pathology_reports")
        .update({
          ambient_moisture_index: record.difference_percentage,
          status: record.anomaly_count > 0 ? "Requires Review" : "Completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", inspection.id);
    } catch (updateErr) {
      console.warn("Could not update pathology_reports telemetry:", updateErr);
    }
  }

  // 3. Save to persistent browser/memory registry
  const current = getLocalStore();
  const updated = [record, ...current.filter((r) => r.report_id !== inspection.id)];
  saveLocalStore(updated);

  return record;
}

/**
 * Fetch moisture analysis by inspection report ID from PostgreSQL or persistent cache
 */
export async function fetchAnalysisByReportId(reportId: string): Promise<MoistureAnalysisRecord | null> {
  const supabase = createClient();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("moisture_analysis")
        .select("*")
        .eq("report_id", reportId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        const metadata = (data.analysis_metadata as Record<string, unknown>) || {};
        return {
          id: String(data.id),
          report_id: String(data.report_id),
          processing_status: data.processing_status,
          is_suitable: true,
          alignment_quality: Number(data.alignment_quality),
          alignment_method: (metadata.alignment_method as string) || "SIFT Homography",
          difference_percentage: Number(data.difference_percentage),
          anomaly_count: Number(data.anomaly_count),
          result_summary: data.result_summary || "",
          heatmap_url: data.heatmap_url || "",
          visual_observations: Array.isArray(metadata.visual_observations)
            ? (metadata.visual_observations as string[])
            : [],
          recommended_actions: Array.isArray(metadata.recommended_actions)
            ? (metadata.recommended_actions as string[])
            : [],
          regions: Array.isArray(metadata.regions) ? (metadata.regions as AnomalousRegion[]) : [],
          limitations: Array.isArray(metadata.limitations)
            ? (metadata.limitations as string[])
            : [],
          execution_time_ms: Number(metadata.execution_time_ms || 120),
          created_at: data.created_at,
          metadata,
        };
      }
    } catch {
      // Fallback to local store
    }
  }

  const all = getLocalStore();
  return all.find((r) => r.report_id === reportId) || null;
}
