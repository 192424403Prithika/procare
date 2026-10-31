"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SparklesIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  DropletIcon,
  AcousticIcon,
  BuildingIcon,
  ClockIcon,
  WrenchIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  CameraIcon,
  MicIcon,
  ThermometerIcon,
  MapPinIcon,
  EyeIcon,
  EyeOffIcon,
} from "@/components/Icons";
import { fetchInspections, InspectionReport } from "@/lib/services/inspectionService";
import {
  runMultiDefectAnalysis,
  fetchMultiDefectByReportId,
  MultiDefectResult,
} from "@/lib/services/multiDefectService";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";

export default function MultiDefectDetectionPage() {
  const searchParams = useSearchParams();
  const inspectionQuery = searchParams.get("inspection") || "";

  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>(inspectionQuery);
  const [selectedInspection, setSelectedInspection] = useState<InspectionReport | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyRecord | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MultiDefectResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Load inspections and properties on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [allInspections, allProps] = await Promise.all([
          fetchInspections(),
          fetchProperties(),
        ]);
        setInspections(allInspections);
        setProperties(allProps);

        const targetId = inspectionQuery || (allInspections.length > 0 ? allInspections[0].id : "");
        setSelectedInspectionId(targetId);

        const foundInsp = allInspections.find((i) => i.id === targetId) || allInspections[0] || null;
        setSelectedInspection(foundInsp);

        if (foundInsp) {
          const prop = allProps.find((p) => p.id === foundInsp.property_id) || null;
          setSelectedProperty(prop);

          const savedAnalysis = await fetchMultiDefectByReportId(foundInsp.id);
          setAnalysisResult(savedAnalysis);
        }
      } catch (err) {
        console.error("Failed to load initial multi-defect data", err);
        setErrorMessage("Failed to load inspection records. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [inspectionQuery]);

  // Handle switching selected inspection
  const handleSelectInspection = async (id: string) => {
    setSelectedInspectionId(id);
    const found = inspections.find((i) => i.id === id) || null;
    setSelectedInspection(found);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (found) {
      const prop = properties.find((p) => p.id === found.property_id) || null;
      setSelectedProperty(prop);

      const saved = await fetchMultiDefectByReportId(found.id);
      setAnalysisResult(saved);
    } else {
      setSelectedProperty(null);
      setAnalysisResult(null);
    }
  };

  // Run or re-run the full multi-modal analytical pipeline
  const handleRunAnalysis = async () => {
    if (!selectedInspection || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusMessage("Initializing multi-modal inspection analysis...");

    try {
      const res = await runMultiDefectAnalysis(selectedInspection, (progressMsg) => {
        setStatusMessage(progressMsg);
      });
      setAnalysisResult(res);
      setSuccessMessage("Cross-modal defect evaluation completed and saved to database.");
    } catch (err) {
      console.error("Multi-defect analysis pipeline failure:", err);
      setErrorMessage((err as Error)?.message || "Analytical pipeline failure. Please verify FastAPI backend is running.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
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
            <span>Diagnostic Intelligence</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Multi-Defect Detection & Cross-Modal Pathology
          </h1>
          <p className="text-xs text-[#806C7B]">
            Correlating OpenCV optical surface difference, SciPy FFT acoustic resonance, and Open-Meteo psychrometrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/moisture-analysis"
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            Moisture Engine
          </Link>
          <Link
            href="/app/acoustic-analysis"
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            Acoustic FFT
          </Link>
          <Link
            href="/app/weather"
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            Weather Station
          </Link>
        </div>
      </div>

      {/* Statutory Advisory Banner (Requirement 10) */}
      <div className="bg-[#FDF5ED] border border-[#B86B35]/30 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangleIcon size={20} className="text-[#B86B35] shrink-0 mt-0.5" />
        <div className="text-xs text-[#493344] leading-relaxed">
          <strong className="font-bold text-[#B86B35]">Awaab’s Law Statutory Screening Advisory: </strong>
          <span>
            Diagnostic evaluations are preliminary screening aids under the Social Housing Regulation Act 2023. Algorithmic outputs indicate potential defect patterns and do not confirm concealed moisture, pipe leaks, or mould growth without on-site physical verification by a qualified surveyor using calibrated meters.
          </span>
        </div>
      </div>

      {/* Inspection Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6D5DC] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#79566F]/10 flex items-center justify-center text-[#79566F] shrink-0">
            <BuildingIcon size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase text-[#806C7B] block">Select Saved Inspection</span>
            <select
              value={selectedInspectionId}
              onChange={(e) => handleSelectInspection(e.target.value)}
              className="text-xs font-bold text-[#493344] bg-transparent border-none p-0 focus:outline-none cursor-pointer max-w-full"
            >
              {inspections.map((insp) => (
                <option key={insp.id} value={insp.id}>
                  {insp.property_name} — {insp.inspection_zone} ({insp.id})
                </option>
              ))}
            </select>
            {selectedProperty && (
              <span className="text-[11px] text-[#806C7B] flex items-center gap-1 mt-0.5">
                <MapPinIcon size={12} className="text-[#79566F]" />
                <span>{selectedProperty.address}, {selectedProperty.postal_code}</span>
                {selectedProperty.latitude && selectedProperty.longitude ? (
                  <span className="text-[#4A8B71] font-mono text-[10px]">
                    ({selectedProperty.latitude.toFixed(4)}, {selectedProperty.longitude.toFixed(4)})
                  </span>
                ) : (
                  <span className="text-[#B86B35] text-[10px]">(Coordinates pending)</span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={isProcessing || !selectedInspection}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-all shadow-md shadow-[#79566F]/20 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCwIcon size={14} className={isProcessing ? "animate-spin" : ""} />
            <span>{isProcessing ? "Executing Analysis..." : "Re-Run Cross-Modal Detection"}</span>
          </button>
        </div>
      </div>

      {/* Progress & Notification Alerts */}
      {statusMessage && (
        <div className="p-3.5 bg-[#EEF2FF] border border-[#79566F]/30 rounded-xl text-xs text-[#79566F] flex items-center gap-2.5 animate-pulse">
          <RefreshCwIcon size={14} className="animate-spin shrink-0" />
          <span className="font-medium">{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-[#FDF2F4] border border-[#C84661]/30 rounded-xl text-xs text-[#C84661] flex items-center gap-2.5">
          <AlertTriangleIcon size={16} className="shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-[#F0FDF4] border border-[#4A8B71]/30 rounded-xl text-xs text-[#4A8B71] flex items-center gap-2.5">
          <CheckCircleIcon size={16} className="shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Empty State when inspection has not been analyzed yet */}
      {!isLoading && !analysisResult && (
        <div className="bg-white p-8 rounded-3xl border border-[#E6D5DC] shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F7EDE5] text-[#79566F] flex items-center justify-center mx-auto">
            <SparklesIcon size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#493344]">Ready for Cross-Modal Detection</h3>
            <p className="text-xs text-[#806C7B] max-w-lg mx-auto mt-1">
              This inspection ({selectedInspection?.id}) has not yet undergone cross-modal detection. Click below to run OpenCV optical difference, SciPy FFT acoustic signal processing, and live Open-Meteo psychrometrics.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-all shadow-md shadow-[#79566F]/20 cursor-pointer"
            >
              <RefreshCwIcon size={14} className={isProcessing ? "animate-spin" : ""} />
              <span>Run Cross-Modal Detection Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Diagnostic Indicator Hero Card */}
      {analysisResult && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-[#79566F] shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-[#E6D5DC]">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#79566F] text-white">
                  PRELIMINARY SCREENING INDICATOR
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    analysisResult.statutory_urgency === "Emergency 24h"
                      ? "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/20"
                      : "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/20"
                  }`}
                >
                  {analysisResult.statutory_urgency} SLA Window
                </span>
              </div>
              <h2 className="text-2xl font-black text-[#493344] mt-2">
                {analysisResult.primary_label}
              </h2>
              <p className="text-xs text-[#806C7B] mt-1">
                Zone: <strong className="text-[#493344]">{selectedInspection?.inspection_zone}</strong> &bull; Room: {selectedInspection?.room_name || "General"} &bull; Location: {selectedInspection?.inspection_location || "Service Route"}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold uppercase text-[#806C7B] block">Diagnostic Indication Index</span>
              <div className="text-3xl font-black text-[#79566F] mt-0.5">
                {analysisResult.confidence_score}%
              </div>
              <span className="text-[10px] text-[#806C7B] font-semibold block">
                Indicative &bull; Physical Verification Required
              </span>
            </div>
          </div>

          {/* Cross-Modal Synthesis Narrative */}
          <div className="p-4 bg-[#F8F9FD] rounded-2xl border border-[#E6D5DC] text-xs text-[#493344] leading-relaxed">
            <strong className="text-[#79566F] font-bold">Cross-Modal Synthesis: </strong>
            {analysisResult.cross_modal_synthesis}
          </div>

          {/* Action & Trade Recommendation Bar */}
          <div className="p-4 bg-[#EEF2FF]/60 rounded-2xl border border-[#79566F]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#79566F] text-white flex items-center justify-center shrink-0">
                <WrenchIcon size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#806C7B] block">Recommended Specialist Consultation</span>
                <span className="text-xs font-bold text-[#493344]">{analysisResult.recommended_trade}</span>
              </div>
            </div>

            <Link
              href={`/app/work-orders?inspection=${selectedInspection?.id}&trade=${encodeURIComponent(analysisResult.recommended_trade)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-all shadow-md shadow-[#79566F]/20 cursor-pointer shrink-0"
            >
              <span>Create Work Order</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Cross-Modal Telemetry Evidence Fusion Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Optical Telemetry (OpenCV) */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DropletIcon size={18} className="text-[#79566F]" />
                <h3 className="text-sm font-bold text-[#493344]">Optical Telemetry (OpenCV)</h3>
              </div>
              <span className="text-[10px] font-bold text-[#79566F] font-mono">
                {analysisResult?.has_optical_data ? "Surface Diff" : "Modality Status"}
              </span>
            </div>

            {analysisResult?.has_optical_data ? (
              <div className="space-y-3">
                <div className="p-4 bg-[#F8F9FD] rounded-2xl border border-[#E6D5DC] text-center">
                  <span className="text-[10px] text-[#806C7B] block">Surface Difference Delta</span>
                  <div className="text-3xl font-black text-[#493344] mt-1">
                    {analysisResult.optical_difference_pct !== null && analysisResult.optical_difference_pct !== undefined
                      ? `${analysisResult.optical_difference_pct.toFixed(1)}%`
                      : "0.0%"}
                  </div>
                  <span className="text-[10px] text-[#C84661] font-bold mt-0.5 block">
                    {analysisResult.optical_anomaly_count || 0} anomalous region(s) detected
                  </span>
                </div>

                {/* Actual Inspection Image Display & Heatmap Toggle */}
                {analysisResult.optical_image_url && (
                  <div className="relative rounded-2xl overflow-hidden border border-[#E6D5DC] bg-slate-900 group">
                    <img
                      src={
                        showHeatmap && analysisResult.optical_heatmap_url
                          ? analysisResult.optical_heatmap_url
                          : analysisResult.optical_image_url
                      }
                      alt="Actual inspection surface"
                      className="w-full h-36 object-cover"
                    />
                    {analysisResult.optical_heatmap_url && (
                      <button
                        type="button"
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
                      >
                        {showHeatmap ? <EyeOffIcon size={12} /> : <EyeIcon size={12} />}
                        <span>{showHeatmap ? "Show Original" : "Show Heatmap"}</span>
                      </button>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-[#806C7B] leading-relaxed">
                  OpenCV chromatic segmentation and reflectance subtraction measured surface irregularity across the photographic field.
                </p>
              </div>
            ) : (
              <div className="p-5 bg-[#FDF2F4]/50 rounded-2xl border border-[#C84661]/20 space-y-2 text-center">
                <div className="w-8 h-8 rounded-full bg-[#C84661]/10 text-[#C84661] flex items-center justify-center mx-auto">
                  <CameraIcon size={16} />
                </div>
                <span className="text-xs font-bold text-[#C84661] block">Optical Data Not Available</span>
                <p className="text-[11px] text-[#806C7B]">
                  {analysisResult?.optical_unavailability_reason ||
                    "No inspection photograph uploaded for this inspection report. Optical difference analysis cannot be performed."}
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#E6D5DC]/60">
            <Link
              href={`/app/moisture-analysis?inspection=${selectedInspection?.id}`}
              className="text-xs font-bold text-[#79566F] hover:underline inline-flex items-center gap-1"
            >
              <span>View Moisture Optical Engine</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Card 2: Acoustic Telemetry (SciPy FFT) */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AcousticIcon size={18} className="text-[#79566F]" />
                <h3 className="text-sm font-bold text-[#493344]">Acoustic Telemetry (SciPy FFT)</h3>
              </div>
              <span className="text-[10px] font-bold text-[#79566F] font-mono">
                {analysisResult?.has_acoustic_data ? "Welch PSD" : "Modality Status"}
              </span>
            </div>

            {analysisResult?.has_acoustic_data ? (
              <div className="space-y-3">
                <div className="p-4 bg-[#F8F9FD] rounded-2xl border border-[#E6D5DC] text-center">
                  <span className="text-[10px] text-[#806C7B] block">Dominant Leak Harmonic</span>
                  <div className="text-3xl font-black text-[#79566F] mt-1">
                    {analysisResult.acoustic_frequency_hz !== null && analysisResult.acoustic_frequency_hz !== undefined
                      ? `${analysisResult.acoustic_frequency_hz.toFixed(0)} Hz`
                      : "0 Hz"}
                  </div>
                  <span className="text-[10px] text-[#4A8B71] font-bold mt-0.5 block">
                    {analysisResult.acoustic_magnitude_db !== null && analysisResult.acoustic_magnitude_db !== undefined
                      ? `${analysisResult.acoustic_magnitude_db.toFixed(1)} dB Magnitude`
                      : "Acoustic Signal Peak Identified"}
                  </span>
                </div>

                {/* Actual Audio Player */}
                {analysisResult.acoustic_audio_url && (
                  <div className="p-3 bg-[#F7EDE5]/60 rounded-2xl border border-[#E6D5DC] space-y-1.5">
                    <span className="text-[10px] font-bold text-[#806C7B] uppercase block">Inspection Audio Recording</span>
                    <audio
                      controls
                      src={analysisResult.acoustic_audio_url}
                      className="w-full h-8"
                    />
                  </div>
                )}

                <p className="text-[11px] text-[#806C7B] leading-relaxed">
                  SciPy Fast Fourier Transform evaluated Welch power spectral density across the audio sample to screen for pressurized turbulence bands (900-1600 Hz).
                </p>
              </div>
            ) : (
              <div className="p-5 bg-[#FDF2F4]/50 rounded-2xl border border-[#C84661]/20 space-y-2 text-center">
                <div className="w-8 h-8 rounded-full bg-[#C84661]/10 text-[#C84661] flex items-center justify-center mx-auto">
                  <MicIcon size={16} />
                </div>
                <span className="text-xs font-bold text-[#C84661] block">Acoustic Telemetry Not Available</span>
                <p className="text-[11px] text-[#806C7B]">
                  {analysisResult?.acoustic_unavailability_reason ||
                    "No acoustic recording (.wav/.mp3) attached to this inspection. Frequency spectrum harmonics not available."}
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#E6D5DC]/60">
            <Link
              href={`/app/acoustic-analysis?inspection=${selectedInspection?.id}`}
              className="text-xs font-bold text-[#79566F] hover:underline inline-flex items-center gap-1"
            >
              <span>View Acoustic Frequency Spectrum</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Card 3: Psychrometric / Weather Intelligence (Open-Meteo API) */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon size={18} className="text-[#B86B35]" />
                <h3 className="text-sm font-bold text-[#493344]">Dew-Point Proximity (Open-Meteo)</h3>
              </div>
              <span className="text-[10px] font-bold text-[#79566F] font-mono">
                {analysisResult?.has_weather_data ? "Magnus-Tetens" : "Modality Status"}
              </span>
            </div>

            {analysisResult?.has_weather_data ? (
              <div className="space-y-3">
                <div className="p-4 bg-[#F8F9FD] rounded-2xl border border-[#E6D5DC] text-center">
                  <span className="text-[10px] text-[#806C7B] block">Surface Margin to Dew Point</span>
                  <div className="text-3xl font-black text-[#493344] mt-1">
                    +{analysisResult.weather_temp_dew_diff_c !== null && analysisResult.weather_temp_dew_diff_c !== undefined
                      ? analysisResult.weather_temp_dew_diff_c.toFixed(1)
                      : "0.0"}°C
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-0.5 block ${
                      (analysisResult.weather_temp_dew_diff_c || 0) <= 1.5 ? "text-[#C84661]" : "text-[#4A8B71]"
                    }`}
                  >
                    {(analysisResult.weather_temp_dew_diff_c || 0) <= 1.5
                      ? "Vulnerable to Interstitial Dew"
                      : "Adequate Thermal Margin"}
                  </span>
                </div>

                {/* Weather Station Live Data Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-[#FAFAFC] rounded-2xl border border-[#E6D5DC] text-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#806C7B] block">Temp</span>
                    <span className="text-xs font-black text-[#493344]">
                      {analysisResult.weather_temperature_c?.toFixed(1)}°C
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#806C7B] block">RH</span>
                    <span className="text-xs font-black text-[#493344]">
                      {analysisResult.weather_humidity_pct?.toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#806C7B] block">Dew Pt</span>
                    <span className="text-xs font-black text-[#493344]">
                      {analysisResult.weather_dew_point_c?.toFixed(1)}°C
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-[#806C7B] flex items-center justify-between">
                  <span>Source: {analysisResult.weather_source || "Open-Meteo"}</span>
                  {analysisResult.weather_timestamp && (
                    <span>Obs: {new Date(analysisResult.weather_timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                </div>

                <p className="text-[11px] text-[#806C7B] leading-relaxed">
                  Real-time ambient weather queried from Open-Meteo for property coordinates. Indicates condensation potential; does not prove internal pipe failure.
                </p>
              </div>
            ) : (
              <div className="p-5 bg-[#FDF5ED] rounded-2xl border border-[#B86B35]/20 space-y-2 text-center">
                <div className="w-8 h-8 rounded-full bg-[#B86B35]/10 text-[#B86B35] flex items-center justify-center mx-auto">
                  <ThermometerIcon size={16} />
                </div>
                <span className="text-xs font-bold text-[#B86B35] block">Weather Telemetry Not Available</span>
                <p className="text-[11px] text-[#806C7B]">
                  {analysisResult?.weather_unavailability_reason ||
                    "Location coordinates required to query Open-Meteo meteorological telemetry for this property."}
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#E6D5DC]/60">
            <Link
              href={`/app/weather?property=${selectedInspection?.property_id}`}
              className="text-xs font-bold text-[#79566F] hover:underline inline-flex items-center gap-1"
            >
              <span>View Property Weather & Forecast</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Differential Pathology Candidates Breakdown */}
      {analysisResult?.candidates && analysisResult.candidates.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#493344]">Differential Pathology Candidates</h3>
            <p className="text-xs text-[#806C7B]">
              Probabilistic ranking evaluated across statutory building defect categories based on available cross-modal evidence
            </p>
          </div>

          <div className="space-y-3">
            {analysisResult.candidates.map((c, i) => (
              <div key={i} className="p-4 rounded-2xl border border-[#E6D5DC] bg-[#FAFAFC] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#79566F]/10 text-[#79566F] font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <h4 className="text-sm font-bold text-[#493344]">{c.label}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.urgency === "Emergency 24h"
                          ? "bg-[#FDF2F4] text-[#C84661]"
                          : "bg-[#FDF5ED] text-[#B86B35]"
                      }`}
                    >
                      {c.urgency}
                    </span>
                    <span className="text-sm font-black text-[#79566F] font-mono">{c.probability}%</span>
                  </div>
                </div>

                <div className="w-full bg-[#E6D5DC] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      c.probability >= 80 ? "bg-[#79566F]" : c.probability >= 50 ? "bg-[#B995AD]" : "bg-slate-400"
                    }`}
                    style={{ width: `${c.probability}%` }}
                  />
                </div>

                <p className="text-xs text-[#806C7B] leading-relaxed pt-1">
                  <strong>Evidence Basis: </strong>
                  {c.evidence_basis}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimers & Algorithmic Limitations */}
      {analysisResult?.limitations && analysisResult.limitations.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#493344]">
            <ShieldCheckIcon size={16} className="text-[#79566F]" />
            <span>Analytical Telemetry Scope & Statutory Limitations</span>
          </div>
          <ul className="space-y-1.5 text-xs text-[#806C7B] list-disc list-inside">
            {analysisResult.limitations.map((lim, idx) => (
              <li key={idx} className="leading-relaxed">
                {lim}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
