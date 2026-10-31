"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DropletIcon,
  SparklesIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CameraIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  BuildingIcon,
  ClockIcon,
  WrenchIcon,
  SearchIcon,
  UploadCloudIcon,
  XIcon,
} from "@/components/Icons";
import { fetchInspections, InspectionReport } from "@/lib/services/inspectionService";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";
import {
  fetchYoloModelStatus,
  runYoloMoistureDetection,
  fetchYoloMoistureHistory,
  YoloModelStatus,
  YoloMoistureDetectionResult,
  DefectDetection,
} from "@/lib/services/yoloMoistureService";

const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

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

const DEFECT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  water_stain: { label: "Water Stain", color: "#3B82F6", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  damp_patch: { label: "Damp Patch", color: "#06B6D4", bg: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  wall_moisture_damage: { label: "Wall Moisture Damage", color: "#F97316", bg: "bg-orange-50 text-orange-700 border-orange-200" },
  ceiling_water_damage: { label: "Ceiling Water Damage", color: "#A855F7", bg: "bg-purple-50 text-purple-700 border-purple-200" },
  peeling_paint: { label: "Peeling / Bubbling Paint", color: "#EAB308", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  visible_mould: { label: "Visible Mould-Like Growth", color: "#EF4444", bg: "bg-red-50 text-red-700 border-red-200" },
  leakage_mark: { label: "Water Leakage Mark", color: "#EC4899", bg: "bg-pink-50 text-pink-700 border-pink-200" },
  plaster_deterioration: { label: "Plaster Deterioration", color: "#64748B", bg: "bg-slate-50 text-slate-700 border-slate-200" },
};

export default function YoloMoistureAnalysisPage() {
  const searchParams = useSearchParams();
  const initialInspectionId = searchParams.get("inspection") || "";
  const initialPropertyId = searchParams.get("property") || "";

  // Data states
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>(initialInspectionId);

  // Model status
  const [modelStatus, setModelStatus] = useState<YoloModelStatus | null>(null);
  const [loadingModelStatus, setLoadingModelStatus] = useState(true);

  // Image upload gallery state
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inference state
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [activeResult, setActiveResult] = useState<YoloMoistureDetectionResult | null>(null);
  const [historyResults, setHistoryResults] = useState<YoloMoistureDetectionResult[]>([]);
  const [viewMode, setViewMode] = useState<"annotated" | "original" | "split">("annotated");
  const [generalError, setGeneralError] = useState<string | null>(null);

  // 1. Initial data loading
  useEffect(() => {
    async function init() {
      try {
        const [statusData, propsData, inspData] = await Promise.all([
          fetchYoloModelStatus(),
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
      const history = await fetchYoloMoistureHistory(selectedInspectionId);
      setHistoryResults(history);
      if (history.length > 0 && !activeResult) {
        setActiveResult(history[0]);
      }
    }
    loadHistory();
  }, [selectedInspectionId, activeResult]);

  // File upload handler
  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: UploadedImageItem[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      if (!ALLOWED_EXTENSIONS.test(file.name)) {
        errors.push(`"${file.name}": Unsupported format. Only JPG, JPEG, PNG, WEBP are accepted.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${file.name}": File size (${formatBytes(file.size)}) exceeds 20MB limit.`);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        formattedSize: formatBytes(file.size),
      });
    });

    if (errors.length > 0) {
      setUploadError(errors.join(" "));
    }

    if (newItems.length > 0) {
      setUploadedImages((prev) => {
        const combined = [...prev, ...newItems];
        if (prev.length === 0) {
          setSelectedImageIndex(0);
        }
        return combined;
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove image from gallery
  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages((prev) => {
      const target = prev[indexToRemove];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      if (selectedImageIndex >= filtered.length) {
        setSelectedImageIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  // Run YOLO Inference
  const handleRunDetection = async () => {
    if (uploadedImages.length === 0) {
      setUploadError("Please upload an inspection image first.");
      return;
    }

    const currentImage = uploadedImages[selectedImageIndex];
    if (!currentImage) return;

    setIsAnalysing(true);
    setGeneralError(null);

    try {
      const result = await runYoloMoistureDetection(
        currentImage.file,
        selectedInspectionId || undefined,
        selectedPropertyId || undefined
      );

      setActiveResult(result);
      if (result.inspection_id) {
        setHistoryResults((prev) => [result, ...prev.filter((r) => r.result_id !== result.result_id)]);
      }
    } catch (err: unknown) {
      console.error("YOLO detection error:", err);
      const msg = err instanceof Error ? err.message : "Inference execution failed.";
      setGeneralError(msg);
    } finally {
      setIsAnalysing(false);
    }
  };

  const currentImage = uploadedImages[selectedImageIndex] || null;
  const filteredInspections = selectedPropertyId
    ? inspections.filter((i) => i.property_id === selectedPropertyId)
    : inspections;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/dashboard" className="hover:text-[#79566F]">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/app/inspections" className="hover:text-[#79566F]">
              Inspections
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#493344]">YOLO Moisture Detection</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight flex items-center gap-2">
            <span>AI Moisture &amp; Water Damage Detection</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EFE4EC] text-[#79566F] border border-[#79566F]/20">
              Ultralytics YOLO
            </span>
          </h1>
          <p className="text-xs text-[#806C7B]">
            Automated visual defect localization for water stains, damp patches, wall/ceiling damage, peeling paint, and mould-like growth.
          </p>
        </div>

        {/* Model Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border ${
              modelStatus?.configured
                ? "bg-[#4A8B71]/10 text-[#4A8B71] border-[#4A8B71]/30"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                modelStatus?.configured ? "bg-[#4A8B71] animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>
              {loadingModelStatus
                ? "Checking YOLO Engine..."
                : modelStatus?.configured
                ? "YOLO Weights Active"
                : "Weights Not Configured"}
            </span>
          </div>
        </div>
      </div>

      {/* Model Not Configured Banner (Strictly Truthful - Never Fabricates) */}
      {!loadingModelStatus && !modelStatus?.configured && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3.5 text-xs text-amber-900 shadow-xs">
          <AlertTriangleIcon size={20} className="shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-amber-950 text-sm">
              Moisture detection model is not configured. Add trained YOLO weights to enable AI detection.
            </div>
            <p className="text-amber-800 leading-relaxed">
              PropCare NW strictly adheres to authentic AI evaluation and does not fabricate detections or show synthetic bounding boxes.
              To activate automated moisture object detection, place trained weights at{" "}
              <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-[11px] border border-amber-200 text-amber-950">
                backend/models/moisture_best.pt
              </code>{" "}
              or specify <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-[11px] border border-amber-200">YOLO_MODEL_PATH</code>.
            </p>
            <div className="pt-1.5 flex flex-wrap gap-2 text-[11px]">
              <span className="font-semibold text-amber-900">Supported Target Classes:</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">Water stains</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">Damp patches</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">Wall moisture damage</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">Ceiling water damage</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">Peeling/bubbling paint</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200 font-bold text-red-700">Visible mould</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">Leakage marks</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">Plaster deterioration</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {(uploadError || generalError) && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon size={16} className="text-red-500 shrink-0" />
            <span>{uploadError || generalError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              setGeneralError(null);
            }}
            className="text-red-500 hover:text-red-700"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Main Grid: Control Panel (Left) & Visualizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Context, Upload, and Actions */}
        <div className="lg:col-span-5 space-y-5">
          {/* Inspection and Property Selectors */}
          <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#493344] flex items-center gap-2">
              <BuildingIcon size={16} className="text-[#79566F]" />
              <span>Inspection Context</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#806C7B] mb-1">
                  Target Property
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    const matching = inspections.filter((i) => i.property_id === e.target.value);
                    if (matching.length > 0) {
                      setSelectedInspectionId(matching[0].id);
                    }
                  }}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-hidden focus:border-[#79566F]"
                >
                  <option value="">Select a Property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.property_name} ({p.postal_code || p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#806C7B] mb-1">
                  Active Survey / Inspection
                </label>
                <select
                  value={selectedInspectionId}
                  onChange={(e) => setSelectedInspectionId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-hidden focus:border-[#79566F]"
                >
                  <option value="">Select an Inspection...</option>
                  {filteredInspections.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.id} – {i.inspection_zone || "General Zone"} ({new Date(i.created_at || Date.now()).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Upload & Gallery Module */}
          <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#493344] flex items-center gap-2">
                <CameraIcon size={16} className="text-[#79566F]" />
                <span>Inspection Photographs</span>
              </h2>
              <span className="text-[11px] text-[#806C7B]">
                {uploadedImages.length} image{uploadedImages.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Dropzone / Upload Trigger */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E6D5DC] hover:border-[#79566F] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#FDF9F7]/60 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFilesChosen}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-[#EFE4EC] text-[#79566F] mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
                <UploadCloudIcon size={20} />
              </div>
              <div className="mt-2 text-xs font-bold text-[#493344]">
                Choose or Drop Inspection Images
              </div>
              <div className="text-[10px] text-[#806C7B] mt-0.5">
                Supports JPG, JPEG, PNG, WEBP &bull; Max 20MB per photo
              </div>
            </div>

            {/* Thumbnail Gallery & Selection */}
            {uploadedImages.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-[#806C7B]">
                  Select Image to Inspect:
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {uploadedImages.map((img, idx) => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative rounded-xl border-2 overflow-hidden h-20 cursor-pointer group transition-all ${
                        selectedImageIndex === idx
                          ? "border-[#79566F] ring-2 ring-[#79566F]/20"
                          : "border-[#E6D5DC] hover:border-[#806C7B]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(idx);
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove image"
                      >
                        <XIcon size={10} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 text-[9px] text-white truncate font-mono">
                        #{idx + 1} {img.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={uploadedImages.length === 0 || isAnalysing}
                onClick={handleRunDetection}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  uploadedImages.length === 0 || isAnalysing
                    ? "bg-[#806C7B]/50 cursor-not-allowed shadow-none"
                    : "bg-[#79566F] hover:bg-[#67475E] shadow-[#79566F]/20"
                }`}
              >
                {isAnalysing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Running Ultralytics YOLO Inference...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon size={15} />
                    <span>
                      {activeResult ? "Re-analyse Selected Image" : "Run YOLO Moisture Detection"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Historical Results for this Inspection */}
          {historyResults.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#493344] flex items-center gap-1.5">
                  <ClockIcon size={14} className="text-[#79566F]" />
                  <span>Stored YOLO Records (MongoDB Atlas)</span>
                </h3>
                <span className="text-[10px] text-[#806C7B]">
                  {historyResults.length} records
                </span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {historyResults.map((rec) => (
                  <div
                    key={rec.result_id}
                    onClick={() => setActiveResult(rec)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      activeResult?.result_id === rec.result_id
                        ? "bg-[#EFE4EC] border-[#79566F] font-semibold text-[#493344]"
                        : "bg-[#FDF9F7] border-[#E6D5DC] hover:border-[#806C7B] text-[#806C7B]"
                    }`}
                  >
                    <div>
                      <div className="font-mono text-[10px] text-[#79566F]">
                        {rec.result_id}
                      </div>
                      <div className="text-[11px] text-[#493344]">
                        {rec.total_defects} Defect(s) &bull; Risk:{" "}
                        <span className="uppercase font-bold">{rec.risk_classification}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#806C7B]">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Visualizer, Defect Badges, Risk Card, and Disclaimer */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Inspection Image Visualizer */}
          <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6D5DC] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#493344] flex items-center gap-2">
                  <DropletIcon size={16} className="text-[#79566F]" />
                  <span>Visual Defect Inspection Plane</span>
                </h2>
                <div className="text-[11px] text-[#806C7B]">
                  {activeResult
                    ? `Result ID: ${activeResult.result_id}`
                    : currentImage
                    ? `Viewing: ${currentImage.name}`
                    : "No image loaded"}
                </div>
              </div>

              {/* View Toggle Tabs */}
              {activeResult && activeResult.annotated_image_url && (
                <div className="inline-flex rounded-xl bg-[#F7EDE5] p-1 border border-[#E6D5DC] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setViewMode("annotated")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === "annotated"
                        ? "bg-[#79566F] text-white shadow-xs"
                        : "text-[#806C7B] hover:text-[#493344]"
                    }`}
                  >
                    Annotated (YOLO)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("original")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === "original"
                        ? "bg-[#79566F] text-white shadow-xs"
                        : "text-[#806C7B] hover:text-[#493344]"
                    }`}
                  >
                    Original Photo
                  </button>
                </div>
              )}
            </div>

            {/* Display Canvas / Image Holder */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-[#E6D5DC] min-h-[380px] flex items-center justify-center">
              {currentImage || activeResult ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={
                    viewMode === "annotated" && activeResult?.annotated_image_url
                      ? activeResult.annotated_image_url
                      : activeResult?.original_image_url || currentImage?.previewUrl
                  }
                  alt="Moisture defect inspection"
                  className="w-full max-h-[500px] object-contain"
                />
              ) : (
                <div className="text-center p-8 text-slate-400 space-y-2">
                  <CameraIcon size={32} className="mx-auto text-slate-500" />
                  <p className="text-xs">
                    Upload an inspection photograph to begin automated moisture detection.
                  </p>
                </div>
              )}

              {/* Status Overlay Pill */}
              {activeResult && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono border border-white/20">
                  {activeResult.total_defects} Defect(s) &bull;{" "}
                  {activeResult.total_affected_area_percentage}% Surface Area
                </div>
              )}
            </div>

            {/* Technical Disclaimer Box (Requirement 5) */}
            <div className="p-3 bg-[#FDF9F7] rounded-xl border border-[#E6D5DC] text-[11px] text-[#806C7B] flex items-start gap-2">
              <span className="font-bold text-[#79566F] shrink-0">CRITICAL MEASUREMENT NOTICE:</span>
              <span>
                Visual detections and confidence scores represent optical pattern recognition of water stains, damp patches, and mould growth.
                Optical images <strong>do not measure true substrate moisture percentage (% WME)</strong>. Accurate moisture saturation requires verification using a calibrated pin or capacitance protimeter.
              </span>
            </div>
          </div>

          {/* Detections & Risk Breakdown Card */}
          {activeResult && (
            <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#493344]">
                  Detection Diagnostics &amp; Risk Assessment
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                    activeResult.risk_classification === "critical"
                      ? "bg-red-50 text-red-700 border-red-300"
                      : activeResult.risk_classification === "high"
                      ? "bg-orange-50 text-orange-700 border-orange-300"
                      : activeResult.risk_classification === "moderate"
                      ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-300"
                  }`}
                >
                  {activeResult.risk_classification} Risk &bull; Score: {activeResult.risk_score}/100
                </span>
              </div>

              {/* Detected Defect Badges */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#806C7B]">
                  Identified Defect Classes:
                </div>
                {activeResult.detections.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    {activeResult.model_configured
                      ? "No moisture defects detected in this photograph above the confidence threshold."
                      : "Moisture detection model is not configured. Add trained YOLO weights to enable AI detection."}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeResult.detections.map((d: DefectDetection, idx: number) => {
                      const meta = DEFECT_LABELS[d.class_name] || {
                        label: d.label,
                        bg: "bg-slate-50 text-slate-700 border-slate-200",
                      };
                      return (
                        <div
                          key={`det-${idx}`}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${meta.bg}`}
                        >
                          <span>{d.label}</span>
                          <span className="font-mono text-[10px] opacity-80">
                            {Math.round(d.confidence * 100)}% conf
                          </span>
                          <span className="text-[10px] opacity-70">
                            ({d.area_percentage}% area)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Risk Rationale & Statutory Recommendations */}
              <div className="space-y-2 pt-2 border-t border-[#E6D5DC]">
                <div className="text-xs font-semibold text-[#806C7B]">
                  Explainable Pathology Rationale:
                </div>
                <ul className="space-y-1 text-xs text-[#493344] list-disc list-inside">
                  {activeResult.risk_rationale.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>

                <div className="mt-3 p-3.5 rounded-xl bg-[#F7EDE5] border border-[#E6D5DC] space-y-1">
                  <div className="text-xs font-bold text-[#493344] flex items-center gap-1.5">
                    <WrenchIcon size={14} className="text-[#79566F]" />
                    <span>Recommended Next Action:</span>
                  </div>
                  <p className="text-xs text-[#493344] leading-relaxed">
                    {activeResult.recommendation}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#806C7B] pt-2">
                  <span>Engine: {activeResult.model_name} (v{activeResult.model_version})</span>
                  <span>Analyzed: {new Date(activeResult.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
