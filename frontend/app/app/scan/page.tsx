"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BuildingIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CameraIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "@/components/Icons";
import { apiClient } from "@/lib/apiClient";

interface ResolvedPropertyData {
  verified: boolean;
  property_id: string;
  property_name: string;
  address: string;
  postcode: string;
  uprn: string;
  building_type: string;
  last_inspection_date: string;
  last_inspection_id?: string;
  can_start_inspection: boolean;
  start_inspection_url: string;
}

export default function QRScanResolverPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenParam = searchParams.get("token") || "";

  const [inputToken, setInputToken] = useState(tokenParam);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedProperty, setResolvedProperty] = useState<ResolvedPropertyData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tokenParam) {
      handleResolve(tokenParam);
    }
  }, [tokenParam]);

  const handleResolve = async (tokenToUse?: string) => {
    const token = tokenToUse || inputToken;
    if (!token.trim()) {
      setErrorMessage("Please enter or scan a valid property QR identifier.");
      return;
    }

    setIsResolving(true);
    setErrorMessage(null);

    try {
      const data = await apiClient.post<ResolvedPropertyData>("/api/v1/qr/resolve", {
        token: token.trim(),
      });
      setResolvedProperty(data);
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          "Cryptographic verification failed. This QR code signature is invalid, expired, or access is unauthorized."
      );
      setResolvedProperty(null);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
          <Link href="/app/dashboard" className="hover:text-[#79566F]">
            Dashboard
          </Link>
          <span>/</span>
          <span>Field Tools</span>
          <span>/</span>
          <span>QR Inspection Scanner</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
          QR-Based Property Verification &amp; Inspection
        </h1>
        <p className="text-xs text-[#806C7B]">
          Instant cryptographic property authentication for field surveyors without exposing tenant records
        </p>
      </div>

      {/* QR Input Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EFE4EC] text-[#79566F] flex items-center justify-center">
            <CameraIcon size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#493344]">Scan or Enter QR Tag Identifier</h2>
            <p className="text-xs text-[#806C7B]">
              Scan the physical asset tag affixed to the property entrance or enter its secure token
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. PROP-0914.1730361234.8f9a2b..."
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-xl border border-[#E6D5DC] bg-[#F7EDE5]/40 focus:bg-white focus:outline-none focus:border-[#79566F] text-[#493344]"
          />
          <button
            onClick={() => handleResolve()}
            disabled={isResolving}
            className="px-4 py-2 bg-[#79566F] hover:bg-[#63445A] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCwIcon size={14} className={isResolving ? "animate-spin" : ""} />
            {isResolving ? "Verifying..." : "Verify"}
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[#FDF2F4] border border-[#C84661]/30 text-xs text-[#C84661] flex items-start gap-2">
            <AlertTriangleIcon size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Security Notice: </span>
              {errorMessage}
            </div>
          </div>
        )}
      </div>

      {/* Resolved Property Details Card */}
      {resolvedProperty && (
        <div className="p-6 rounded-2xl bg-white border border-[#4A8B71]/40 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF8F3] text-[#4A8B71] flex items-center justify-center">
                <ShieldCheckIcon size={22} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#4A8B71] uppercase tracking-wider">
                  Cryptographically Verified Unit
                </span>
                <h2 className="text-lg font-extrabold text-[#493344]">
                  {resolvedProperty.property_name}
                </h2>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/20">
              Access Authorized
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#F7EDE5]/50 border border-[#E6D5DC]">
              <span className="text-[10px] font-bold text-[#806C7B] uppercase">Postal Address</span>
              <div className="font-semibold text-[#493344] mt-0.5">
                {resolvedProperty.address}, {resolvedProperty.postcode}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F7EDE5]/50 border border-[#E6D5DC]">
              <span className="text-[10px] font-bold text-[#806C7B] uppercase">UPRN / Archetype</span>
              <div className="font-semibold text-[#493344] mt-0.5">
                {resolvedProperty.uprn || "UPRN Verified"} • {resolvedProperty.building_type}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F7EDE5]/50 border border-[#E6D5DC]">
              <span className="text-[10px] font-bold text-[#806C7B] uppercase">Last Physical Inspection</span>
              <div className="font-semibold text-[#493344] mt-0.5">
                {resolvedProperty.last_inspection_date}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F7EDE5]/50 border border-[#E6D5DC]">
              <span className="text-[10px] font-bold text-[#806C7B] uppercase">Surveyor Compliance</span>
              <div className="font-semibold text-[#4A8B71] mt-0.5">
                Active Physical Survey Permitted
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href={resolvedProperty.start_inspection_url}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#79566F] hover:bg-[#63445A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Start New Inspection for this Unit
              <ArrowRightIcon size={14} />
            </Link>

            <Link
              href={`/app/properties/${resolvedProperty.property_id}/twin`}
              className="inline-flex items-center justify-center gap-2 py-3 px-4 bg-white border border-[#E6D5DC] hover:bg-[#EFE4EC] text-[#493344] text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Open Digital Twin
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
