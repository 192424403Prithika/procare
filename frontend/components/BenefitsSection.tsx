import React from "react";
import {
  DropletIcon,
  ShieldCheckIcon,
  ClockIcon,
  AlertTriangleIcon,
  WrenchIcon,
  FileCheckIcon,
  ArrowRightIcon,
} from "./Icons";

export default function BenefitsSection() {
  const benefits = [
    {
      title: "Detect Possible Problems Earlier",
      description:
        "Uncover invisible sub-surface damp, capillary rising moisture, and pipe micro-weeps weeks before paint bubbles, rot sets in, or mould blooms appear.",
      icon: <DropletIcon size={22} className="text-[#B995AD]" />,
      badgeBg: "bg-[#EFE4EC]",
      stat: "Weeks Earlier",
      statLabel: "Early Intervention Window",
    },
    {
      title: "Reduce Unnecessary Property Damage",
      description:
        "Pinless dielectric permittivity and acoustic listening eliminate exploratory drywall cutting, ceiling demolition, and tenant displacement.",
      icon: <ShieldCheckIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#EFF8F3]",
      stat: "100% Non-Drill",
      statLabel: "Zero Surface Damage",
    },
    {
      title: "Improve Inspection Efficiency",
      description:
        "Standardized sensor-assisted survey workflows cut diagnostic inspection time per asset from hours to minutes with automated telemetry sync.",
      icon: <ClockIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#EAE0E7]",
      stat: "3.5x Faster",
      statLabel: "Survey Completion Rate",
    },
    {
      title: "Prioritize High-Risk Properties",
      description:
        "Intelligent risk stratification algorithms automatically sort portfolio assets, spotlighting severe moisture ingress and approaching weather threats.",
      icon: <AlertTriangleIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#FDF5ED]",
      stat: "Top 7% Triage",
      statLabel: "Immediate Threat Focus",
    },
    {
      title: "Organize Maintenance Activities",
      description:
        "Seamlessly orchestrate drying contractor dispatches, monitor dehumidifier installations, and verify structural drying with closed-loop milestones.",
      icon: <WrenchIcon size={22} className="text-[#B995AD]" />,
      badgeBg: "bg-[#EFE4EC]",
      stat: "Under 4h",
      statLabel: "Avg Contractor Dispatch",
    },
    {
      title: "Maintain Inspection Records",
      description:
        "Keep comprehensive, court-admissible forensic dossiers with cryptographic timestamps to defend against housing disrepair claims and prove statutory compliance.",
      icon: <FileCheckIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#EFF8F3]",
      stat: "100% Audit",
      statLabel: "Compliance Ready Trail",
    },
  ];

  return (
    <section id="benefits" className="py-14 sm:py-20 lg:py-24 bg-white border-y border-[#E6D5DC]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE4EC] px-3.5 py-1 text-xs font-semibold text-[#B995AD]">
            <span>Measurable Value</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#493344] sm:text-4xl">
            Key Benefits of <span className="text-[#B995AD]">Predictive Maintenance</span>
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#806C7B] sm:text-base">
            Protect portfolio capital, safeguard tenant respiratory health, and maintain strict statutory
            compliance across your property estate.
          </p>
        </div>

        {/* 6 Benefit Cards Grid */}
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((item, idx) => (
            <div
              key={idx}
              className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#E6D5DC] bg-[#F7EDE5] p-5 sm:p-6 shadow-xs transition-all duration-300 hover:bg-white hover:shadow-xl hover:-translate-y-1.5"
            >
              <div>
                {/* Header: Icon + Stat Pill */}
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.badgeBg} shadow-xs transition-transform duration-300 group-hover:scale-110`}
                  >
                    {item.icon}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-[#493344] block">{item.stat}</span>
                    <span className="text-[10px] text-[#806C7B] block">{item.statLabel}</span>
                  </div>
                </div>

                <h3 className="mt-5 text-lg font-bold tracking-tight text-[#493344]">
                  {item.title}
                </h3>

                <p className="mt-2.5 text-xs leading-relaxed text-[#806C7B]">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E6D5DC] flex items-center justify-between text-xs text-[#B995AD] font-semibold">
                <span>Predictive Impact</span>
                <span className="text-sm font-bold">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
