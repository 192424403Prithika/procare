"use client";

import React from "react";
import {
  DropletIcon,
  CloudRainIcon,
  ShieldCheckIcon,
  ActivityIcon,
  ArrowRightIcon,
  CheckIcon,
} from "./Icons";

interface HeroSectionProps {
  onStartInspection?: () => void;
  onExploreDashboard?: () => void;
}

export default function HeroSection({
  onStartInspection,
  onExploreDashboard,
}: HeroSectionProps) {
  return (
    <section id="product" className="relative overflow-hidden pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24">
      {/* Subtle light background ambient glows */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#EFE4EC]/80 via-[#EAE0E7]/50 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute right-4 top-1/4 -z-10 h-64 w-64 rounded-full bg-[#EFF8F3]/50 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Heading, Description, CTA Buttons (Visually Dominant) */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Small Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B995AD]/30 bg-[#EFE4EC] px-3.5 py-1.5 text-xs font-semibold text-[#B995AD] shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-[#B995AD] animate-pulse" />
              <span>AI-Powered Property Intelligence</span>
            </div>

            {/* Main Heading */}
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#493344] sm:text-5xl lg:text-6xl sm:leading-[1.12]">
              Detect Early.{" "}
              <span className="text-[#B995AD]">Prevent Damage.</span>{" "}
              <span>Protect Properties.</span>
            </h1>

            {/* Description */}
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#806C7B] sm:text-base lg:text-lg">
              PropCare NW combines sub-surface dielectric sensing, cavity acoustic leak diagnostics, and
              hyper-local weather forecasting to identify building moisture risks before paint bubbles,
              drywall decays, or structural mould takes hold.
            </p>

            {/* CTA Buttons - Large, Touch-Friendly, Responsive Stacking */}
            <div className="mt-8 flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onStartInspection}
                className="group inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#B995AD] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#B995AD]/20 transition-all hover:bg-[#67475E] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 sm:w-auto cursor-pointer"
              >
                <DropletIcon size={18} className="text-white" />
                <span>Start Inspection</span>
                <ArrowRightIcon size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={onExploreDashboard}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#E6D5DC] bg-white px-7 py-3.5 text-sm font-semibold text-[#493344] shadow-xs transition-all hover:border-[#B995AD]/50 hover:bg-[#F7EDE5] hover:-translate-y-0.5 active:translate-y-0 sm:w-auto cursor-pointer"
              >
                <ActivityIcon size={18} className="text-[#B995AD]" />
                <span>Explore Dashboard</span>
              </button>
            </div>

            {/* Feature Micro-Badges */}
            <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6 pt-6 border-t border-[#E6D5DC] text-xs font-medium text-[#806C7B]">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EFF8F3] text-[#493344]">
                  <CheckIcon size={12} />
                </span>
                <span>Zero-Drill Non-Destructive Scanning</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EFE4EC] text-[#B995AD]">
                  <CheckIcon size={12} />
                </span>
                <span>Awaab&apos;s Law 24h Triage Ready</span>
              </div>
            </div>
          </div>

          {/* Right Column: Balanced, Compact Property Inspection Telemetry Preview */}
          <div className="lg:col-span-5 w-full">
            <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none">
              {/* Floating Weather Ingress Alert Top-Right */}
              <div className="absolute -top-3 right-2 z-20 flex items-center gap-2.5 rounded-xl border border-[#EAE0E7] bg-white/95 px-3 py-2 shadow-md backdrop-blur-xs transition-all">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAE0E7] text-[#493344]">
                  <CloudRainIcon size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#493344]">
                    <span>Weather Alert</span>
                    <span className="rounded bg-[#FDF5ED] px-1 py-0.2 text-[9px] font-bold text-[#493344]">72H</span>
                  </div>
                  <div className="text-[10px] text-[#806C7B]">Heavy rain: 48mm</div>
                </div>
              </div>

              {/* Floating Property Health Card Bottom-Left */}
              <div className="absolute -bottom-3 left-2 z-20 flex items-center gap-2.5 rounded-xl border border-[#EFF8F3] bg-white/95 px-3 py-2 shadow-md backdrop-blur-xs transition-all">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF8F3] text-[#493344]">
                  <ShieldCheckIcon size={14} className="text-[#493344]" />
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#806C7B]">Property Health</div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#493344]">
                    <span>94/100 Optimal</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#493344]" />
                  </div>
                </div>
              </div>

              {/* Compact Preview Card */}
              <div className="overflow-hidden rounded-2xl border border-[#E6D5DC] bg-white p-4 sm:p-5 shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E6D5DC] pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B995AD]">
                      Asset Telemetry #402
                    </span>
                    <h3 className="text-sm font-bold text-[#493344]">
                      Oakridge Court · North Gable
                    </h3>
                  </div>

                  <span className="rounded-full bg-[#FDF5ED] px-2 py-0.5 text-[10px] font-bold text-[#493344] border border-[#E6D5DC]">
                    High Ingress Risk
                  </span>
                </div>

                {/* Architectural Blueprint SVG Scanner Graphic */}
                <div className="relative mt-3 h-32 w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#F7EDE5] to-[#EAE0E7]/30 border border-[#E6D5DC]">
                  <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 130">
                    <defs>
                      <linearGradient id="heroWallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#E6D5DC" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.4" />
                      </linearGradient>
                      <radialGradient id="heroMoistureHeat" cx="65%" cy="45%" r="38%">
                        <stop offset="0%" stopColor="#B995AD" stopOpacity="0.6" />
                        <stop offset="50%" stopColor="#FDF5ED" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#EFF8F3" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Architectural Building Outline */}
                    <rect x="20" y="15" width="360" height="100" rx="6" fill="url(#heroWallGrad)" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="140" y1="15" x2="140" y2="115" stroke="#CBD5E1" strokeWidth="1" />
                    <line x1="260" y1="15" x2="260" y2="115" stroke="#CBD5E1" strokeWidth="1" />
                    <line x1="20" y1="65" x2="380" y2="65" stroke="#CBD5E1" strokeWidth="1" />

                    {/* Moisture Ingress Heatmap Area */}
                    <circle cx="270" cy="55" r="42" fill="url(#heroMoistureHeat)" />
                    <circle cx="270" cy="55" r="4" fill="#B995AD" />
                    <circle cx="270" cy="55" r="12" fill="none" stroke="#B995AD" strokeWidth="1.5" strokeDasharray="2 2" />
                  </svg>

                  <div className="absolute top-2 left-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#493344] shadow-xs">
                    Cavity Dielectric Scan
                  </div>

                  <div className="absolute bottom-2 right-2 rounded bg-[#493344] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    Pinless Active
                  </div>
                </div>

                {/* Telemetry Row */}
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] p-2.5">
                    <span className="text-[10px] font-medium text-[#806C7B]">Moisture Level</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-[#B995AD]">24.8%</span>
                      <span className="text-[10px] font-bold text-[#493344]">WME</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#B995AD]">Sub-drywall damp</span>
                  </div>

                  <div className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] p-2.5">
                    <span className="text-[10px] font-medium text-[#806C7B]">Risk Index</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-[#493344]">86</span>
                      <span className="text-[10px] font-medium text-[#806C7B]">/100</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#806C7B]">Priority review</span>
                  </div>
                </div>

                {/* Illustrative Label */}
                <div className="mt-2.5 text-center text-[9px] font-medium text-[#806C7B]">
                  Illustrative property telemetry preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
