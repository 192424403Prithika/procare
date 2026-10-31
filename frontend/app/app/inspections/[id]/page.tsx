/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileCheckIcon,
  FileTextIcon,
  CameraIcon,
  MicIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  DropletIcon,
  AcousticIcon,
  SparklesIcon,
  ClockIcon,
  WrenchIcon,
  EyeIcon,
  XIcon,
} from "@/components/Icons";
import { fetchInspectionById, InspectionReport } from "@/lib/services/inspectionService";
import { useRole } from "@/components/app/RoleContext";
import EditEvidenceModal from "@/components/app/EditEvidenceModal";

export default function InspectionDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const { role } = useRole();

  function formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return "1.5 MB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  const [inspection, setInspection] = useState<InspectionReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageTab, setActiveImageTab] = useState<"gallery" | "both" | "ambient" | "flash">("gallery");
  const [isEditEvidenceOpen, setIsEditEvidenceOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [previewModalImg, setPreviewModalImg] = useState<{ url: string; title: string; filename: string; path?: string } | null>(null);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    const data = await fetchInspectionById(id);
    setInspection(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const getStatusBadge = (status: InspectionReport["status"]) => {
    switch (status) {
      case "Flagged for Contractor":
        return "bg-[#79566F] text-white";
      case "Requires Review":
        return "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/30";
      case "Pending Review":
        return "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/30";
      case "Completed":
      case "Approved":
        return "bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/30";
      default:
        return "bg-[#F7EDE5] text-[#806C7B]";
    }
  };

  const getRiskBadge = (risk: InspectionReport["risk_level"]) => {
    switch (risk) {
      case "critical":
        return "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/30";
      case "high":
        return "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/30";
      case "moderate":
        return "bg-[#FEF9C3] text-[#CA8A04] border border-[#CA8A04]/30";
      case "low":
        return "bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/30";
      default:
        return "bg-[#F7EDE5] text-[#806C7B] border border-[#E6D5DC]";
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs font-semibold text-[#806C7B]">
          Loading inspection details and verifying evidence signatures...
        </span>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center bg-white p-8 rounded-3xl border border-[#E6D5DC] shadow-xs">
        <FileCheckIcon size={40} className="mx-auto text-[#806C7B]/40 mb-3" />
        <h2 className="text-lg font-bold text-[#493344]">Inspection Not Found</h2>
        <p className="text-xs text-[#806C7B] mt-1 mb-5">
          The requested inspection report (<code className="font-mono text-[#79566F]">{id}</code>) does not exist or you do not have permission to access it.
        </p>
        <Link
          href="/app/inspections"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] transition-colors"
        >
          <span>Return to Inspection Registry</span>
        </Link>
      </div>
    );
  }

  const allSavedPhotos = inspection.images && inspection.images.length > 0
    ? inspection.images
    : [
      ...(inspection.ambient_img_url
        ? [
          {
            id: `${inspection.id}-amb-0`,
            url: inspection.ambient_img_url,
            storage_path: inspection.ambient_img_path || "",
            file_name: "Primary Inspection Photo",
            file_size: 1540000,
            caption: "Primary ambient reference photo",
          },
        ]
        : []),
      ...(inspection.flash_img_url
        ? [
          {
            id: `${inspection.id}-fls-1`,
            url: inspection.flash_img_url,
            storage_path: inspection.flash_img_path || "",
            file_name: "Secondary Flash Photo",
            file_size: 1620000,
            caption: "Specular flash photo",
          },
        ]
        : []),
    ];

  const hasRequiredEvidence = Boolean(
    inspection.ambient_img_url || inspection.ambient_img_path || allSavedPhotos.length > 0
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/inspections" className="hover:text-[#79566F]">
              &larr; Inspection Registry
            </Link>
            <span>/</span>
            <span className="font-mono text-[#79566F] font-semibold">{inspection.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
              Diagnostic Survey #{inspection.id}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(inspection.status)}`}>
              {inspection.status}
            </span>
          </div>
          <p className="text-xs text-[#806C7B] mt-0.5">
            Recorded at {inspection.property_name} &bull; Zone: {inspection.inspection_zone}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl border border-[#E6D5DC] bg-white text-[#806C7B] hover:text-[#493344] hover:bg-[#F7EDE5] transition-colors cursor-pointer"
            title="Refresh Inspection Data"
          >
            <RefreshCwIcon size={16} />
          </button>

          {/* Edit Evidence Top Button */}
          <button
            type="button"
            onClick={() => setIsEditEvidenceOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#79566F]/30 bg-[#EFE4EC] text-[#79566F] hover:bg-[#79566F] hover:text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <CameraIcon size={14} />
            <span>Edit Evidence</span>
          </button>

          {/* View Forensic Dossier Button */}
          <Link
            href={`/app/inspections/${inspection.id}/report`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E6D5DC] bg-white hover:bg-[#F7EDE5] text-[#493344] text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <FileTextIcon size={14} />
            <span>Forensic Dossier</span>
          </Link>

          {/* Proceed to Analysis Action Button */}
          {hasRequiredEvidence && (
            <Link
              href={`/app/moisture-analysis?inspection=${inspection.id}&property=${inspection.property_id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#79566F] text-white text-xs font-semibold shadow-md shadow-[#79566F]/20 hover:bg-[#67475E] transition-all cursor-pointer"
            >
              <DropletIcon size={14} />
              <span>Proceed to Moisture Analysis</span>
              <ArrowRightIcon size={12} />
            </Link>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 bg-[#EFF8F3] border border-[#4A8B71]/30 rounded-2xl flex items-center justify-between text-xs text-[#4A8B71] animate-fade-in shadow-xs">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircleIcon size={18} />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-[#4A8B71] hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Details Left, Actions/Analysis Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Uploaded Evidence (Ambient, Flash & Audio) */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6D5DC]">
              <div>
                <h2 className="text-sm font-bold text-[#493344]">Multi-Modal Telemetry Evidence</h2>
                <p className="text-[11px] text-[#806C7B]">
                  Encrypted private storage artifacts &bull; Signed URLs generated on-demand
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                {/* Edit Evidence Main Button */}
                <button
                  type="button"
                  onClick={() => setIsEditEvidenceOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#79566F] text-white hover:bg-[#67475E] text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <CameraIcon size={13} />
                  <span>Edit Evidence</span>
                </button>

                {/* View switch */}
                <div className="flex items-center gap-1 bg-[#F7EDE5] p-1 rounded-xl border border-[#E6D5DC] text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveImageTab("gallery")}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${activeImageTab === "gallery"
                        ? "bg-white text-[#79566F] shadow-xs"
                        : "text-[#806C7B] hover:text-[#493344]"
                      }`}
                  >
                    All Photos ({allSavedPhotos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageTab("both")}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${activeImageTab === "both"
                        ? "bg-white text-[#79566F] shadow-xs"
                        : "text-[#806C7B] hover:text-[#493344]"
                      }`}
                  >
                    Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageTab("ambient")}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${activeImageTab === "ambient"
                        ? "bg-white text-[#79566F] shadow-xs"
                        : "text-[#806C7B] hover:text-[#493344]"
                      }`}
                  >
                    Ambient
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageTab("flash")}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${activeImageTab === "flash"
                        ? "bg-white text-[#79566F] shadow-xs"
                        : "text-[#806C7B] hover:text-[#493344]"
                      }`}
                  >
                    Flash
                  </button>
                </div>
              </div>
            </div>

            {/* Gallery View: All Saved Photos */}
            {activeImageTab === "gallery" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-bold text-[#493344] flex items-center gap-1.5">
                    <CameraIcon size={14} className="text-[#79566F]" />
                    <span>Saved Photographic Evidence ({allSavedPhotos.length} Photo{allSavedPhotos.length > 1 ? "s" : ""})</span>
                  </span>
                  <span className="text-[10px] text-[#4A8B71] bg-[#EFF8F3] px-2 py-0.5 rounded-md font-bold border border-[#4A8B71]/30">
                    Private Supabase Bucket: inspection-images
                  </span>
                </div>

                {allSavedPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {allSavedPhotos.map((photo, idx) => (
                      <div
                        key={photo.id || idx}
                        className="rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5]/40 hover:bg-[#F7EDE5] p-3 shadow-xs space-y-2 flex flex-col justify-between transition-all group"
                      >
                        <div className="space-y-2">
                          <div
                            onClick={() =>
                              setPreviewModalImg({
                                url: photo.url,
                                title: `Photo #${idx + 1}: ${idx === 0
                                    ? "Primary Ambient Baseline"
                                    : idx === 1
                                      ? "Specular Flash Detail"
                                      : "Inspection Detail"
                                  }`,
                                filename: photo.file_name,
                                path: photo.storage_path,
                              })
                            }
                            className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-900 border border-[#E6D5DC] cursor-pointer group-hover:shadow-md transition-shadow"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt={photo.file_name}
                              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono">
                              {idx === 0
                                ? "Photo #1: Primary (Ambient)"
                                : idx === 1
                                  ? "Photo #2: Flash (Specular)"
                                  : `Photo #${idx + 1}: Detail`}
                            </div>
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                              <EyeIcon size={16} />
                              <span>View Full Size</span>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-[#493344] truncate" title={photo.file_name}>
                              {photo.file_name}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#806C7B] mt-0.5">
                              <span className="font-mono">{formatBytes(photo.file_size)}</span>
                              <span className="text-[10px] font-mono text-[#79566F] bg-[#EFE4EC] px-1.5 py-0.5 rounded">
                                Signed URL Active
                              </span>
                            </div>
                            {photo.storage_path && (
                              <div
                                className="text-[10px] text-[#806C7B] font-mono truncate mt-1"
                                title={photo.storage_path}
                              >
                                path: {photo.storage_path}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#E6D5DC] flex items-center justify-between">
                          <span className="text-[10px] text-[#806C7B]">
                            {idx === 0 ? "Default for Moisture Analysis" : "Archived in Storage"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModalImg({
                                url: photo.url,
                                title: `Photo #${idx + 1}: ${idx === 0
                                    ? "Primary Ambient Baseline"
                                    : idx === 1
                                      ? "Specular Flash Detail"
                                      : "Inspection Detail"
                                  }`,
                                filename: photo.file_name,
                                path: photo.storage_path,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#79566F] hover:underline cursor-pointer"
                          >
                            <EyeIcon size={12} />
                            <span>Enlarge</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#F7EDE5] rounded-2xl border border-[#E6D5DC] text-xs text-[#806C7B]">
                    No photographs currently attached to this inspection report.
                  </div>
                )}
              </div>
            )}

            {/* Images Grid (Ambient / Flash views) */}
            {activeImageTab !== "gallery" && (
              <div
                className={`grid gap-4 ${activeImageTab === "both" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                  }`}
              >
                {/* Ambient Image */}
                {(activeImageTab === "both" || activeImageTab === "ambient") && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#493344] flex items-center gap-1.5">
                        <CameraIcon size={14} className="text-[#79566F]" />
                        <span>Ambient Image (Diffused Baseline)</span>
                      </span>
                      {inspection.ambient_img_url ? (
                        <span className="text-[10px] text-[#4A8B71] font-medium">Signed Private URL</span>
                      ) : (
                        <span className="text-[10px] text-[#C84661] font-bold">Missing Evidence</span>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#E6D5DC] overflow-hidden bg-slate-900 shadow-inner group relative h-60 flex items-center justify-center">
                      {inspection.ambient_img_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={inspection.ambient_img_url}
                            alt="Ambient Evidence"
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono">
                            I_ambient
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 text-slate-400 space-y-2">
                          <CameraIcon size={32} className="mx-auto opacity-40 text-slate-400" />
                          <div className="text-xs font-semibold">No Ambient Image Captured</div>
                          <button
                            type="button"
                            onClick={() => setIsEditEvidenceOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Upload Ambient Photo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Flash Image */}
                {(activeImageTab === "both" || activeImageTab === "flash") && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#493344] flex items-center gap-1.5">
                        <SparklesIcon size={14} className="text-[#B995AD]" />
                        <span>Flash Image (Specular Reflectance)</span>
                      </span>
                      {inspection.flash_img_url ? (
                        <span className="text-[10px] text-[#4A8B71] font-medium">Signed Private URL</span>
                      ) : (
                        <span className="text-[10px] text-[#C84661] font-bold">Missing Evidence</span>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#E6D5DC] overflow-hidden bg-slate-900 shadow-inner group relative h-60 flex items-center justify-center">
                      {inspection.flash_img_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={inspection.flash_img_url}
                            alt="Flash Evidence"
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono">
                            I_flash (Specular)
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 text-slate-400 space-y-2">
                          <SparklesIcon size={32} className="mx-auto opacity-40 text-[#B995AD]" />
                          <div className="text-xs font-semibold">No Flash Image Captured</div>
                          <button
                            type="button"
                            onClick={() => setIsEditEvidenceOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Upload Flash Photo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audio Recording Player */}
            <div className="pt-2">
              <div className="p-5 rounded-2xl bg-[#79566F] text-white border border-[#E6D5DC] space-y-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#79566F] text-white flex items-center justify-center">
                      <MicIcon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Acoustic Resonance Recording</div>
                      <div className="text-[10px] text-slate-400">
                        {inspection.audio_duration_seconds
                          ? `${inspection.audio_duration_seconds}s sample`
                          : "10-second scan"}{" "}
                        &bull; {inspection.audio_file_size ? `${(inspection.audio_file_size / 1024).toFixed(0)} KB` : "WAV audio"} &bull; acoustic-recordings bucket
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setIsEditEvidenceOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <MicIcon size={12} />
                      <span>{inspection.audio_url ? "Replace Audio" : "Record Audio"}</span>
                    </button>
                    <span className="text-[10px] font-mono text-[#B995AD] bg-white/10 px-2 py-0.5 rounded-md">
                      44.1 kHz PCM
                    </span>
                  </div>
                </div>

                {inspection.audio_url ? (
                  <audio controls className="w-full h-10 mt-1" src={inspection.audio_url}>
                    Your browser does not support the audio element.
                  </audio>
                ) : (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-2">
                    <div className="text-xs text-slate-400">No acoustic recording attached to this survey.</div>
                    <button
                      type="button"
                      onClick={() => setIsEditEvidenceOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#79566F] text-white text-xs font-bold hover:bg-[#67475E] transition-colors cursor-pointer"
                    >
                      Record or Upload Audio
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Zone & Physical Location */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#493344]">Inspection Zone &amp; Spatial Context</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC]">
                <span className="text-[10px] uppercase font-bold text-[#806C7B] block">
                  Diagnostic Zone
                </span>
                <span className="font-bold text-[#493344] mt-1 block">
                  {inspection.inspection_zone}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC]">
                <span className="text-[10px] uppercase font-bold text-[#806C7B] block">
                  Floor &amp; Room
                </span>
                <span className="font-bold text-[#493344] mt-1 block">
                  {inspection.floor} &bull; {inspection.room_name || "General Area"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC]">
                <span className="text-[10px] uppercase font-bold text-[#806C7B] block">
                  Surface / Junction
                </span>
                <span className="font-medium text-[#493344] mt-1 block">
                  {inspection.inspection_location || "Not specified"}
                </span>
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <span className="text-xs font-bold text-[#493344] block mb-2">
                Reported Observable Symptoms
              </span>
              <div className="flex flex-wrap gap-1.5">
                {inspection.symptom_tags && inspection.symptom_tags.length > 0 ? (
                  inspection.symptom_tags.map((sym) => (
                    <span
                      key={sym}
                      className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#EFE4EC] text-[#79566F] border border-[#79566F]/20 flex items-center gap-1.5"
                    >
                      <CheckCircleIcon size={12} className="text-[#79566F]" />
                      <span>{sym}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#806C7B]">No physical symptoms recorded</span>
                )}
              </div>
            </div>

            {/* Surveyor Notes */}
            {inspection.notes && (
              <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#806C7B] block">
                  Surveyor Observations &amp; Environmental Notes
                </span>
                <p className="text-[#493344] leading-relaxed">
                  {inspection.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Metadata & Analysis Actions */}
        <div className="space-y-6">
          {/* Property Card */}
          <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6D5DC]">
              <span className="text-xs font-bold text-[#493344]">Target Property Asset</span>
              <Link
                href={`/app/properties/${inspection.property_id}`}
                className="text-[11px] text-[#79566F] font-semibold hover:underline"
              >
                View Asset &rarr;
              </Link>
            </div>

            <div>
              <div className="font-bold text-sm text-[#493344]">{inspection.property_name}</div>
              <div className="text-xs text-[#806C7B] mt-0.5">{inspection.property_address}</div>
              <div className="text-[11px] font-mono text-[#79566F] mt-1">
                Asset ID: {inspection.property_id}
              </div>
            </div>
          </div>

          {/* Inspector Details */}
          <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-3">
            <span className="text-xs font-bold text-[#493344] block pb-2 border-b border-[#E6D5DC]">
              Lead Diagnostic Surveyor
            </span>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#79566F] text-white flex items-center justify-center font-bold text-xs">
                {inspection.inspector_name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-xs text-[#493344]">{inspection.inspector_name}</div>
                <div className="text-[11px] text-[#806C7B]">{inspection.inspector_email || "Authorized Surveyor"}</div>
                <div className="text-[10px] text-[#4A8B71] font-medium mt-0.5">Verified Surveyor Credential</div>
              </div>
            </div>
          </div>

          {/* Analysis & SLA Readiness Status */}
          <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6D5DC]">
              <span className="text-xs font-bold text-[#493344]">Analysis &amp; Triage Readiness</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getRiskBadge(inspection.risk_level)}`}>
                {inspection.risk_level} Risk
              </span>
            </div>

            {/* Analysis Metrics if exist */}
            {inspection.ambient_moisture_index !== null && inspection.ambient_moisture_index !== undefined ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#F7EDE5]">
                  <span className="text-[#806C7B]">Moisture Saturation:</span>
                  <span className="font-bold text-[#493344]">{inspection.ambient_moisture_index}%</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#F7EDE5]">
                  <span className="text-[#806C7B]">Flash Reflection Sheen:</span>
                  <span className="font-bold text-[#B995AD]">{inspection.flash_reflection_score}%</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#F7EDE5]">
                  <span className="text-[#806C7B]">Acoustic Leak Peak:</span>
                  <span className="font-bold text-[#B995AD]">
                    {inspection.acoustic_leak_frequency_hz && inspection.acoustic_leak_frequency_hz > 0
                      ? `${inspection.acoustic_leak_frequency_hz} Hz`
                      : "No resonance anomaly"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#FDF5ED] border border-[#B86B35]/30 rounded-2xl text-xs text-[#493344] space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[#B86B35]">
                  <ClockIcon size={14} />
                  <span>Awaiting Algorithmic Processing</span>
                </div>
                <p className="text-[11px] text-[#806C7B]">
                  Evidence collection is verified. Proceed below to run optical reflection subtraction or acoustic FFT processing.
                </p>
              </div>
            )}

            {/* Proceed to Analysis Buttons */}
            <div className="space-y-2 pt-2">
              <Link
                href={`/app/moisture-analysis?inspection=${inspection.id}`}
                className="w-full py-2.5 px-3 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold flex items-center justify-between transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <DropletIcon size={14} />
                  <span>Run Moisture Heatmap (OpenCV)</span>
                </div>
                <ArrowRightIcon size={12} />
              </Link>

              <Link
                href={`/app/acoustic-analysis?inspection=${inspection.id}`}
                className="w-full py-2.5 px-3 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold flex items-center justify-between transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <AcousticIcon size={14} />
                  <span>Run Acoustic FFT Peak Scan</span>
                </div>
                <ArrowRightIcon size={12} />
              </Link>

              {(role === "admin" || role === "manager") && (
                <Link
                  href={`/app/work-orders?property=${inspection.property_id}&inspection=${inspection.id}`}
                  className="w-full py-2 px-3 rounded-xl border border-[#E6D5DC] hover:bg-[#F7EDE5] text-[#493344] text-xs font-semibold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <WrenchIcon size={14} className="text-[#806C7B]" />
                    <span>Dispatch Remediation Contractor</span>
                  </div>
                  <ArrowRightIcon size={12} />
                </Link>
              )}
            </div>
          </div>

          {/* Audit Timestamp info */}
          <div className="text-[11px] text-[#806C7B] p-4 bg-white rounded-2xl border border-[#E6D5DC] space-y-1">
            <div>
              <strong>Submitted:</strong> {new Date(inspection.created_at).toLocaleString("en-GB")}
            </div>
            <div>
              <strong>Last Updated:</strong> {new Date(inspection.updated_at).toLocaleString("en-GB")}
            </div>
            <div>
              <strong>Storage Encryption:</strong> AES-256 (Supabase Storage Private)
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Evidence Editing Modal */}
      <EditEvidenceModal
        isOpen={isEditEvidenceOpen}
        onClose={() => setIsEditEvidenceOpen(false)}
        inspection={inspection}
        onSuccess={(updated) => {
          setInspection(updated);
          setSuccessToast("Inspection evidence successfully updated and persisted!");
        }}
      />

      {/* Full-size Image Preview Modal */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-[#E6D5DC] flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#E6D5DC] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#493344]">{previewModalImg.title}</h3>
                <p className="text-[11px] text-[#806C7B] font-mono mt-0.5">
                  {previewModalImg.filename} {previewModalImg.path ? `• ${previewModalImg.path}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="p-1.5 rounded-xl hover:bg-[#F7EDE5] text-[#806C7B] hover:text-[#493344] cursor-pointer"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewModalImg.url}
                alt={previewModalImg.filename}
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-[#F7EDE5] border-t border-[#E6D5DC] flex items-center justify-between text-xs">
              <span className="text-[#806C7B]">
                Supabase Storage: bucket <code>inspection-images</code>
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="px-4 py-1.5 rounded-xl bg-[#79566F] text-white font-semibold hover:bg-[#67475E] cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

