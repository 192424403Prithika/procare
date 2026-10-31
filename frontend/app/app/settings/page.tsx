"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  SettingsIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  SparklesIcon,
  CpuIcon,
  DatabaseIcon,
  ClockIcon,
} from "@/components/Icons";

export default function SettingsPage() {
  const [openCvSensitivity, setOpenCvSensitivity] = useState(68);
  const [fftBandMin, setFftBandMin] = useState(900);
  const [fftBandMax, setFftBandMax] = useState(1500);
  const [slaEmergencyHours, setSlaEmergencyHours] = useState(24);
  const [slaRepairDays, setSlaRepairDays] = useState(14);
  const [weatherPollingMinutes, setWeatherPollingMinutes] = useState(15);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/dashboard" className="hover:text-[#79566F]">
              Dashboard
            </Link>
            <span>/</span>
            <span>Platform Configuration</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            System &amp; Analytical Settings
          </h1>
          <p className="text-xs text-[#806C7B]">
            Configure multi-modal analytical pipelines, Awaab&apos;s Law SLA triggers, and Supabase integration
          </p>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFF8F3] text-[#4A8B71] text-xs font-bold border border-[#4A8B71]/30 animate-in fade-in">
            <CheckCircleIcon size={14} />
            <span>Settings Saved Successfully</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Computer Vision & Acoustic Calibration */}
        <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6D5DC]">
            <CpuIcon size={18} className="text-[#79566F]" />
            <div>
              <h2 className="text-base font-bold text-[#493344]">
                Computer Vision &amp; Acoustic Calibration
              </h2>
              <p className="text-xs text-[#806C7B]">
                Tune OpenCV difference thresholds and SciPy audio frequency resonance detection
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <div className="flex justify-between font-bold text-[#493344] mb-1">
                <span>OpenCV Difference Threshold:</span>
                <span className="font-mono text-[#79566F]">{openCvSensitivity} / 100</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                value={openCvSensitivity}
                onChange={(e) => setOpenCvSensitivity(Number(e.target.value))}
                className="w-full accent-[#79566F]"
              />
              <span className="text-[10px] text-[#806C7B] block mt-1">
                Threshold for specular highlight subtraction between ambient and flash images
              </span>
            </div>

            <div>
              <div className="flex justify-between font-bold text-[#493344] mb-1">
                <span>Acoustic Pinhole Leak Band:</span>
                <span className="font-mono text-[#79566F]">{fftBandMin}Hz - {fftBandMax}Hz</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  type="number"
                  value={fftBandMin}
                  onChange={(e) => setFftBandMin(Number(e.target.value))}
                  className="rounded-xl border border-[#E6D5DC] p-2 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  placeholder="Min Hz"
                />
                <input
                  type="number"
                  value={fftBandMax}
                  onChange={(e) => setFftBandMax(Number(e.target.value))}
                  className="rounded-xl border border-[#E6D5DC] p-2 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  placeholder="Max Hz"
                />
              </div>
              <span className="text-[10px] text-[#806C7B] block mt-1">
                Target resonance band for pressurized water escaping 15mm copper piping
              </span>
            </div>
          </div>
        </div>

        {/* 2. Statutory Awaab's Law SLA Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6D5DC]">
            <ClockIcon size={18} className="text-[#B86B35]" />
            <div>
              <h2 className="text-base font-bold text-[#493344]">
                Statutory Compliance Timers (Awaab&apos;s Law)
              </h2>
              <p className="text-xs text-[#806C7B]">
                Configured to meet the UK Social Housing (Regulation) Act mandatory thresholds
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-[#493344] mb-1">
                Emergency Hazard Investigation SLA:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={slaEmergencyHours}
                  onChange={(e) => setSlaEmergencyHours(Number(e.target.value))}
                  className="rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none w-28"
                />
                <span className="text-xs text-[#806C7B]">Hours (Statutory 24h default)</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#493344] mb-1">
                Mandatory Repair Commencement SLA:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={slaRepairDays}
                  onChange={(e) => setSlaRepairDays(Number(e.target.value))}
                  className="rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none w-28"
                />
                <span className="text-xs text-[#806C7B]">Days (Statutory 14d default)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. API & Cloud Backend Security */}
        <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6D5DC]">
            <DatabaseIcon size={18} className="text-[#4A8B71]" />
            <div>
              <h2 className="text-base font-bold text-[#493344]">
                Backend Infrastructure &amp; Security Isolation
              </h2>
              <p className="text-xs text-[#806C7B]">
                Supabase PostgreSQL with Row-Level Security (RLS) &bull; FastAPI analytical cluster
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#F7EDE5] rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-[#493344] block">Supabase Row-Level Security (RLS)</span>
                <span className="text-[11px] text-[#806C7B]">Enforced via JWT bearer tokens and role claims</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/30">
                Active &amp; Guarded
              </span>
            </div>

            <div className="p-3 bg-[#F7EDE5] rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-[#493344] block">Service-Role Secret Protection</span>
                <span className="text-[11px] text-[#806C7B]">Service keys strictly confined to backend server environment</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/30">
                Zero Client Leakage
              </span>
            </div>

            <div className="p-3 bg-[#F7EDE5] rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-[#493344] block">Open-Meteo Meteorological API</span>
                <span className="text-[11px] text-[#806C7B]">Polling Greater Manchester stations every {weatherPollingMinutes} minutes</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDFBFB] text-[#B995AD] border border-[#B995AD]/30">
                Online (Free Tier)
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold shadow-md shadow-[#79566F]/20 transition-colors cursor-pointer"
          >
            Save Configuration Changes
          </button>
        </div>
      </form>
    </div>
  );
}
