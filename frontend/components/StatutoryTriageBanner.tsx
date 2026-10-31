"use client";

import React from "react";
import {
  ShieldCheckIcon,
  ClockIcon,
  FileTextIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BuildingIcon,
  ArrowRightIcon,
} from "./Icons";

export default function StatutoryTriageBanner() {
  return (
    <section id="statutory" className="py-14 bg-white border-y border-[#E5E9F2]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E8E9FF]/50 via-white to-[#DCE8FA]/40 p-8 border border-[#DCE8FA] shadow-sm sm:p-10">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FFEACF] px-3 py-1 text-xs font-bold text-[#26324B]">
                <AlertTriangleIcon className="h-3.5 w-3.5 text-[#26324B]" />
                <span>Statutory Mandate Compliance</span>
              </div>

              <h3 className="mt-4 text-2xl font-extrabold text-[#26324B] sm:text-3xl">
                Built specifically to comply with <span className="text-[#B995AD]">Awaab&apos;s Law</span> and the Decent Homes Standard
              </h3>

              <p className="mt-3 text-sm text-[#64748B] sm:text-base leading-relaxed">
                Social landlords and private property managers face stringent legal timeframes:
                investigate hazards within 24 hours, begin repair works within 48 hours, and maintain
                tamper-proof evidential records. PropCare NW automates every statutory milestone.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-3.5 border border-[#E5E9F2] shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#B995AD]">
                    <ClockIcon className="h-4 w-4" />
                    <span>24h Initial Triage</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748B]">Automated hazard classification & survey booking</p>
                </div>

                <div className="rounded-2xl bg-white p-3.5 border border-[#E5E9F2] shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#26324B]">
                    <FileTextIcon className="h-4 w-4" />
                    <span>Court-Admissible</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748B]">Digital timestamped telemetry logs & moisture maps</p>
                </div>

                <div className="rounded-2xl bg-white p-3.5 border border-[#E5E9F2] shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#26324B]">
                    <ShieldCheckIcon className="h-4 w-4" />
                    <span>Zero Liability Gaps</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748B]">Audited contractor sign-off & post-dry certification</p>
                </div>
              </div>
            </div>

            {/* Right Interactive SLA Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-[#DDF5EA] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E5E9F2] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-[#DDF5EA] text-[#26324B]" />
                    <span className="text-xs font-bold text-[#26324B]">Statutory Compliance Engine</span>
                  </div>
                  <span className="rounded bg-[#DDF5EA] px-2 py-0.5 text-[10px] font-bold text-[#26324B]">
                    Audit Ready
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DDF5EA] text-[#26324B]">
                      <CheckCircleIcon className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-[#26324B]">Step 1: Automated Case Logging</div>
                      <div className="text-[#64748B]">Dielectric sensor or tenant damp report ingested into triage</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DDF5EA] text-[#26324B]">
                      <CheckCircleIcon className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-[#26324B]">Step 2: Predictive Spore & Structural Analysis</div>
                      <div className="text-[#64748B]">AI correlates weather, building envelope, and hygroscopic equilibrium</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8E9FF] text-[#B995AD]">
                      <ClockIcon className="h-4 w-4 text-[#B995AD]" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-[#26324B]">Step 3: Auto-Dispatch Work Order</div>
                      <div className="text-[#64748B]">Pre-qualified contractor notified with exact drying equipment quota</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E5E9F2] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#64748B]">Average Triage Resolution</span>
                  <span className="text-xs font-extrabold text-[#B995AD]">&lt; 4 Hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
