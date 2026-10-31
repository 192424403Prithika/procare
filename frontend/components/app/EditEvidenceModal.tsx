"use client";

import React, { useState, useRef } from "react";
import {
  CameraIcon,
  SparklesIcon,
  MicIcon,
  XIcon,
  CheckCircleIcon,
  UploadCloudIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
} from "@/components/Icons";
import {
  InspectionReport,
  uploadInspectionEvidence,
  updateInspectionEvidence,
  validateImageFile,
  validateAudioFile,
} from "@/lib/services/inspectionService";
import CameraCaptureModal from "./CameraCaptureModal";

interface EditEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: InspectionReport;
  onSuccess: (updated: InspectionReport) => void;
}

export default function EditEvidenceModal({
  isOpen,
  onClose,
  inspection,
  onSuccess,
}: EditEvidenceModalProps) {
  // Pending evidence files
  const [ambientFile, setAmbientFile] = useState<File | null>(null);
  const [ambientPreview, setAmbientPreview] = useState<string | null>(null);
  const [ambientError, setAmbientError] = useState<string | null>(null);

  const [flashFile, setFlashFile] = useState<File | null>(null);
  const [flashPreview, setFlashPreview] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Live audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraModalMode, setCameraModalMode] = useState<"ambient" | "flash">("ambient");

  // Save / Upload status
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Hidden file input refs
  const ambientInputRef = useRef<HTMLInputElement | null>(null);
  const flashInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const hasChanges = Boolean(ambientFile || flashFile || audioFile);

  // Camera handlers
  const handleOpenCamera = (mode: "ambient" | "flash") => {
    setCameraModalMode(mode);
    setCameraModalOpen(true);
  };

  const handleCameraCapture = (file: File, previewUrl: string) => {
    if (cameraModalMode === "ambient") {
      setAmbientFile(file);
      setAmbientPreview(previewUrl);
      setAmbientError(null);
    } else {
      setFlashFile(file);
      setFlashPreview(previewUrl);
      setFlashError(null);
    }
  };

  // Ambient file upload handler
  const handleAmbientSelected = (file: File) => {
    setAmbientError(null);
    const val = validateImageFile(file);
    if (!val.valid) {
      setAmbientError(val.error || "Invalid image format.");
      return;
    }
    setAmbientFile(file);
    setAmbientPreview(URL.createObjectURL(file));
  };

  // Flash file upload handler
  const handleFlashSelected = (file: File) => {
    setFlashError(null);
    const val = validateImageFile(file);
    if (!val.valid) {
      setFlashError(val.error || "Invalid image format.");
      return;
    }
    setFlashFile(file);
    setFlashPreview(URL.createObjectURL(file));
  };

  // Audio file upload handler
  const handleAudioSelected = (file: File) => {
    setAudioError(null);
    const val = validateAudioFile(file);
    if (!val.valid) {
      setAudioError(val.error || "Invalid audio format.");
      return;
    }
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      setAudioDuration(Number(tempAudio.duration.toFixed(1)));
    };
  };

  // Mic recording handlers
  const startRecording = async () => {
    try {
      setAudioError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const recordedFile = new File(
          [audioBlob],
          `acoustic_replacement_${Date.now()}.wav`,
          { type: "audio/wav" }
        );
        handleAudioSelected(recordedFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.warn("Media recorder not accessible", err);
      setAudioError("Microphone access unavailable or denied. Please upload an audio file directly.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  // Revert handlers
  const handleRevertAmbient = () => {
    if (ambientPreview) URL.revokeObjectURL(ambientPreview);
    setAmbientFile(null);
    setAmbientPreview(null);
    setAmbientError(null);
  };

  const handleRevertFlash = () => {
    if (flashPreview) URL.revokeObjectURL(flashPreview);
    setFlashFile(null);
    setFlashPreview(null);
    setFlashError(null);
  };

  const handleRevertAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setAudioError(null);
  };

  // Safe commit handler: Upload files first; DO NOT overwrite existing until successful
  const handleSaveEvidence = async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    setGlobalError(null);
    setUploadStatusText("Validating and preparing evidence uploads...");

    try {
      const updates: {
        ambient_img_url?: string;
        ambient_img_path?: string;
        flash_img_url?: string;
        flash_img_path?: string;
        audio_url?: string;
        audio_path?: string;
        audio_duration_seconds?: number;
        audio_file_size?: number;
      } = {};

      // 1. Upload Ambient replacement if provided
      if (ambientFile) {
        setUploadStatusText("Uploading replacement ambient image to private storage...");
        const res = await uploadInspectionEvidence(
          ambientFile,
          "inspection-images",
          inspection.property_id
        );
        updates.ambient_img_url = res.url;
        updates.ambient_img_path = res.storagePath;
      }

      // 2. Upload Flash replacement if provided
      if (flashFile) {
        setUploadStatusText("Uploading replacement flash image to private storage...");
        const res = await uploadInspectionEvidence(
          flashFile,
          "inspection-images",
          inspection.property_id
        );
        updates.flash_img_url = res.url;
        updates.flash_img_path = res.storagePath;
      }

      // 3. Upload Audio replacement if provided
      if (audioFile) {
        setUploadStatusText("Uploading replacement acoustic audio to private storage...");
        const res = await uploadInspectionEvidence(
          audioFile,
          "acoustic-recordings",
          inspection.property_id
        );
        updates.audio_url = res.url;
        updates.audio_path = res.storagePath;
        updates.audio_duration_seconds = audioDuration || 10.0;
        updates.audio_file_size = audioFile.size;
      }

      setUploadStatusText("Persisting changes to inspection database...");
      // 4. Update the database record now that uploads succeeded
      const updated = await updateInspectionEvidence(inspection.id, updates);

      setIsSaving(false);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to update evidence", err);
      const msg = err instanceof Error ? err.message : "Evidence upload failed. Existing evidence preserved.";
      setGlobalError(msg);
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl border border-[#E6D5DC] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-[#E6D5DC] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#79566F]" />
                <h2 className="text-base font-extrabold text-[#493344]">
                  Manage &amp; Edit Telemetry Evidence
                </h2>
              </div>
              <p className="text-xs text-[#806C7B] mt-0.5">
                Inspection <span className="font-mono text-[#79566F] font-bold">{inspection.id}</span> &bull; Asset: {inspection.property_name}
              </p>
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="p-2 rounded-xl text-[#806C7B] hover:text-[#493344] hover:bg-[#F7EDE5] transition-colors cursor-pointer disabled:opacity-50"
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {globalError && (
              <div className="p-4 bg-[#FDF2F4] border border-[#C84661]/30 rounded-2xl flex items-start gap-3 text-xs text-[#C84661]">
                <AlertTriangleIcon size={18} className="shrink-0 mt-0.5 text-[#C84661]" />
                <div>
                  <span className="font-bold">Upload Error: </span>
                  <span>{globalError}</span>
                  <div className="mt-0.5 text-[11px] text-[#806C7B]">
                    Existing inspection evidence remains completely intact and unaffected.
                  </div>
                </div>
              </div>
            )}

            <div className="p-3.5 bg-[#EFE4EC] border border-[#79566F]/20 rounded-2xl text-xs text-[#79566F] flex items-center gap-2">
              <CheckCircleIcon size={16} className="shrink-0" />
              <span>
                Select replacement files or capture live. Previews are shown below. Existing evidence will only be replaced after successful cloud upload.
              </span>
            </div>

            {/* Three Evidence Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* CARD A: Ambient Image */}
              <div className="rounded-2xl border border-[#E6D5DC] p-4 bg-[#F7EDE5] flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#493344] flex items-center gap-1.5">
                      <CameraIcon size={14} className="text-[#79566F]" />
                      <span>A. Ambient Image</span>
                    </span>
                    {ambientPreview ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Pending Replacement
                      </span>
                    ) : inspection.ambient_img_url ? (
                      <span className="text-[10px] font-semibold text-[#4A8B71] bg-[#EFF8F3] px-2 py-0.5 rounded-md">
                        Current Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#C84661] bg-[#FDF2F4] px-2 py-0.5 rounded-md">
                        Missing
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#806C7B]">
                    Natural diffused illumination baseline.
                  </p>

                  {/* Preview Container */}
                  <div className="h-44 rounded-xl border border-[#E6D5DC] bg-slate-900 overflow-hidden relative flex items-center justify-center">
                    {ambientPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ambientPreview}
                        alt="Ambient Replacement Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : inspection.ambient_img_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inspection.ambient_img_url}
                        alt="Current Ambient"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-slate-400 text-xs">
                        <CameraIcon size={28} className="mx-auto mb-1 opacity-40" />
                        <div>No Ambient Image Uploaded</div>
                      </div>
                    )}
                  </div>

                  {ambientError && (
                    <p className="text-[10px] text-[#C84661] font-semibold">{ambientError}</p>
                  )}
                </div>

                {/* Card A Actions */}
                <div className="space-y-2 pt-2 border-t border-[#E6D5DC]">
                  <input
                    ref={ambientInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAmbientSelected(f);
                    }}
                  />

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenCamera("ambient")}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E6D5DC] hover:border-[#79566F] text-[#493344] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <CameraIcon size={12} className="text-[#79566F]" />
                      <span>Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => ambientInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E6D5DC] hover:border-[#79566F] text-[#493344] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <UploadCloudIcon size={12} className="text-[#79566F]" />
                      <span>Upload</span>
                    </button>
                  </div>

                  {ambientPreview && (
                    <button
                      type="button"
                      onClick={handleRevertAmbient}
                      className="w-full py-1 text-center text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Cancel Replacement (Keep Existing)
                    </button>
                  )}
                </div>
              </div>

              {/* CARD B: Flash Image */}
              <div className="rounded-2xl border border-[#E6D5DC] p-4 bg-[#F7EDE5] flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#493344] flex items-center gap-1.5">
                      <SparklesIcon size={14} className="text-[#B995AD]" />
                      <span>B. Flash Image</span>
                    </span>
                    {flashPreview ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Pending Replacement
                      </span>
                    ) : inspection.flash_img_url ? (
                      <span className="text-[10px] font-semibold text-[#4A8B71] bg-[#EFF8F3] px-2 py-0.5 rounded-md">
                        Current Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#C84661] bg-[#FDF2F4] px-2 py-0.5 rounded-md">
                        Missing
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#806C7B]">
                    Same area with flash/torch enabled where supported.
                  </p>

                  {/* Preview Container */}
                  <div className="h-44 rounded-xl border border-[#E6D5DC] bg-slate-900 overflow-hidden relative flex items-center justify-center">
                    {flashPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={flashPreview}
                        alt="Flash Replacement Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : inspection.flash_img_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inspection.flash_img_url}
                        alt="Current Flash"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-slate-400 text-xs">
                        <SparklesIcon size={28} className="mx-auto mb-1 opacity-40" />
                        <div>No Flash Image Uploaded</div>
                      </div>
                    )}
                  </div>

                  {flashError && (
                    <p className="text-[10px] text-[#C84661] font-semibold">{flashError}</p>
                  )}
                </div>

                {/* Card B Actions */}
                <div className="space-y-2 pt-2 border-t border-[#E6D5DC]">
                  <input
                    ref={flashInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFlashSelected(f);
                    }}
                  />

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenCamera("flash")}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E6D5DC] hover:border-[#B995AD] text-[#493344] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <CameraIcon size={12} className="text-[#B995AD]" />
                      <span>Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => flashInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E6D5DC] hover:border-[#B995AD] text-[#493344] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <UploadCloudIcon size={12} className="text-[#B995AD]" />
                      <span>Upload</span>
                    </button>
                  </div>

                  {flashPreview && (
                    <button
                      type="button"
                      onClick={handleRevertFlash}
                      className="w-full py-1 text-center text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Cancel Replacement (Keep Existing)
                    </button>
                  )}
                </div>
              </div>

              {/* CARD C: Acoustic Recording */}
              <div className="rounded-2xl border border-[#E6D5DC] p-4 bg-[#F7EDE5] flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#493344] flex items-center gap-1.5">
                      <MicIcon size={14} className="text-[#B995AD]" />
                      <span>C. Acoustic Recording</span>
                    </span>
                    {audioUrl ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Pending Replacement
                      </span>
                    ) : inspection.audio_url ? (
                      <span className="text-[10px] font-semibold text-[#4A8B71] bg-[#EFF8F3] px-2 py-0.5 rounded-md">
                        Current Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#C84661] bg-[#FDF2F4] px-2 py-0.5 rounded-md">
                        Missing
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#806C7B]">
                    Acoustic frequency &amp; leak resonance audio.
                  </p>

                  {/* Audio Player Container */}
                  <div className="h-44 rounded-xl border border-[#E6D5DC] bg-[#DFCECF] text-[#493344] p-3 flex flex-col justify-between">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{audioUrl ? "Replacement Preview" : "Current Recording"}</span>
                      <span className="font-mono text-[#B995AD]">
                        {audioUrl
                          ? audioDuration > 0
                            ? `${audioDuration}s`
                            : "Ready"
                          : inspection.audio_duration_seconds
                          ? `${inspection.audio_duration_seconds}s`
                          : "Audio"}
                      </span>
                    </div>

                    <div className="py-2">
                      {audioUrl ? (
                        <audio controls className="w-full h-8" src={audioUrl}>
                          Your browser does not support the audio element.
                        </audio>
                      ) : inspection.audio_url ? (
                        <audio controls className="w-full h-8" src={inspection.audio_url}>
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <div className="text-center text-slate-500 text-xs py-4">
                          No audio recorded
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 truncate">
                      {audioFile ? audioFile.name : inspection.audio_path || "44.1 kHz WAV"}
                    </div>
                  </div>

                  {audioError && (
                    <p className="text-[10px] text-[#C84661] font-semibold">{audioError}</p>
                  )}
                </div>

                {/* Card C Actions */}
                <div className="space-y-2 pt-2 border-t border-[#E6D5DC]">
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/wav,audio/mpeg,audio/mp3,audio/m4a,audio/webm,audio/ogg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAudioSelected(f);
                    }}
                  />

                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="w-full py-1.5 rounded-xl bg-[#C84661] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <div className="w-2 h-2 rounded-full bg-white" />
                      <span>Stop Recording ({recordingSeconds}s)</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E6D5DC] hover:border-[#B995AD] text-[#493344] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <MicIcon size={12} className="text-[#B995AD]" />
                        <span>Record Audio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E6D5DC] hover:border-[#B995AD] text-[#493344] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <UploadCloudIcon size={12} className="text-[#B995AD]" />
                        <span>Upload Audio</span>
                      </button>
                    </div>
                  )}

                  {audioUrl && !isRecording && (
                    <button
                      type="button"
                      onClick={handleRevertAudio}
                      className="w-full py-1 text-center text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Cancel Replacement (Keep Existing)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-[#E6D5DC] bg-[#F7EDE5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#806C7B]">
              {isSaving ? (
                <span className="flex items-center gap-2 text-[#79566F] font-semibold">
                  <div className="w-3.5 h-3.5 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin" />
                  <span>{uploadStatusText}</span>
                </span>
              ) : hasChanges ? (
                <span className="text-[#493344] font-semibold">
                  Pending changes ready for upload.
                </span>
              ) : (
                <span>No changes selected. Pick an image or audio to replace.</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#E6D5DC] bg-white text-xs font-semibold text-[#806C7B] hover:text-[#493344] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!hasChanges || isSaving}
                onClick={handleSaveEvidence}
                className="px-5 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-[#79566F]/20 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <RefreshCwIcon size={13} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon size={13} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Live Camera Modal */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        isFlashMode={cameraModalMode === "flash"}
        title={
          cameraModalMode === "flash"
            ? "Capture Flash Specular Photo"
            : "Capture Ambient Reference Photo"
        }
      />
    </>
  );
}
