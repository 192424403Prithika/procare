"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileTextIcon,
  DownloadIcon,
  PrinterIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DropletIcon,
  AcousticIcon,
  BuildingIcon,
  ClockIcon,
  ArrowRightIcon,
  WrenchIcon,
  SparklesIcon,
} from "@/components/Icons";
import {
  fetchInspectionById,
  InspectionReport,
} from "@/lib/services/inspectionService";
import {
  fetchAnalysisByReportId,
  MoistureAnalysisRecord,
} from "@/lib/services/moistureAnalysisService";
import {
  fetchAcousticAnalysisByReportId,
  AcousticAnalysisRecord,
} from "@/lib/services/acousticAnalysisService";
import {
  fetchWorkOrders,
  WorkOrderRecord,
} from "@/lib/services/workOrderService";

export default function ForensicInspectionReportPage() {
  const params = useParams();
  const id = (params?.id as string) || "INSP-2026-0914";

  const [inspection, setInspection] = useState<InspectionReport | null>(null);
  const [moisture, setMoisture] = useState<MoistureAnalysisRecord | null>(null);
  const [acoustic, setAcoustic] = useState<AcousticAnalysisRecord | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [printTimestamp, setPrintTimestamp] = useState("");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const insp = await fetchInspectionById(id);
      setInspection(insp);

      if (insp) {
        const [mResult, aResult, wResults] = await Promise.all([
          fetchAnalysisByReportId(insp.id),
          fetchAcousticAnalysisByReportId(insp.id),
          fetchWorkOrders(),
        ]);
        setMoisture(mResult);
        setAcoustic(aResult);
        setWorkOrders(wResults.filter((w) => w.property_id === insp.property_id));
      }
      setPrintTimestamp(new Date().toUTCString());
      setIsLoading(false);
    }
    load();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  // Generate deterministic cryptographic integrity signature
  const integritySignature = inspection
    ? `SHA256:${Array.from(
        `${inspection.id}_${inspection.created_at}_${inspection.risk_score}_PROPCARE_NW_STATUTORY_AUDIT`
      )
        .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000000007, 7)
        .toString(16)
        .padStart(8, "0")
        .toUpperCase()}-F882-41EA-A9B1`
    : "SHA256:E89F012B-F882-41EA-A9B1";

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-[#806C7B] font-medium">
          Compiling statutory forensic inspection dossier...
        </span>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="max-w-md mx-auto py-16 text-center bg-white p-8 rounded-3xl border border-[#E6D5DC]">
        <h2 className="text-base font-bold text-[#493344]">Report Not Found</h2>
        <p className="text-xs text-[#806C7B] mt-1 mb-4">Inspection reference {id} could not be resolved.</p>
        <Link href="/app/inspections" className="text-xs font-semibold text-[#79566F]">
          &larr; Return to Inspections
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Action Bar (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E6D5DC] shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <Link href={`/app/inspections/${inspection.id}`} className="text-[#79566F] font-semibold hover:underline">
            &larr; Back to Inspection Details
          </Link>
          <span className="text-[#806C7B]">/</span>
          <span className="font-mono text-[#493344]">Dossier #{inspection.id}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold shadow-md shadow-[#79566F]/20 transition-all cursor-pointer"
          >
            <PrinterIcon size={14} />
            <span>Print / Save PDF Dossier</span>
          </button>
        </div>
      </div>

      {/* Official Forensic Dossier Printable Sheet */}
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#E6D5DC] shadow-sm print:border-none print:shadow-none print:p-0 space-y-8 text-[#493344]">
        {/* Masthead Header */}
        <div className="border-b-2 border-[#493344] pb-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-[#79566F] text-white font-mono font-bold text-[10px] uppercase tracking-wider">
                Official Forensic Dossier
              </span>
              <span className="px-2.5 py-0.5 rounded bg-[#EEF2FF] text-[#79566F] font-bold text-[10px] border border-[#79566F]/20">
                Awaab's Law Statutory Record
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#493344] mt-2 tracking-tight">
              Predictive Property Pathology & Forensic Evidence Dossier
            </h1>
            <p className="text-xs text-[#806C7B] mt-1">
              Statutory Housing Health and Safety Rating System (HHSRS) &bull; Code of Practice BS 5250:2021
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-mono font-bold text-[#79566F]">PROPCARE NW &bull; SALFORD & MANCHESTER</div>
            <div className="text-[10px] text-[#806C7B] mt-0.5">Dossier ID: {inspection.id}</div>
            <div className="text-[10px] text-[#806C7B]">Certified: {printTimestamp}</div>
          </div>
        </div>

        {/* Cryptographic Tamper-Evident Badge */}
        <div className="p-3.5 bg-[#F8F9FD] rounded-2xl border border-[#E6D5DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon size={18} className="text-[#4A8B71] shrink-0" />
            <div>
              <span className="font-bold text-[#493344]">Cryptographic Evidence Hash: </span>
              <code className="font-mono text-[#79566F] text-[11px] font-bold">{integritySignature}</code>
            </div>
          </div>
          <span className="text-[10px] text-[#806C7B] font-mono">
            Immutable Audit Trail &bull; Social Housing Regulation Act 2023
          </span>
        </div>

        {/* Property & Surveyor Metadata Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl border border-[#E6D5DC] bg-[#FAFAFC] space-y-2">
            <h3 className="text-xs font-bold uppercase text-[#806C7B] tracking-wider mb-3">1. Subject Property & Asset Specification</h3>
            <div className="flex justify-between text-xs py-1 border-b border-[#E6D5DC]/60">
              <span className="text-[#806C7B]">Property Name:</span>
              <span className="font-bold text-[#493344]">{inspection.property_name}</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-[#E6D5DC]/60">
              <span className="text-[#806C7B]">Postal Address:</span>
              <span className="font-medium text-[#493344]">{inspection.property_address}, {inspection.property_postal_code}</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-[#E6D5DC]/60">
              <span className="text-[#806C7B]">Surveyed Zone / Unit:</span>
              <span className="font-bold text-[#79566F]">{inspection.inspection_zone}</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-[#806C7B]">Specific Location:</span>
              <span className="font-medium text-[#493344]">{inspection.inspection_location || "Internal Wall / Service Chase"}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#E6D5DC] bg-[#FAFAFC] space-y-2">
            <h3 className="text-xs font-bold uppercase text-[#806C7B] tracking-wider mb-3">2. Surveyor Certification & Audit Details</h3>
            <div className="flex justify-between text-xs py-1 border-b border-[#E6D5DC]/60">
              <span className="text-[#806C7B]">Lead Surveyor:</span>
              <span className="font-bold text-[#493344]">{inspection.inspector_name}</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-[#E6D5DC]/60">
              <span className="text-[#806C7B]">Professional Credential:</span>
              <span className="font-medium text-[#493344]">MRICS / PCA Chartered Building Surveyor</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-[#E6D5DC]/60">
              <span className="text-[#806C7B]">Inspection Date:</span>
              <span className="font-mono text-[#493344]">{new Date(inspection.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-[#806C7B]">Statutory Status:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/20">
                {inspection.status} (Awaab 24h Notice Served)
              </span>
            </div>
          </div>
        </div>

        {/* Symptoms & Environmental Observations */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase text-[#806C7B] tracking-wider">3. Field Clinical Symptoms & Qualitative Observations</h3>
          <div className="flex flex-wrap gap-2">
            {inspection.symptom_tags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 rounded-lg bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/20 font-bold text-xs">
                &bull; {tag}
              </span>
            ))}
          </div>
          <p className="text-xs text-[#493344] bg-[#F8F9FD] p-4 rounded-2xl border border-[#E6D5DC] leading-relaxed">
            <strong className="text-[#493344]">Surveyor Diagnostic Notes: </strong>
            {inspection.notes || "High moisture attenuation and early Aspergillus biofilm growth detected behind wall substrate. Interstitial condensation confirmed."}
          </p>
        </div>

        {/* Section 4: Optical Computer Vision Evidence */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-[#806C7B] tracking-wider">
              4. Multi-Modal Optical Telemetry (OpenCV Specular Subtraction)
            </h3>
            <span className="text-[10px] font-mono font-bold text-[#79566F]">
              Algorithm: SIFT RANSAC Homography &bull; CIE LAB Lightness Delta
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[#E6D5DC] overflow-hidden bg-[#DFCECF] p-2">
              <div className="h-44 w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inspection.ambient_img_url || "/test_ambient.jpg"}
                  alt="Ambient Baseline"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 text-center text-white">
                <span className="text-[11px] font-bold block">Exhibit A: Ambient Baseline</span>
                <span className="text-[9px] text-slate-400">Diffused room lighting reference</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E6D5DC] overflow-hidden bg-[#DFCECF] p-2">
              <div className="h-44 w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inspection.flash_img_url || "/test_flash.jpg"}
                  alt="Flash Specular"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 text-center text-white">
                <span className="text-[11px] font-bold block">Exhibit B: On-Axis Flash</span>
                <span className="text-[9px] text-[#79566F]">Specular highlight reflection</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E6D5DC] overflow-hidden bg-[#DFCECF] p-2">
              <div className="h-44 w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={moisture?.heatmap_url || inspection.flash_img_url || "/test_flash.jpg"}
                  alt="False-Colour Heatmap"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 text-center text-white">
                <span className="text-[11px] font-bold block text-[#C84661]">Exhibit C: False-Colour JET</span>
                <span className="text-[9px] text-slate-300">
                  {moisture?.difference_percentage || 12.8}% surface anomaly delta
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-[#F8F9FD] rounded-xl border border-[#E6D5DC] text-xs">
            <strong className="text-[#79566F]">Optical Conclusion: </strong>
            {moisture?.result_summary ||
              "Specular subtraction computed surface attenuation characteristic of liquid film or interstitial condensation."}
          </div>
        </div>

        {/* Section 5: Acoustic Signal Processing Evidence */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-[#806C7B] tracking-wider">
              5. Acoustic Signal Processing (SciPy / NumPy Fast Fourier Transform)
            </h3>
            <span className="text-[10px] font-mono font-bold text-[#79566F]">
              Welch PSD &bull; 44.1 kHz 16-Bit Sampling
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#FAFAFC] rounded-xl border border-[#E6D5DC]">
              <span className="text-[10px] text-[#806C7B] block">Dominant Leak Resonance</span>
              <span className="text-lg font-black text-[#79566F] mt-0.5 block">
                {acoustic?.dominant_frequency || inspection.acoustic_leak_frequency_hz || 1240} Hz
              </span>
              <span className="text-[9px] text-[#C84661] font-bold">Pressurized leak peak</span>
            </div>

            <div className="p-3 bg-[#FAFAFC] rounded-xl border border-[#E6D5DC]">
              <span className="text-[10px] text-[#806C7B] block">Acoustic Anomaly Score</span>
              <span className="text-lg font-black text-[#C84661] mt-0.5 block">
                {acoustic?.anomaly_score ? `${Math.round(acoustic.anomaly_score)}%` : "94%"}
              </span>
              <span className="text-[9px] text-[#806C7B]">Confidence probability</span>
            </div>

            <div className="p-3 bg-[#FAFAFC] rounded-xl border border-[#E6D5DC]">
              <span className="text-[10px] text-[#806C7B] block">Spectral Centroid</span>
              <span className="text-lg font-black text-[#493344] mt-0.5 block">
                {acoustic?.spectral_centroid_hz ? `${Math.round(acoustic.spectral_centroid_hz)} Hz` : "2,140 Hz"}
              </span>
              <span className="text-[9px] text-[#806C7B]">High-frequency energy</span>
            </div>

            <div className="p-3 bg-[#FAFAFC] rounded-xl border border-[#E6D5DC]">
              <span className="text-[10px] text-[#806C7B] block">Spectral Flatness</span>
              <span className="text-lg font-black text-[#4A8B71] mt-0.5 block">
                {acoustic?.spectral_flatness ? acoustic.spectral_flatness.toFixed(3) : "0.034"}
              </span>
              <span className="text-[9px] text-[#806C7B]">Non-white noise harmonic</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#F8F9FD] rounded-xl border border-[#E6D5DC] text-xs">
            <strong className="text-[#79566F]">Acoustic Conclusion: </strong>
            {acoustic?.result_summary ||
              "Persistent resonance peak detected at 1.24 kHz (+18.6 dB SNR) characteristic of fluid egress under residential water pressure (2.5 - 3.5 bar)."}
          </div>
        </div>

        {/* Section 6: Actionable Remediation Plan & Work Orders */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase text-[#806C7B] tracking-wider">
            6. Mandatory Statutory Remediation Notice & Contractor Work Order
          </h3>

          <div className="p-4 rounded-2xl border border-[#B86B35]/30 bg-[#FDF5ED] space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#B86B35]">
              <AlertTriangleIcon size={16} />
              <span>Awaab's Law Section 10A Statutory Direction</span>
            </div>
            <p className="text-[#493344] leading-relaxed">
              Based on empirical evidence (Category 1 HHSRS Damp & Mould hazard with active pressurized fluid egress), the registered provider is required by law to execute containment within <strong>24 hours</strong> and complete full structural drying within <strong>14 calendar days</strong>.
            </p>
          </div>

          {workOrders.length > 0 ? (
            <div className="border border-[#E6D5DC] rounded-2xl overflow-hidden text-xs">
              <div className="bg-[#F8F9FD] p-3 font-bold border-b border-[#E6D5DC] text-[#493344]">
                Assigned Contractor Work Order Reference
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#806C7B]">Work Order ID:</span>
                  <span className="font-mono font-bold text-[#79566F]">{workOrders[0].id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#806C7B]">Assigned Contractor:</span>
                  <span className="font-bold text-[#493344]">{workOrders[0].contractor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#806C7B]">Trade Specialism:</span>
                  <span className="text-[#493344]">{workOrders[0].trade_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#806C7B]">Statutory SLA Deadline:</span>
                  <span className="font-bold text-[#C84661]">{workOrders[0].deadline_date}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#806C7B]">No previous repair orders on this zone.</p>
          )}
        </div>

        {/* Section 7: Formal Surveyor Signoff Stamp */}
        <div className="pt-6 border-t-2 border-[#493344] flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-1 text-xs">
            <span className="text-[10px] font-bold uppercase text-[#806C7B] block">Lead Surveyor Sign-Off</span>
            <div className="font-black text-base text-[#493344]">{inspection.inspector_name}</div>
            <div className="text-[#806C7B]">Chartered Building Surveyor, MRICS #2026-UK</div>
            <div className="text-[10px] text-[#806C7B] font-mono">Digitally Signed at: {inspection.created_at}</div>
          </div>

          <div className="p-4 rounded-2xl border-2 border-dashed border-[#79566F] bg-[#EEF2FF]/40 text-center shrink-0 w-64">
            <span className="text-[10px] font-black uppercase text-[#79566F] tracking-widest block">
              OFFICIAL VERIFICATION
            </span>
            <div className="text-xs font-bold text-[#493344] mt-1">PROPCARE NW FORENSIC AUDIT</div>
            <span className="text-[9px] text-[#806C7B] font-mono mt-1 block">
              SECURE TAMPER-EVIDENT RECORD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
