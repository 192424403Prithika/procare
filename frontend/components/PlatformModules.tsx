"use client";

import React from "react";
import {
  DropletIcon,
  ShieldCheckIcon,
  ActivityIcon,
  RadarIcon,
  CloudRainIcon,
  WrenchIcon,
  FileTextIcon,
  BuildingIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "./Icons";

interface ModuleItem {
  id: number;
  title: string;
  category: string;
  badge: string;
  status: "Active" | "Next";
  colorBg: string;
  colorBorder: string;
  description: string;
  icon: React.ReactNode;
}

export default function PlatformModules() {
  const modules: ModuleItem[] = [
    {
      id: 1,
      title: "1. Landing Page",
      category: "Platform Overview",
      badge: "Completed",
      status: "Active",
      colorBg: "bg-[#E8E9FF]",
      colorBorder: "border-[#B995AD]",
      description: "Executive presentation, core value proposition, interactive telemetry showcase, and public portal.",
      icon: <SparklesIcon className="h-5 w-5 text-[#B995AD]" />,
    },
    {
      id: 2,
      title: "2. Mobile Field Inspection",
      category: "Field Operations",
      badge: "Next Module",
      status: "Next",
      colorBg: "bg-[#DCE8FA]",
      colorBorder: "border-[#DCE8FA]",
      description: "On-site surveyor app for wireless moisture meter pairing, camera thermal overlays, and GPS room tagging.",
      icon: <DropletIcon className="h-5 w-5 text-[#26324B]" />,
    },
    {
      id: 3,
      title: "3. Property Dashboard",
      category: "Asset Management",
      badge: "Upcoming",
      status: "Next",
      colorBg: "bg-[#DDF5EA]",
      colorBorder: "border-[#DDF5EA]",
      description: "Portfolio-wide health scoring, unit-level risk stratification, and real-time IoT telemetry heatmaps.",
      icon: <BuildingIcon className="h-5 w-5 text-[#26324B]" />,
    },
    {
      id: 4,
      title: "4. Statutory Triage Queue",
      category: "Legal & Compliance",
      badge: "Upcoming",
      status: "Next",
      colorBg: "bg-[#FFEACF]",
      colorBorder: "border-[#FFEACF]",
      description: "Awaab's Law 24h & 14d strict statutory countdown timer, legal liability escalation, and priority routing.",
      icon: <ShieldCheckIcon className="h-5 w-5 text-[#26324B]" />,
    },
    {
      id: 5,
      title: "5. Forensic Pathology Studio",
      category: "AI Deep Diagnostics",
      badge: "Upcoming",
      status: "Next",
      colorBg: "bg-[#E8E9FF]",
      colorBorder: "border-[#B995AD]",
      description: "Deep spectral analysis distinguishing capillary rising damp, penetrating rainwater, and tenant condensation.",
      icon: <RadarIcon className="h-5 w-5 text-[#B995AD]" />,
    },
    {
      id: 6,
      title: "6. Predictive Weather Risk",
      category: "Meteorological AI",
      badge: "Upcoming",
      status: "Next",
      colorBg: "bg-[#DCE8FA]",
      colorBorder: "border-[#DCE8FA]",
      description: "72-hour hyper-local storm ingress modeling, wind-driven rain vectors, and microclimate risk indices.",
      icon: <CloudRainIcon className="h-5 w-5 text-[#26324B]" />,
    },
    {
      id: 7,
      title: "7. Automated Contractor Dispatch",
      category: "Logistics Automation",
      badge: "Upcoming",
      status: "Next",
      colorBg: "bg-[#FFEACF]",
      colorBorder: "border-[#FFEACF]",
      description: "Auto-quote comparison, pre-qualified damp specialist booking, and automated digital job pack dispatch.",
      icon: <WrenchIcon className="h-5 w-5 text-[#26324B]" />,
    },
    {
      id: 8,
      title: "8. Work Order Management",
      category: "Execution Tracking",
      badge: "Upcoming",
      status: "Next",
      colorBg: "bg-[#DDF5EA]",
      colorBorder: "border-[#DDF5EA]",
      description: "Dehumidification progress monitoring, moisture sign-off logs, tenant signatures, and invoicing.",
      icon: <FileTextIcon className="h-5 w-5 text-[#26324B]" />,
    },
    {
      id: 9,
      title: "9. Auth & Role-Based Access",
      category: "Security & Permissions",
      badge: "Upcoming",
      status: "Next",
      colorBg: "bg-[#E8E9FF]",
      colorBorder: "border-[#B995AD]",
      description: "Supabase authentication, multi-tenant RBAC (Surveyor, Housing Officer, Contractor, Tenant, Auditor).",
      icon: <ActivityIcon className="h-5 w-5 text-[#B995AD]" />,
    },
  ];

  return (
    <section id="modules" className="py-16 sm:py-24 bg-[#F7EDE5]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E8E9FF] px-3.5 py-1.5 text-xs font-semibold text-[#B995AD]">
            <RadarIcon className="h-3.5 w-3.5" />
            <span>Platform Roadmap & Modules</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#26324B] sm:text-4xl">
            9 Integrated Modules Powering <span className="text-[#B995AD]">PropCare NW</span>
          </h2>

          <p className="mt-4 text-base text-[#64748B] sm:text-lg">
            Designed as an end-to-end ecosystem connecting mobile surveyors in the field to housing directors,
            AI forensic engines, and approved repair contractors.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <div
              key={mod.id}
              className={`relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                mod.status === "Active"
                  ? "border-[#B995AD] ring-2 ring-[#B995AD]/30"
                  : "border-[#E5E9F2] hover:border-[#B995AD]/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${mod.colorBg}`}
                  >
                    {mod.icon}
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      mod.status === "Active"
                        ? "bg-[#B995AD] text-white"
                        : "bg-[#F7EDE5] text-[#64748B] border border-[#E5E9F2]"
                    }`}
                  >
                    {mod.badge}
                  </span>
                </div>

                <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[#B995AD]">
                  {mod.category}
                </div>

                <h3 className="mt-1 text-base font-bold text-[#26324B]">{mod.title}</h3>

                <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                  {mod.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E5E9F2] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#26324B]">
                  {mod.status === "Active" ? "Current Stage" : "Planned Phase"}
                </span>
                <span
                  className={`font-bold ${
                    mod.status === "Active" ? "text-[#B995AD]" : "text-[#64748B]"
                  }`}
                >
                  Module {mod.id} of 9
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
