import React from "react";
import Link from "next/link";
import {
  BuildingShieldIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  TwitterIcon,
  LinkedinIcon,
  GithubIcon,
} from "./Icons";

export default function Footer() {
  return (
    <footer id="about" className="border-t border-[#E6D5DC] bg-white pt-16 pb-12 text-[#493344]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* 1. Brand Description & Logo */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B995AD] text-white shadow-xs">
                <BuildingShieldIcon size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#493344]">
                PropCare <span className="text-[#B995AD]">NW</span>
              </span>
            </Link>

            <p className="mt-4 text-xs leading-relaxed text-[#806C7B] max-w-sm">
              PropCare NW is an enterprise predictive property intelligence platform. We combine sub-surface
              dielectric moisture sensing, cavity acoustic diagnostics, and hyper-local weather risk modeling
              to detect building defects before damage escalates.
            </p>

            {/* Compliance Badges */}
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold text-[#B995AD]">
              <span className="rounded-md bg-[#EFE4EC] px-2.5 py-1">Awaab&apos;s Law Compliant</span>
              <span className="rounded-md bg-[#EFF8F3] px-2.5 py-1 text-[#493344]">Decent Homes Standard</span>
              <span className="rounded-md bg-[#EAE0E7] px-2.5 py-1 text-[#493344]">HHSRS Aligned</span>
            </div>

            {/* Social Media Placeholder Icons */}
            <div className="mt-6 flex items-center gap-3">
              <a
                href="#about"
                aria-label="Twitter / X profile"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6D5DC] bg-[#F7EDE5] text-[#806C7B] transition-colors hover:border-[#B995AD] hover:text-[#B995AD]"
              >
                <TwitterIcon size={14} />
              </a>
              <a
                href="#about"
                aria-label="LinkedIn profile"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6D5DC] bg-[#F7EDE5] text-[#806C7B] transition-colors hover:border-[#B995AD] hover:text-[#B995AD]"
              >
                <LinkedinIcon size={14} />
              </a>
              <a
                href="#about"
                aria-label="GitHub repository"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6D5DC] bg-[#F7EDE5] text-[#806C7B] transition-colors hover:border-[#B995AD] hover:text-[#B995AD]"
              >
                <GithubIcon size={14} />
              </a>
            </div>
          </div>

          {/* 2. Product Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#493344]">
              Product
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#806C7B]">
              <li>
                <a href="#product" className="hover:text-[#B995AD] transition-colors">
                  Moisture Intelligence
                </a>
              </li>
              <li>
                <a href="#dashboard-preview" className="hover:text-[#B995AD] transition-colors">
                  Operations Dashboard
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#B995AD] transition-colors">
                  Field Inspection Process
                </a>
              </li>
              <li>
                <a href="#technology" className="hover:text-[#B995AD] transition-colors">
                  Technology Stack
                </a>
              </li>
              <li>
                <a href="#impact" className="hover:text-[#B995AD] transition-colors">
                  Platform Metrics
                </a>
              </li>
            </ul>
          </div>

          {/* 3. Features Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#493344]">
              Features
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#806C7B]">
              <li>
                <a href="#features" className="hover:text-[#B995AD] transition-colors">
                  Smart Moisture Detection
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#B995AD] transition-colors">
                  Acoustic Leak Analysis
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#B995AD] transition-colors">
                  Predictive Weather Risk
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#B995AD] transition-colors">
                  Automated Dispatch
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#B995AD] transition-colors">
                  Statutory SLA Triage
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#B995AD] transition-colors">
                  Forensic Reports
                </a>
              </li>
            </ul>
          </div>

          {/* 4. Solutions & Contact Section */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#493344]">
              Solutions &amp; Contact
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#806C7B]">
              <li>
                <a href="#solutions" className="hover:text-[#B995AD] transition-colors">
                  Residential Apartments
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#B995AD] transition-colors">
                  Commercial Buildings
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#B995AD] transition-colors">
                  Property Managers
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#B995AD] transition-colors">
                  Facility Maintenance
                </a>
              </li>
            </ul>

            {/* Direct Contact Details */}
            <div className="mt-5 pt-4 border-t border-[#E6D5DC] space-y-2 text-[11px] text-[#806C7B]">
              <div className="flex items-center gap-2">
                <MailIcon size={13} className="text-[#B995AD]" />
                <span className="font-medium text-[#493344]">contact@propcare-nw.com</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneIcon size={13} className="text-[#B995AD]" />
                <span className="font-medium text-[#493344]">+44 (0) 161 820 4910</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon size={13} className="text-[#B995AD]" />
                <span>Manchester / North West, UK</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Technical Standards */}
        <div className="mt-12 pt-6 border-t border-[#E6D5DC] flex flex-col items-center justify-between gap-3 text-xs text-[#806C7B] sm:flex-row">
          <div>
            &copy; 2026 PropCare NW. All rights reserved. Predictive Property Intelligence.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Zero-Drill Scanning</span>
            <span>&bull;</span>
            <span>Acoustic Cavity FFT</span>
            <span>&bull;</span>
            <span>Open-Meteo Integration</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
