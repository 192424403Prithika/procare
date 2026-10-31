import React from "react";
import {
  HomeIcon,
  Building2Icon,
  UsersIcon,
  WrenchIcon,
  CheckIcon,
  ArrowRightIcon,
} from "./Icons";

export default function PropertyUseCases() {
  const useCases = [
    {
      title: "Residential Apartments",
      category: "Multi-Family & Social Housing",
      description:
        "Protect high-density residential estates from cavity damp, interstitial condensation, and toxic mould blooms while ensuring full compliance with tenant safety standards.",
      icon: <HomeIcon size={24} className="text-[#B995AD]" />,
      badgeBg: "bg-[#EFE4EC]",
      accentBorder: "hover:border-[#B995AD]/50",
      highlights: [
        "Awaab's Law 24-hour statutory hazard triage",
        "Sub-drywall bathroom & kitchen cavity monitoring",
        "Tenant health protection against mould spore blooms",
      ],
      idealFor: "Housing Associations & Multi-family Landlords",
    },
    {
      title: "Commercial Buildings",
      category: "Offices, Retail & Mixed-Use",
      description:
        "Preserve commercial asset value and prevent business disruption by detecting roof parapet ingress, riser pipe micro-weeps, and curtain-wall leaks early.",
      icon: <Building2Icon size={24} className="text-[#493344]" />,
      badgeBg: "bg-[#EAE0E7]",
      accentBorder: "hover:border-[#EAE0E7]",
      highlights: [
        "Façade & roof parapet rainwater ingress alerts",
        "HVAC riser & concealed pipe acoustic scanning",
        "Zero-drill diagnostics during active office hours",
      ],
      idealFor: "Commercial Asset Funds & Corporate Campuses",
    },
    {
      title: "Property Management Companies",
      category: "Portfolio Asset Directors",
      description:
        "Centralize inspection schedules, eliminate spreadsheet tracking, and manage disrepair claims across hundreds of scattered units from a single dashboard.",
      icon: <UsersIcon size={24} className="text-[#493344]" />,
      badgeBg: "bg-[#FDF5ED]",
      accentBorder: "hover:border-[#FDF5ED]",
      highlights: [
        "Unified portfolio health scoring & risk mapping",
        "Automated drying contractor SLA tracking",
        "Court-admissible cryptographically signed logs",
      ],
      idealFor: "Block Managers & Build-to-Rent Operators",
    },
    {
      title: "Facility Maintenance Teams",
      category: "Surveyors & Remediation Specialists",
      description:
        "Equip field operatives with calibrated dielectric probes, acoustic FFT analyzers, and automated drying specifications to resolve ingress efficiently.",
      icon: <WrenchIcon size={24} className="text-[#493344]" />,
      badgeBg: "bg-[#EFF8F3]",
      accentBorder: "hover:border-[#EFF8F3]",
      highlights: [
        "Rapid non-destructive mobile survey workflows",
        "Dehumidifier deployment & drying sign-off metrics",
        "Eliminates destructive exploratory wall cutting",
      ],
      idealFor: "Chartered Building Surveyors & Damp Remediation Crews",
    },
  ];

  return (
    <section id="solutions" className="py-14 sm:py-20 lg:py-24 bg-white border-y border-[#E6D5DC]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE4EC] px-3.5 py-1 text-xs font-semibold text-[#B995AD]">
            <span>Tailored Solutions</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#493344] sm:text-4xl">
            Built for Every <span className="text-[#B995AD]">Property Sector</span>
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#806C7B] sm:text-base">
            Whether managing thousands of social housing homes or maintaining premium commercial assets,
            PropCare NW adapts to your exact operational requirements.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((useCase, idx) => (
            <div
              key={idx}
              className={`group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#E6D5DC] bg-[#F7EDE5] p-5 sm:p-6 shadow-xs transition-all duration-300 hover:bg-white hover:shadow-xl hover:-translate-y-1.5 ${useCase.accentBorder}`}
            >
              <div>
                {/* Icon & Category */}
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${useCase.badgeBg} shadow-xs transition-transform duration-300 group-hover:scale-110`}
                  >
                    {useCase.icon}
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[9px] font-bold text-[#806C7B] border border-[#E6D5DC]">
                    Sector 0{idx + 1}
                  </span>
                </div>

                <div className="mt-5 text-[10px] font-bold uppercase tracking-wider text-[#B995AD]">
                  {useCase.category}
                </div>

                <h3 className="mt-1 text-lg font-bold tracking-tight text-[#493344]">
                  {useCase.title}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-[#806C7B]">
                  {useCase.description}
                </p>

                {/* Highlights */}
                <div className="mt-5 space-y-2 pt-4 border-t border-[#E6D5DC]">
                  {useCase.highlights.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#EFF8F3] text-[#493344]">
                        <CheckIcon size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-[#493344]/90">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Ideal For */}
              <div className="mt-6 pt-4 border-t border-[#E6D5DC]">
                <div className="text-[10px] font-semibold text-[#806C7B]">Ideal for:</div>
                <div className="mt-0.5 text-xs font-bold text-[#493344]">{useCase.idealFor}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
