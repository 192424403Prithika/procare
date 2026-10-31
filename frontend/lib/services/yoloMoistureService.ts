import { apiClient } from "@/lib/apiClient";

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
}

export interface DefectDetection {
  class_id: number;
  class_name: string;
  label: string;
  confidence: number;
  bbox: BoundingBox;
  area_percentage: number;
  severity: "low" | "medium" | "high" | "critical";
}

export interface YoloMoistureDetectionResult {
  result_id: string;
  inspection_id?: string;
  property_id?: string;
  status: "completed" | "unconfigured" | "failed";
  model_configured: boolean;
  model_name: string;
  model_version: string;
  original_image_url: string;
  annotated_image_url?: string;
  detections: DefectDetection[];
  total_defects: number;
  defect_counts: Record<string, number>;
  total_affected_area_percentage: number;
  risk_classification: "low" | "moderate" | "high" | "critical";
  risk_score: number;
  risk_rationale: string[];
  recommendation: string;
  timestamp: string;
  inspector_id?: string;
  message?: string;
}

export interface YoloModelStatus {
  configured: boolean;
  model_name: string;
  weights_path: string;
  weights_exist: boolean;
  classes: string[];
  device: string;
  instructions: string;
}

/**
 * Queries the model status from FastAPI to check if weights are loaded.
 */
export async function fetchYoloModelStatus(): Promise<YoloModelStatus> {
  try {
    return await apiClient.get<YoloModelStatus>("/api/v1/analysis/moisture/model/status");
  } catch (err) {
    console.warn("Failed to fetch YOLO model status:", err);
    return {
      configured: false,
      model_name: "Ultralytics YOLO Moisture & Water Damage Detector",
      weights_path: "backend/models/moisture_best.pt",
      weights_exist: false,
      classes: [],
      device: "cpu",
      instructions: "Moisture detection model is not configured. Add trained YOLO weights to enable AI detection.",
    };
  }
}

/**
 * Runs YOLO inference on an uploaded image file via POST /api/v1/analysis/moisture/detect.
 */
export async function runYoloMoistureDetection(
  file: File,
  inspectionId?: string,
  propertyId?: string
): Promise<YoloMoistureDetectionResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (inspectionId) formData.append("inspection_id", inspectionId);
  if (propertyId) formData.append("property_id", propertyId);

  return await apiClient.post<YoloMoistureDetectionResult>(
    "/api/v1/analysis/moisture/detect",
    formData
  );
}

/**
 * Retrieves historical YOLO moisture detection results for an inspection.
 */
export async function fetchYoloMoistureHistory(
  inspectionId: string
): Promise<YoloMoistureDetectionResult[]> {
  if (!inspectionId) return [];
  try {
    return await apiClient.get<YoloMoistureDetectionResult[]>(
      `/api/v1/analysis/moisture/${encodeURIComponent(inspectionId)}`
    );
  } catch (err) {
    console.error("Failed to fetch moisture history:", err);
    return [];
  }
}

/**
 * Retrieves a specific YOLO moisture detection result by ID.
 */
export async function fetchYoloMoistureResult(
  resultId: string
): Promise<YoloMoistureDetectionResult | null> {
  if (!resultId) return null;
  try {
    return await apiClient.get<YoloMoistureDetectionResult>(
      `/api/v1/analysis/moisture/result/${encodeURIComponent(resultId)}`
    );
  } catch (err) {
    console.error("Failed to fetch moisture result by id:", err);
    return null;
  }
}

