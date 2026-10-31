import React from "react";
import {
  HomeIcon,
  ScanIcon,
  AlertTriangleIcon,
  WrenchIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "./Icons";

export default function ImpactStatistics() {
  const stats = [
    {
      value: "1,240+",
      label: "Properties Monitored",
      detail: "Residential & commercial units mapped across active portfolios",
      icon: <HomeIcon size={24} className="text-[#B995AD]" />,
      badgeBg: "bg-[#EFE4EC]",
    },
    {
      value: "3,850+",
      label: "Inspections Analyzed",
      detail: "Sub-surface dielectric scans and acoustic cavity tests logged",
      icon: <ScanIcon size={24} className="text-[#493344]" />,
      badgeBg: "bg-[#EAE0E7]",
    },
    {
      value: "620+",
      label: "Risks Identified",
      detail: "Pre-symptomatic damp ingress and hidden pipe micro-weeps isolated",
      icon: <AlertTriangleIcon size={24} className="text-[#493344]" />,
      badgeBg: "bg-[#FDF5ED]",
    },
    {
      value: "410+",
      label: "Maintenance Requests",
      detail: "Proactive drying and remediation dispatches executed before rot",
      icon: <WrenchIcon size={24} className="text-[#493344]" />,
      badgeBg: "bg-[#EFF8F3]",
    },
  ];

  const subMetrics = [
    { value: "94%", label: "Early Ingress Resolution Rate" },
    { value: "100%", label: "Statutory SLA Compliance Adherence" },
    { value: "70%", label: "Average Repair Cost Reduction" },
    { value: "0", label: "Drill Holes Required in Scans" },
  ];

  return (
    <section id="impact" className="py-14 sm:py-20 lg:py-24 bg-[#F7EDE5]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE4EC] px-3.5 py-1 text-xs font-semibold text-[#B995AD]">
            <span>Demonstration Metrics</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#493344] sm:text-4xl">
            Simulated Platform Impact &amp; <span className="text-[#B995AD]">Scale</span>
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#806C7B] sm:text-base">
            Illustrative sample figures demonstrating how predictive property intelligence transforms
            large-scale portfolio maintenance efficiency.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#806C7B] border border-[#E6D5DC] shadow-xs text-left">
            <span className="h-2 w-2 rounded-full bg-[#B995AD] shrink-0" />
            <span>Demonstration figures for illustrative purposes only — not actual platform statistics.</span>
          </div>
        </div>

        {/* 4 Main Core Metric Cards */}
        <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#E6D5DC] bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5"
            >
              <div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.badgeBg} shadow-xs transition-transform duration-300 group-hover:scale-110`}>
                  {stat.icon}
                </div>

                <div className="mt-6 text-3xl sm:text-4xl font-black tracking-tight text-[#493344]">
                  {stat.value}
                </div>

                <h3 className="mt-1 text-base font-bold text-[#493344]">
                  {stat.label}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-[#806C7B]">
                  {stat.detail}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E6D5DC] text-[10px] font-bold uppercase tracking-wider text-[#B995AD]">
                Illustrative Metric
              </div>
            </div>
          ))}
        </div>

        {/* Supporting Performance Metrics Banner */}
        <div className="mt-8 rounded-3xl border border-[#E6D5DC] bg-white p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 text-center">
            {subMetrics.map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black text-[#B995AD]">{item.value}</span>
                <span className="mt-1 text-xs font-semibold text-[#493344]">{item.label}</span>
                <span className="mt-0.5 text-[10px] text-[#806C7B]">Demonstration Benchmark</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
