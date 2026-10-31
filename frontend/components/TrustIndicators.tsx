import React from "react";
import { ShieldCheckIcon, AcousticIcon, CloudRainIcon, CheckCircleIcon } from "./Icons";

export default function TrustIndicators() {
  const indicators = [
    {
      title: "Zero-Drill Non-Destructive Scanning",
      description: "High-frequency dielectric capacitance sensors map sub-surface moisture up to 40mm deep without cutting or drilling drywall.",
      icon: <ShieldCheckIcon size={22} className="text-[#B995AD]" />,
      badgeBg: "bg-[#EFE4EC]",
    },
    {
      title: "Acoustic Leak Diagnostics",
      description: "Cavity resonance listening isolates high-frequency pipe micro-weeps and valve vibrations behind structural envelopes.",
      icon: <AcousticIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#EAE0E7]",
    },
    {
      title: "Predictive Weather Intelligence",
      description: "Hyper-local rainfall vectors and wind shear models forecast mould spore germination and envelope ingress 72 hours in advance.",
      icon: <CloudRainIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#EFF8F3]",
    },
    {
      title: "Proactive Maintenance Insights",
      description: "Automated risk prioritization flags high-hazard units, prevents catastrophic structural decay, and streamlines surveyor actions.",
      icon: <CheckCircleIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#FDF5ED]",
    },
  ];

  return (
    <section className="py-10 sm:py-14 border-y border-[#E6D5DC] bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* The 4 Core Trust Pillars */}
        <div className="grid gap-3.5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {indicators.map((item, idx) => (
            <div
              key={idx}
              className="group flex flex-col items-start gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5] p-4 sm:p-5 transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${item.badgeBg} transition-transform duration-300 group-hover:scale-105`}>
                {item.icon}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#493344]">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#806C7B]">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
