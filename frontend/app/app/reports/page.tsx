"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileTextIcon,
  DownloadIcon,
  EyeIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  DropletIcon,
  AcousticIcon,
  XIcon,
} from "@/components/Icons";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const reportPacks = [
    {
      id: "REP-2026-EX-01",
      title: "Quarterly Executive Property Intelligence Pack",
      target: "Housing Trust Board & Regulators",
      coverage: "148 Properties &bull; Greater Manchester Portfolio",
      date: "2026-10-30",
      type: "Executive Summary",
      size: "2.4 MB PDF",
      summary: "Macro-level risk distribution, percentage of stock with dew-point vulnerability, and total work order expenditures.",
    },
    {
      id: "REP-2026-TECH-42",
      title: "Multi-Modal Forensic Evidence Dossier",
      target: "Surveyors, Claims Assessors & Structural Engineers",
      coverage: "Trinity Court (Unit 14) & Pendleton Tower (Floor 4)",
      date: "2026-10-29",
      type: "Technical Dossier",
      size: "8.1 MB PDF",
      summary: "Raw OpenCV specular difference heatmaps, 44.1kHz FFT acoustic spectrum plots, and Open-Meteo psychrometric saturation curves.",
    },
    {
      id: "REP-2026-SLA-09",
      title: "Awaab's Law Statutory Compliance Audit Trail",
      target: "Housing Ombudsman & Local Authority Environmental Health",
      coverage: "All 24-Hour & 14-Day Mandatory Notice Timestamps",
      date: "2026-10-28",
      type: "Legal Compliance",
      size: "1.8 MB PDF",
      summary: "Cryptographically verifiable timestamped audit trail proving 24h hazard response and contractor assignment within statutory windows.",
    },
  ];

  const handleDownload = (repId: string) => {
    setDownloadSuccess(true);
    setTimeout(() => {
      setDownloadSuccess(false);
    }, 2000);
  };

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
            <span>Documentation &amp; Compliance</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Forensic Reports &amp; Legal Audit Packs
          </h1>
          <p className="text-xs text-[#806C7B]">
            Court-admissible technical dossiers, Housing Ombudsman compliance packs, and board-level risk summaries
          </p>
        </div>

        <div className="flex items-center gap-2">
          {downloadSuccess && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFF8F3] text-[#4A8B71] text-xs font-bold border border-[#4A8B71]/30 animate-in fade-in">
              <CheckCircleIcon size={14} />
              <span>Report Package Downloaded</span>
            </span>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportPacks.map((pack) => (
          <div
            key={pack.id}
            className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#79566F] font-bold">{pack.id}</span>
                <span className="px-2 py-0.5 rounded-md bg-[#EFE4EC] text-[#79566F] text-[10px] font-bold">
                  {pack.type}
                </span>
              </div>

              <h3 className="text-base font-bold text-[#493344] mt-2.5 leading-snug">
                {pack.title}
              </h3>
              <p className="text-xs text-[#806C7B] mt-1" dangerouslySetInnerHTML={{ __html: pack.coverage }} />

              <div className="mt-4 p-3 bg-[#F7EDE5] rounded-2xl text-xs text-[#806C7B] leading-relaxed">
                {pack.summary}
              </div>

              <div className="mt-4 space-y-1 text-[11px] text-[#806C7B]">
                <div>Audience: <strong className="text-[#493344]">{pack.target}</strong></div>
                <div>Generated: <span className="font-mono">{pack.date}</span> &bull; {pack.size}</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E6D5DC] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedReport(pack.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors cursor-pointer"
              >
                <EyeIcon size={14} />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownload(pack.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <DownloadIcon size={14} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PDF Document Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E6D5DC] animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D5DC]">
              <div>
                <h3 className="text-base font-bold text-[#493344]">Document Preview</h3>
                <p className="text-xs text-[#806C7B]">Audit ID: {selectedReport}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-[#806C7B] hover:text-[#493344] rounded-lg cursor-pointer"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Simulated PDF Layout */}
            <div className="mt-4 p-6 bg-slate-100 rounded-2xl border border-slate-200 text-[#493344] font-serif space-y-4">
              <div className="border-b border-slate-300 pb-3 flex justify-between items-baseline font-sans">
                <div>
                  <h4 className="text-base font-black text-[#493344] tracking-tight">
                    PROPCARE NW &bull; PREDICTIVE PROPERTY INTELLIGENCE
                  </h4>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                    Statutory Forensic Assessment &bull; ISO 17025 Compliant
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono">
                  CLASSIFICATION: OFFICIAL
                </div>
              </div>

              <div className="text-xs space-y-2">
                <p className="font-bold font-sans text-sm">
                  Executive Findings: Trinity Court (Salford M3 5LE)
                </p>
                <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                  On 2026-10-28, multi-modal diagnostics conducted across Unit 14 bathroom wall and cavity envelope revealed a 78% specular moisture anomaly corroborating a 1.24 kHz acoustic resonance characteristic of a pressurized copper pipe leak.
                </p>
                <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                  Pursuant to Awaab&apos;s Law (Social Housing Regulation Act 2023), emergency remediation work order WO-8821 was issued within 4.2 hours of detection, well within the statutory 24-hour investigation threshold.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-300 text-[10px] font-sans flex justify-between">
                <span>Verified Sign-off Officer: <strong>Eleanor Vance</strong></span>
                <span>Cryptographic Digest: <code className="text-[#79566F]">e8f3...a91c</code></span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6D5DC] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#806C7B] hover:bg-[#F7EDE5] cursor-pointer"
              >
                Close Preview
              </button>
              <Link
                href="/app/inspections/INSP-2026-0914/report"
                className="px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <FileTextIcon size={14} />
                <span>Open Live Printable Dossier</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
