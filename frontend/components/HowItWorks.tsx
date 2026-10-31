import React from "react";
import {
  Building2Icon,
  ScanIcon,
  CpuIcon,
  FileCheckIcon,
  ArrowRightIcon,
} from "./Icons";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Identify the Property and Inspection Zone",
      subtitle: "Asset & structural zoning",
      description:
        "Select the asset unit, floorplan layout, and structural zone (drywall, subfloor screed, or external wall envelope) to calibrate baseline dielectric permittivity.",
      icon: <Building2Icon size={24} className="text-[#B995AD]" />,
      badgeBg: "bg-[#EFE4EC]",
    },
    {
      number: "02",
      title: "Capture Images, Acoustic Signals and Symptoms",
      subtitle: "Multi-sensor field diagnostics",
      description:
        "Field surveyors record high-resolution visual evidence, capture cavity acoustic resonance recordings with listening probes, and log humidity and temperature readings.",
      icon: <ScanIcon size={24} className="text-[#493344]" />,
      badgeBg: "bg-[#EAE0E7]",
    },
    {
      number: "03",
      title: "Analyze Moisture and Environmental Risk",
      subtitle: "AI correlation & FFT processing",
      description:
        "The predictive engine computes WME moisture percentages, runs Fast Fourier Transform spectral analysis on acoustic leaks, and factors in 72-hour rainfall vectors.",
      icon: <CpuIcon size={24} className="text-[#493344]" />,
      badgeBg: "bg-[#FDF5ED]",
    },
    {
      number: "04",
      title: "Generate Reports and Maintenance Recommendations",
      subtitle: "Actionable triage & dispatch",
      description:
        "Instantly output court-admissible forensic PDF dossiers, trigger statutory compliance timers, and dispatch accredited drying specialists before damage escalates.",
      icon: <FileCheckIcon size={24} className="text-[#493344]" />,
      badgeBg: "bg-[#EFF8F3]",
    },
  ];

  return (
    <section id="how-it-works" className="py-14 sm:py-20 lg:py-24 bg-white border-y border-[#E6D5DC]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE4EC] px-3.5 py-1 text-xs font-semibold text-[#B995AD]">
            <span>Four-Step Methodology</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#493344] sm:text-4xl">
            How <span className="text-[#B995AD]">PropCare NW</span> Works
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#806C7B] sm:text-base">
            A seamless horizontal workflow connecting on-site diagnostic capture to predictive risk analytics
            and automated remediation recommendations.
          </p>
        </div>

        {/* 4-Step Horizontal Process with Connecting Lines */}
        <div className="relative">
          {/* Desktop Connecting Horizontal Line */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 -translate-y-8 bg-gradient-to-r from-[#EFE4EC] via-[#B995AD]/40 to-[#EFF8F3] -z-0" />

          <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#E6D5DC] bg-[#F7EDE5] p-5 sm:p-6 shadow-xs transition-all duration-300 hover:bg-white hover:shadow-xl hover:-translate-y-1.5"
              >
                <div>
                  {/* Top Bar: Icon + Step Number */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.badgeBg} shadow-xs transition-transform duration-300 group-hover:scale-110`}
                    >
                      {step.icon}
                    </div>
                    <span className="text-2xl font-black text-[#B995AD]/40 group-hover:text-[#B995AD] transition-colors">
                      {step.number}
                    </span>
                  </div>

                  <div className="mt-5 text-[11px] font-bold uppercase tracking-wider text-[#B995AD]">
                    Step {step.number}
                  </div>

                  <h3 className="mt-1 text-base font-bold tracking-tight text-[#493344]">
                    {step.title}
                  </h3>

                  <p className="mt-1 text-[11px] font-semibold text-[#806C7B]">{step.subtitle}</p>

                  <p className="mt-3 text-xs leading-relaxed text-[#806C7B]">{step.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E6D5DC] flex items-center justify-between text-xs">
                  <span className="text-[#806C7B]">Phase {idx + 1} of 4</span>
                  {idx < 3 ? (
                    <span className="inline-flex items-center gap-1 text-[#B995AD] font-semibold">
                      <span>Next Step</span>
                      <ArrowRightIcon size={12} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#493344] font-bold">
                      <span>Final Action</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
