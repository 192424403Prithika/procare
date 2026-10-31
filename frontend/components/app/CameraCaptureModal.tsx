/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { CameraIcon, SparklesIcon, XIcon, CheckCircleIcon, RefreshCwIcon } from "@/components/Icons";

interface MediaTrackWithTorch extends MediaStreamTrack {
  applyConstraints(constraints?: MediaTrackConstraints & { advanced?: Array<{ torch?: boolean }> }): Promise<void>;
  getCapabilities(): MediaTrackCapabilities & { torch?: boolean };
}

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string, flashUsed: boolean) => void;
  title?: string;
  isFlashMode?: boolean;
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = "Capture Inspection Photo",
  isFlashMode = false,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [flashActuallyUsed, setFlashActuallyUsed] = useState<boolean>(false);

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  // Initialize camera
  const startCamera = async (mode: "environment" | "user") => {
    stopCamera();
    setErrorMessage(null);
    setCapturedBlob(null);
    setCapturedPreview(null);
    setTorchOn(false);
    setFlashActuallyUsed(false);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setHasPermission(true);

      // Check for torch capability on video track
      const track = stream.getVideoTracks()[0] as MediaTrackWithTorch | undefined;
      if (track) {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        const supportsTorch = Boolean(capabilities?.torch);
        setTorchSupported(supportsTorch);

        // If in flash mode and torch is supported, auto-engage torch
        if (isFlashMode && supportsTorch) {
          try {
            await track.applyConstraints({ advanced: [{ torch: true }] });
            setTorchOn(true);
            setFlashActuallyUsed(true);
          } catch {
            setTorchOn(false);
            setFlashActuallyUsed(false);
          }
        }
      }
    } catch (err: unknown) {
      console.warn("Camera start failed", err);
      setHasPermission(false);
      const name = (err as Error).name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setErrorMessage("Camera access was denied. Please allow camera permissions in your browser settings.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setErrorMessage("No camera hardware detected on this device.");
      } else {
        setErrorMessage("Unable to access camera. Please ensure no other application is using it.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facingMode]);

  // Toggle torch / flash
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0] as MediaTrackWithTorch | undefined;
    if (track && torchSupported) {
      try {
        const newState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: newState }] });
        setTorchOn(newState);
        setFlashActuallyUsed(newState);
      } catch (err) {
        console.warn("Failed to toggle torch", err);
      }
    }
  };

  // Flip front / rear camera
  const handleFlipCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  // Snap photo
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedPreview(url);
      },
      "image/jpeg",
      0.92
    );
  };

  // Retake photo
  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
  };

  // Confirm photo
  const handleConfirm = () => {
    if (!capturedBlob || !capturedPreview) return;
    const prefix = isFlashMode ? "flash" : "ambient";
    const filename = `${prefix}_camera_${Date.now()}.jpg`;
    const file = new File([capturedBlob], filename, { type: "image/jpeg" });
    onCapture(file, capturedPreview, flashActuallyUsed);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#493344] border border-[#E6D5DC] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isFlashMode ? "bg-[#B995AD]" : "bg-[#79566F]"}`}>
              {isFlashMode ? <SparklesIcon size={16} /> : <CameraIcon size={16} />}
            </div>
            <div>
              <h3 className="text-sm font-bold">{title}</h3>
              <p className="text-[11px] text-slate-400">
                {isFlashMode
                  ? "Flash Illumination Mode (Enable device torch or external light)"
                  : "Ambient Diffuse Lighting Mode"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Camera Viewport or Preview */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[340px] overflow-hidden">
          {errorMessage ? (
            <div className="p-6 text-center text-xs text-rose-400 max-w-sm space-y-2">
              <CameraIcon size={36} className="mx-auto opacity-50 mb-2" />
              <div className="font-bold text-white text-sm">Camera Unavailable</div>
              <div>{errorMessage}</div>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : capturedPreview ? (
            /* Captured Frame Preview */
            <div className="relative w-full h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedPreview}
                alt="Captured Preview"
                className="max-h-[55vh] w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-mono text-[#4A8B71] border border-white/10 flex items-center gap-1.5">
                <CheckCircleIcon size={12} />
                <span>PHOTO CAPTURED</span>
              </div>
            </div>
          ) : (
            /* Live Stream */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="max-h-[55vh] w-full object-cover"
              />

              {/* Status overlay badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                <span className="bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-mono text-cyan-400 border border-white/10 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>LIVE ({facingMode === "environment" ? "REAR" : "FRONT"})</span>
                </span>

                {isFlashMode && (
                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono border ${
                      torchOn
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-black/70 text-slate-400 border-white/10"
                    }`}
                  >
                    {torchSupported
                      ? torchOn
                        ? "⚡ TORCH ACTIVE"
                        : "⚡ TORCH READY"
                      : "TORCH NOT SUPPORTED"}
                  </span>
                )}
              </div>

              {/* Flash unavailability explanation */}
              {isFlashMode && !torchSupported && (
                <div className="absolute bottom-3 inset-x-3 bg-black/80 backdrop-blur-xs p-2 rounded-xl text-[10px] text-amber-200 border border-amber-500/30 text-center">
                  Hardware torch not supported by this browser/camera. Please illuminate the subject with device flash or an external flashlight.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Controls Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0B1120] flex items-center justify-between gap-3 text-xs">
          {capturedPreview ? (
            /* Actions after capturing */
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCwIcon size={14} />
                <span>Retake Photo</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2.5 rounded-xl bg-[#4A8B71] hover:bg-[#1A8762] text-white font-bold transition-colors flex items-center gap-2 shadow-md shadow-[#4A8B71]/20 cursor-pointer"
              >
                <CheckCircleIcon size={14} />
                <span>Use This Photo</span>
              </button>
            </>
          ) : (
            /* Live camera controls */
            <>
              <div className="flex items-center gap-2">
                {/* Switch Camera Button */}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Switch Front / Rear Camera"
                >
                  <RefreshCwIcon size={13} />
                  <span className="hidden sm:inline">Flip Camera</span>
                </button>

                {/* Torch toggle button (if supported) */}
                {torchSupported && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`px-3 py-2 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      torchOn
                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    <span>⚡</span>
                    <span className="hidden sm:inline">{torchOn ? "Torch On" : "Torch Off"}</span>
                  </button>
                )}
              </div>

              {/* Shutter Button */}
              <button
                type="button"
                disabled={!hasPermission}
                onClick={handleCapture}
                className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-200 text-[#493344] font-extrabold shadow-lg transition-transform active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-pulse" />
                <span>Capture Photo</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
