"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ShieldCheckIcon,
  DropletIcon,
  AcousticIcon,
  CloudRainIcon,
  BuildingIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  WrenchIcon,
  ClockIcon,
} from "@/components/Icons";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";
import { useRole } from "@/components/app/RoleContext";

export default function RiskTriagePage() {
  const { role, profile } = useRole();
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedOff, setIsSignedOff] = useState(false);
  const [humanNotes, setHumanNotes] = useState("");

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const props = await fetchProperties();
        setProperties(props);
        if (props.length > 0) {
          setSelectedProperty(props[0]);
        }
      } catch (err) {
        console.warn("Failed to load properties for triage", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSignOff = () => {
    setIsSignedOff(true);
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
            <span>Algorithmic Triage Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Explainable Risk &amp; Priority Triage
          </h1>
          <p className="text-xs text-[#806C7B]">
            Transparent multi-modal weighting: OpenCV (35%) + FFT Acoustic (25%) + Dew-Point (25%) + Building Age (15%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/work-orders"
            className="px-3.5 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] shadow-md shadow-[#79566F]/20 transition-colors"
          >
            Dispatch Remediation Contractor
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-[#E6D5DC] text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-[#493344]">Loading property risk models...</p>
        </div>
      ) : !selectedProperty ? (
        <div className="bg-white p-12 rounded-3xl border border-[#E6D5DC] text-center shadow-xs">
          <BuildingIcon size={32} className="mx-auto text-[#806C7B] mb-2 opacity-50" />
          <h3 className="text-base font-bold text-[#493344]">No Properties Available</h3>
          <p className="text-xs text-[#806C7B] max-w-sm mx-auto mt-1">
            Enroll a property in the portfolio registry to calculate multi-modal triage risk.
          </p>
          <div className="mt-4">
            <Link
              href="/app/properties/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E]"
            >
              + Enroll New Property
            </Link>
          </div>
        </div>
      ) : (
      <>
      {/* Main Selected Property Triage Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E6D5DC]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#79566F] bg-[#EFE4EC] px-2 py-0.5 rounded-md">
                {selectedProperty.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/20 uppercase">
                {selectedProperty.risk_level} Priority
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B86B35]/10 text-[#B86B35]">
                {selectedProperty.inspection_status || "Active"}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#493344] mt-2">{selectedProperty.property_name}</h2>
            <p className="text-xs text-[#806C7B] mt-1">
              {selectedProperty.address}, {selectedProperty.postal_code} &bull; Typology: {selectedProperty.building_type}
            </p>
          </div>

          {/* Composite Score Circle / Badge */}
          <div className="flex items-center gap-4">
            <div className="p-4 bg-linear-to-br from-[#79566F] to-[#67475E] rounded-3xl text-white text-center min-w-[150px] shadow-md border border-[#E6D5DC]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Composite Risk Score
              </span>
              <div className="text-4xl font-black text-[#C84661] mt-1">
                {selectedProperty.risk_score}
                <span className="text-base font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-slate-300">Action Required</span>
            </div>
          </div>
        </div>

        {/* 4 Contributing Factors Breakdown */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-[#493344] mb-3">
            Algorithmic Weighting &amp; Multi-Modal Factor Breakdown
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Factor 1: OpenCV Image Difference */}
            <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#493344] flex items-center gap-1.5">
                  <DropletIcon size={14} className="text-[#79566F]" />
                  <span>OpenCV Moisture Sheen</span>
                </span>
                <span className="text-[10px] font-mono text-[#806C7B]">35% Weight</span>
              </div>
              <div className="text-xl font-black text-[#C84661]">78 / 100</div>
              <p className="text-[11px] text-[#806C7B]">
                High specular reflection attenuation detected between ambient and flash pairs on northern wall.
              </p>
            </div>

            {/* Factor 2: FFT Acoustic Signal */}
            <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#493344] flex items-center gap-1.5">
                  <AcousticIcon size={14} className="text-[#B995AD]" />
                  <span>Acoustic FFT Leak Peak</span>
                </span>
                <span className="text-[10px] font-mono text-[#806C7B]">25% Weight</span>
              </div>
              <div className="text-xl font-black text-[#C84661]">92 / 100</div>
              <p className="text-[11px] text-[#806C7B]">
                Continuous 1.24 kHz spectral peak (+18 dB SNR) detected adjacent to cold supply riser shaft.
              </p>
            </div>

            {/* Factor 3: Open-Meteo Dew-Point */}
            <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#493344] flex items-center gap-1.5">
                  <CloudRainIcon size={14} className="text-[#B995AD]" />
                  <span>Dew-Point Margin</span>
                </span>
                <span className="text-[10px] font-mono text-[#806C7B]">25% Weight</span>
              </div>
              <div className="text-xl font-black text-[#B86B35]">84 / 100</div>
              <p className="text-[11px] text-[#806C7B]">
                Surface temperature is only 0.8°C above calculated dew point. High risk of moisture condensation.
              </p>
            </div>

            {/* Factor 4: Structural Typology */}
            <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#493344] flex items-center gap-1.5">
                  <BuildingIcon size={14} className="text-[#4A8B71]" />
                  <span>Structural Vulnerability</span>
                </span>
                <span className="text-[10px] font-mono text-[#806C7B]">15% Weight</span>
              </div>
              <div className="text-xl font-black text-[#B86B35]">65 / 100</div>
              <p className="text-[11px] text-[#806C7B]">
                1974 brick cavity with known thermal bridging at concrete lintels and uninsulated lintel cavities.
              </p>
            </div>
          </div>
        </div>

        {/* Recommended Action & Human Review Section */}
        <div className="mt-6 pt-5 border-t border-[#E6D5DC] grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Recommendation */}
          <div className="p-4 bg-[#EFE4EC] rounded-2xl border border-[#79566F]/20 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#79566F]" />
              <span className="text-xs font-bold text-[#79566F] uppercase tracking-wider">
                Automated Decision Recommendation
              </span>
            </div>
            <h4 className="text-sm font-bold text-[#493344]">
              Emergency Work Order Dispatch &bull; 24-Hour Statutory Window
            </h4>
            <p className="text-xs text-[#806C7B]">
              Combined acoustic resonance and sub-surface moisture indicate an active pressurized leak rather than lifestyle condensation. Recommend immediate isolations of supply riser 4B and deployment of accredited acoustic plumber.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/app/work-orders"
                className="px-4 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] transition-colors"
              >
                Dispatch Apex Fluid Dynamics
              </Link>
            </div>
          </div>

          {/* Human-in-the-Loop Signoff */}
          <div className="p-4 bg-white rounded-2xl border border-[#E6D5DC] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#493344]">Human Review &amp; Surveyor Sign-Off</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSignedOff
                    ? "bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/30"
                    : "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/30"
                }`}
              >
                {isSignedOff ? "Approved & Verified" : "Pending Human Signoff"}
              </span>
            </div>

            {isSignedOff ? (
              <div className="p-3 bg-[#EFF8F3] rounded-xl text-xs text-[#4A8B71] flex items-center gap-2">
                <CheckCircleIcon size={16} />
                <span>
                  Approved by {profile.name} ({profile.title}) on 2026-10-30. Audit record locked for legal compliance.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  placeholder="Enter surveyor concurrence or mitigation notes..."
                  value={humanNotes}
                  onChange={(e) => setHumanNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#E6D5DC] p-2 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSignOff}
                  className="px-4 py-2 rounded-xl bg-[#4A8B71] hover:bg-[#1A8762] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Verify &amp; Sign Off Triage (Authorized Officer)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Triage Queue */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
        <h2 className="text-base font-bold text-[#493344] mb-1">Portfolio Priority Queue</h2>
        <p className="text-xs text-[#806C7B] mb-4">Properties ranked by urgency of multi-modal indicators</p>

        <div className="space-y-2.5">
          {properties.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProperty(p)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                selectedProperty?.id === p.id
                  ? "border-[#79566F] bg-[#EFE4EC]/70 shadow-xs ring-1 ring-[#79566F]"
                  : "border-[#E6D5DC] hover:bg-[#F7EDE5]"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#493344]">{p.property_name}</span>
                  <span className="text-[10px] font-mono text-[#79566F]">{p.id}</span>
                </div>
                <div className="text-[11px] text-[#806C7B] mt-0.5">
                  {p.address} &bull; Built {p.build_year} &bull; {p.building_type}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-[#493344]">Score: {p.risk_score}/100</span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    p.risk_level === "critical"
                      ? "bg-[#FDF2F4] text-[#C84661]"
                      : p.risk_level === "high"
                      ? "bg-[#FDF5ED] text-[#B86B35]"
                      : "bg-[#EFF8F3] text-[#4A8B71]"
                  }`}
                >
                  {p.risk_level}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
