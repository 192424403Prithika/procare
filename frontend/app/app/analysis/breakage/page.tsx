"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SparklesIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CameraIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  BuildingIcon,
  ClockIcon,
  WrenchIcon,
  UploadCloudIcon,
  XIcon,
  DropletIcon,
} from "@/components/Icons";
import { fetchInspections, InspectionReport } from "@/lib/services/inspectionService";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";
import {
  fetchBreakageModelStatus,
  runBreakageDetection,
  fetchBreakageHistory,
  fetchCombinedInspectionAnalysis,
  BreakageModelStatus,
  BreakageDetectionResult,
  BreakageDefectDetection,
  CombinedInspectionAnalysis,
} from "@/lib/services/yoloBreakageService";

const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

interface UploadedImageItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  formattedSize: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const DEFECT_TAXONOMY: Record<string, { label: string; color: string; bg: string; structural: boolean }> = {
  wall_crack: { label: "Wall Crack", color: "#F59E0B", bg: "bg-amber-50 text-amber-800 border-amber-200", structural: false },
  ceiling_crack: { label: "Ceiling Crack", color: "#8B5CF6", bg: "bg-purple-50 text-purple-800 border-purple-200", structural: false },
  structural_fracture: { label: "Structural Fracture", color: "#EF4444", bg: "bg-red-100 text-red-900 border-red-300 font-bold", structural: true },
  broken_plaster: { label: "Broken Plaster", color: "#64748B", bg: "bg-slate-50 text-slate-700 border-slate-200", structural: false },
  broken_tiles: { label: "Broken / Chipped Tiles", color: "#06B6D4", bg: "bg-cyan-50 text-cyan-800 border-cyan-200", structural: false },
  concrete_spalling: { label: "Concrete Spalling", color: "#DC2626", bg: "bg-red-50 text-red-800 border-red-300 font-bold", structural: true },
  exposed_rebar: { label: "Exposed Reinforcement Steel", color: "#991B1B", bg: "bg-red-200 text-red-950 border-red-400 font-bold", structural: true },
  damaged_wall_surface: { label: "Damaged Wall Surface", color: "#D97706", bg: "bg-amber-50 text-amber-700 border-amber-200", structural: false },
  broken_masonry: { label: "Broken Bricks / Masonry", color: "#B91C1C", bg: "bg-rose-50 text-rose-800 border-rose-300 font-bold", structural: true },
  damaged_ceiling: { label: "Damaged Ceiling Section", color: "#6B7280", bg: "bg-gray-100 text-gray-800 border-gray-300", structural: false },
  surface_holes_impact: { label: "Surface Holes & Impact", color: "#E11D48", bg: "bg-pink-50 text-pink-800 border-pink-200", structural: false },
  damaged_door_window_frame: { label: "Damaged Aperture Frame", color: "#4F46E5", bg: "bg-indigo-50 text-indigo-800 border-indigo-200", structural: false },
};

