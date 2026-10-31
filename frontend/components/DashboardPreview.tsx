"use client";

import React, { useState } from "react";
import {
  LayoutDashboardIcon,
  HomeIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  WrenchIcon,
  FileCheckIcon,
  DropletIcon,
  CloudRainIcon,
  ShieldCheckIcon,
} from "./Icons";

export default function DashboardPreview() {
  const [activeTab, setActiveTab] = useState("overview");

  const recentReports = [
    {
      id: "#INS-2026-904",
      unit: "Unit 402 - North Gable",
      property: "Oakridge Court",
      healthScore: "62/100",
      moistureLevel: "24.8% WME (Critical)",
      riskStatus: "High Risk",
      statusColor: "bg-[#FDF5ED] text-[#493344] border border-[#E6D5DC]",
      weatherAlert: "48mm Rain Ingress",
      workOrder: "Drying Dispatch #WO-402",
      reportTime: "Today, 09:40 AM",
    },
    {
      id: "#INS-2026-901",
      unit: "Apt 12B - Bathroom Cavity",
      property: "Lancaster Towers",
      healthScore: "78/100",
      moistureLevel: "19.2% WME (Elevated)",
      riskStatus: "Elevated",
      statusColor: "bg-[#EFE4EC] text-[#B995AD] border border-[#B995AD]/30",
      weatherAlert: "Wind Shear Risk",
      workOrder: "Acoustic Scan #WO-401",
      reportTime: "Yesterday, 04:15 PM",
    },
    {
      id: "#INS-2026-898",
      unit: "Unit 108 - Subfloor Screed",
      property: "St. Jude Terraces",
      healthScore: "96/100",
      moistureLevel: "12.4% WME (Normal)",
      riskStatus: "Normal",
      statusColor: "bg-[#EFF8F3] text-[#493344] border border-[#E6D5DC]",
      weatherAlert: "No Threat",
      workOrder: "Routine Sign-Off",
      reportTime: "28 Oct 2026",
    },
    {
      id: "#INS-2026-895",
      unit: "Unit 305 - Roof Parapet",
      property: "Meadowview Estate",
      healthScore: "94/100",
      moistureLevel: "14.1% WME (Normal)",
      riskStatus: "Normal",
      statusColor: "bg-[#EFF8F3] text-[#493344] border border-[#E6D5DC]",
      weatherAlert: "Gutter Check",
      workOrder: "Preventive Clean",
      reportTime: "27 Oct 2026",
    },
  ];

  return (
    <section id="dashboard-preview" className="py-14 sm:py-20 lg:py-24 bg-[#F7EDE5]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE4EC] px-3.5 py-1 text-xs font-semibold text-[#B995AD]">
            <span>Portfolio Operations Hub</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#493344] sm:text-4xl">
            Live Property Intelligence at a Glance
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#806C7B] sm:text-base">
            An illustrative preview of the unified command center for asset directors, chartered surveyors,
            and housing maintenance teams.
          </p>

          <div className="mt-3 inline-block rounded-full bg-white px-3.5 py-1 text-[11px] font-semibold text-[#806C7B] border border-[#E6D5DC] shadow-xs">
            Illustrative Mockup — Sample Demonstration Values
          </div>
        </div>

        {/* Large Realistic Dashboard Mockup */}
        <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-[#E6D5DC] bg-white shadow-xl">
          {/* Mock Browser/App Chrome Bar */}
          <div className="flex items-center justify-between border-b border-[#E6D5DC] bg-[#F7EDE5] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FF5F56] shrink-0" />
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FFBD2E] shrink-0" />
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#27C93F] shrink-0" />
              <span className="ml-2 sm:ml-4 text-[11px] sm:text-xs font-semibold text-[#806C7B] truncate max-w-[140px] sm:max-w-none">
                https://app.propcare-nw.com/dashboard/overview
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-[#B995AD] shrink-0">
              <span className="flex h-2 w-2 rounded-full bg-[#B995AD] animate-pulse" />
              <span>Demo Feed Active</span>
            </div>
          </div>

          {/* Mobile Tab Pills for Tablet and Below */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-[#E6D5DC] bg-[#F7EDE5]/50 p-2.5 lg:hidden no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === "overview"
                  ? "bg-white text-[#B995AD] shadow-xs border border-[#E6D5DC]"
                  : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              <LayoutDashboardIcon size={14} />
              <span>Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("properties")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "properties"
                  ? "bg-white text-[#B995AD] shadow-xs border border-[#E6D5DC]"
                  : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              <HomeIcon size={14} />
              <span>Properties (1,240)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sensors")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "sensors"
                  ? "bg-white text-[#B995AD] shadow-xs border border-[#E6D5DC]"
                  : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              <DropletIcon size={14} />
              <span>Sensors</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("triage")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "triage"
                  ? "bg-white text-[#B995AD] shadow-xs border border-[#E6D5DC]"
                  : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              <AlertTriangleIcon size={14} />
              <span>Triage (4)</span>
            </button>
          </div>

          {/* Main Dashboard Layout: Sidebar + Workspace */}
          <div className="grid lg:grid-cols-12 min-h-[540px]">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex border-r border-[#E6D5DC] bg-[#F7EDE5] p-4 lg:col-span-3 flex-col justify-between">
              <div className="space-y-1">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#806C7B]">
                  Command Center
                </div>

                <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#B995AD] shadow-xs border border-[#E6D5DC]">
                  <LayoutDashboardIcon size={16} />
                  <span>Portfolio Overview</span>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#493344]/80 hover:bg-white hover:text-[#493344] transition-colors cursor-pointer">
                  <HomeIcon size={16} />
                  <span>Properties (1,240)</span>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#493344]/80 hover:bg-white hover:text-[#493344] transition-colors cursor-pointer">
                  <DropletIcon size={16} />
                  <span>Moisture Risk Telemetry</span>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#493344]/80 hover:bg-white hover:text-[#493344] transition-colors cursor-pointer">
                  <AlertTriangleIcon size={16} />
                  <span>Statutory Triage</span>
                  <span className="ml-auto rounded-full bg-[#FDF5ED] px-1.5 py-0.2 text-[9px] font-bold text-[#493344]">
                    4
                  </span>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#493344]/80 hover:bg-white hover:text-[#493344] transition-colors cursor-pointer">
                  <WrenchIcon size={16} />
                  <span>Work Orders (12)</span>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#493344]/80 hover:bg-white hover:text-[#493344] transition-colors cursor-pointer">
                  <BarChart3Icon size={16} />
                  <span>Forensic Reports</span>
                </div>
              </div>

              {/* Sidebar Footer User Card */}
              <div className="rounded-2xl border border-[#E6D5DC] bg-white p-3 mt-4">
                <div className="text-[11px] font-bold text-[#493344]">North West Housing Group</div>
                <div className="text-[10px] text-[#806C7B]">Asset Directorate · Illustrative</div>
              </div>
            </aside>

            {/* Main Workspace Area - Responsive Padding for Mobile & Desktop */}
            <main className="p-3.5 sm:p-5 lg:p-6 lg:col-span-9 bg-white">
              {/* 1. Property Health Score & Top Metric Cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
                {/* Metric 1: Overall Property Health Score */}
                <div className="rounded-xl sm:rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5] p-3 sm:p-3.5">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-[#806C7B]">Health Score</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-[#493344]">94</span>
                    <span className="text-[10px] text-[#806C7B]">/100</span>
                  </div>
                  <div className="mt-0.5 text-[9px] sm:text-[10px] text-[#493344] font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#493344]" />
                    <span>Safe Level</span>
                  </div>
                </div>

                {/* Metric 2: Moisture Risk Level */}
                <div className="rounded-xl sm:rounded-2xl border border-[#FDF5ED] bg-[#F7EDE5] p-3 sm:p-3.5">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-[#806C7B]">Moisture Risk</span>
                  <div className="mt-1 text-xl sm:text-2xl font-black text-[#B995AD]">4 Units</div>
                  <div className="mt-0.5 text-[9px] sm:text-[10px] text-[#B995AD] font-bold">18h SLA Left</div>
                </div>

                {/* Metric 3: Weather Risk Alerts */}
                <div className="rounded-xl sm:rounded-2xl border border-[#EAE0E7] bg-[#F7EDE5] p-3 sm:p-3.5">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-[#806C7B]">Weather Alerts</span>
                  <div className="mt-1 text-xl sm:text-2xl font-black text-[#493344]">3 Zones</div>
                  <div className="mt-0.5 text-[9px] sm:text-[10px] text-[#493344] font-medium">48mm Ingress</div>
                </div>

                {/* Metric 4: Recent Work Orders */}
                <div className="rounded-xl sm:rounded-2xl border border-[#EFF8F3] bg-[#F7EDE5] p-3 sm:p-3.5">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-[#806C7B]">Work Orders</span>
                  <div className="mt-1 text-xl sm:text-2xl font-black text-[#493344]">12 Active</div>
                  <div className="mt-0.5 text-[9px] sm:text-[10px] text-[#806C7B] font-medium">6 Drying Units</div>
                </div>
              </div>

              {/* 2. Middle Grid: Risk Distribution Chart + Weather Alert & Work Order Summary */}
              <div className="mt-4 sm:mt-5 grid gap-3 sm:gap-4 lg:grid-cols-12">
                {/* Risk Distribution Chart */}
                <div className="rounded-xl sm:rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5] p-3 sm:p-4 lg:col-span-7">
                  <div className="flex items-center justify-between text-xs font-bold text-[#493344]">
                    <span>Risk Distribution Chart</span>
                    <span className="text-[#B995AD] text-[11px]">1,240 Units</span>
                  </div>

                  {/* Multi-segment Distribution Bar */}
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full flex gap-1 bg-[#E6D5DC]">
                    <div className="bg-[#EFF8F3] h-full" style={{ width: "72%" }} title="Safe: 72%" />
                    <div className="bg-[#FDF5ED] h-full" style={{ width: "21%" }} title="Elevated Risk: 21%" />
                    <div className="bg-[#B995AD] h-full" style={{ width: "7%" }} title="Critical Moisture: 7%" />
                  </div>

                  {/* Segment Details Cards */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
                    <div className="rounded-lg sm:rounded-xl bg-white p-2 border border-[#E6D5DC]">
                      <div className="text-[9px] sm:text-[10px] font-semibold text-[#806C7B]">Safe (&lt;14%)</div>
                      <div className="text-sm sm:text-base font-bold text-[#493344]">72%</div>
                      <div className="text-[8px] sm:text-[9px] text-[#806C7B]">892 Units</div>
                    </div>
                    <div className="rounded-lg sm:rounded-xl bg-white p-2 border border-[#E6D5DC]">
                      <div className="text-[9px] sm:text-[10px] font-semibold text-[#806C7B]">Elevated</div>
                      <div className="text-sm sm:text-base font-bold text-[#493344]">21%</div>
                      <div className="text-[8px] sm:text-[9px] text-[#806C7B]">260 Units</div>
                    </div>
                    <div className="rounded-lg sm:rounded-xl bg-white p-2 border border-[#E6D5DC]">
                      <div className="text-[9px] sm:text-[10px] font-semibold text-[#B995AD]">Critical</div>
                      <div className="text-sm sm:text-base font-bold text-[#B995AD]">7%</div>
                      <div className="text-[8px] sm:text-[9px] text-[#B995AD] font-bold">88 Units</div>
                    </div>
                  </div>
                </div>

                {/* Weather Alert & Work Order Coordination */}
                <div className="rounded-xl sm:rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5] p-3 sm:p-4 lg:col-span-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-bold text-[#493344]">
                    <span>Weather Alert &amp; Dispatch</span>
                    <span className="rounded bg-[#EAE0E7] px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#493344]">
                      72H Radar
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg sm:rounded-xl border border-[#E6D5DC]">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <CloudRainIcon size={14} className="text-[#B995AD]" />
                        <span className="text-[11px] sm:text-xs font-semibold text-[#493344]">48mm Rain Ingress</span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#B995AD]">Incoming</span>
                    </div>

                    <div className="flex items-center justify-between bg-white p-2 rounded-lg sm:rounded-xl border border-[#E6D5DC]">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <WrenchIcon size={14} className="text-[#493344]" />
                        <span className="text-[11px] sm:text-xs font-semibold text-[#493344]">Parapet Gutter Triage</span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#493344]">3 Teams</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] sm:text-[11px] text-[#806C7B]">
                    <span>Avg SLA: 3.2 hrs</span>
                    <span className="text-[#B995AD] font-semibold cursor-pointer">View Orders →</span>
                  </div>
                </div>
              </div>

              {/* 3. Bottom Table: Inspection Reports */}
              <div className="mt-4 sm:mt-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <FileCheckIcon size={14} className="text-[#B995AD]" />
                    <h4 className="text-[11px] sm:text-xs font-bold text-[#493344] uppercase tracking-wider">
                      Recent Inspection Reports
                    </h4>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-[#B995AD] cursor-pointer">
                    3,850+ Records
                  </span>
                </div>

                <div className="sm:hidden text-[10px] text-[#806C7B] text-right mb-1">
                  ← Scroll horizontally for full report telemetry →
                </div>

                <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-[#E6D5DC] -mx-0.5">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="bg-[#F7EDE5] text-[9px] sm:text-[10px] font-bold uppercase text-[#806C7B] border-b border-[#E6D5DC]">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-2.5">Report / Location</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-2.5">Health Score</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-2.5">Moisture Level</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-2.5">Risk Status</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-2.5">Action Plan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6D5DC]">
                      {recentReports.map((row, i) => (
                        <tr key={i} className="hover:bg-[#F7EDE5]/60 transition-colors">
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5">
                            <div className="font-bold text-[#493344] text-xs">{row.unit}</div>
                            <div className="text-[9px] text-[#806C7B]">{row.property} · {row.id}</div>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-[#493344]">{row.healthScore}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-black text-[#493344]">{row.moistureLevel}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold ${row.statusColor}`}>
                              {row.riskStatus}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-[#493344] font-medium text-[11px]">{row.workOrder}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </section>
  );
}
