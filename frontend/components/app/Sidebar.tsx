"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BuildingShieldIcon,
  LayoutDashboardIcon,
  BuildingIcon,
  FileCheckIcon,
  DropletIcon,
  AcousticIcon,
  SparklesIcon,
  CloudRainIcon,
  AlertTriangleIcon,
  ClockIcon,
  UsersIcon,
  WrenchIcon,
  FileTextIcon,
  BellIcon,
  UserIcon,
  SettingsIcon,
  XIcon,
  LogOutIcon,
} from "@/components/Icons";
import { useRole } from "./RoleContext";
import { isRouteAllowed } from "@/lib/authPermissions";

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { role, profile, signOut } = useRole();

  const navItems = [
    {
      label: "Dashboard",
      href: "/app/dashboard",
      icon: LayoutDashboardIcon,
      badge: null,
    },
    {
      label: "Properties",
      href: "/app/properties",
      icon: BuildingIcon,
      badge: "148",
    },
    {
      label: "Inspections",
      href: "/app/inspections",
      icon: FileCheckIcon,
      badge: "6 pending",
    },
    {
      label: "Moisture Analysis",
      href: "/app/moisture-analysis",
      icon: DropletIcon,
      badge: "OpenCV",
    },
    {
      label: "Acoustic Analysis",
      href: "/app/acoustic-analysis",
      icon: AcousticIcon,
      badge: "FFT",
    },
    {
      label: "Multi-Defect Triage",
      href: "/app/multi-defect",
      icon: SparklesIcon,
      badge: "Cross-Modal",
      badgeColor: "bg-[#79566F] text-white",
    },
    {
      label: "Weather Intelligence",
      href: "/app/weather",
      icon: CloudRainIcon,
      badge: "Live",
    },
    {
      label: "Risk & Triage",
      href: "/app/risk-triage",
      icon: AlertTriangleIcon,
      badge: "3 Critical",
      badgeColor: "bg-[#C84661] text-white",
    },
    {
      label: "Deadlines",
      href: "/app/deadlines",
      icon: ClockIcon,
      badge: "Awaab SLA",
      badgeColor: "bg-[#B86B35] text-white",
    },
    {
      label: "Contractors",
      href: "/app/contractors",
      icon: UsersIcon,
      badge: null,
    },
    {
      label: "Work Orders",
      href: "/app/work-orders",
      icon: WrenchIcon,
      badge: "12 active",
    },
    {
      label: "Reports",
      href: "/app/reports",
      icon: FileTextIcon,
      badge: null,
    },
    {
      label: "Notifications",
      href: "/app/notifications",
      icon: BellIcon,
      badge: "4",
      badgeColor: "bg-[#B995AD] text-white",
    },
    {
      label: "Profile",
      href: "/app/profile",
      icon: UserIcon,
      badge: null,
    },
    {
      label: "Settings",
      href: "/app/settings",
      icon: SettingsIcon,
      badge: null,
    },
  ];

  const roleColors: Record<string, string> = {
    admin: "bg-[#79566F]/15 text-[#79566F] border-[#79566F]/30",
    manager: "bg-[#B995AD]/25 text-[#493344] border-[#B995AD]/40",
    inspector: "bg-[#4A8B71]/15 text-[#4A8B71] border-[#4A8B71]/30",
    contractor: "bg-[#B86B35]/15 text-[#B86B35] border-[#B86B35]/30",
  };

  const roleLabels: Record<string, string> = {
    admin: "Platform Admin",
    manager: "Property Manager",
    inspector: "Field Inspector",
    contractor: "Contractor",
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#E8DADB] text-[#493344] flex flex-col transition-transform duration-300 ease-in-out border-r border-[#E6D5DC] lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-[#E6D5DC] bg-[#DFCECF]">
          <Link
            href="/app/dashboard"
            className="flex items-center gap-3 group"
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#79566F] text-white shadow-md shadow-[#79566F]/30 transition-transform group-hover:scale-105">
              <BuildingShieldIcon size={20} className="text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[#493344] block">
                PropCare <span className="text-[#B995AD]">NW</span>
              </span>
              <span className="text-[10px] font-medium text-[#806C7B] block tracking-wider uppercase">
                Property Intelligence
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            className="lg:hidden p-1.5 text-[#806C7B] hover:text-[#493344] rounded-lg hover:bg-black/5 cursor-pointer"
            onClick={() => setMobileOpen(false)}
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin scrollbar-thumb-[#D8C4D0]">
          <div className="px-3 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#806C7B]">
              Operations &amp; Telemetry
            </span>
          </div>

          {navItems
            .filter((item) => isRouteAllowed(item.href, role))
            .map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? "bg-[#79566F] text-white shadow-md shadow-[#79566F]/30 font-semibold"
                    : "text-[#493344] hover:bg-[#D8C4D0]/60 hover:text-[#493344]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={17}
                    className={`transition-colors ${
                      isActive ? "text-white" : "text-[#806C7B] group-hover:text-[#493344]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.badgeColor ||
                      (isActive ? "bg-white/20 text-white" : "bg-[#D8C4D0] text-[#493344]")
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Role Card at Bottom */}
        <div className="p-4 border-t border-[#E6D5DC] bg-[#DFCECF]">
          <div className="p-3 rounded-xl bg-white/80 border border-[#E6D5DC]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[#806C7B] font-bold">
                Active Session
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border ${
                  roleColors[role] || "bg-[#D8C4D0] text-[#493344]"
                }`}
              >
                {roleLabels[role] || role}
              </span>
            </div>
            <div className="text-xs font-semibold text-[#493344] truncate">{profile.name}</div>
            <div className="text-[10px] text-[#806C7B] truncate">{profile.organization}</div>
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-[#C84661] bg-[#FDF2F4] hover:bg-[#FBE4E8] border border-[#C84661]/20 transition-colors cursor-pointer"
            >
              <LogOutIcon size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
