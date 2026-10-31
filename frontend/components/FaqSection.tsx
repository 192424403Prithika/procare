"use client";

import React, { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, DropletIcon } from "./Icons";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "What is PropCare NW?",
      answer:
        "PropCare NW is an enterprise predictive property intelligence platform designed for housing associations, chartered building surveyors, and property management teams. It integrates sub-surface dielectric moisture scanning, cavity acoustic leak detection, and hyper-local 72-hour weather forecasting to detect water ingress and damp risks before visible damage occurs.",
    },
    {
      question: "How does moisture detection work?",
      answer:
        "The platform utilizes pinless high-frequency dielectric capacitance sensors paired via Bluetooth to the field inspection app. By measuring changes in relative dielectric permittivity, it calculates the Wood Moisture Equivalent (WME) percentage up to 40mm deep behind drywall, plasterboard, tiles, and timber studs without puncturing surfaces.",
    },
    {
      question: "Does the system require drilling?",
      answer:
        "No. PropCare NW is 100% non-destructive and zero-drill. Traditional inspections often involve destructive exploratory cutting into walls, ceilings, and tiles to search for pipe leaks. Our non-invasive dielectric scanners and high-sensitivity acoustic probes assess internal cavities completely through intact building envelopes.",
    },
    {
      question: "How does acoustic analysis help?",
      answer:
        "Pressurized pipe micro-weeps, pinhole fractures, and faulty valves emit high-frequency acoustic turbulence. By utilizing specialized cavity listening probes and applying Fast Fourier Transform (FFT) digital signal processing, PropCare NW isolates the distinctive audio frequency spectrum of active water leaks from ambient room noise.",
    },
    {
      question: "Can property managers track inspections?",
      answer:
        "Yes. The centralized cloud dashboard gives asset directors and property managers a real-time portfolio overview. You can monitor property health scores, review automated risk stratifications, track statutory SLA countdowns (such as Awaab's Law 24-hour and 14-day timelines), and coordinate contractor drying work orders from any web browser.",
    },
    {
      question: "Does the platform provide real-time weather information?",
      answer:
        "Yes. PropCare NW integrates meteorological APIs (such as Open-Meteo) to stream hyper-local precipitation forecasts, wind-driven rain vectors, and relative humidity models. This allows property managers to receive early ingress alerts 72 hours before major storms hit high-risk masonry or parapet structures.",
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-14 sm:py-20 lg:py-24 bg-white border-y border-[#E6D5DC]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE4EC] px-3.5 py-1 text-xs font-semibold text-[#B995AD]">
            <span>Frequently Asked Questions</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#493344] sm:text-4xl">
            Everything You Need to <span className="text-[#B995AD]">Know</span>
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#806C7B] sm:text-base">
            Answers to common questions regarding non-destructive sensing, acoustic diagnostics, and portfolio
            statutory compliance.
          </p>
        </div>

        {/* Expandable Accordion List */}
        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="overflow-hidden rounded-xl sm:rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5] transition-all hover:border-[#B995AD]/40"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="flex w-full min-h-[48px] items-center justify-between p-4 sm:p-5 text-left text-sm sm:text-base font-bold text-[#493344] transition-colors hover:text-[#B995AD] cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="pr-3">{faq.question}</span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${
                      isOpen ? "bg-[#EFE4EC] text-[#B995AD]" : "bg-white text-[#806C7B]"
                    } border border-[#E6D5DC] transition-colors`}
                  >
                    {isOpen ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 text-xs sm:text-sm leading-relaxed text-[#806C7B] border-t border-[#E6D5DC]/60 bg-white">
                    <p className="mt-2">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
