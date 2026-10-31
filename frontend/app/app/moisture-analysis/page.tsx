/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
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
} from "@/components/Icons";
import { fetchInspections, InspectionReport } from "@/lib/services/inspectionService";
import {
  executeMoistureAnalysis,
  fetchAnalysisByReportId,
  MoistureAnalysisRecord,
} from "@/lib/services/moistureAnalysisService";
import { useRole } from "@/components/app/RoleContext";

export default function MoistureAnalysisPage() {
  const searchParams = useSearchParams();
  const inspectionQuery = searchParams.get("inspection") || "";
  const { role } = useRole();

  // State
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>(inspectionQuery);
  const [selectedInspection, setSelectedInspection] = useState<InspectionReport | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MoistureAnalysisRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View state
  const [activeTab, setActiveTab] = useState<"heatmap" | "processed" | "original" | "comparison">("heatmap");
  const [sensitivity, setSensitivity] = useState<number>(0.5);
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  // Load inspections and select initial
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const all = await fetchInspections();
      setInspections(all);

      const targetId = inspectionQuery || (all.length > 0 ? all[0].id : "");
      setSelectedInspectionId(targetId);

      const found = all.find((i) => i.id === targetId) || all[0] || null;
      setSelectedInspection(found);

      if (found) {
        const savedAnalysis = await fetchAnalysisByReportId(found.id);
        if (savedAnalysis) {
          setAnalysisResult(savedAnalysis);
        }
      }
      setIsLoading(false);
    }
    loadData();
  }, [inspectionQuery]);

  // Handle switching inspection
  const handleSelectInspection = async (id: string) => {
    setSelectedInspectionId(id);
    const found = inspections.find((i) => i.id === id) || null;
    setSelectedInspection(found);
    setErrorMessage(null);

    if (found) {
      const saved = await fetchAnalysisByReportId(found.id);
      setAnalysisResult(saved);
    } else {
      setAnalysisResult(null);
    }
  };

  // Run Real OpenCV Analysis
  const handleRunAnalysis = async () => {
    if (!selectedInspection || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressPercent(15);
    setProcessingStep("Ingesting original inspection photograph from storage...");

    try {
      setTimeout(() => {
        setProgressPercent(40);
        setProcessingStep("Validating optical illumination & focus sharpness...");
      }, 300);

      setTimeout(() => {
        setProgressPercent(70);
        setProcessingStep("Evaluating water stain tidemarks, discoloration & texture disruption...");
      }, 700);

      const result = await executeMoistureAnalysis(selectedInspection, sensitivity);

      setProgressPercent(95);
      setProcessingStep("Synthesizing false-colour JET anomaly heatmap & surveyor actions...");

      setTimeout(() => {
        setAnalysisResult(result);
        setProgressPercent(100);
        setIsProcessing(false);
        setProcessingStep("");
      }, 1000);
    } catch (err: unknown) {
      console.error("Moisture analysis failure", err);
      const msg = err instanceof Error ? err.message : "Analysis service unreachable. Please ensure the Python FastAPI engine is active on http://127.0.0.1:8000.";
      setErrorMessage(msg);
      setIsProcessing(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/30";
      case "high":
        return "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/30";
      case "moderate":
        return "bg-[#FEF9C3] text-[#CA8A04] border border-[#CA8A04]/30";
      default:
        return "bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/30";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/inspections" className="hover:text-[#79566F]">
              Inspection Registry
            </Link>
            <span>/</span>
            <span>Moisture &amp; Defect Analysis</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Image-Based Moisture &amp; Defect Detection
          </h1>
          <p className="text-xs text-[#806C7B]">
            OpenCV &amp; NumPy optical diagnostics: Tidemark rings, chromatic discoloration, peeling paint, and specular reflection
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/app/analysis/moisture"
            className="px-3.5 py-2 rounded-xl bg-[#4A8B71] text-white text-xs font-bold hover:bg-[#3B6F5A] shadow-md shadow-[#4A8B71]/20 transition-colors flex items-center gap-1.5"
          >
            <SparklesIcon size={14} />
            <span>Launch YOLO Moisture AI</span>
          </Link>
          <Link
            href="/app/inspections"
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            &larr; Return to Inspections
          </Link>
          <Link
            href="/app/risk-triage"
            className="px-3.5 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] shadow-md shadow-[#79566F]/20 transition-colors"
          >
            View Risk Triage
          </Link>
        </div>
      </div>

      {/* Mandatory Limitations & Confidence Notice */}
      <div className="bg-[#FDF5ED] border border-[#B86B35]/30 rounded-3xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
        <AlertTriangleIcon size={20} className="text-[#B86B35] shrink-0 mt-0.5" />
        <div className="text-xs text-[#493344]">
          <strong className="font-bold text-[#B86B35] block mb-0.5">
            Diagnostic Standards &amp; Optical Anomaly Limitations:
          </strong>
          <span className="text-[#806C7B] leading-relaxed block">
            This analytical engine evaluates visible surface patterns (water tidemarks, chromatic discoloration, and surface texture disruptions). Optical indications serve as non-invasive early indicators and <strong className="text-[#493344]">do not prove</strong> concealed sub-surface pipe failure or biological mould species. All flagged areas require on-site verification with calibrated pin/dielectric moisture meter probes.
          </span>
        </div>
      </div>

      {/* Target Survey Selector Bar & Execution Controller */}
      <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Inspection selector */}
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
              Target Inspection:
            </span>
            {inspections.length > 0 ? (
              <select
                value={selectedInspectionId}
                onChange={(e) => handleSelectInspection(e.target.value)}
                className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-1.5 px-3 text-xs font-bold text-[#493344] focus:border-[#79566F] focus:outline-none cursor-pointer"
              >
                {inspections.map((insp) => (
                  <option key={insp.id} value={insp.id}>
                    {insp.id} — {insp.property_name} ({insp.inspection_zone})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-[#806C7B] italic">No inspection records found. Please create one first.</span>
            )}
          </div>

          {selectedInspection && (
            <div className="text-xs text-[#806C7B] pt-1">
              <strong className="text-[#493344]">{selectedInspection.property_name}</strong> &bull;{" "}
              {selectedInspection.floor} &bull; Zone: {selectedInspection.inspection_zone} &bull;{" "}
              {new Date(selectedInspection.created_at).toLocaleDateString("en-GB")}
            </div>
          )}
        </div>

        {/* Right: Sensitivity slider & Run Analysis button */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-[#F7EDE5] px-3 py-1.5 rounded-2xl border border-[#E6D5DC] text-xs">
            <span className="text-[#806C7B] font-semibold text-[11px]">Threshold Sensitivity:</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-24 accent-[#79566F] cursor-pointer"
            />
            <span className="font-mono font-bold text-[#79566F] text-[11px]">
              {(sensitivity * 100).toFixed(0)}%
            </span>
          </div>

          <button
            type="button"
            disabled={isProcessing || !selectedInspection}
            onClick={handleRunAnalysis}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              isProcessing
                ? "bg-[#79566F]/70 cursor-not-allowed"
                : "bg-[#79566F] hover:bg-[#67475E] shadow-[#79566F]/25"
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running OpenCV Analysis...</span>
              </>
            ) : (
              <>
                <SparklesIcon size={14} />
                <span>Run Moisture Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Feedback Banner */}
      {isProcessing && (
        <div className="p-4 rounded-2xl bg-white border border-[#79566F]/30 shadow-xs space-y-2 animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold text-[#493344]">
            <span className="flex items-center gap-2 text-[#79566F]">
              <ClockIcon size={14} />
              <span>{processingStep}</span>
            </span>
            <span className="font-mono text-[#79566F]">{progressPercent}%</span>
          </div>
          <div className="w-full bg-[#E6D5DC] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#79566F] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#C84661]/30 text-xs text-[#C84661] flex items-start gap-2.5">
          <AlertTriangleIcon size={16} className="shrink-0 mt-0.5" />
          <div>
            <strong>Optical Pipeline Notice:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Main Analysis Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Canvas & View Switcher (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-[#E6D5DC] shadow-xs text-[#493344] space-y-4">
            {/* View Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6D5DC]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B995AD] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#493344]">
                  {activeTab === "heatmap"
                    ? "False-Colour Moisture Heatmap (OpenCV JET)"
                    : activeTab === "processed"
                    ? "Processed Image (CLAHE Contrast Normalized)"
                    : activeTab === "original"
                    ? "Original Uploaded Photograph"
                    : "Interactive Optical Comparison"}
                </span>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-[#F7EDE5] border border-[#E6D5DC] p-1 rounded-xl text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("heatmap")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    activeTab === "heatmap"
                      ? "bg-[#79566F] text-white shadow-xs"
                      : "text-[#806C7B] hover:text-[#493344]"
                  }`}
                >
                  Anomaly Heatmap
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("processed")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    activeTab === "processed"
                      ? "bg-[#79566F] text-white shadow-xs"
                      : "text-[#806C7B] hover:text-[#493344]"
                  }`}
                >
                  Processed Image
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("original")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    activeTab === "original"
                      ? "bg-[#79566F] text-white shadow-xs"
                      : "text-[#806C7B] hover:text-[#493344]"
                  }`}
                >
                  Original Photo
                </button>
                {selectedInspection?.flash_img_url && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("comparison")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      activeTab === "comparison"
                        ? "bg-[#79566F] text-white shadow-xs"
                        : "text-[#806C7B] hover:text-[#493344]"
                    }`}
                  >
                    A/B Slider
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Image Display Area */}
            <div className="relative w-full h-96 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center select-none shadow-inner">
              {activeTab === "heatmap" && (
                analysisResult?.heatmap_url ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={analysisResult.heatmap_url}
                      alt="OpenCV Moisture Heatmap"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-mono text-[#B995AD] border border-white/10">
                      JET COLORMAP &bull; COMPOSITE OVERLAY
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 space-y-3 max-w-md">
                    <div className="w-12 h-12 rounded-2xl bg-[#EFE4EC] text-[#79566F] mx-auto flex items-center justify-center">
                      <DropletIcon size={24} />
                    </div>
                    <div className="text-sm font-bold text-slate-200">
                      No Anomaly Heatmap Generated Yet
                    </div>
                    <p className="text-xs text-slate-400">
                      Optical processing has not run on this inspection image yet. Click &quot;Run Moisture Analysis&quot; above to execute the OpenCV anomaly detection pipeline.
                    </p>
                    <button
                      type="button"
                      disabled={isProcessing || !selectedInspection}
                      onClick={handleRunAnalysis}
                      className="px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <SparklesIcon size={14} />
                      <span>Process Photo Now</span>
                    </button>
                  </div>
                )
              )}

              {activeTab === "processed" && (
                analysisResult?.processed_image_url ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={analysisResult.processed_image_url}
                      alt="Processed Normalized Image"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-mono text-[#4A8B71] border border-white/10">
                      CLAHE NORMALIZED L* CHANNEL (OPENCV)
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 space-y-2 max-w-sm text-slate-400 text-xs">
                    <div className="font-bold text-slate-200">CLAHE Channel Not Yet Generated</div>
                    <p>Contrast-normalized optical channel is produced when you run OpenCV analysis on this inspection image.</p>
                  </div>
                )
              )}

              {activeTab === "original" && (
                <div className="w-full h-full relative flex items-center justify-center">
                  {selectedInspection?.ambient_img_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedInspection.ambient_img_url}
                        alt="Original Uploaded Evidence"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-mono text-white border border-white/10">
                        ORIGINAL INSPECTION PHOTOGRAPH (SAVED IN STORAGE)
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-8 text-slate-400 text-xs">
                      No photographic image attached to this inspection record.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "comparison" && selectedInspection?.flash_img_url && (
                <div className="w-full h-full relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedInspection.ambient_img_url}
                    alt="Ambient Baseline"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-[#79566F] shadow-2xl"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedInspection.flash_img_url}
                      alt="Flash Specular"
                      className="absolute inset-0 w-full h-full object-cover max-w-none"
                      style={{ width: "100%", height: "100%" }}
                    />
                    <div className="absolute top-3 left-3 bg-black/70 px-2 py-0.5 rounded text-[10px] text-[#B995AD] font-mono">
                      FLASH SPECULAR
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 bg-black/70 px-2 py-0.5 rounded text-[10px] text-[#806C7B] font-mono">
                    AMBIENT BASELINE
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(parseInt(e.target.value, 10))}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 accent-[#79566F] cursor-ew-resize opacity-80 hover:opacity-100 transition-opacity"
                  />
                </div>
              )}
            </div>

            {/* Source Images Preview Row */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-[#493344] block">
                Saved Inspection Photographs Available for Analysis:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(selectedInspection?.images && selectedInspection.images.length > 0
                  ? selectedInspection.images
                  : [
                      ...(selectedInspection?.ambient_img_url
                        ? [
                            {
                              id: "ambient-0",
                              url: selectedInspection.ambient_img_url,
                              file_name: "Primary Inspection Photo",
                              storage_path: selectedInspection.ambient_img_path,
                            },
                          ]
                        : []),
                      ...(selectedInspection?.flash_img_url
                        ? [
                            {
                              id: "flash-1",
                              url: selectedInspection.flash_img_url,
                              file_name: "Secondary Flash Photo",
                              storage_path: selectedInspection.flash_img_path,
                            },
                          ]
                        : []),
                    ]
                ).map((img, idx) => (
                  <div
                    key={img.id || idx}
                    className="p-3 bg-[#F7EDE5] rounded-2xl border border-[#E6D5DC] flex items-center gap-3"
                  >
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-[#E6D5DC]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.file_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs truncate">
                      <div className="font-semibold text-[#493344] truncate" title={img.file_name}>
                        {idx === 0 ? "Photo #1 (Primary Analysis)" : `Photo #${idx + 1}`}
                      </div>
                      <div className="text-[10px] text-[#806C7B] truncate">
                        {img.file_name || "inspection-images bucket"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detected Anomalous Regions Table */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6D5DC]">
              <div>
                <h3 className="text-sm font-bold text-[#493344]">
                  Detected Connected Anomaly Clusters ({analysisResult?.regions.length || 0})
                </h3>
                <p className="text-[11px] text-[#806C7B]">
                  Surface area, centroid coordinate, bounding box, and priority level
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#79566F] bg-[#EFE4EC] px-2 py-0.5 rounded-md">
                Min Area: 120 px
              </span>
            </div>

            {analysisResult?.regions && analysisResult.regions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E6D5DC] text-[10px] font-bold uppercase text-[#806C7B]">
                      <th className="py-2.5 px-3">Zone ID</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Surface Coverage</th>
                      <th className="py-2.5 px-3">Centroid (X, Y)</th>
                      <th className="py-2.5 px-3">Relative Intensity</th>
                      <th className="py-2.5 px-3">Bounding Box</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D5DC]">
                    {analysisResult.regions.map((reg) => (
                      <tr key={reg.id} className="hover:bg-[#F7EDE5]/60 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#79566F]">
                          Zone #{reg.id}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getSeverityBadge(
                              reg.severity
                            )}`}
                          >
                            {reg.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#493344]">
                          {reg.area_percentage}% ({reg.area_pixels.toLocaleString()} px)
                        </td>
                        <td className="py-3 px-3 font-mono text-[#806C7B]">
                          ({reg.centroid.x}, {reg.centroid.y})
                        </td>
                        <td className="py-3 px-3 font-bold text-[#493344]">
                          {reg.mean_intensity}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#806C7B]">
                          {reg.bounding_box.width}x{reg.bounding_box.height} at ({reg.bounding_box.x}, {reg.bounding_box.y})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#806C7B]">
                {analysisResult
                  ? "No anomalous visual clusters detected. Surface characteristics align with uniform dry substrate."
                  : "Click 'Run Moisture Analysis' above to evaluate photographic evidence."}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Identified Observations, Status & Recommended Actions */}
        <div className="space-y-6">
          {/* Analysis Status & Telemetry Card */}
          <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6D5DC]">
              <span className="text-xs font-bold text-[#493344]">Diagnostic Status &amp; Telemetry</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
                  analysisResult?.processing_status === "completed"
                    ? "text-[#4A8B71] bg-[#EFF8F3]"
                    : analysisResult?.processing_status === "failed"
                    ? "text-[#C84661] bg-[#FDF2F4]"
                    : "text-[#806C7B] bg-[#F7EDE5]"
                }`}
              >
                {analysisResult ? analysisResult.processing_status.toUpperCase() : "AWAITING RUN"}
              </span>
            </div>

            <div className="space-y-3">
              {/* Metric: Anomaly Coverage % */}
              <div className="p-3 bg-[#F7EDE5] rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-[#806C7B] block">
                  Anomaly Surface Coverage
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-extrabold text-[#493344]">
                    {analysisResult ? `${analysisResult.difference_percentage}%` : "--"}
                  </span>
                  <span className="text-xs font-semibold text-[#79566F]">
                    {analysisResult && analysisResult.difference_percentage > 4.0
                      ? "Elevated Variance"
                      : "Nominal"}
                  </span>
                </div>
              </div>

              {/* Metric: SIFT / Detection Method */}
              <div className="p-3 bg-[#F7EDE5] rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-[#806C7B] block">
                  Optical Pipeline Architecture
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-[#493344] truncate">
                    {analysisResult?.alignment_method || "OpenCV Multi-Channel"}
                  </span>
                  <span className="text-[11px] text-[#806C7B] font-mono shrink-0">
                    {analysisResult?.execution_time_ms ? `${analysisResult.execution_time_ms} ms` : ""}
                  </span>
                </div>
              </div>

              {/* Metric: Cluster Count */}
              <div className="p-3 bg-[#F7EDE5] rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-[#806C7B] block">
                  Identified Anomaly Clusters
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-extrabold text-[#493344]">
                    {analysisResult ? analysisResult.anomaly_count : "--"}
                  </span>
                  <span className="text-xs text-[#806C7B]">Discrete Zones</span>
                </div>
              </div>
            </div>
          </div>

          {/* Identified Visual Observations Card */}
          <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-3">
            <span className="text-xs font-bold text-[#493344] block pb-2 border-b border-[#E6D5DC]">
              Identified Visual Observations
            </span>

            {analysisResult && analysisResult.visual_observations?.length > 0 ? (
              <ul className="space-y-2 text-xs text-[#493344]">
                {analysisResult.visual_observations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-[#F7EDE5] p-2.5 rounded-xl border border-[#E6D5DC]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#79566F] shrink-0 mt-1.5" />
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-[#806C7B] italic">
                {analysisResult ? "No suspicious visual patterns identified." : "Run analysis to detect visual indicators."}
              </div>
            )}
          </div>

          {/* Recommended Manual Inspection Actions Card */}
          <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-3">
            <span className="text-xs font-bold text-[#493344] block pb-2 border-b border-[#E6D5DC]">
              Recommended Manual Inspection Actions
            </span>

            {analysisResult && analysisResult.recommended_actions?.length > 0 ? (
              <ul className="space-y-2 text-xs text-[#493344]">
                {analysisResult.recommended_actions.map((act, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-[#EFF8F3] p-2.5 rounded-xl border border-[#4A8B71]/30 text-[#493344]">
                    <CheckCircleIcon size={14} className="text-[#4A8B71] shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-[#806C7B] italic">
                {analysisResult ? "Routine maintenance protocol." : "Action recommendations will be generated based on visual findings."}
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <Link
                href={`/app/inspections/${selectedInspectionId}`}
                className="w-full py-2.5 px-3 rounded-xl border border-[#E6D5DC] hover:bg-[#F7EDE5] text-[#493344] text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Back to Inspection Details</span>
                <ArrowRightIcon size={12} />
              </Link>

              {(role === "admin" || role === "manager") && (
                <Link
                  href={`/app/work-orders?property=${selectedInspection?.property_id}&inspection=${selectedInspectionId}`}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold flex items-center justify-between transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <WrenchIcon size={14} />
                    <span>Dispatch Remediation Contractor</span>
                  </div>
                  <ArrowRightIcon size={12} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
