"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  SparklesIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  WrenchIcon,
  DropletIcon,
  AcousticIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  BuildingIcon,
  XIcon,
} from "@/components/Icons";
import { apiClient } from "@/lib/apiClient";
import { fetchInspections, InspectionReport } from "@/lib/services/inspectionService";
import { fetchContractors, ContractorProfile } from "@/lib/services/contractorService";

interface MaintenanceRecommendation {
  id: string;
  inspection_id: string;
  property_id: string;
  property_name: string;
  room: string;
  issue_title: string;
  supporting_evidence: string;
  risk_level: "critical" | "high" | "moderate" | "low";
  urgency: string;
  statutory_deadline_hours: number;
  recommended_action: string;
  suggested_trade: string;
  estimated_cost_guide: number;
  status: "pending" | "approved" | "rejected" | "converted_to_work_order";
  disclaimer: string;
  work_order_id?: string;
  work_order_number?: string;
  approved_by?: string;
}

export default function MaintenanceAssistantPage() {
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>("");
  const [recommendations, setRecommendations] = useState<MaintenanceRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Conversion Modal state
  const [convertingRec, setConvertingRec] = useState<MaintenanceRecommendation | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<string>("");
  const [overrideCost, setOverrideCost] = useState<number>(350);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [inspList, contList] = await Promise.all([
          fetchInspections(),
          fetchContractors(),
        ]);
        setInspections(inspList);
        setContractors(contList);
        if (inspList.length > 0) {
          setSelectedInspectionId(inspList[0].id);
          loadRecommendationsForInspection(inspList[0].id);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.warn("Failed to load initial assistant data:", err);
        setIsLoading(false);
      }
    }
    loadInitial();
  }, []);

  const loadRecommendationsForInspection = async (inspId: string) => {
    setIsLoading(true);
    setSuccessMessage(null);
    try {
      const recs = await apiClient.get<MaintenanceRecommendation[]>(
        `/api/v1/recommendations/inspection/${inspId}`
      );
      setRecommendations(recs || []);
    } catch (err) {
      console.warn("Error fetching recommendations:", err);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectInspection = (inspId: string) => {
    setSelectedInspectionId(inspId);
    loadRecommendationsForInspection(inspId);
  };

  const handleApprove = async (recId: string) => {
    setIsProcessing(true);
    try {
      await apiClient.post(`/api/v1/recommendations/${recId}/approve`, { notes: "Approved by manager" });
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, status: "approved" } : r))
      );
      setSuccessMessage("Recommendation approved successfully.");
    } catch (err) {
      console.warn("Failed to approve recommendation:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (recId: string) => {
    setIsProcessing(true);
    try {
      await apiClient.post(`/api/v1/recommendations/${recId}/reject`, { notes: "Dismissed by manager review" });
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, status: "rejected" } : r))
      );
      setSuccessMessage("Recommendation rejected.");
    } catch (err) {
      console.warn("Failed to reject recommendation:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenConvertModal = (rec: MaintenanceRecommendation) => {
    setConvertingRec(rec);
    setOverrideCost(rec.estimated_cost_guide || 350);
    // Find matching contractor for suggested trade
    const matched = contractors.find((c) =>
      c.trade.toLowerCase().includes(rec.suggested_trade.toLowerCase())
    );
    if (matched) setSelectedContractorId(matched.id);
    else if (contractors.length > 0) setSelectedContractorId(contractors[0].id);
  };

  const handleConfirmConvert = async () => {
    if (!convertingRec) return;
    setIsProcessing(true);

    const cont = contractors.find((c) => c.id === selectedContractorId);

    try {
      const wo: any = await apiClient.post(
        `/api/v1/recommendations/${convertingRec.id}/convert-work-order`,
        {
          assigned_contractor_id: selectedContractorId || undefined,
          assigned_contractor_name: cont?.company_name || undefined,
          estimated_cost: overrideCost,
        }
      );

      setRecommendations((prev) =>
        prev.map((r) =>
          r.id === convertingRec.id
            ? {
                ...r,
                status: "converted_to_work_order",
                work_order_id: wo.id,
                work_order_number: wo.order_number,
              }
            : r
        )
      );

      setSuccessMessage(
        `Recommendation converted into official work order ${wo.order_number}!`
      );
      setConvertingRec(null);
    } catch (err: any) {
      console.warn("Failed to convert recommendation to work order:", err);
    } finally {
      setIsProcessing(false);
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
            <span>Predictive Intelligence</span>
            <span>/</span>
            <span>AI Maintenance Assistant</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            AI Maintenance Recommendation Assistant
          </h1>
          <p className="text-xs text-[#806C7B]">
            Multi-modal evidence synthesis, explainable next actions, and manager work-order conversion workflow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#806C7B]">Inspection:</label>
          <select
            value={selectedInspectionId}
            onChange={(e) => handleSelectInspection(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F] shadow-xs"
          >
            {inspections.map((i) => (
              <option key={i.id} value={i.id}>
                {i.property_name} ({i.inspection_date}) - {i.room}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statutory Disclaimer */}
      <div className="p-3.5 rounded-xl bg-[#EFF8F3] border border-[#4A8B71]/30 text-xs text-[#285A44] flex items-start gap-2.5">
        <SparklesIcon size={16} className="text-[#4A8B71] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Explainable Remedial Basis: </span>
          Recommendations synthesize moisture sensor readings, acoustic FFT resonance, optical surface analysis, and Open-Meteo weather dew-point margins.
          AI recommendations never confirm hidden structural flaws without on-site physical surveyor verification.
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-[#EFF8F3] border border-[#4A8B71]/40 text-xs text-[#4A8B71] font-semibold flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Recommendations Feed */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-[#806C7B] bg-white rounded-2xl border border-[#E6D5DC]">
          <div className="w-8 h-8 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Synthesizing multi-modal telemetry into remedial recommendations...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="p-16 text-center text-xs text-[#806C7B] bg-white rounded-2xl border border-[#E6D5DC]">
          No recommendations found for this inspection.
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const riskBadge =
              rec.risk_level === "critical"
                ? "bg-[#FDF2F4] text-[#C84661] border-[#C84661]/30"
                : rec.risk_level === "high"
                ? "bg-[#FDF5ED] text-[#B86B35] border-[#B86B35]/30"
                : rec.risk_level === "moderate"
                ? "bg-[#FEF9E7] text-[#8C6D1F] border-[#8C6D1F]/30"
                : "bg-[#EFF8F3] text-[#4A8B71] border-[#4A8B71]/30";

            const statusBadge =
              rec.status === "converted_to_work_order"
                ? "bg-[#4A8B71] text-white"
                : rec.status === "approved"
                ? "bg-[#79566F] text-white"
                : rec.status === "rejected"
                ? "bg-[#806C7B] text-white"
                : "bg-[#F7EDE5] text-[#493344] border border-[#E6D5DC]";

            return (
              <div
                key={rec.id}
                className="p-6 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${riskBadge}`}>
                        {rec.risk_level.toUpperCase()} RISK
                      </span>
                      <span className="text-xs font-semibold text-[#806C7B]">
                        {rec.property_name} • {rec.room}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusBadge}`}>
                        {rec.status === "converted_to_work_order"
                          ? `Work Order Dispatched (${rec.work_order_number || "Active"})`
                          : rec.status.toUpperCase()}
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-[#493344]">{rec.issue_title}</h2>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-[#806C7B] block">Statutory Window</span>
                    <span className="text-xs font-extrabold text-[#C84661]">{rec.urgency}</span>
                  </div>
                </div>

                {/* Evidence Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F7EDE5]/50 border border-[#E6D5DC] space-y-1">
                    <span className="text-[10px] font-bold text-[#806C7B] uppercase tracking-wider block">
                      Diagnostic Evidence Basis
                    </span>
                    <p className="text-[#493344]">{rec.supporting_evidence}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#EFF8F3] border border-[#4A8B71]/20 space-y-1">
                    <span className="text-[10px] font-bold text-[#4A8B71] uppercase tracking-wider block">
                      Recommended Remedial Action
                    </span>
                    <p className="text-[#285A44] font-medium">{rec.recommended_action}</p>
                  </div>
                </div>

                {/* Trade & Cost Specs */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6D5DC] text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[11px] text-[#806C7B]">Specialist Trade: </span>
                      <span className="font-bold text-[#493344]">{rec.suggested_trade}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#806C7B]">Guide Estimate: </span>
                      <span className="font-bold text-[#79566F]">
                        £{rec.estimated_cost_guide.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Manager Action Buttons */}
                  <div className="flex items-center gap-2">
                    {rec.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleReject(rec.id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-xl border border-[#E6D5DC] text-[#806C7B] hover:text-[#C84661] hover:bg-[#FDF2F4] text-xs font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(rec.id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-xl bg-[#79566F] hover:bg-[#63445A] text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Approve Action
                        </button>
                      </>
                    )}

                    {rec.status === "approved" && (
                      <button
                        onClick={() => handleOpenConvertModal(rec)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#4A8B71] hover:bg-[#3d735d] text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <WrenchIcon size={14} />
                        Convert to Work Order
                      </button>
                    )}

                    {rec.status === "converted_to_work_order" && (
                      <Link
                        href="/app/work-orders"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#4A8B71] hover:underline"
                      >
                        View in Work Orders
                        <ArrowRightIcon size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Convert to Work Order Modal */}
      {convertingRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E6D5DC] shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E6D5DC] pb-3">
              <h3 className="text-base font-extrabold text-[#493344]">
                Convert Recommendation to Work Order
              </h3>
              <button
                onClick={() => setConvertingRec(null)}
                className="text-[#806C7B] hover:text-[#493344]"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-[#493344] block">Remediation Scope:</span>
                <p className="text-[#806C7B] mt-0.5">{convertingRec.issue_title}</p>
              </div>

              <div>
                <label className="font-bold text-[#493344] block mb-1">
                  Assign Contractor ({convertingRec.suggested_trade})
                </label>
                <select
                  value={selectedContractorId}
                  onChange={(e) => setSelectedContractorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
                >
                  <option value="">Dispatch to Tender / Contractor Queue</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} - {c.trade} ({c.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#493344] block mb-1">
                  Budget Authorization Amount (£)
                </label>
                <input
                  type="number"
                  value={overrideCost}
                  onChange={(e) => setOverrideCost(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#FDF2F4] border border-[#C84661]/20 text-[11px] text-[#C84661]">
                <span className="font-bold">Awaab's Law Compliance: </span>
                Statutory deadline will be automatically timestamped for {convertingRec.urgency}.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E6D5DC]">
              <button
                onClick={() => setConvertingRec(null)}
                className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#806C7B] hover:bg-[#F7EDE5]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmConvert}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-[#4A8B71] hover:bg-[#3d735d] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {isProcessing ? "Creating Work Order..." : "Confirm & Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
