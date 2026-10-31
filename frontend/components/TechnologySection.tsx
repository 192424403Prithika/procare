import React from "react";
import {
  ScanIcon,
  AcousticIcon,
  CloudRainIcon,
  ServerIcon,
  DatabaseIcon,
  CodeIcon,
  CpuIcon,
} from "./Icons";

export default function TechnologySection() {
  const techStack = [
    {
      category: "Computer Vision",
      tech: "OpenCV",
      badge: "Vision AI",
      description:
        "Extracts damp boundaries, aligns multi-spectral thermal gradients, and generates calibrated surface moisture heatmaps from mobile camera captures.",
      icon: <ScanIcon size={22} className="text-[#B995AD]" />,
      badgeBg: "bg-[#EFE4EC]",
      role: "Visual pathology & thermal alignment",
    },
    {
      category: "Acoustic Signal Processing",
      tech: "FFT (Fast Fourier Transform)",
      badge: "Spectral DSP",
      description:
        "Transforms cavity acoustic audio into frequency spectra to isolate signature high-frequency turbulence caused by pressurized pipe micro-leaks.",
      icon: <AcousticIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#EAE0E7]",
      role: "Ultrasonic pipe leak isolation",
    },
    {
      category: "Weather Intelligence",
      tech: "Open-Meteo",
      badge: "Meteorological API",
      description:
        "Streams hyper-local driving rain volumes, wind shear vectors, and relative humidity trends to forecast structural envelope ingress 72 hours ahead.",
      icon: <CloudRainIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#FDF5ED]",
      role: "72H envelope ingress prediction",
    },
    {
      category: "Backend Analysis",
      tech: "Python FastAPI",
      badge: "Async Engine",
      description:
        "Powers high-throughput asynchronous diagnostic pipelines, statutory SLA countdown calculators, and automated contractor dispatch webhooks.",
      icon: <ServerIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#EFF8F3]",
      role: "High-speed analytical pipeline",
    },
    {
      category: "Database & Security",
      tech: "Supabase PostgreSQL",
      badge: "PostGIS & RLS",
      description:
        "Enterprise PostgreSQL with Row-Level Security, geospatial telemetry queries for estate mapping, and cryptographic immutable audit logs.",
      icon: <DatabaseIcon size={22} className="text-[#B995AD]" />,
      badgeBg: "bg-[#EFE4EC]",
      role: "Secure telemetry storage & audit logs",
    },
    {
      category: "Frontend Application",
      tech: "Next.js & TypeScript",
      badge: "React 19 & Tailwind",
      description:
        "Modern responsive web architecture with strict static typing, fluid component state, and real-time dashboard visualization.",
      icon: <CodeIcon size={22} className="text-[#493344]" />,
      badgeBg: "bg-[#EAE0E7]",
      role: "Ultra-responsive client command hub",
    },
  ];

  return (
    <section id="technology" className="py-14 sm:py-20 lg:py-24 bg-[#F7EDE5]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE4EC] px-3.5 py-1 text-xs font-semibold text-[#B995AD]">
            <span>Architectural Foundation</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#493344] sm:text-4xl">
            Enterprise Technology <span className="text-[#B995AD]">Stack</span>
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#806C7B] sm:text-base">
            PropCare NW brings together advanced computer vision, acoustic digital signal processing, and
            meteorological modeling into an enterprise-ready architecture.
          </p>
        </div>

        {/* 6 Technology Cards Grid */}
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {techStack.map((item, idx) => (
            <div
              key={idx}
              className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#E6D5DC] bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5"
            >
              <div>
                {/* Header: Icon + Category Badge */}
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.badgeBg} shadow-xs transition-transform duration-300 group-hover:scale-110`}
                  >
                    {item.icon}
                  </div>
                  <span className="rounded-full bg-[#F7EDE5] px-2.5 py-0.5 text-[10px] font-bold text-[#806C7B] border border-[#E6D5DC]">
                    {item.badge}
                  </span>
                </div>

                <div className="mt-5 text-[10px] font-bold uppercase tracking-wider text-[#B995AD]">
                  {item.category}
                </div>

                <h3 className="mt-1 text-lg font-bold tracking-tight text-[#493344]">
                  {item.tech}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-[#806C7B]">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E6D5DC] flex items-center justify-between text-xs">
                <span className="text-[#806C7B] font-medium">{item.role}</span>
                <span className="rounded-md bg-[#EFF8F3] px-2 py-0.5 text-[10px] font-bold text-[#493344]">
                  Integrated
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
