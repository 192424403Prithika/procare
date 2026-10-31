import React from "react";
import {
  DropletIcon,
  AcousticIcon,
  CloudRainIcon,
  WrenchIcon,
  ClockIcon,
  FileCheckIcon,
  ArrowRightIcon,
  CheckIcon,
} from "./Icons";

export default function FeatureCards() {
  const features = [
    {
      title: "Smart Moisture Detection",
      badge: "Dielectric RF",
      iconBg: "bg-[#EFE4EC]",
      icon: <DropletIcon size={22} className="text-[#B995AD]" />,
      accentBorder: "hover:border-[#B995AD]/50",
      description:
        "Pinpoint hidden sub-surface damp, capillary rising moisture, and cold-bridging up to 40mm deep behind plaster and tiles before visible stains appear.",
      bulletPoints: [
        "Non-destructive pinless dielectric probe scanning",
        "Calibrated for timber, brick, plasterboard & concrete",
        "Hygroscopic equilibrium and dew-point differential",
      ],
    },
    {
      title: "Acoustic Leak Analysis",
      badge: "Cavity Resonance",
      iconBg: "bg-[#EAE0E7]",
      icon: <AcousticIcon size={22} className="text-[#493344]" />,
      accentBorder: "hover:border-[#EAE0E7]",
      description:
        "Detect pressurized micro-leaks, valve weeping, and pipe vibrations deep inside structural wall cavities using high-fidelity acoustic spectral filters.",
      bulletPoints: [
        "Ultrasonic pipe turbulence frequency detection",
        "Eliminates destructive exploratory wall cutting",
        "Identifies pinhole leaks before drywall saturation",
      ],
    },
    {
      title: "Predictive Weather Intelligence",
      badge: "72H Radar Forecast",
      iconBg: "bg-[#FDF5ED]",
      icon: <CloudRainIcon size={22} className="text-[#493344]" />,
      accentBorder: "hover:border-[#FDF5ED]",
      description:
        "Correlate hyper-local driving rain, barometric swings, and building age to model water ingress risks and biological spore germination windows 72 hours ahead.",
      bulletPoints: [
        "Predicts mould spore colony bloom timelines",
        "Wind-driven rain vector vulnerability modeling",
        "Automated early storm warnings for high-risk assets",
      ],
    },
    {
      title: "Automated Contractor Dispatch",
      badge: "Auto Dispatch",
      iconBg: "bg-[#EFF8F3]",
      icon: <WrenchIcon size={22} className="text-[#493344]" />,
      accentBorder: "hover:border-[#EFF8F3]",
      description:
        "Enforce strict remediation workflows. Automatically generate forensic repair scopes and dispatch pre-qualified damp specialists with verified drying specs.",
      bulletPoints: [
        "One-click certified drying contractor dispatch",
        "Automated dehumidification deployment tracking",
        "Closed-loop post-drying moisture verification",
      ],
    },
    {
      title: "Statutory Deadline Tracking",
      badge: "Awaab's Law SLA",
      iconBg: "bg-[#EFE4EC]",
      icon: <ClockIcon size={22} className="text-[#B995AD]" />,
      accentBorder: "hover:border-[#B995AD]/50",
      description:
        "Track regulatory timelines with automated countdown timers for the strict 24-hour investigation and 14-day repair mandates under statutory tenant safety standards.",
      bulletPoints: [
        "Real-time countdown clocks for active triage cases",
        "Automated escalation triggers for high-hazard units",
        "Decent Homes Standard & HHSRS compliance checks",
      ],
    },
    {
      title: "Forensic Inspection Reports",
      badge: "Court-Admissible",
      iconBg: "bg-[#EAE0E7]",
      icon: <FileCheckIcon size={22} className="text-[#493344]" />,
      accentBorder: "hover:border-[#EAE0E7]",
      description:
        "Generate cryptographic, tamper-evident forensic inspection dossiers complete with WME heatmaps, thermal profiles, and acoustic frequency logs.",
      bulletPoints: [
        "One-click PDF generation for legal & insurer audits",
        "Embedded GPS coordinates & calibrated sensor telemetry",
        "Complete historical damp disrepair defense audit trail",
      ],
    },
  ];

  return (
    <section id="features" className="py-14 sm:py-20 lg:py-24 bg-[#F7EDE5]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE4EC] px-3.5 py-1 text-xs font-semibold text-[#B995AD]">
            <span>Core System Capabilities</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#493344] sm:text-4xl">
            Engineered for <span className="text-[#B995AD]">Complete Property Preservation</span>
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#806C7B] sm:text-base">
            Six enterprise-grade diagnostic and workflow modules protecting building envelopes, tenant health,
            and compliance standards.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#E6D5DC] bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${feature.accentBorder}`}
            >
              <div>
                {/* Icon Header */}
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.iconBg} shadow-xs transition-transform duration-300 group-hover:scale-110`}
                  >
                    {feature.icon}
                  </div>
                  <span className="rounded-full bg-[#F7EDE5] px-2.5 py-0.5 text-[10px] font-bold text-[#806C7B] border border-[#E6D5DC]">
                    {feature.badge}
                  </span>
                </div>

                {/* Card Title & Description */}
                <h3 className="mt-5 text-lg font-bold tracking-tight text-[#493344]">
                  {feature.title}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-[#806C7B]">
                  {feature.description}
                </p>

                {/* Bullet Points */}
                <div className="mt-5 space-y-2 pt-4 border-t border-[#E6D5DC]">
                  {feature.bulletPoints.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#EFF8F3] text-[#493344]">
                        <CheckIcon size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-[#493344]/90">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Learn More link */}
              <div className="mt-6 pt-4 border-t border-[#E6D5DC] flex items-center justify-between text-xs font-semibold text-[#B995AD]">
                <span>Explore Module Spec</span>
                <ArrowRightIcon size={12} className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
