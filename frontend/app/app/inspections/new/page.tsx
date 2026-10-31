/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BuildingIcon,
  CameraIcon,
  MicIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  UploadCloudIcon,
  SparklesIcon,
  SearchIcon,
  XIcon,
  PlusIcon,
} from "@/components/Icons";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";
import {
  createInspection,
  uploadInspectionEvidence,
  validateAudioFile,
  InspectionImageItem,
} from "@/lib/services/inspectionService";
import { useRole } from "@/components/app/RoleContext";
import CameraCaptureModal from "@/components/app/CameraCaptureModal";

export interface SelectedPhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  formattedSize: string;
  type: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const ALLOWED_PHOTO_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i;
const ALLOWED_PHOTO_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 20 * 1024 * 1024; // 20 MB

export default function NewInspectionWorkflowPage() {
  const searchParams = useSearchParams();
  const initialPropId = searchParams.get("property") || "";
  const { profile } = useRole();

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Step 1: Properties from Supabase
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropId);
  const [propertySearch, setPropertySearch] = useState("");

  // Step 2: Inspection Zone
  const [roomName, setRoomName] = useState("");
  const [floor, setFloor] = useState("Ground Floor");
  const [inspectionZone, setInspectionZone] = useState("Bathroom ceiling & external wall");
  const [inspectionLocation, setInspectionLocation] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");

  // Step 3: Photos Collection
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhotoItem[]>([]);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Optional Acoustic Telemetry
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Step 4: Symptoms & Notes
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherObservations, setOtherObservations] = useState("");
  const [notes, setNotes] = useState("");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgressText, setSubmissionProgressText] = useState<string>("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdInspectionId, setCreatedInspectionId] = useState<string | null>(null);

  // Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Load actual properties from Supabase
  useEffect(() => {
    async function load() {
      setIsLoadingProps(true);
      const props = await fetchProperties();
      setProperties(props);
      if (!selectedPropertyId && props.length > 0) {
        setSelectedPropertyId(props[0].id);
      }
      setIsLoadingProps(false);
    }
    load();
  }, []);

  // Standard step definitions
  const stepsList = [
    { number: 1, title: "Property", subtitle: "Select building asset" },
    { number: 2, title: "Zone", subtitle: "Room, floor & area" },
    { number: 3, title: "Upload Photos", subtitle: "Inspection photography" },
    { number: 4, title: "Symptoms", subtitle: "Observable pathology" },
    { number: 5, title: "Review", subtitle: "Verify & submit" },
  ];

  const standardZones = [
    "Bathroom ceiling & external wall",
    "Living room northern cavity wall",
    "Kitchen riser pipe enclosure",
    "Bedroom window reveal & sill",
    "Sub-floor void & timber joists",
    "External gable cavity reveal",
    "Basement service manifold",
    "Loft insulation & roof timber",
  ];

  const floorOptions = [
    "Basement / Sub-floor",
    "Ground Floor",
    "Floor 1",
    "Floor 2",
    "Floor 3",
    "Floor 4",
    "Floor 5",
    "Floor 6+",
    "Roof Space / Attics",
  ];

  const symptomOptions = [
    "Musty odour",
    "Damp patches",
    "Peeling plaster",
    "Spongy surface",
    "Cold draft",
    "Visible mould",
    "Other observations",
  ];

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  // Multi-photo selection and validation handler
  const handlePhotosSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newErrors: string[] = [];
    const validPhotos: SelectedPhotoItem[] = [];

    fileArray.forEach((file) => {
      const isExtensionValid = ALLOWED_PHOTO_EXTENSIONS.test(file.name);
      const isMimeValid = ALLOWED_PHOTO_MIMES.includes(file.type.toLowerCase()) || file.type === "";

      if (!isExtensionValid && !isMimeValid) {
        newErrors.push(`"${file.name}" is not a supported format. Please upload JPG, JPEG, PNG, or WEBP images.`);
        return;
      }

      if (file.size > MAX_PHOTO_BYTES) {
        newErrors.push(`"${file.name}" exceeds the 20 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
        return;
      }

      // Check for duplicate in already selected
      const isDuplicate = selectedPhotos.some((p) => p.name === file.name && p.size === file.size);
      if (isDuplicate) {
        newErrors.push(`"${file.name}" has already been selected.`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      validPhotos.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        formattedSize: formatBytes(file.size),
        type: file.type || "image/jpeg",
      });
    });

    if (newErrors.length > 0) {
      setPhotoErrors(newErrors);
    } else {
      setPhotoErrors([]);
    }

    if (validPhotos.length > 0) {
      setSelectedPhotos((prev) => [...prev, ...validPhotos]);
      setSubmissionError(null);
    }

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (id: string) => {
    setSelectedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleCameraCapture = (file: File, previewUrl: string) => {
    const photo: SelectedPhotoItem = {
      id: `photo-cam-${Date.now()}`,
      file,
      previewUrl,
      name: file.name || `camera_capture_${Date.now()}.jpg`,
      size: file.size,
      formattedSize: formatBytes(file.size),
      type: file.type || "image/jpeg",
    };
    setSelectedPhotos((prev) => [...prev, photo]);
    setSubmissionError(null);
    setPhotoErrors([]);
  };

  // Audio Upload Handler
  const handleAudioUpload = (file: File) => {
    setAudioError(null);
    const val = validateAudioFile(file);
    if (!val.valid) {
      setAudioError(val.error || "Invalid audio file");
      return;
    }

    setAudioFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAudioUrl(objectUrl);

    const tempAudio = new Audio(objectUrl);
    tempAudio.onloadedmetadata = () => {
      setAudioDuration(Number(tempAudio.duration.toFixed(1)));
    };
  };

  const handleRemoveAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setAudioError(null);
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

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
        const recordedFile = new File([audioBlob], `acoustic_capture_${Date.now()}.wav`, {
          type: "audio/wav",
        });
        handleAudioUpload(recordedFile);
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

  // Step validation
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      if (!selectedPropertyId) {
        setSubmissionError("Please select an authorized property to inspect.");
        return false;
      }
    } else if (currentStep === 2) {
      if (!inspectionZone.trim()) {
        setSubmissionError("Please specify or select an inspection zone.");
        return false;
      }
    } else if (currentStep === 3) {
      if (selectedPhotos.length === 0) {
        setSubmissionError("Please choose or capture at least one inspection photograph (JPG, JPEG, PNG, or WEBP).");
        return false;
      }
    }
    setSubmissionError(null);
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleBack = () => {
    setSubmissionError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Submission handler
  const handleSubmitInspection = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      if (selectedPhotos.length === 0) {
        throw new Error("At least one inspection photograph is required. Please choose photos from your device.");
      }

      // 1. Upload all selected photographs to private storage bucket inspection-images
      setSubmissionProgressText(`Uploading ${selectedPhotos.length} photo${selectedPhotos.length > 1 ? "s" : ""} to private storage bucket (inspection-images)...`);

      const uploadedImages: InspectionImageItem[] = [];

      for (let i = 0; i < selectedPhotos.length; i++) {
        const photo = selectedPhotos[i];
        setSubmissionProgressText(`Uploading photo ${i + 1} of ${selectedPhotos.length}: ${photo.name}...`);
        
        const uploadRes = await uploadInspectionEvidence(
          photo.file,
          "inspection-images",
          selectedPropertyId
        );

        uploadedImages.push({
          id: `img-${Date.now()}-${i}`,
          url: uploadRes.url,
          storage_path: uploadRes.storagePath,
          file_name: uploadRes.fileName || photo.name,
          file_size: uploadRes.fileSize || photo.size,
          caption: i === 0 ? "Primary ambient baseline photo" : i === 1 ? "Secondary specular flash photo" : `Inspection detail #${i + 1}`,
        });
      }

      const primaryPhoto = uploadedImages[0];
      const secondaryPhoto = uploadedImages.length > 1 ? uploadedImages[1] : null;

      // 2. Upload acoustic recording if provided
      let audioUploadedUrl = "";
      let audioPath = "";
      if (audioFile) {
        setSubmissionProgressText("Uploading acoustic telemetry recording...");
        const audioRes = await uploadInspectionEvidence(
          audioFile,
          "acoustic-recordings",
          selectedPropertyId
        );
        audioUploadedUrl = audioRes.url;
        audioPath = audioRes.storagePath;
      }

      // Combine symptoms with other observations if any
      const allSymptoms = [...selectedSymptoms];
      if (selectedSymptoms.includes("Other observations") && otherObservations.trim()) {
        allSymptoms.push(`Other: ${otherObservations.trim()}`);
      }

      setSubmissionProgressText("Registering inspection and storage paths in PostgreSQL...");

      // 3. Create record in Supabase / persistent store
      const created = await createInspection({
        property_id: selectedPropertyId,
        inspector_id: null,
        inspector_name: profile.name || "Markus Thorne, MRICS",
        inspector_email: profile.email || "m.thorne@forensicspec.com",
        inspection_zone: inspectionZone,
        room_name: roomName || "General Area",
        floor: floor,
        inspection_location: inspectionLocation || zoneDescription,
        symptom_tags: allSymptoms,
        notes: notes,
        ambient_img_url: primaryPhoto.url,
        ambient_img_path: primaryPhoto.storage_path,
        flash_img_url: secondaryPhoto ? secondaryPhoto.url : "",
        flash_img_path: secondaryPhoto ? secondaryPhoto.storage_path : "",
        images: uploadedImages,
        image_paths: uploadedImages.map((u) => u.storage_path),
        audio_url: audioUploadedUrl,
        audio_path: audioPath,
        audio_duration_seconds: audioDuration || 10.0,
        audio_file_size: audioFile?.size || 400000,
      });

      setCreatedInspectionId(created.id);
      setIsSubmitting(false);
    } catch (err: unknown) {
      console.error("Submission failed", err);
      const msg = err instanceof Error ? err.message : "Failed to submit inspection evidence. Please check network connectivity and retry.";
      setSubmissionError(msg);
      setIsSubmitting(false);
    }
  };

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  const filteredProperties = properties.filter((p) => {
    const term = propertySearch.toLowerCase();
    return (
      p.property_name.toLowerCase().includes(term) ||
      p.address.toLowerCase().includes(term) ||
      p.postal_code.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/inspections" className="hover:text-[#79566F]">
              &larr; Back to Inspection Registry
            </Link>
            <span>/</span>
            <span>New Survey Protocol</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Field Inspection Telemetry Wizard
          </h1>
          <p className="text-xs text-[#806C7B]">
            Standardized multi-modal evidence collection: High-resolution photos &amp; acoustic sampling
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EFE4EC] text-[#79566F] border border-[#79566F]/20 self-start sm:self-center">
          <SparklesIcon size={14} />
          <span>Step {currentStep} of {totalSteps}</span>
        </span>
      </div>

      {/* Progress Navigation Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E6D5DC] shadow-xs">
        <div className="hidden sm:grid grid-cols-5 gap-2">
          {stepsList.map((step) => {
            const isDone = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            return (
              <button
                key={step.number}
                type="button"
                onClick={() => {
                  if (step.number < currentStep || validateCurrentStep()) {
                    setCurrentStep(step.number);
                  }
                }}
                className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#EFE4EC] border border-[#79566F] shadow-xs"
                    : isDone
                    ? "bg-[#F7EDE5] border border-[#E6D5DC] hover:bg-[#EFF8F3]"
                    : "opacity-60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold ${
                      isCurrent
                        ? "bg-[#79566F] text-white"
                        : isDone
                        ? "bg-[#4A8B71] text-white"
                        : "bg-[#E6D5DC] text-[#806C7B]"
                    }`}
                  >
                    {isDone ? "✓" : step.number}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isCurrent ? "text-[#79566F]" : isDone ? "text-[#493344]" : "text-[#806C7B]"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                <div className="text-[10px] text-[#806C7B] mt-1 truncate pl-8">
                  {step.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Mobile Compact Progress Bar */}
        <div className="sm:hidden space-y-2">
          <div className="flex justify-between text-xs font-bold text-[#493344]">
            <span>
              Step {currentStep} of {totalSteps}: {stepsList[currentStep - 1].title}
            </span>
            <span className="text-[#79566F]">
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-[#E6D5DC] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#79566F] h-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {submissionError && (
        <div className="p-4 bg-[#FDF2F4] border border-[#C84661]/30 rounded-2xl flex items-start gap-3 text-xs text-[#C84661]">
          <AlertTriangleIcon size={18} className="shrink-0 mt-0.5 text-[#C84661]" />
          <div className="flex-1">
            <div className="font-bold">Notice / Action Required</div>
            <div className="mt-0.5">{submissionError}</div>
          </div>
          <button
            type="button"
            onClick={() => setSubmissionError(null)}
            className="text-[#C84661] hover:opacity-75 cursor-pointer"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Main Wizard Form Body */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6D5DC] shadow-xs min-h-[460px] flex flex-col justify-between">
        {createdInspectionId ? (
          /* Submission Complete View */
          <div className="text-center py-8 space-y-5 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#4A8B71]/10 text-[#4A8B71] mx-auto flex items-center justify-center">
              <CheckCircleIcon size={36} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#493344]">
                Inspection Telemetry Submitted Successfully
              </h2>
              <p className="text-xs text-[#806C7B] mt-1.5">
                Photographic evidence for <strong className="text-[#493344]">{selectedProperty?.property_name}</strong> has been securely uploaded to Supabase Storage and registered in PostgreSQL.
              </p>
            </div>

            <div className="p-4 bg-[#F7EDE5] rounded-2xl border border-[#E6D5DC] text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#806C7B]">Inspection ID:</span>
                <span className="font-mono font-bold text-[#79566F]">{createdInspectionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806C7B]">Property:</span>
                <span className="font-semibold text-[#493344]">{selectedProperty?.property_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806C7B]">Zone &amp; Room:</span>
                <span className="font-medium text-[#493344]">{inspectionZone} ({floor})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806C7B]">Saved Evidence:</span>
                <span className="font-medium text-[#4A8B71]">
                  {selectedPhotos.length} Photo{selectedPhotos.length > 1 ? "s" : ""} (inspection-images bucket)
                  {audioFile ? " + 1 Audio Scan" : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806C7B]">Initial Status:</span>
                <span className="font-semibold text-[#B86B35]">Pending Review</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-2.5">
              <Link
                href={`/app/inspections/${createdInspectionId}`}
                className="flex-1 py-3 px-4 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] transition-colors text-center shadow-md shadow-[#79566F]/20"
              >
                View Reopened Inspection
              </Link>
              <Link
                href="/app/inspections"
                className="flex-1 py-3 px-4 rounded-xl border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors text-center"
              >
                Inspection Registry
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* STEP 1: SELECT PROPERTY */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[#493344]">
                    Step 1 – Select Authorized Property
                  </h2>
                  <p className="text-xs text-[#806C7B]">
                    Choose the residential housing unit or estate scheduled for field diagnostic survey from Supabase
                  </p>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#806C7B]">
                    <SearchIcon size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search properties by name, address, postcode or ID..."
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    className="w-full rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2.5 pl-9 pr-3 text-xs text-[#493344] placeholder-[#806C7B] focus:border-[#79566F] focus:bg-white focus:outline-none"
                  />
                </div>

                {isLoadingProps ? (
                  <div className="py-12 text-center text-xs text-[#806C7B]">
                    <div className="w-5 h-5 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading authorized properties from database...</span>
                  </div>
                ) : filteredProperties.length === 0 ? (
                  <div className="p-8 text-center bg-[#F7EDE5] rounded-2xl border border-[#E6D5DC] text-xs text-[#806C7B]">
                    No properties match &quot;{propertySearch}&quot;.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {filteredProperties.map((p) => {
                      const isSelected = selectedPropertyId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPropertyId(p.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-[#79566F] bg-[#EFE4EC]/80 shadow-xs ring-1 ring-[#79566F]"
                              : "border-[#E6D5DC] hover:bg-[#F7EDE5]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-[#79566F] text-white"
                                    : "bg-white border border-[#E6D5DC] text-[#806C7B]"
                                }`}
                              >
                                <BuildingIcon size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[#493344]">
                                    {p.property_name}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#79566F]">
                                    {p.id}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#806C7B] mt-0.5">
                                  {p.address}, {p.postal_code} &bull; {p.building_type}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                  p.risk_level === "critical"
                                    ? "bg-[#FDF2F4] text-[#C84661]"
                                    : p.risk_level === "high"
                                    ? "bg-[#FDF5ED] text-[#B86B35]"
                                    : "bg-[#EFF8F3] text-[#4A8B71]"
                                }`}
                              >
                                {p.risk_level}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: SELECT INSPECTION ZONE */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#493344]">
                    Step 2 – Select Inspection Zone &amp; Location
                  </h2>
                  <p className="text-xs text-[#806C7B]">
                    Define the specific micro-area, floor level, and physical surface location inside the property
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#493344] mb-1">
                      Room or Area Name <span className="text-[#C84661]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Flat 14 Master Bathroom, Unit 8B Kitchen..."
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#493344] mb-1">
                      Floor Level <span className="text-[#C84661]">*</span>
                    </label>
                    <select
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      className="w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none cursor-pointer"
                    >
                      {floorOptions.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344] mb-2">
                    Diagnostic Inspection Zone
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {standardZones.map((zone) => {
                      const isSelected = inspectionZone === zone;
                      return (
                        <button
                          key={zone}
                          type="button"
                          onClick={() => setInspectionZone(zone)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#79566F] bg-[#EFE4EC] text-[#79566F] ring-1 ring-[#79566F]"
                              : "border-[#E6D5DC] text-[#493344] hover:bg-[#F7EDE5]"
                          }`}
                        >
                          <div className="font-bold text-xs">{zone}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344] mb-1">
                    Inspection Location Details
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Ceiling-to-gable wall junction behind extractor duct"
                    value={inspectionLocation}
                    onChange={(e) => setInspectionLocation(e.target.value)}
                    className="w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344] mb-1">
                    Optional Description &amp; Access Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Access via tenant hallway; radiator located on adjacent return wall..."
                    value={zoneDescription}
                    onChange={(e) => setZoneDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: UPLOAD INSPECTION PHOTOS */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Section Header */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#79566F]" />
                    <h2 className="text-lg font-bold text-[#493344]">
                      Upload Inspection Photos
                    </h2>
                  </div>
                  <p className="text-xs text-[#806C7B] mt-1">
                    Attach real diagnostic photographs for this inspection. You can select multiple images from your computer or capture with a connected camera.
                  </p>
                </div>

                {/* Hidden File Picker Input */}
                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handlePhotosSelected(e.target.files);
                  }}
                />

                {/* Validation Errors Display */}
                {photoErrors.length > 0 && (
                  <div className="p-3.5 bg-[#FDF2F4] border border-[#C84661]/30 rounded-2xl space-y-1.5 text-xs text-[#C84661]">
                    <div className="font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangleIcon size={14} />
                        <span>Validation Notice ({photoErrors.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPhotoErrors([])}
                        className="text-[11px] hover:underline cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {photoErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dropzone & Action Box */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) handlePhotosSelected(e.dataTransfer.files);
                  }}
                  className="border-2 border-dashed border-[#79566F]/40 hover:border-[#79566F] bg-[#F7EDE5]/50 hover:bg-[#F7EDE5] rounded-3xl p-6 sm:p-8 text-center transition-all"
                >
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#EFE4EC] text-[#79566F] mx-auto flex items-center justify-center shadow-xs">
                      <UploadCloudIcon size={24} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#493344]">
                        Choose Inspection Photos to Upload
                      </h3>
                      <p className="text-xs text-[#806C7B] mt-0.5">
                        Supports multiple files &bull; Allowed formats: <strong>JPG, JPEG, PNG, WEBP</strong> &bull; Max 20 MB each
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                      {/* Prominent "Choose Photos" button */}
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-[#79566F] text-white hover:bg-[#67475E] text-xs font-bold transition-all shadow-md shadow-[#79566F]/20 flex items-center gap-2 cursor-pointer"
                      >
                        <UploadCloudIcon size={15} />
                        <span>Choose Photos</span>
                      </button>

                      {/* Camera Capture Modal Trigger */}
                      <button
                        type="button"
                        onClick={() => setCameraModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-white border border-[#E6D5DC] hover:border-[#79566F] text-[#493344] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CameraIcon size={15} className="text-[#79566F]" />
                        <span>Capture with Camera</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Selected Photos Gallery / Previews */}
                {selectedPhotos.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E6D5DC]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#493344]">
                          Selected Photos ({selectedPhotos.length})
                        </span>
                        <span className="text-[10px] text-[#4A8B71] bg-[#EFF8F3] px-2 py-0.5 rounded-md font-bold border border-[#4A8B71]/30">
                          Ready for upload
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="inline-flex items-center gap-1 text-[11px] text-[#79566F] font-bold hover:underline cursor-pointer"
                      >
                        <PlusIcon size={13} />
                        <span>Add More Photos</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedPhotos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="rounded-2xl border border-[#E6D5DC] bg-white p-3 shadow-xs space-y-2.5 flex flex-col justify-between group"
                        >
                          <div className="space-y-2">
                            {/* Thumbnail preview */}
                            <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-900 border border-[#E6D5DC]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.previewUrl}
                                alt={photo.name}
                                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                              />
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono">
                                {index === 0
                                  ? "Photo #1: Primary (Ambient)"
                                  : index === 1
                                  ? "Photo #2: Flash / Specular"
                                  : `Photo #${index + 1}: Detail`}
                              </div>
                            </div>

                            {/* Filename and details */}
                            <div>
                              <div className="text-xs font-bold text-[#493344] truncate" title={photo.name}>
                                {photo.name}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-[#806C7B] mt-0.5">
                                <span className="font-mono">{photo.formattedSize}</span>
                                <span className="text-[10px] font-bold uppercase text-[#79566F] bg-[#EFE4EC] px-1.5 py-0.5 rounded">
                                  {photo.file.type.split("/")[1] || "PHOTO"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Remove button */}
                          <div className="pt-2 border-t border-[#E6D5DC] flex items-center justify-between">
                            <span className="text-[10px] text-[#806C7B]">
                              {index === 0 ? "Used for Moisture Heatmap" : "Stored in private bucket"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(photo.id)}
                              className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Remove this photograph"
                            >
                              <XIcon size={12} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional Acoustic Recording Section */}
                <div className="pt-4 border-t border-[#E6D5DC]">
                  <div className="rounded-2xl border border-[#E6D5DC] p-4 bg-[#F7EDE5]/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#493344] flex items-center gap-1.5">
                        <MicIcon size={14} className="text-[#79566F]" />
                        <span>Optional: Acoustic Pipe / Cavity Audio Recording</span>
                      </span>
                      {audioUrl && (
                        <span className="text-[10px] font-bold text-[#4A8B71] bg-[#EFF8F3] px-2 py-0.5 rounded-md border border-[#4A8B71]/30">
                          Audio Ready ({audioDuration}s)
                        </span>
                      )}
                    </div>

                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp3,audio/m4a,audio/webm,audio/ogg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAudioUpload(file);
                      }}
                    />

                    {audioUrl ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#E6D5DC]">
                        <audio controls className="h-8 flex-1" src={audioUrl}>
                          Your browser does not support audio playback.
                        </audio>
                        <button
                          type="button"
                          onClick={handleRemoveAudio}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 cursor-pointer transition-colors self-end sm:self-center"
                        >
                          Remove Audio
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {isRecording ? (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-4 py-2 rounded-xl bg-[#C84661] text-white text-xs font-bold flex items-center gap-2 cursor-pointer animate-pulse"
                          >
                            <div className="w-2 h-2 rounded-full bg-white" />
                            <span>Stop &amp; Save Recording ({recordingSeconds}s)</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={startRecording}
                              className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] hover:border-[#79566F] text-[#493344] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <MicIcon size={13} className="text-[#79566F]" />
                              <span>Record Audio</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => audioInputRef.current?.click()}
                              className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] hover:border-[#79566F] text-[#493344] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <UploadCloudIcon size={13} className="text-[#79566F]" />
                              <span>Upload Audio File</span>
                            </button>
                            <span className="text-[11px] text-[#806C7B]">
                              Supports WAV, MP3, M4A up to 50 MB
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {audioError && (
                      <p className="text-[11px] text-[#C84661] font-semibold">{audioError}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: RECORD SYMPTOMS */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#493344]">
                    Step 4 – Record Observable Symptoms &amp; Notes
                  </h2>
                  <p className="text-xs text-[#806C7B]">
                    Select all physical diagnostic indicators observed on-site during inspection
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {symptomOptions.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        className={`p-3.5 rounded-2xl border text-left font-semibold text-xs transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-[#79566F] bg-[#EFE4EC] text-[#79566F] ring-1 ring-[#79566F]"
                            : "border-[#E6D5DC] text-[#493344] hover:bg-[#F7EDE5]"
                        }`}
                      >
                        <span>{sym}</span>
                        {isSelected && <CheckCircleIcon size={14} className="text-[#79566F]" />}
                      </button>
                    );
                  })}
                </div>

                {selectedSymptoms.includes("Other observations") && (
                  <div>
                    <label className="block text-xs font-bold text-[#493344] mb-1">
                      Specify Other Observations
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Efflorescence salt deposit on baseboard, condensation on sash"
                      value={otherObservations}
                      onChange={(e) => setOtherObservations(e.target.value)}
                      className="w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#493344] mb-1">
                    Additional Surveyor Notes &amp; Environmental Factors
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter environmental conditions, heating operational status, tenant comments, ventilation observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-2xl border border-[#E6D5DC] p-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW AND SUBMIT */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#493344]">
                    Step 5 – Review &amp; Submit Inspection
                  </h2>
                  <p className="text-xs text-[#806C7B]">
                    Review all captured photos and technical metadata before committing to the database
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Property & Zone Summary */}
                  <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E6D5DC]">
                      <span className="text-xs font-bold text-[#493344]">Target Property</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-[11px] text-[#79566F] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#493344]">
                        {selectedProperty?.property_name || "Unknown"}
                      </div>
                      <div className="text-[11px] text-[#806C7B]">
                        {selectedProperty?.address}, {selectedProperty?.postal_code}
                      </div>
                      <div className="text-[11px] text-[#806C7B] mt-0.5">
                        Type: {selectedProperty?.building_type}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E6D5DC]">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-bold text-[#493344]">Inspection Zone</span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-[11px] text-[#79566F] hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="text-xs font-semibold text-[#493344]">{inspectionZone}</div>
                      <div className="text-[11px] text-[#806C7B]">
                        {floor} &bull; {roomName || "General Area"}
                      </div>
                      {inspectionLocation && (
                        <div className="text-[11px] text-[#806C7B] mt-0.5 italic">
                          Location: {inspectionLocation}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Evidence & Symptoms Summary */}
                  <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E6D5DC]">
                      <span className="text-xs font-bold text-[#493344]">Captured Evidence ({selectedPhotos.length} Photos)</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-[11px] text-[#79566F] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs max-h-36 overflow-y-auto pr-1">
                      {selectedPhotos.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between py-0.5">
                          <span className="text-[#806C7B] truncate max-w-[180px]">
                            #{idx + 1}: {p.name}
                          </span>
                          <span className="font-semibold text-[#4A8B71] shrink-0">
                            {p.formattedSize}
                          </span>
                        </div>
                      ))}
                      {audioFile && (
                        <div className="flex items-center justify-between py-0.5 border-t border-[#E6D5DC] pt-1">
                          <span className="text-[#806C7B] truncate max-w-[180px]">
                            Audio: {audioFile.name}
                          </span>
                          <span className="font-semibold text-[#4A8B71]">
                            {audioDuration > 0 ? `${audioDuration}s` : "Audio Scan"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#E6D5DC]">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-bold text-[#493344]">Reported Symptoms</span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(4)}
                          className="text-[11px] text-[#79566F] hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedSymptoms.length > 0 ? (
                          selectedSymptoms.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EFE4EC] text-[#79566F] border border-[#79566F]/20"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#806C7B]">No symptoms selected</span>
                        )}
                      </div>
                      {notes && (
                        <div className="text-[11px] text-[#806C7B] mt-2 italic bg-white p-2 rounded-xl border border-[#E6D5DC]">
                          &quot;{notes}&quot;
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selected Photos Thumbnail Preview Strip */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-[#493344] block">
                    Selected Photographs Ready for Storage Upload:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedPhotos.map((p, idx) => (
                      <div key={p.id} className="rounded-xl border border-[#E6D5DC] overflow-hidden bg-slate-900 relative h-28">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] truncate font-mono">
                          #{idx + 1} {p.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wizard Controls Footer */}
        {!createdInspectionId && (
          <div className="mt-8 pt-5 border-t border-[#E6D5DC] flex items-center justify-between">
            <button
              type="button"
              disabled={currentStep === 1 || isSubmitting}
              onClick={handleBack}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                currentStep === 1 || isSubmitting
                  ? "opacity-30 cursor-not-allowed text-[#806C7B]"
                  : "border border-[#E6D5DC] text-[#493344] hover:bg-[#F7EDE5]"
              }`}
            >
              &larr; Previous Step
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] shadow-md shadow-[#79566F]/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRightIcon size={12} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitInspection}
                className={`px-6 py-2.5 rounded-xl bg-[#4A8B71] hover:bg-[#1A8762] text-white text-xs font-bold shadow-md shadow-[#4A8B71]/20 flex items-center gap-2 transition-colors cursor-pointer ${
                  isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{submissionProgressText || "Uploading Photos & Submitting..."}</span>
                  </>
                ) : (
                  <>
                    <span>Submit Inspection Record ({selectedPhotos.length} Photos)</span>
                    <CheckCircleIcon size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Embedded Live Camera Modal */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        isFlashMode={false}
        title="Capture Inspection Photograph"
      />
    </div>
  );
}
