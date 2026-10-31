"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileTextIcon,
  DownloadIcon,
  EyeIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  DropletIcon,
  AcousticIcon,
  SparklesIcon,
  RefreshCwIcon,
  XIcon,
} from "@/components/Icons";
import { apiClient } from "@/lib/apiClient";
import { fetchInspections, InspectionReport } from "@/lib/services/inspectionService";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";

interface GeneratedReportRecord {
  id: string;
  property_id: string;
  property_name: string;
  inspection_id?: string;
  report_type: string;
  title: string;
  file_path: string;
  download_url: string;
  file_size_bytes: number;
  generated_by: string;
  generated_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<GeneratedReportRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);

  const [selectedInspectionId, setSelectedInspectionId] = useState<string>("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [reportType, setReportType] = useState<string>("Court-Admissible Forensic Dossier");

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [reps, insps, props] = await Promise.all([
        apiClient.get<GeneratedReportRecord[]>("/api/v1/reports"),
        fetchInspections(),
        fetchProperties(),
      ]);
      setReports(reps || []);
      setInspections(insps || []);
      setProperties(props || []);

      if (insps && insps.length > 0) {
        setSelectedInspectionId(insps[0].id);
        setSelectedPropertyId(insps[0].property_id);
      } else if (props && props.length > 0) {
        setSelectedPropertyId(props[0].id);
      }
    } catch (err) {
      console.warn("Failed to load reports initial data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleInspectionChange = (inspId: string) => {
    setSelectedInspectionId(inspId);
    const found = inspections.find((i) => i.id === inspId);
    if (found) {
      setSelectedPropertyId(found.property_id);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedPropertyId) {
      setErrorMessage("Please select a property or inspection.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const newReport = await apiClient.post<GeneratedReportRecord>("/api/v1/reports/generate", {
        property_id: selectedPropertyId,
        inspection_id: selectedInspectionId || undefined,
        report_type: reportType,
      });

      setReports((prev) => [newReport, ...prev]);
      setSuccessMessage(`Report generated successfully: ${newReport.title}`);
      if (newReport.download_url) {
        setPreviewUrl(newReport.download_url);
        setPreviewTitle(newReport.title);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
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
            Automated Inspection Reports &amp; Legal Audit Packs
          </h1>
          <p className="text-xs text-[#806C7B]">
            ReportLab court-admissible technical dossiers, OpenCV telemetry attachments, and Housing Ombudsman compliance packs
          </p>
        </div>

        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#E6D5DC] rounded-xl text-xs font-semibold text-[#493344] hover:bg-[#EFE4EC] shadow-xs cursor-pointer"
        >
          <RefreshCwIcon size={14} className={isLoading ? "animate-spin" : ""} />
          Refresh History
        </button>
      </div>

      {/* Statutory Disclaimer */}
      <div className="p-3.5 rounded-xl bg-[#EFF8F3] border border-[#4A8B71]/30 text-xs text-[#285A44] flex items-start gap-2.5">
        <SparklesIcon size={16} className="text-[#4A8B71] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Evidence Integrity: </span>
          All reports embed actual database records, calibrated OpenCV optical difference calculations, SciPy acoustic FFT frequencies, and Open-Meteo psychrometric telemetry. Fabricated or static mock metrics are strictly prohibited.
        </div>
      </div>

      {/* Report Generator Action Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EFE4EC] text-[#79566F] flex items-center justify-center">
            <FileTextIcon size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#493344]">Generate New Official Inspection Dossier</h2>
            <p className="text-xs text-[#806C7B]">
              Compile multi-modal telemetry into a cryptographically timestamped PDF document
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-[#493344] mb-1">Select Inspection</label>
            <select
              value={selectedInspectionId}
              onChange={(e) => handleInspectionChange(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
            >
              {inspections.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.property_name} ({i.inspection_date}) - {i.room}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#493344] mb-1">Dossier Legal Archetype</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
            >
              <option value="Court-Admissible Forensic Dossier">Court-Admissible Forensic Dossier</option>
              <option value="Awaab's Law Section 10A Compliance Pack">Awaab's Law Section 10A Compliance Pack</option>
              <option value="Housing Ombudsman Technical Summary">Housing Ombudsman Technical Summary</option>
              <option value="Quarterly Executive Asset Review">Quarterly Executive Asset Review</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#79566F] hover:bg-[#63445A] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <RefreshCwIcon size={14} className={isGenerating ? "animate-spin" : ""} />
              {isGenerating ? "Compiling ReportLab PDF..." : "Generate Official PDF"}
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="p-3 rounded-xl bg-[#EFF8F3] border border-[#4A8B71]/30 text-xs text-[#4A8B71] font-semibold">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#FDF2F4] border border-[#C84661]/30 text-xs text-[#C84661] font-semibold">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Previously Generated Reports Table */}
      <div className="bg-white rounded-2xl border border-[#E6D5DC] shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E6D5DC] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#493344]">Previously Generated Forensic Dossiers</h2>
          <span className="text-xs text-[#806C7B]">{reports.length} records</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#806C7B]">
            <div className="w-8 h-8 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading generated report metadata...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#806C7B]">
            No forensic reports generated yet. Use the tool above to generate the first official dossier.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7EDE5]/60 text-[#806C7B] font-semibold text-[10px] uppercase">
                <tr>
                  <th className="px-5 py-3">Report Title</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Generated By</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">File Size</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D5DC]">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-[#F7EDE5]/20 transition-colors">
                    <td className="px-5 py-3 font-bold text-[#493344]">
                      <div className="flex items-center gap-2">
                        <FileTextIcon size={14} className="text-[#79566F] shrink-0" />
                        <span>{rep.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#493344] font-medium">{rep.property_name}</td>
                    <td className="px-4 py-3 text-[#806C7B]">{rep.generated_by}</td>
                    <td className="px-4 py-3 text-[#806C7B]">
                      {rep.generated_at ? new Date(rep.generated_at).toLocaleDateString() : "Recent"}
                    </td>
                    <td className="px-4 py-3 text-[#806C7B]">
                      {rep.file_size_bytes > 0
                        ? `${(rep.file_size_bytes / 1024).toFixed(1)} KB`
                        : "PDF"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {rep.download_url && (
                          <>
                            <button
                              onClick={() => {
                                setPreviewUrl(rep.download_url);
                                setPreviewTitle(rep.title);
                              }}
                              className="p-1.5 rounded-lg border border-[#E6D5DC] hover:bg-[#EFE4EC] text-[#79566F]"
                              title="Preview"
                            >
                              <EyeIcon size={14} />
                            </button>
                            <a
                              href={rep.download_url}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#79566F] hover:bg-[#63445A] text-white text-[11px] font-bold shadow-xs"
                            >
                              <DownloadIcon size={12} />
                              <span>Download</span>
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl border border-[#E6D5DC] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E6D5DC] flex items-center justify-between bg-[#F7EDE5]/40">
              <div className="flex items-center gap-2">
                <FileTextIcon size={16} className="text-[#79566F]" />
                <h3 className="text-sm font-bold text-[#493344]">{previewTitle || "Dossier Preview"}</h3>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={previewUrl}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#79566F] text-white text-xs font-bold"
                >
                  <DownloadIcon size={12} />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="text-[#806C7B] hover:text-[#493344] p-1"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100">
              <iframe
                src={previewUrl}
                title="PDF Preview"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
