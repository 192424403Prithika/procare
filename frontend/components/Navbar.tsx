"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BuildingShieldIcon, MenuIcon, XIcon, ArrowRightIcon } from "./Icons";

interface NavbarProps {
  onStartInspection?: () => void;
  onExploreDashboard?: () => void;
}

export default function Navbar({ onStartInspection, onExploreDashboard }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E6D5DC] bg-[#F7EDE5]/95 backdrop-blur-md">
      <div className="mx-auto flex h-18 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#B995AD] text-white shadow-xs transition-transform group-hover:scale-105">
            <BuildingShieldIcon size={20} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight text-[#493344]">
              PropCare <span className="text-[#B995AD]">NW</span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#806C7B]">
              Predictive Property Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-6 lg:gap-8 md:flex">
          <a
            href="#product"
            className="text-sm font-semibold text-[#493344]/80 transition-colors hover:text-[#B995AD]"
          >
            Product
          </a>
          <a
            href="#features"
            className="text-sm font-semibold text-[#493344]/80 transition-colors hover:text-[#B995AD]"
          >
            Features
          </a>
          <a
            href="#solutions"
            className="text-sm font-semibold text-[#493344]/80 transition-colors hover:text-[#B995AD]"
          >
            Solutions
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-semibold text-[#493344]/80 transition-colors hover:text-[#B995AD]"
          >
            How It Works
          </a>
          <a
            href="#about"
            className="text-sm font-semibold text-[#493344]/80 transition-colors hover:text-[#B995AD]"
          >
            About
          </a>
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden items-center gap-3.5 md:flex">
          <Link
            href="/login"
            className="text-sm font-semibold text-[#493344] transition-colors hover:text-[#B995AD] cursor-pointer px-3 py-2"
          >
            Sign In
          </Link>

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-[#B995AD] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#67475E] hover:shadow-md active:translate-y-0 cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRightIcon size={14} />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle Button - 44px+ touch area */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E6D5DC] bg-white text-[#493344] shadow-xs active:scale-95 transition-all md:hidden cursor-pointer"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="border-b border-[#E6D5DC] bg-white px-4 py-5 shadow-xl md:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1">
            <a
              href="#product"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold text-[#493344] hover:bg-[#EFE4EC]/60 hover:text-[#B995AD] transition-colors"
            >
              Product
            </a>
            <a
              href="#features"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold text-[#493344] hover:bg-[#EFE4EC]/60 hover:text-[#B995AD] transition-colors"
            >
              Features
            </a>
            <a
              href="#solutions"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold text-[#493344] hover:bg-[#EFE4EC]/60 hover:text-[#B995AD] transition-colors"
            >
              Solutions
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold text-[#493344] hover:bg-[#EFE4EC]/60 hover:text-[#B995AD] transition-colors"
            >
              How It Works
            </a>
            <a
              href="#about"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold text-[#493344] hover:bg-[#EFE4EC]/60 hover:text-[#B995AD] transition-colors"
            >
              About
            </a>

            {/* Mobile Actions */}
            <div className="mt-4 flex flex-col gap-2.5 pt-4 border-t border-[#E6D5DC]">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[46px] w-full items-center justify-center rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2.5 text-sm font-semibold text-[#493344] active:bg-[#E6D5DC] transition-colors cursor-pointer"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#B995AD] py-2.5 text-sm font-semibold text-white shadow-xs active:bg-[#67475E] transition-colors cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRightIcon size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
