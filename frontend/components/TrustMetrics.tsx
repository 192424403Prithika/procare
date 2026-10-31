import React from "react";
import { BuildingShieldIcon, CheckCircleIcon, AlertTriangleIcon, ActivityIcon } from "./Icons";

export default function TrustMetrics() {
  const metrics = [
    {
      label: "Properties Monitored",
      value: "1,240+",
      sub: "Across housing portfolios",
      color: "bg-[#EFE4EC] text-[#B995AD]",
      icon: <BuildingShieldIcon size={20} className="text-[#B995AD]" />,
    },
    {
      label: "Inspections Completed",
      value: "3,850+",
      sub: "Dielectric & acoustic surveys",
      color: "bg-[#EAE0E7] text-[#493344]",
      icon: <CheckCircleIcon size={20} className="text-[#493344]" />,
    },
    {
      label: "Issues Identified",
      value: "620+",
      sub: "Pre-surface micro anomalies",
      color: "bg-[#FDF5ED] text-[#493344]",
      icon: <AlertTriangleIcon size={20} className="text-[#493344]" />,
    },
    {
      label: "Preventive Actions",
      value: "94%",
      sub: "Resolved prior to structural rot",
      color: "bg-[#EFF8F3] text-[#493344]",
      icon: <ActivityIcon size={20} className="text-[#493344]" />,
    },
  ];

  return (
    <section className="py-12 border-y border-[#E6D5DC] bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left mb-8">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#493344] sm:text-2xl">
              Predictive Impact by the Numbers
            </h2>
            <p className="mt-1 text-xs text-[#806C7B]">
              Sample dashboard telemetry demonstrating early damp mitigation at scale.
            </p>
          </div>
          <span className="rounded-full bg-[#F7EDE5] px-3 py-1 text-[11px] font-semibold text-[#806C7B] border border-[#E6D5DC]">
            Illustrative Sample Metrics
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {metrics.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5] p-5 transition-all hover:bg-white hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#806C7B]">{item.label}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}>
                  {item.icon}
                </div>
              </div>

              <div className="mt-3 text-3xl font-black tracking-tight text-[#493344]">
                {item.value}
              </div>

              <div className="mt-1 text-[11px] font-medium text-[#806C7B]">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
