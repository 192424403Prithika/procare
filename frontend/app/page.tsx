"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustIndicators from "@/components/TrustIndicators";
import WhyPropCare from "@/components/WhyPropCare";
import FeatureCards from "@/components/FeatureCards";
import HowItWorks from "@/components/HowItWorks";
import DashboardPreview from "@/components/DashboardPreview";
import BenefitsSection from "@/components/BenefitsSection";
import TechnologySection from "@/components/TechnologySection";
import PropertyUseCases from "@/components/PropertyUseCases";
import ImpactStatistics from "@/components/ImpactStatistics";
import FaqSection from "@/components/FaqSection";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";
import {
  DropletIcon,
  ActivityIcon,
  XIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from "@/components/Icons";

export default function Home() {
  const [activeModal, setActiveModal] = useState<"inspection" | "dashboard" | null>(null);

  return (
    <div className="min-h-screen bg-[#F7EDE5] text-[#493344] flex flex-col font-sans selection:bg-[#EFE4EC] selection:text-[#B995AD] scroll-smooth overflow-x-hidden">
      {/* 1. NAVIGATION BAR */}
      <Navbar
        onStartInspection={() => setActiveModal("inspection")}
        onExploreDashboard={() => setActiveModal("dashboard")}
      />

      <main className="flex-1">
        {/* 2. HERO SECTION */}
        <HeroSection
          onStartInspection={() => setActiveModal("inspection")}
          onExploreDashboard={() => setActiveModal("dashboard")}
        />

        {/* 3. TRUST INDICATORS */}
        <TrustIndicators />

        {/* 4. WHY PROPCARE NW? */}
        <WhyPropCare />

        {/* 5. FEATURES SECTION */}
        <FeatureCards />

        {/* 6. HOW IT WORKS */}
        <HowItWorks />

        {/* 7. DASHBOARD PREVIEW */}
        <DashboardPreview />

        {/* 8. BENEFITS SECTION */}
        <BenefitsSection />

        {/* 9. TECHNOLOGY SECTION */}
        <TechnologySection />

        {/* 10. PROPERTY USE CASES */}
        <PropertyUseCases />

        {/* 11. IMPACT AND STATISTICS */}
        <ImpactStatistics />

        {/* 12. FAQ SECTION */}
        <FaqSection />

        {/* 13. FINAL CALL TO ACTION */}
        <CtaSection onGetStarted={() => setActiveModal("inspection")} />
      </main>

      {/* 14. FOOTER */}
      <Footer />

      {/* Interactive Mobile Field Inspection Demo Modal */}
      {activeModal === "inspection" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#493344]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-[#E6D5DC] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E6D5DC] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFE4EC] text-[#B995AD]">
                  <DropletIcon size={20} className="text-[#B995AD]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#493344]">Mobile Field Inspection (Demonstration)</h3>
                  <span className="text-[11px] text-[#806C7B]">Pinless Dielectric Scanner · Module 2</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1.5 text-[#806C7B] hover:bg-[#F7EDE5] hover:text-[#493344] cursor-pointer"
                aria-label="Close dialog"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#493344]">Telemetry Session: #INS-2026-904</span>
                  <span className="rounded-full bg-[#EFF8F3] px-2 py-0.5 text-[10px] font-bold text-[#493344]">
                    Sensor Connected
                  </span>
                </div>
                <div className="mt-2 text-xs text-[#806C7B]">
                  Asset: <span className="font-semibold text-[#493344]">Oakridge Court, Unit 402</span>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3 border border-[#E6D5DC]">
                  <span className="text-xs font-medium text-[#493344]">Live Wall Moisture Reading</span>
                  <span className="text-base font-black text-[#B995AD]">24.8% WME</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#FDF5ED] p-3 text-xs text-[#493344] border border-[#E6D5DC]">
                <span className="font-bold">Awaab&apos;s Law Trigger:</span> Moisture exceeds 16% threshold. 24-hour statutory investigation countdown initiated.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-[#E6D5DC]">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-[#E6D5DC] bg-white px-4 py-2 text-xs font-semibold text-[#493344] hover:bg-[#F7EDE5] cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex items-center gap-1.5 rounded-xl bg-[#B995AD] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#67475E] cursor-pointer"
              >
                <span>Demonstration Mode</span>
                <ArrowRightIcon size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Operations Dashboard Demo Modal */}
      {activeModal === "dashboard" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#493344]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-[#E6D5DC] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E6D5DC] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF8F3] text-[#493344]">
                  <ActivityIcon size={20} className="text-[#493344]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#493344]">Operations Dashboard (Demonstration)</h3>
                  <span className="text-[11px] text-[#806C7B]">Portfolio Command Center · Module 3</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1.5 text-[#806C7B] hover:bg-[#F7EDE5] hover:text-[#493344] cursor-pointer"
                aria-label="Close dialog"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5] p-3.5">
                  <div className="text-[10px] font-bold uppercase text-[#806C7B]">Portfolio Units</div>
                  <div className="mt-1 text-2xl font-black text-[#493344]">1,240</div>
                  <div className="mt-0.5 text-[10px] text-[#493344] font-medium">96.8% Safe Level</div>
                </div>

                <div className="rounded-2xl border border-[#FDF5ED] bg-[#F7EDE5] p-3.5">
                  <div className="text-[10px] font-bold uppercase text-[#806C7B]">Active Ingress</div>
                  <div className="mt-1 text-2xl font-black text-[#B995AD]">4 Units</div>
                  <div className="mt-0.5 text-[10px] text-[#B995AD] font-bold">18h SLA Remaining</div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5] p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#493344]">
                  <span>Weather Ingress Warning</span>
                  <span className="text-[#B995AD] font-bold">48mm Driving Rain</span>
                </div>
                <div className="mt-1.5 text-xs text-[#806C7B]">
                  Oakridge Court, Lancaster Towers, and St. Jude Estate flagged for parapet gutter inspection before incoming storm.
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-[#E6D5DC]">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-[#E6D5DC] bg-white px-4 py-2 text-xs font-semibold text-[#493344] hover:bg-[#F7EDE5] cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex items-center gap-1.5 rounded-xl bg-[#B995AD] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#67475E] cursor-pointer"
              >
                <span>Demonstration Mode</span>
                <ArrowRightIcon size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