export default function YoloBreakageAnalysisPage() {
  const searchParams = useSearchParams();
  const initialInspectionId = searchParams.get("inspection") || "";
  const initialPropertyId = searchParams.get("property") || "";

  // Data states
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>(initialInspectionId);

  // Model status
  const [modelStatus, setModelStatus] = useState<BreakageModelStatus | null>(null);
  const [loadingModelStatus, setLoadingModelStatus] = useState(true);

  // Image upload gallery state
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inference state
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [activeResult, setActiveResult] = useState<BreakageDetectionResult | null>(null);
  const [historyResults, setHistoryResults] = useState<BreakageDetectionResult[]>([]);
  const [viewMode, setViewMode] = useState<"annotated" | "original">("annotated");
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Filters
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  // Combined inspection analysis
  const [showCombinedModal, setShowCombinedModal] = useState(false);
  const [combinedData, setCombinedData] = useState<CombinedInspectionAnalysis | null>(null);
  const [loadingCombined, setLoadingCombined] = useState(false);

  // 1. Initial data loading
  useEffect(() => {
    async function init() {
      try {
        const [statusData, propsData, inspData] = await Promise.all([
          fetchBreakageModelStatus(),
          fetchProperties(),
          fetchInspections(),
        ]);

        setModelStatus(statusData);
        setProperties(propsData);
        setInspections(inspData);

        if (!selectedPropertyId && propsData.length > 0) {
          setSelectedPropertyId(propsData[0].id);
        }
        if (!selectedInspectionId && inspData.length > 0) {
          setSelectedInspectionId(inspData[0].id);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoadingModelStatus(false);
      }
    }
    init();
  }, [initialInspectionId, initialPropertyId, selectedInspectionId, selectedPropertyId]);

  // 2. Fetch history when inspection changes
  useEffect(() => {
    if (!selectedInspectionId) return;
    async function loadHistory() {
      try {
        const history = await fetchBreakageHistory(selectedInspectionId);
        setHistoryResults(history);
        if (history.length > 0 && !activeResult) {
          setActiveResult(history[0]);
        }
      } catch (err) {
        console.error("Failed to load breakage history:", err);
      }
    }
    loadHistory();
  }, [selectedInspectionId, activeResult]);

  // 3. File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const newItems: UploadedImageItem[] = [];

    for (const file of files) {
      if (!ALLOWED_EXTENSIONS.test(file.name)) {
        setUploadError(`Invalid file format: ${file.name}. Allowed: JPG, JPEG, PNG, WEBP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File too large: ${file.name} (${formatBytes(file.size)}). Max: 25 MB.`);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        formattedSize: formatBytes(file.size),
      });
    }

    setUploadedImages((prev) => [...prev, ...newItems]);
    if (uploadedImages.length === 0 && newItems.length > 0) {
      setSelectedImageIndex(0);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
    if (selectedImageIndex >= index && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  // 4. Run Analysis
  const handleRunAnalysis = async () => {
    if (uploadedImages.length === 0) {
      setUploadError("Please upload at least one photograph to analyse.");
      return;
    }

    const currentItem = uploadedImages[selectedImageIndex];
    if (!currentItem) return;

    setIsAnalysing(true);
    setGeneralError(null);

    try {
      const result = await runBreakageDetection(
        currentItem.file,
        selectedInspectionId || undefined,
        selectedPropertyId || undefined
      );

      setActiveResult(result);
      setViewMode("annotated");

      // Refresh inspection history
      if (selectedInspectionId) {
        const history = await fetchBreakageHistory(selectedInspectionId);
        setHistoryResults(history);
      }
    } catch (err: any) {
      console.warn("Breakage detection warning:", err?.message || err);
      if (err?.status === 401 || err?.message?.toLowerCase().includes("expired") || err?.message?.toLowerCase().includes("token")) {
        setGeneralError("Authentication token has expired. Please refresh your session or sign in again.");
      } else {
        setGeneralError(err?.message || "Failed to execute structural breakage AI analysis. Check backend logs.");
      }
    } finally {
      setIsAnalysing(false);
    }
  };

  // 5. Open Combined Findings Modal
  const handleOpenCombined = async () => {
    if (!selectedInspectionId) return;
    setLoadingCombined(true);
    setShowCombinedModal(true);
    try {
      const combined = await fetchCombinedInspectionAnalysis(selectedInspectionId);
      setCombinedData(combined);
    } catch (err) {
      console.error("Failed to load combined analysis:", err);
    } finally {
      setLoadingCombined(false);
    }
  };

  // Active displayed image URL
  const selectedUpload = uploadedImages[selectedImageIndex];
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

  let displayImageUrl = "";
  if (viewMode === "annotated" && activeResult?.annotated_image_url) {
    displayImageUrl = `${backendBase}${activeResult.annotated_image_url}`;
  } else if (activeResult?.original_image_url) {
    displayImageUrl = `${backendBase}${activeResult.original_image_url}`;
  } else if (selectedUpload) {
    displayImageUrl = selectedUpload.previewUrl;
  }

  // Filter detections
  const filteredDetections = (activeResult?.detections || []).filter((d) => {
    if (filterClass !== "all" && d.class_name !== filterClass) return false;
    if (filterSeverity !== "all" && d.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#1B2559] p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              <SparklesIcon className="w-3.5 h-3.5 text-amber-600" />
              Ultralytics YOLO Computer Vision
            </span>
            <span className="text-xs text-slate-500 font-mono">v2.0 (Structural Breakage)</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#1B2559] mt-1">
            Structural Breakage & Damage Analysis
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Real computer vision inference for masonry cracks, structural fractures, concrete spalling, and surface building damage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCombined}
            disabled={!selectedInspectionId}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1B2559] text-[#1B2559] hover:bg-slate-100 text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            <DropletIcon className="w-4 h-4 text-[#79566F]" />
            Combined Inspection View
          </button>
          <Link
            href="/app/analysis/moisture"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition shadow-sm"
          >
            <SparklesIcon className="w-4 h-4 text-[#79566F]" />
            Moisture AI
          </Link>
        </div>
      </div>

      {/* Model Configuration Status Banner */}
      {!loadingModelStatus && modelStatus && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            modelStatus.configured
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          <div className="flex items-start gap-3">
            {modelStatus.configured ? (
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <div className="font-semibold text-sm">
                {modelStatus.configured
                  ? "YOLO Structural Breakage Model Active & Ready"
                  : "Structural breakage AI model is not configured. Please add trained YOLO weights."}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Weights path: <code className="bg-white/80 px-1 py-0.5 rounded font-mono">{modelStatus.weights_path}</code>
                {modelStatus.configured && (
                  <>
                    {" "}
                    | Device: <span className="font-semibold">{modelStatus.device.toUpperCase()}</span> | Confidence:{" "}
                    <span className="font-semibold">{Math.round(modelStatus.conf_threshold * 100)}%</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                modelStatus.configured ? "bg-emerald-200 text-emerald-800" : "bg-amber-200 text-amber-900"
              }`}
            >
              {modelStatus.configured ? "ONLINE" : "UNCONFIGURED"}
            </span>
          </div>
        </div>
      )}

      {/* Property & Inspection Selector Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Target Property
          </label>
          <div className="relative">
            <BuildingIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#1B2559] font-medium focus:outline-none focus:ring-2 focus:ring-[#1B2559]"
            >
              <option value="">-- Select Property --</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || p.address} ({p.postcode || "NW"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Inspection Record
          </label>
          <div className="relative">
            <ClockIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={selectedInspectionId}
              onChange={(e) => setSelectedInspectionId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#1B2559] font-medium focus:outline-none focus:ring-2 focus:ring-[#1B2559]"
            >
              <option value="">-- Select Inspection --</option>
              {inspections.map((insp) => (
                <option key={insp.id} value={insp.id}>
                  {insp.title || `Inspection ${insp.id.slice(0, 8)}`} — {insp.inspection_date || "Recent"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Analysis Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Gallery (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Upload Dropzone */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base text-[#1B2559] flex items-center gap-2">
                <CameraIcon className="w-4 h-4 text-amber-600" />
                Upload Damage Photographs
              </h2>
              <span className="text-xs text-slate-400">JPG, PNG, WEBP</span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/20 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
            >
              <UploadCloudIcon className="w-8 h-8 text-amber-600" />
              <div className="text-sm font-semibold text-[#1B2559]">Click or drag photos here</div>
              <p className="text-xs text-slate-500">Supports multiple high-resolution photos up to 25 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                {uploadError}
              </div>
            )}

            {/* Gallery Thumbnails */}
            {uploadedImages.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Uploaded Gallery ({uploadedImages.length})</span>
                  <button
                    onClick={() => setUploadedImages([])}
                    className="text-xs text-red-500 hover:underline font-normal"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {uploadedImages.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer transition aspect-square bg-slate-100 ${
                        selectedImageIndex === idx ? "border-amber-600 ring-2 ring-amber-200" : "border-slate-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(idx);
                        }}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analyse Action Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalysing || uploadedImages.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAnalysing ? (
                <>
                  <RefreshCwIcon className="w-4 h-4 animate-spin text-white" />
                  Running YOLO Computer Vision...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  Analyse Breakage (YOLO)
                </>
              )}
            </button>
          </div>

          {/* Historical Inspection Findings */}
          {historyResults.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-semibold text-sm text-[#1B2559] flex items-center justify-between">
                <span>Saved Breakage Records</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                  {historyResults.length}
                </span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {historyResults.map((hist) => (
                  <div
                    key={hist.result_id}
                    onClick={() => setActiveResult(hist)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                      activeResult?.result_id === hist.result_id
                        ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-300"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-[#1B2559]">
                        {hist.total_defects} {hist.total_defects === 1 ? "defect" : "defects"} detected
                      </div>
                      <div className="text-[11px] text-slate-500">{new Date(hist.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        hist.severity_classification === "critical"
                          ? "bg-red-100 text-red-800"
                          : hist.severity_classification === "major"
                          ? "bg-orange-100 text-orange-800"
                          : hist.severity_classification === "moderate"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {hist.severity_classification}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Visualizer & Results (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {generalError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Analysis Notice</div>
                  <div className="text-xs sm:text-sm mt-0.5">{generalError}</div>
                </div>
              </div>
              {generalError.toLowerCase().includes("session") || generalError.toLowerCase().includes("token") ? (
                <Link
                  href="/login?next=/app/analysis/breakage"
                  className="px-3 py-1.5 rounded-lg bg-[#1B2559] text-white text-xs font-semibold hover:bg-slate-800 transition whitespace-nowrap shadow-sm text-center flex-shrink-0"
                >
                  Sign In to Reconnect
                </Link>
              ) : null}
            </div>
          )}

          {/* Image Visualizer Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Visualizer Toolbar */}
            <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">View Mode:</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                  <button
                    onClick={() => setViewMode("annotated")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      viewMode === "annotated"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Annotated (YOLO Bounding Boxes)
                  </button>
                  <button
                    onClick={() => setViewMode("original")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      viewMode === "original"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Original Photograph
                  </button>
                </div>
              </div>

              {activeResult && (
                <div className="text-xs text-slate-500 font-mono">
                  {activeResult.model_name} • {activeResult.model_version}
                </div>
              )}
            </div>

            {/* Visualizer Display Area */}
            <div className="relative bg-[#1A1F2C] min-h-[380px] lg:min-h-[460px] flex items-center justify-center p-4">
              {displayImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayImageUrl}
                  alt="Structural Analysis"
                  className="max-h-[520px] w-auto max-w-full rounded shadow-lg object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 space-y-2">
                  <CameraIcon className="w-12 h-12 mx-auto text-slate-600" />
                  <div className="text-sm font-medium">No photograph selected</div>
                  <p className="text-xs text-slate-500">Upload or choose a photograph to begin YOLO analysis</p>
                </div>
              )}

              {/* Scanning Overlay Animation */}
              {isAnalysing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white space-y-3">
                  <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
                  <div className="text-sm font-semibold tracking-wide">YOLO INFERENCE IN PROGRESS</div>
                  <div className="text-xs text-slate-300">Detecting fractures, wall cracks, and masonry defects...</div>
                </div>
              )}
            </div>
          </div>

          {/* Active Result Analytics */}
          {activeResult && (
            <div className="space-y-5">
              {/* Mandatory Safety Notice & Structural Engineer Alert */}
              {activeResult.structural_engineer_required && (
                <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-900 flex items-start gap-3 shadow-sm">
                  <AlertTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm tracking-wide text-red-950">
                      STRUCTURAL ASSESSMENT REQUIRED — SUSPECTED STRUCTURAL DEFECT DETECTED
                    </div>
                    <div className="text-xs text-red-800 mt-1 leading-relaxed">
                      AI computer vision has identified potential structural fractures, exposed rebar, concrete spalling, or broken masonry.
                      A mandatory on-site inspection by a qualified structural engineer is required to determine building safety.
                    </div>
                  </div>
                </div>
              )}

              {/* Metrics Header Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity Level</div>
                  <div
                    className={`mt-1 text-lg font-extrabold uppercase ${
                      activeResult.severity_classification === "critical"
                        ? "text-red-600"
                        : activeResult.severity_classification === "major"
                        ? "text-orange-600"
                        : activeResult.severity_classification === "moderate"
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {activeResult.severity_classification}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Score: {activeResult.severity_score}/100</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Defects Count</div>
                  <div className="mt-1 text-lg font-extrabold text-[#1B2559]">{activeResult.total_defects}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Bounding boxes found</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Affected Area</div>
                  <div className="mt-1 text-lg font-extrabold text-[#1B2559]">
                    {activeResult.total_affected_area_percentage}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Of photograph surface</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assessment Status</div>
                  <div className="mt-1 text-sm font-bold text-[#1B2559]">
                    {activeResult.structural_engineer_required ? "Engineer Review" : "Maintenance"}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Triage classification</div>
                </div>
              </div>

              {/* Explainable Severity Triage & Recommendation */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-semibold text-sm text-[#1B2559] flex items-center gap-2">
                    <WrenchIcon className="w-4 h-4 text-amber-600" />
                    Recommended Next Action & Severity Rationale
                  </h3>
                  <span className="text-xs font-mono text-slate-400">Explainable AI</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg text-sm font-medium text-[#1B2559] leading-relaxed">
                  {activeResult.recommended_action}
                </div>

                {activeResult.severity_rationale && activeResult.severity_rationale.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Severity Determination Factors:
                    </div>
                    <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                      {activeResult.severity_rationale.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Defect Categories & Filters */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h3 className="font-semibold text-sm text-[#1B2559]">Detected Building Defects Breakdown</h3>

                  {/* Filter controls */}
                  <div className="flex items-center gap-2">
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 font-medium"
                    >
                      <option value="all">All Classes</option>
                      {Object.keys(activeResult.defect_counts || {}).map((c) => (
                        <option key={c} value={c}>
                          {DEFECT_TAXONOMY[c]?.label || c} ({activeResult.defect_counts[c]})
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 font-medium"
                    >
                      <option value="all">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="major">Major</option>
                      <option value="moderate">Moderate</option>
                      <option value="minor">Minor</option>
                    </select>
                  </div>
                </div>

                {/* Defect list */}
                {filteredDetections.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">
                    No detections match the selected filter.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {filteredDetections.map((det, i) => {
                      const tax = DEFECT_TAXONOMY[det.class_name];
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tax?.color || "#F59E0B" }}
                            />
                            <div>
                              <div className="font-semibold text-[#1B2559] flex items-center gap-1.5">
                                {det.label}
                                {tax?.structural && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-bold uppercase">
                                    Structural
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Area: {det.area_percentage}% of photo | BBox: [{det.bbox.x1}, {det.bbox.y1}, {det.bbox.x2}, {det.bbox.y2}]
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-mono font-bold text-slate-800">
                                {Math.round(det.confidence * 100)}%
                              </div>
                              <div className="text-[10px] text-slate-400">Confidence</div>
                            </div>

                            <span
                              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                                det.severity === "critical"
                                  ? "bg-red-100 text-red-800"
                                  : det.severity === "major"
                                  ? "bg-orange-100 text-orange-800"
                                  : det.severity === "moderate"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {det.severity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mandatory Permanent Disclaimer Card */}
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-4 h-4 text-slate-500" />
                  Mandatory Professional Disclaimer
                </div>
                <p className="leading-relaxed">{activeResult.disclaimer}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Combined Findings Modal */}
      {showCombinedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#1B2559] flex items-center gap-2">
                  <DropletIcon className="w-5 h-5 text-[#79566F]" />
                  Combined Inspection Damage Summary
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspection ID: <code className="font-mono">{selectedInspectionId}</code>
                </p>
              </div>
              <button
                onClick={() => setShowCombinedModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {loadingCombined ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto text-amber-600" />
                <div className="text-sm font-medium">Aggregating cross-modal inspection findings...</div>
              </div>
            ) : combinedData ? (
              <div className="space-y-5">
                {/* Overall Severity Status */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase font-semibold text-slate-500">Highest Combined Severity</div>
                    <div
                      className={`text-xl font-extrabold uppercase mt-0.5 ${
                        combinedData.highest_severity === "critical"
                          ? "text-red-600"
                          : combinedData.highest_severity === "major" || combinedData.highest_severity === "high"
                          ? "text-orange-600"
                          : combinedData.highest_severity === "moderate"
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {combinedData.highest_severity}
                    </div>
                  </div>
                  {combinedData.breakage_findings?.structural_engineer_required && (
                    <span className="px-3 py-1.5 rounded-lg bg-red-100 text-red-900 font-bold text-xs uppercase border border-red-200">
                      Structural Assessment Required
                    </span>
                  )}
                </div>

                {/* Moisture vs Breakage Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Moisture Card */}
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                    <div className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1.5">
                      <DropletIcon className="w-4 h-4 text-blue-600" />
                      Moisture Observations (YOLO)
                    </div>
                    {combinedData.moisture_findings ? (
                      <>
                        <div className="text-sm text-slate-700">
                          Water/Mould Defects: <strong>{combinedData.moisture_findings.total_defects}</strong>
                        </div>
                        <div className="text-sm text-slate-700">
                          Risk Classification: <span className="font-bold uppercase">{combinedData.moisture_findings.risk_classification}</span>
                        </div>
                        <div className="text-xs text-slate-600 italic">
                          {combinedData.moisture_findings.recommendation}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No moisture analysis on file for this inspection.</div>
                    )}
                  </div>

                  {/* Breakage Card */}
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                    <div className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                      <SparklesIcon className="w-4 h-4 text-amber-600" />
                      Structural Breakage (YOLO)
                    </div>
                    {combinedData.breakage_findings ? (
                      <>
                        <div className="text-sm text-slate-700">
                          Structural Defects: <strong>{combinedData.breakage_findings.structural_defect_count}</strong> (Cosmetic: {combinedData.breakage_findings.cosmetic_defect_count})
                        </div>
                        <div className="text-sm text-slate-700">
                          Severity: <span className="font-bold uppercase">{combinedData.breakage_findings.severity_classification}</span>
                        </div>
                        <div className="text-xs text-slate-600 italic">
                          {combinedData.breakage_findings.recommendation}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No breakage analysis on file for this inspection.</div>
                    )}
                  </div>
                </div>

                {/* Combined Action Recommendations */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#1B2559] uppercase tracking-wider">
                    Combined Maintenance & Remediation Roadmap
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {combinedData.combined_recommendation}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-slate-500">
                No combined findings available for this inspection.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
