"use client";

import React from "react";
import { ArrowRightIcon, ShieldCheckIcon, DropletIcon, ActivityIcon } from "./Icons";

interface CtaSectionProps {
  onGetStarted?: () => void;
}

export default function CtaSection({ onGetStarted }: CtaSectionProps) {
  return (
    <section className="relative overflow-hidden py-14 sm:py-20 lg:py-24 bg-white border-t border-[#E6D5DC]">
      {/* Decorative gradient glow */}
      <div className="pointer-events-none absolute -bottom-24 left-1/2 -z-10 h-[380px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-t from-[#EFE4EC] via-[#EAE0E7]/40 to-transparent blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#B995AD]/30 bg-gradient-to-br from-[#EFE4EC]/80 via-white to-[#EAE0E7]/50 p-6 sm:p-12 lg:p-14 text-center shadow-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#B995AD] shadow-xs border border-[#E6D5DC]">
            <ShieldCheckIcon size={14} className="text-[#B995AD]" />
            <span>AI-Driven Property Preservation &amp; Compliance</span>
          </div>

          <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[#493344] sm:text-4xl lg:text-5xl">
            Protect Your Properties <span className="text-[#B995AD]">Before Problems Grow.</span>
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-[#806C7B] sm:text-sm lg:text-base">
            Equip your property officers and chartered surveyors with non-destructive dielectric telemetry,
            acoustic leak detection, and automated statutory work order dispatch to eliminate costly structural
            damage and ensure tenant safety.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onGetStarted}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#B995AD] px-8 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#B995AD]/20 transition-all hover:bg-[#67475E] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 sm:w-auto cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRightIcon size={14} />
            </button>

            <a
              href="#features"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#E6D5DC] bg-white px-8 py-3.5 text-sm font-semibold text-[#493344] shadow-xs transition-all hover:border-[#B995AD]/50 hover:bg-[#F7EDE5] hover:-translate-y-0.5 active:translate-y-0 sm:w-auto cursor-pointer"
            >
              <ActivityIcon size={16} className="text-[#B995AD]" />
              <span>Explore Features</span>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#806C7B]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#493344]" />
              Zero Hardware Lock-In
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B995AD]" />
              Full Audit Trail Security
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#493344]" />
              Decent Homes Standard 2 Ready
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
