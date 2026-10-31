"use client";

import React, { useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  DropletIcon,
  AcousticIcon,
  ClockIcon,
  DollarSignIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from "./Icons";

export default function WhyPropCare() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const comparisons = [
    {
      problemTitle: "Hidden Moisture Damage",
      problemDesc:
        "Moisture accumulates silently behind drywall, sub-floors, and structural cavities for months before surface staining or paint bubbling appears.",
      problemImpact: "Costly structural timber rot, toxic black mould spore proliferation, and health hazards.",
      solutionTitle: "High-Frequency Dielectric Sensing",
      solutionDesc:
        "Scans up to 40mm sub-surface using pinless non-destructive capacitance to map moisture gradients before any visible damage manifests.",
      solutionBenefit: "Immediate early detection within minutes, 100% non-invasive with zero surface damage.",
      icon: <DropletIcon size={20} className="text-[#B995AD]" />,
      badgeBg: "bg-[#EFE4EC]",
    },
    {
      problemTitle: "Undetected Pipe Leakage",
      problemDesc:
        "Pressurized micro-weeps, pinhole fractures, and valve weeping behind tiled bathrooms and riser ducts go unnoticed until catastrophic ceiling collapses.",
      problemImpact: "Expensive emergency exploratory wall demolition, tenant displacement, and severe water loss.",
      solutionTitle: "Acoustic Cavity FFT Diagnostics",
      solutionDesc:
        "Isolates ultra-high frequency acoustic turbulence and resonance signatures of pressurized water escaping pipes inside enclosed building cavities.",
      solutionBenefit: "Pinpoints precise micro-leak coordinates through closed walls without exploratory cutting.",
      icon: <AcousticIcon size={20} className="text-[#493344]" />,
      badgeBg: "bg-[#EAE0E7]",
    },
    {
      problemTitle: "Delayed Property Inspections",
      problemDesc:
        "Manual paper checklists, backlog spreadsheets, and delayed surveyor dispatches cause hazard response times to exceed statutory deadlines.",
      problemImpact: "Regulatory non-compliance, legal vulnerability under Awaab's Law, and tenant dispute escalation.",
      solutionTitle: "Automated Statutory SLA Engine",
      solutionDesc:
        "Directly correlates inspection data with statutory 24-hour and 14-day legal response timers, triggering automated alerts and audit logs.",
      solutionBenefit: "Guaranteed compliance tracking with court-admissible forensic timestamps and reports.",
      icon: <ClockIcon size={20} className="text-[#493344]" />,
      badgeBg: "bg-[#EFF8F3]",
    },
    {
      problemTitle: "Unexpected Maintenance Costs",
      problemDesc:
        "Reactive emergency callouts, extensive mould remediation, and emergency contractor premiums drain annual asset preservation budgets.",
      problemImpact: "Budgets overrun by 300%+ on avoidable emergency claims and disrepair damages.",
      solutionTitle: "Proactive Envelope Preservation",
      solutionDesc:
        "Combines hyper-local 72-hour rainfall forecasting with telemetry trends to schedule targeted micro-fixes before damp spreads.",
      solutionBenefit: "Saves up to 70% in repair expenditures by replacing emergency teardowns with early prevention.",
      icon: <DollarSignIcon size={20} className="text-[#493344]" />,
      badgeBg: "bg-[#FDF5ED]",
    },
  ];

  return (
    <section id="why-propcare" className="py-14 sm:py-20 lg:py-24 bg-[#F7EDE5]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE4EC] px-3.5 py-1 text-xs font-semibold text-[#B995AD]">
            <span>Problem vs Solution</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#493344] sm:text-4xl">
            Why <span className="text-[#B995AD]">PropCare NW?</span>
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#806C7B] sm:text-base">
            Traditional property maintenance is reactive, destructive, and expensive. PropCare NW transforms
            unplanned emergencies into controlled, predictive preservation.
          </p>
        </div>

        {/* 4 Interactive / Visual Cards: Problem vs Solution */}
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
          {comparisons.map((item, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl sm:rounded-3xl border border-[#E6D5DC] bg-white shadow-xs transition-all hover:shadow-lg hover:-translate-y-1"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E6D5DC] bg-[#F7EDE5]/60 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl ${item.badgeBg}`}>
                    {item.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#806C7B]">Challenge #{index + 1}</span>
                    <h3 className="text-sm sm:text-base font-bold text-[#493344]">{item.problemTitle}</h3>
                  </div>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#B995AD] border border-[#E6D5DC] shrink-0">
                  Predictive Fix
                </span>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* The Traditional Problem */}
                <div className="rounded-2xl border border-[#FDF5ED] bg-[#FDF5ED]/30 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#493344]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FDF5ED] text-[#493344]">
                      ✕
                    </span>
                    <span>The Traditional Failure: {item.problemTitle}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#806C7B]">
                    {item.problemDesc}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#493344]">
                    <span className="text-[#B995AD] font-bold">Risk:</span>
                    <span>{item.problemImpact}</span>
                  </div>
                </div>

                {/* The PropCare NW Solution */}
                <div className="rounded-2xl border border-[#EFF8F3] bg-[#EFF8F3]/30 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#493344]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EFF8F3] text-[#493344]">
                      ✓
                    </span>
                    <span>The PropCare NW Advantage: {item.solutionTitle}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#493344]/80">
                    {item.solutionDesc}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#493344]">
                    <span className="text-[#493344] font-bold">Outcome:</span>
                    <span>{item.solutionBenefit}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
