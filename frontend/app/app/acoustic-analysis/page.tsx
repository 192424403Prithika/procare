"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AcousticIcon,
  MicIcon,
  AlertTriangleIcon,
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
  BuildingIcon,
  ClockIcon,
} from "@/components/Icons";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { fetchInspections, InspectionReport } from "@/lib/services/inspectionService";
import {
  executeAcousticAnalysis,
  fetchAcousticAnalysisByReportId,
  AcousticAnalysisRecord,
  INITIAL_ACOUSTIC_ANALYSES,
} from "@/lib/services/acousticAnalysisService";

export default function AcousticAnalysisPage() {
  const searchParams = useSearchParams();
  const inspectionQuery = searchParams.get("inspection") || "";

  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>(inspectionQuery);
  const [selectedInspection, setSelectedInspection] = useState<InspectionReport | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AcousticAnalysisRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load inspections and default analysis
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
        const saved = await fetchAcousticAnalysisByReportId(found.id);
        if (saved) {
          setAnalysisResult(saved);
        } else {
          // Fall back to default seeded record
          setAnalysisResult(INITIAL_ACOUSTIC_ANALYSES[0]);
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
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (found) {
      const saved = await fetchAcousticAnalysisByReportId(found.id);
      if (saved) {
        setAnalysisResult(saved);
      } else {
        const matchSeed = INITIAL_ACOUSTIC_ANALYSES.find((a) => a.report_id === found.id);
        setAnalysisResult(matchSeed || INITIAL_ACOUSTIC_ANALYSES[0]);
      }
    }
  };

  // Run acoustic analysis
  const handleRunAnalysis = async () => {
    if (!selectedInspection || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage("Running SciPy/NumPy FFT acoustic signal processing...");

    try {
      const res = await executeAcousticAnalysis(selectedInspection);
      setAnalysisResult(res);
      setStatusMessage("Acoustic frequency analysis completed successfully.");
    } catch (err) {
      console.error(err);
      setStatusMessage("Failed to execute acoustic analysis.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.warn("Audio playback interrupted", e));
    }
  };

  // Convert spectrum data for Recharts
  const chartData = analysisResult?.spectrum_points?.length
    ? analysisResult.spectrum_points.map((pt) => ({
        freq: pt.frequency_hz >= 1000 ? `${(pt.frequency_hz / 1000).toFixed(1)}kHz` : `${pt.frequency_hz}Hz`,
        frequencyHz: pt.frequency_hz,
        amp: Math.max(0, pt.magnitude_db + 80), // Normalised 0-80 dB
        rawDb: pt.magnitude_db,
        baseline: 15,
      }))
    : [
        { freq: "100Hz", amp: 12, baseline: 10, rawDb: -68 },
        { freq: "250Hz", amp: 18, baseline: 14, rawDb: -62 },
        { freq: "500Hz", amp: 26, baseline: 16, rawDb: -54 },
        { freq: "750Hz", amp: 44, baseline: 18, rawDb: -36 },
        { freq: "980Hz", amp: 78, baseline: 20, rawDb: -22 },
        { freq: "1.2kHz", amp: 94, baseline: 22, rawDb: -14 },
        { freq: "1.5kHz", amp: 68, baseline: 20, rawDb: -23 },
        { freq: "2.0kHz", amp: 42, baseline: 18, rawDb: -28 },
        { freq: "3.0kHz", amp: 28, baseline: 15, rawDb: -31 },
        { freq: "4.5kHz", amp: 19, baseline: 12, rawDb: -34 },
        { freq: "6.0kHz", amp: 14, baseline: 10, rawDb: -37 },
        { freq: "8.0kHz", amp: 11, baseline: 8, rawDb: -39 },
      ];

  const currentAudioUrl = selectedInspection?.audio_url || "/test_audio.wav";

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
            <span>Acoustic FFT Telemetry</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Acoustic Signal Processing (Fast Fourier Transform)
          </h1>
          <p className="text-xs text-[#806C7B]">
            Micro-acoustic spectrum analysis to identify pressurised pinhole pipe leaks vs. ambient noise
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/moisture-analysis"
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            Moisture Heatmap
          </Link>
          <Link
            href="/app/risk-triage"
            className="px-3.5 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] shadow-md shadow-[#79566F]/20 transition-colors"
          >
            Risk Triage Model &rarr;
          </Link>
        </div>
      </div>

      {/* Statutory Limitation Notice */}
      <div className="bg-[#FDF5ED] border border-[#B86B35]/30 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangleIcon size={20} className="text-[#B86B35] shrink-0 mt-0.5" />
        <div className="text-xs text-[#493344]">
          <strong className="font-bold text-[#B86B35]">Notice: Probabilistic Acoustic Signatures</strong>
          <span className="text-[#806C7B] ml-1.5">
            Acoustic resonance between 900 Hz and 1.5 kHz strongly correlates with turbulent fluid egress under residential water pressure (2.5 - 3.5 bar). It does not guarantee the exact physical puncture location without correlation against thermal and dielectric moisture indicators.
          </span>
        </div>
      </div>

      {/* Inspection Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6D5DC] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#79566F]/10 flex items-center justify-center text-[#79566F]">
            <BuildingIcon size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-[#806C7B] block">Survey Inspection Audio Source</span>
            <select
              value={selectedInspectionId}
              onChange={(e) => handleSelectInspection(e.target.value)}
              className="text-xs font-bold text-[#493344] bg-transparent border-none p-0 focus:outline-none cursor-pointer"
            >
              {inspections.map((insp) => (
                <option key={insp.id} value={insp.id}>
                  {insp.property_name} — {insp.inspection_zone} ({insp.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-all shadow-md shadow-[#79566F]/20 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCwIcon size={14} className={isProcessing ? "animate-spin" : ""} />
            <span>{isProcessing ? "Processing FFT..." : "Re-Analyze Acoustic Signal"}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[#EEF2FF] border border-[#79566F]/30 rounded-xl text-xs text-[#79566F] flex items-center gap-2">
          <CheckCircleIcon size={16} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Audio Sample Player Bar */}
      <div className="bg-[#79566F] p-5 sm:p-6 rounded-3xl text-white border border-[#E6D5DC] shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#79566F] text-white">
                WAV {analysisResult?.sampling_rate || 44100} Hz / 16-Bit
              </span>
              <span className="text-xs text-white/80">
                Zone: {selectedInspection?.inspection_zone || "Bathroom Ceiling & External Wall"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              {selectedInspection?.property_name || "Trinity Court Blocks A-C"}
            </h2>
            <p className="text-xs text-white/70 mt-0.5">
              Duration: {analysisResult?.duration_seconds || selectedInspection?.audio_duration_seconds || 10.4}s &bull; Dominant Frequency:{" "}
              <span className="text-[#B995AD] font-bold font-mono">
                {analysisResult?.dominant_frequency || 1240} Hz
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B995AD] hover:bg-[#9E7B92] text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              <span>{isPlaying ? "Pause Playback" : "Play Acoustic Recording"}</span>
            </button>
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={currentAudioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />

        {/* Dynamic Waveform Visualizer */}
        <div className="mt-4 pt-2">
          <div className="flex items-center justify-between text-xs text-white/70 mb-2">
            <span>Time-Domain Waveform Envelope</span>
            <span className="font-mono text-[#B995AD]">
              Peak RMS: {analysisResult?.dominant_magnitude_db || -14.2} dBFS
            </span>
          </div>

          <div className="h-16 flex items-center justify-center gap-1 bg-slate-900/80 p-2 rounded-2xl border border-slate-700/60">
            {[24, 38, 52, 75, 90, 68, 45, 82, 95, 88, 60, 42, 65, 84, 98, 72, 50, 32, 68, 85, 76, 54, 40, 72, 88, 62, 38, 55, 78, 64, 30].map((v, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  isPlaying ? "bg-[#B995AD] animate-pulse" : "bg-slate-600"
                }`}
                style={{ height: `${isPlaying ? Math.max(15, v * (i % 2 === 0 ? 1 : 0.8)) : v * 0.4}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fast Fourier Transform (FFT) Power Spectrum */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#493344]">
              FFT Spectral Density (Fast Fourier Transform)
            </h2>
            <p className="text-xs text-[#806C7B]">
              Power spectral density showing persistent resonance peak at {analysisResult?.dominant_frequency || 1240} Hz (Fluid turbulence signature)
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase border ${
              analysisResult?.is_anomaly_detected
                ? "bg-[#FDF2F4] text-[#C84661] border-[#C84661]/20"
                : "bg-[#EFF8F3] text-[#4A8B71] border-[#4A8B71]/20"
            }`}
          >
            {analysisResult?.is_anomaly_detected ? "Acoustic Anomaly Confirmed" : "Normal Ambient Acoustic Signature"}
          </span>
        </div>

        <div className="h-64 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFreq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B995AD" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#B995AD" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="freq" stroke="#806C7B" fontSize={11} tickLine={false} />
                <YAxis stroke="#806C7B" fontSize={11} tickLine={false} unit=" dB" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#493344",
                    borderColor: "#79566F",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="baseline"
                  name="Ambient Floor Noise"
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  fillOpacity={0}
                />
                <Area
                  type="monotone"
                  dataKey="amp"
                  name="Recorded FFT Spectrum"
                  stroke="#79566F"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorFreq)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#806C7B]">
              Computing Fast Fourier Transform...
            </div>
          )}
        </div>

        {/* Diagnostic Frequency Bands Breakdown */}
        {analysisResult?.bands && analysisResult.bands.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[#E6D5DC]">
            <h3 className="text-xs font-bold text-[#493344] mb-3">Diagnostic Frequency Band Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {analysisResult.bands.map((band, i) => (
                <div key={i} className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E6D5DC]">
                  <span className="text-[10px] text-[#806C7B] block truncate">{band.name}</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-extrabold text-[#493344]">{band.energy_percentage}%</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        band.significance === "prominent"
                          ? "bg-[#FDF2F4] text-[#C84661]"
                          : band.significance === "elevated"
                          ? "bg-[#FDF5ED] text-[#B86B35]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {band.significance}
                    </span>
                  </div>
                  <span className="text-[9px] text-[#806C7B] mt-1 block">
                    {band.range_hz[0]} - {band.range_hz[1]} Hz
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Narrative findings */}
        {analysisResult?.result_summary && (
          <div className="mt-4 p-3.5 bg-[#F8F9FD] rounded-2xl border border-[#E6D5DC] text-xs text-[#493344]">
            <strong className="text-[#79566F] font-bold">Diagnostic Conclusion:</strong>{" "}
            {analysisResult.result_summary}
          </div>
        )}
      </div>

      {/* Telemetry Metrics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E6D5DC] shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#806C7B] block">
            Leak Resonance Probability
          </span>
          <div className="text-2xl font-black text-[#C84661] mt-1">
            {analysisResult?.anomaly_score ? `${Math.round(analysisResult.anomaly_score)}%` : "94%"}
          </div>
          <p className="text-[11px] text-[#806C7B] mt-1">
            Characteristic acoustic frequency match for 15mm copper supply pipe under 3.0 bar pressure.
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E6D5DC] shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#806C7B] block">
            Spectral Centroid
          </span>
          <div className="text-2xl font-black text-[#79566F] mt-1">
            {analysisResult?.spectral_centroid_hz
              ? `${Math.round(analysisResult.spectral_centroid_hz)} Hz`
              : "2,140 Hz"}
          </div>
          <p className="text-[11px] text-[#806C7B] mt-1">
            Energy center-of-mass elevated towards high turbulence band, confirming continuous flow.
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E6D5DC] shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#806C7B] block">
            Spectral Flatness
          </span>
          <div className="text-2xl font-black text-[#4A8B71] mt-1">
            {analysisResult?.spectral_flatness
              ? analysisResult.spectral_flatness.toFixed(3)
              : "0.034"}
          </div>
          <p className="text-[11px] text-[#806C7B] mt-1">
            Low Wiener entropy confirms a non-white noise harmonic peak distinct from environmental hiss.
          </p>
        </div>
      </div>
    </div>
  );
}
