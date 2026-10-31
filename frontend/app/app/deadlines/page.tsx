"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BuildingIcon,
  ShieldCheckIcon,
} from "@/components/Icons";

export default function DeadlinesPage() {
  const [filter, setFilter] = useState<"all" | "emergency" | "repair">("all");

  const deadlines = [
    {
      id: "SLA-0914",
      property: "Trinity Court Blocks A-C",
      zone: "Unit 14 - Bathroom Wall Riser",
      slaType: "24-Hour Emergency Investigation",
      legislation: "Awaab's Law (Social Housing Regulation Act)",
      timeRemaining: "18h 12m",
      totalWindow: "24 hours",
      status: "critical",
      hazard: "Pinhole pressurized leak with high mold propagation risk",
      assignedOfficer: "Eleanor Vance (Portfolio Director)",
      deadlineDate: "2026-10-31 11:45 GMT",
    },
    {
      id: "SLA-0422",
      property: "Pendleton Tower Estate",
      zone: "Floor 4 Service Riser Shaft",
      slaType: "24-Hour Emergency Investigation",
      legislation: "Awaab's Law (Social Housing Regulation Act)",
      timeRemaining: "21h 45m",
      totalWindow: "24 hours",
      status: "critical",
      hazard: "38% dielectric moisture saturation and 980Hz acoustic resonance",
      assignedOfficer: "Sarah Jenkins, CEng",
      deadlineDate: "2026-10-31 15:30 GMT",
    },
    {
      id: "SLA-0118",
      property: "Ancoats Redrow Terraces",
      zone: "Sub-floor void & Airbricks",
      slaType: "14-Day Mandatory Repair Commencement",
      legislation: "Awaab's Law (Social Housing Regulation Act)",
      timeRemaining: "2 days 4h",
      totalWindow: "14 days",
      status: "urgent",
      hazard: "Ventilation grilles obstructed causing interstitial sub-floor condensation",
      assignedOfficer: "Markus Thorne, MRICS",
      deadlineDate: "2026-11-02 17:00 GMT",
    },
    {
      id: "SLA-0831",
      property: "Trafford Gateway Residences",
      zone: "Apt 2B window jamb",
      slaType: "7-Day Final Rectification Signoff",
      legislation: "Statutory Housing Health and Safety Rating System (HHSRS)",
      timeRemaining: "5 days 10h",
      totalWindow: "7 days",
      status: "compliant",
      hazard: "Sealant degradation remediation verified by contractor",
      assignedOfficer: "Eleanor Vance",
      deadlineDate: "2026-11-05 09:00 GMT",
    },
  ];

  const filtered = deadlines.filter((d) => {
    if (filter === "emergency") return d.slaType.includes("24-Hour");
    if (filter === "repair") return d.slaType.includes("14-Day") || d.slaType.includes("7-Day");
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/dashboard" className="hover:text-[#79566F]">
              Dashboard
            </Link>
            <span>/</span>
            <span>Statutory Compliance</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Statutory Deadlines &amp; Awaab&apos;s Law SLAs
          </h1>
          <p className="text-xs text-[#806C7B]">
            Enforcing strict UK Social Housing Regulation Act timelines for emergency damp investigation and remediation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#E6D5DC] bg-white p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === "all" ? "bg-[#79566F] text-white" : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              All Deadlines
            </button>
            <button
              type="button"
              onClick={() => setFilter("emergency")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === "emergency" ? "bg-[#79566F] text-white" : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              24h Emergency
            </button>
            <button
              type="button"
              onClick={() => setFilter("repair")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === "repair" ? "bg-[#79566F] text-white" : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              14d / 7d Repair
            </button>
          </div>
        </div>
      </div>

      {/* SLA Statutory Overview Banner */}
      <div className="bg-[#79566F] p-6 rounded-3xl text-white border border-[#E6D5DC] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B86B35] text-white">
              Statutory Standard
            </span>
            <span className="text-xs text-white/85">
              Department for Levelling Up, Housing &amp; Communities (DLUHC)
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Automated Audit Defense &amp; Tenant Safeguarding
          </h2>
          <p className="text-xs text-white/85 max-w-2xl">
            PropCare NW automatically timestamps initial telemetry capture, notifies contractors within 4 hours, and compiles court-admissible audit packs to avoid regulatory enforcement fines.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 bg-white/10 rounded-2xl text-center flex-1 md:flex-initial min-w-[120px] border border-white/10">
            <span className="text-[10px] uppercase font-bold text-white/85">Active 24h SLAs</span>
            <div className="text-2xl font-black text-[#B86B35] mt-0.5">2</div>
            <span className="text-[9px] text-white/70">Within statutory window</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl text-center flex-1 md:flex-initial min-w-[120px] border border-white/10">
            <span className="text-[10px] uppercase font-bold text-white/85">Compliance Rate</span>
            <div className="text-2xl font-black text-[#4A8B71] mt-0.5">100%</div>
            <span className="text-[9px] text-white/70">0 breaches logged</span>
          </div>
        </div>
      </div>

      {/* Deadlines List */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#E6D5DC]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#79566F]">{item.id}</span>
                  <span className="text-sm font-bold text-[#493344]">{item.property}</span>
                  <span className="text-xs text-[#806C7B]">&bull; {item.zone}</span>
                </div>
                <div className="text-[11px] text-[#806C7B] mt-0.5">
                  Standard: <strong className="text-[#493344]">{item.legislation}</strong> &bull; Assigned: {item.assignedOfficer}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-[#806C7B]">Time Remaining</div>
                  <div
                    className={`text-lg font-black ${
                      item.status === "critical"
                        ? "text-[#C84661]"
                        : item.status === "urgent"
                        ? "text-[#B86B35]"
                        : "text-[#4A8B71]"
                    }`}
                  >
                    {item.timeRemaining}
                  </div>
                </div>

                <Link
                  href="/app/work-orders"
                  className="px-3.5 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] transition-colors"
                >
                  Manage Order
                </Link>
              </div>
            </div>

            <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="p-3 bg-[#F7EDE5] rounded-2xl flex-1 border border-[#E6D5DC]">
                <span className="text-[10px] uppercase font-bold text-[#806C7B] block">
                  Identified Hazard Description:
                </span>
                <span className="text-[#493344] font-medium mt-0.5 block">{item.hazard}</span>
              </div>

              <div className="p-3 bg-[#F7EDE5] rounded-2xl sm:min-w-[200px] border border-[#E6D5DC] text-[11px]">
                <div className="text-[#806C7B]">Statutory Expiry:</div>
                <div className="font-bold text-[#493344] font-mono mt-0.5">{item.deadlineDate}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
