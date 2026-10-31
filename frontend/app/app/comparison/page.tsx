"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  SparklesIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BuildingIcon,
  ClockIcon,
  RefreshCwIcon,
  CameraIcon,
  ArrowRightIcon,
  EyeIcon,
} from "@/components/Icons";
import { apiClient } from "@/lib/apiClient";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";

interface DamageComparisonData {
  comparison_id: string;
  property_id?: string;
  inspection_zone?: string;
  previous_date?: string;
  current_date?: string;
  change_status: "deterioration" | "improvement" | "no_significant_change";
  change_percentage: number;
  alignment_quality: number;
  alignment_method: string;
  change_summary: string;
  previous_image_url: string;
  current_image_url: string;
  aligned_current_url: string;
  difference_heatmap_url: string;
  scientific_disclaimer: string;
}

export default function DamageComparisonPage() {
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"slider" | "side_by_side" | "heatmap">("slider");
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 - 100
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<DamageComparisonData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // File upload state
  const [prevImageBase64, setPrevImageBase64] = useState<string>("");
  const [currImageBase64, setCurrImageBase64] = useState<string>("");
  const [prevDate, setPrevDate] = useState<string>("2026-01-15");
  const [currDate, setCurrDate] = useState<string>("2026-10-28");
  const [zoneName, setZoneName] = useState<string>("Master Bedroom North Gable Wall");

  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProps() {
      try {
        const props = await fetchProperties();
        setProperties(props);
        if (props.length > 0) {
          setSelectedPropertyId(props[0].id);
        }
      } catch (err) {
        console.warn("Failed to load properties:", err);
      }
    }
    loadProps();
  }, []);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "prev" | "curr"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      if (target === "prev") setPrevImageBase64(b64);
      else setCurrImageBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteComparison = async () => {
    if (!prevImageBase64 || !currImageBase64) {
      setError("Please provide both historical (before) and current (after) photographs.");
      return;
    }

    setIsComparing(true);
    setError(null);

    try {
      const data = await apiClient.post<DamageComparisonData>("/api/v1/analyze/compare", {
        previous_image: prevImageBase64,
        current_image: currImageBase64,
        property_id: selectedPropertyId,
        inspection_zone: zoneName,
        previous_date: prevDate,
        current_date: currDate,
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Failed to execute computer vision damage comparison.");
    } finally {
      setIsComparing(false);
    }
  };

  // Slider drag handling
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!sliderRef.current || !e.touches[0]) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/dashboard" className="hover:text-[#79566F]">
              Dashboard
            </Link>
            <span>/</span>
            <span>Diagnostic Vision</span>
            <span>/</span>
            <span>Damage Comparison</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Before-and-After Damage Comparison
          </h1>
          <p className="text-xs text-[#806C7B]">
            Automated SIFT planar alignment, exposure compensation, and structural delta tracking across inspection intervals
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-1 bg-white border border-[#E6D5DC] rounded-xl shadow-xs">
          <button
            onClick={() => setViewMode("slider")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === "slider" ? "bg-[#79566F] text-white" : "text-[#806C7B] hover:text-[#493344]"
            }`}
          >
            Split Slider
          </button>
          <button
            onClick={() => setViewMode("side_by_side")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === "side_by_side" ? "bg-[#79566F] text-white" : "text-[#806C7B] hover:text-[#493344]"
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode("heatmap")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === "heatmap" ? "bg-[#79566F] text-white" : "text-[#806C7B] hover:text-[#493344]"
            }`}
          >
            Change Heatmap
          </button>
        </div>
      </div>

      {/* Statutory Methodology Disclaimer */}
      <div className="p-3.5 rounded-xl bg-[#EFF8F3] border border-[#4A8B71]/30 text-xs text-[#285A44] flex items-start gap-2.5">
        <SparklesIcon size={16} className="text-[#4A8B71] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Photogrammetric Calibration: </span>
          {result?.scientific_disclaimer ||
            "Software utilizes SIFT homographic registration and median-gain exposure normalization. Lighting variances and viewing angles are accounted for, distinguishing real property deterioration from camera differences."}
        </div>
      </div>

      {/* Upload & Parameter Card */}
      <div className="p-5 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#493344] mb-1">Target Property</label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_name} ({p.postcode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#493344] mb-1">Monitored Zone / Room</label>
            <input
              type="text"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExecuteComparison}
              disabled={isComparing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#79566F] hover:bg-[#63445A] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <RefreshCwIcon size={14} className={isComparing ? "animate-spin" : ""} />
              {isComparing ? "Aligning & Comparing..." : "Run Damage Comparison"}
            </button>
          </div>
        </div>

        {/* Two Image Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Previous Image */}
          <div className="p-4 rounded-xl border border-dashed border-[#E6D5DC] bg-[#F7EDE5]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#493344]">Historical (Before) Photograph</span>
              <input
                type="date"
                value={prevDate}
                onChange={(e) => setPrevDate(e.target.value)}
                className="text-[11px] px-2 py-0.5 rounded border border-[#E6D5DC] bg-white"
              />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "prev")}
              className="text-xs text-[#806C7B] mb-2 w-full"
            />
            {prevImageBase64 ? (
              <img
                src={prevImageBase64}
                alt="Previous"
                className="w-full h-44 object-cover rounded-lg border border-[#E6D5DC]"
              />
            ) : (
              <div className="w-full h-44 flex flex-col items-center justify-center text-xs text-[#806C7B] bg-white rounded-lg border border-[#E6D5DC]">
                <CameraIcon size={24} className="mb-1 opacity-50" />
                Upload baseline historical photo
              </div>
            )}
          </div>

          {/* Current Image */}
          <div className="p-4 rounded-xl border border-dashed border-[#E6D5DC] bg-[#F7EDE5]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#493344]">Current (After) Photograph</span>
              <input
                type="date"
                value={currDate}
                onChange={(e) => setCurrDate(e.target.value)}
                className="text-[11px] px-2 py-0.5 rounded border border-[#E6D5DC] bg-white"
              />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "curr")}
              className="text-xs text-[#806C7B] mb-2 w-full"
            />
            {currImageBase64 ? (
              <img
                src={currImageBase64}
                alt="Current"
                className="w-full h-44 object-cover rounded-lg border border-[#E6D5DC]"
              />
            ) : (
              <div className="w-full h-44 flex flex-col items-center justify-center text-xs text-[#806C7B] bg-white rounded-lg border border-[#E6D5DC]">
                <CameraIcon size={24} className="mb-1 opacity-50" />
                Upload recent follow-up photo
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#FDF2F4] border border-[#C84661]/30 text-xs text-[#C84661]">
            {error}
          </div>
        )}
      </div>

      {/* Comparison Results Area */}
      {result && (
        <div className="space-y-4">
          {/* Status Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs">
              <span className="text-[11px] font-semibold text-[#806C7B]">Structural Change Status</span>
              <div className="mt-1 flex items-center gap-2">
                {result.change_status === "deterioration" && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/30">
                    Visible Deterioration
                  </span>
                )}
                {result.change_status === "improvement" && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/30">
                    Defect Improvement
                  </span>
                )}
                {result.change_status === "no_significant_change" && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#FEF9E7] text-[#8C6D1F] border border-[#8C6D1F]/30">
                    No Significant Change
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs">
              <span className="text-[11px] font-semibold text-[#806C7B]">Surface Deviation</span>
              <div className="mt-1 text-xl font-extrabold text-[#493344]">
                {result.change_percentage}%
              </div>
              <span className="text-[11px] text-[#806C7B]">Multichannel pixel difference</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs">
              <span className="text-[11px] font-semibold text-[#806C7B]">SIFT Planar Homography</span>
              <div className="mt-1 text-xl font-extrabold text-[#4A8B71]">
                {result.alignment_quality}%
              </div>
              <span className="text-[11px] text-[#806C7B] truncate block">{result.alignment_method}</span>
            </div>
          </div>

          {/* Interactive Viewer Panel */}
          <div className="p-5 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-[#806C7B]">
              <span className="font-semibold text-[#493344]">Interactive Visual Comparison</span>
              <span>
                Before ({result.previous_date}) ↔ After ({result.current_date})
              </span>
            </div>

            {/* Slider Mode */}
            {viewMode === "slider" && (
              <div
                ref={sliderRef}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                className="relative w-full h-[420px] rounded-xl overflow-hidden select-none cursor-ew-resize border border-[#E6D5DC]"
              >
                {/* Background: Current / After image */}
                <img
                  src={result.aligned_current_url || result.current_image_url}
                  alt="After"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Foreground: Previous / Before image, clipped by sliderPos */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={result.previous_image_url}
                    alt="Before"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ width: `${100 / (sliderPos / 100 || 0.01)}%`, maxWidth: "none" }}
                  />
                </div>

                {/* Vertical Divider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md flex items-center justify-center pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-8 h-8 rounded-full bg-[#79566F] text-white flex items-center justify-center text-[10px] font-bold shadow-lg border-2 border-white">
                    ↔
                  </div>
                </div>

                {/* Badges on viewer */}
                <span className="absolute top-3 left-3 px-2 py-1 bg-black/60 text-white rounded text-[10px] font-semibold backdrop-blur-xs">
                  Historical: {result.previous_date}
                </span>
                <span className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white rounded text-[10px] font-semibold backdrop-blur-xs">
                  Current: {result.current_date}
                </span>
              </div>
            )}

            {/* Side-by-Side Mode */}
            {viewMode === "side_by_side" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-bold text-[#806C7B] mb-1">
                    Previous: {result.previous_date}
                  </div>
                  <img
                    src={result.previous_image_url}
                    alt="Previous"
                    className="w-full h-72 object-cover rounded-xl border border-[#E6D5DC]"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#806C7B] mb-1">
                    Current: {result.current_date} (Aligned)
                  </div>
                  <img
                    src={result.aligned_current_url}
                    alt="Current"
                    className="w-full h-72 object-cover rounded-xl border border-[#E6D5DC]"
                  />
                </div>
              </div>
            )}

            {/* Heatmap Mode */}
            {viewMode === "heatmap" && (
              <div>
                <div className="text-[11px] font-bold text-[#806C7B] mb-1">
                  Visible Change Density Overlay (Jet Colormap)
                </div>
                <img
                  src={result.difference_heatmap_url}
                  alt="Heatmap"
                  className="w-full h-[400px] object-cover rounded-xl border border-[#E6D5DC]"
                />
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#F7EDE5]/50 border border-[#E6D5DC] text-xs text-[#493344]">
              <span className="font-bold">Automated Analysis Summary: </span>
              {result.change_summary}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
