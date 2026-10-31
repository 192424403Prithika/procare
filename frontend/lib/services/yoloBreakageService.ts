import { apiClient } from "@/lib/apiClient";

export interface BreakageBoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
}

export interface BreakageDefectDetection {
  class_id: number;
  class_name: string;
  label: string;
  confidence: number;
  bbox: BreakageBoundingBox;
  area_percentage: number;
  severity: "minor" | "moderate" | "major" | "critical";
  damage_type: "structural" | "cosmetic";
}

export interface BreakageDetectionResult {
  result_id: string;
  inspection_id?: string;
  property_id?: string;
  status: "completed" | "unconfigured" | "failed";
  model_configured: boolean;
  model_name: string;
  model_version: string;
  original_image_url: string;
  annotated_image_url?: string;
  detections: BreakageDefectDetection[];
  total_defects: number;
  defect_counts: Record<string, number>;
  total_affected_area_percentage: number;
  severity_classification: "minor" | "moderate" | "major" | "critical";
  severity_score: number;
  severity_rationale: string[];
  structural_engineer_required: boolean;
  recommended_action: string;
  timestamp: string;
  inspector_id?: string;
  disclaimer: string;
  message?: string;
}

export interface BreakageModelStatus {
  configured: boolean;
  model_name: string;
  weights_path: string;
  weights_exist: boolean;
  classes: string[];
  device: string;
  conf_threshold: number;
  iou_threshold: number;
  instructions: string;
}

export interface CombinedInspectionAnalysis {
  inspection_id: string;
  property_id: string;
  moisture_findings?: {
    result_id: string;
    status: string;
    total_defects: number;
    defect_counts: Record<string, number>;
    risk_classification: string;
    risk_score: number;
    annotated_image_url?: string;
    recommendation: string;
  } | null;
  breakage_findings?: {
    result_id: string;
    status: string;
    total_defects: number;
    structural_defect_count: number;
    cosmetic_defect_count: number;
    severity_classification: string;
    severity_score: number;
    structural_engineer_required: boolean;
    annotated_image_url?: string;
    recommendation: string;
  } | null;
  combined_defect_count: number;
  highest_severity: string;
  combined_recommendation: string;
  timestamp: string;
}

/**
 * Checks whether the structural breakage model weights are configured and loaded.
 */
export async function fetchBreakageModelStatus(): Promise<BreakageModelStatus> {
  try {
    return await apiClient.get<BreakageModelStatus>("/api/v1/analysis/breakage/model-status");
  } catch (err) {
    console.warn("Failed to fetch breakage model status:", err);
    return {
      configured: false,
      model_name: "Ultralytics YOLO Structural Breakage & Damage Detector",
      weights_path: "backend/models/breakage_best.pt",
      weights_exist: false,
      classes: [],
      device: "cpu",
      conf_threshold: 0.25,
      iou_threshold: 0.45,
      instructions: "Structural breakage AI model is not configured. Please add trained YOLO weights.",
    };
  }
}

/**
 * Uploads an image and triggers YOLO structural breakage analysis.
 */
export async function runBreakageDetection(
  file: File,
  inspectionId?: string,
  propertyId?: string
): Promise<BreakageDetectionResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (inspectionId) formData.append("inspection_id", inspectionId);
  if (propertyId) formData.append("property_id", propertyId);

  return await apiClient.post<BreakageDetectionResult>(
    "/api/v1/analysis/breakage/detect",
    formData
  );
}

/**
 * Retrieves all saved structural breakage results for an inspection.
 */
export async function fetchBreakageHistory(
  inspectionId: string
): Promise<BreakageDetectionResult[]> {
  if (!inspectionId) return [];
  try {
    const res = await apiClient.get<any>(
      `/api/v1/analysis/breakage/${inspectionId}`
    );
    if (Array.isArray(res)) return res;
    return res?.results || [];
  } catch (err) {
    console.error(`Failed to fetch breakage history for inspection ${inspectionId}:`, err);
    return [];
  }
}

/**
 * Retrieves a single result by ID.
 */
export async function fetchBreakageResultById(
  resultId: string
): Promise<BreakageDetectionResult> {
  return await apiClient.get<BreakageDetectionResult>(
    `/api/v1/analysis/breakage/result/${resultId}`
  );
}

/**
 * Retrieves combined inspection summary (moisture + breakage findings).
 */
export async function fetchCombinedInspectionAnalysis(
  inspectionId: string
): Promise<CombinedInspectionAnalysis> {
  return await apiClient.get<CombinedInspectionAnalysis>(
    `/api/v1/analysis/breakage/combined/${inspectionId}`
  );
}
