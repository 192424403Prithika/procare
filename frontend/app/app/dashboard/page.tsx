"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BuildingIcon,
  FileCheckIcon,
  AlertTriangleIcon,
  WrenchIcon,
  ClockIcon,
  ArrowRightIcon,
  DropletIcon,
  AcousticIcon,
  CloudRainIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  CpuIcon,
  SettingsIcon,
  CheckCircleIcon,
  UploadCloudIcon,
  CameraIcon,
  XIcon,
} from "@/components/Icons";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";
import { fetchInspections, InspectionReport } from "@/lib/services/inspectionService";
import { fetchWorkOrders, updateWorkOrderStatus, WorkOrderRecord } from "@/lib/services/workOrderService";
import { fetchContractors, ContractorRecord } from "@/lib/services/contractorService";
import { useRole } from "@/components/app/RoleContext";
import dynamic from "next/dynamic";

const PortfolioInspectionTrendChart = dynamic(
  () => import("@/components/app/DashboardCharts").then((m) => m.PortfolioInspectionTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-[#F7EDE5]/40 rounded-xl animate-pulse text-xs text-[#806C7B]">
        Rendering telemetry...
      </div>
    ),
  }
);

const PortfolioRiskPieChart = dynamic(
  () => import("@/components/app/DashboardCharts").then((m) => m.PortfolioRiskPieChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-[#F7EDE5]/40 rounded-xl animate-pulse text-xs text-[#806C7B]">
        Rendering risk distribution...
      </div>
    ),
  }
);

export default function DashboardPage() {
  const { role, profile, actualRole } = useRole();
  const [mounted, setMounted] = useState(false);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [contractors, setContractors] = useState<ContractorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Evidence upload modal state for Contractor
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderRecord | null>(null);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceFileName, setEvidenceFileName] = useState("");
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceSuccess, setEvidenceSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [props, insps, wos, conts] = await Promise.all([
          fetchProperties({
            role,
            userId: profile.id,
            organization: profile.organization,
          }),
          fetchInspections(role === "inspector" ? "inspector" : undefined, profile.id),
          fetchWorkOrders({
            userRole: role,
            contractorName: profile.organization || profile.name,
            contractorId: profile.id,
            organization: profile.organization,
          }),
          fetchContractors(),
        ]);
        setProperties(props);
        setInspections(insps);
        setWorkOrders(wos);
        setContractors(conts);
      } catch (err) {
        console.warn("Failed to load dashboard metrics", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [role, profile.id, profile.organization, profile.name]);

  // Handle contractor evidence submission
  const handleEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkOrder) return;
    setIsSubmittingEvidence(true);
    try {
      const evidenceText = `Evidence submitted by ${profile.name}: ${evidenceNote || "Field remediation photo and moisture readings verified"}${evidenceFileName ? ` [File: ${evidenceFileName}]` : ""}`;
      const updated = await updateWorkOrderStatus(selectedWorkOrder.id, "Awaiting Signoff", evidenceText);
      setWorkOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setEvidenceSuccess(true);
      setTimeout(() => {
        setEvidenceSuccess(false);
        setSelectedWorkOrder(null);
        setEvidenceNote("");
        setEvidenceFileName("");
      }, 1500);
    } catch (err) {
      console.error("Evidence update failed:", err);
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Quick status toggle for contractor
  const handleQuickStatusChange = async (woId: string, nextStatus: WorkOrderRecord["status"]) => {
    try {
      const updated = await updateWorkOrderStatus(woId, nextStatus);
      setWorkOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  // Dynamic Risk Distribution Data computed from real properties
  const criticalCount = properties.filter((p) => p.risk_level === "critical").length;
  const highCount = properties.filter((p) => p.risk_level === "high").length;
  const moderateCount = properties.filter((p) => p.risk_level === "moderate").length;
  const lowCount = properties.filter((p) => p.risk_level === "low").length;

  const riskDistributionData = [
    { name: "Critical Risk", count: criticalCount, color: "#C84661" },
    { name: "High Risk", count: highCount, color: "#B86B35" },
    { name: "Moderate Risk", count: moderateCount, color: "#B995AD" },
    { name: "Low Risk", count: lowCount, color: "#4A8B71" },
  ];

  const trendData = [
    { month: "May", inspections: 18, anomalies: 5, workOrders: 4 },
    { month: "Jun", inspections: 24, anomalies: 7, workOrders: 6 },
    { month: "Jul", inspections: 31, anomalies: 8, workOrders: 7 },
    { month: "Aug", inspections: 29, anomalies: 6, workOrders: 5 },
    { month: "Sep", inspections: 38, anomalies: 12, workOrders: 9 },
    { month: "Oct", inspections: 46, anomalies: 15, workOrders: 12 },
  ];

  // Specific filtered counts
  const pendingContractors = contractors.filter((c) => c.verification_status === "Pending Verification");
  const approvedContractors = contractors.filter((c) => c.verification_status === "Approved");
  const emergencyWorkOrders = workOrders.filter((w) => w.priority === "Emergency 24h" && w.status !== "Completed");
  const urgentWorkOrders = workOrders.filter((w) => w.priority === "Urgent 7d" && w.status !== "Completed");

  return (
    <div className="space-y-6">
      {/* 1. ROLE-SPECIFIC WELCOME & BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFE4EC] text-[#79566F] border border-[#79566F]/20">
              <SparklesIcon size={12} />
              <span>
                {role === "admin"
                  ? "Platform Administration & System Governance"
                  : role === "manager"
                  ? "Social Housing Portfolio Command"
                  : role === "inspector"
                  ? "Building Diagnostic & Pathology Field Station"
                  : "Contractor Remediation & SLA Dispatch"}
              </span>
            </span>
            <span className="text-[10px] text-[#806C7B] font-medium">
              {role === "admin"
                ? "Full Infrastructure & RLS Access"
                : `${profile.organization || "PropCare NW Partner"}`}
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-extrabold text-[#493344] tracking-tight">
            Welcome back, {profile.name}
          </h1>
          <p className="text-xs text-[#806C7B] mt-0.5">
            Role:{" "}
            <span className="font-semibold text-[#493344] capitalize">
              {role === "manager"
                ? "Property Manager"
                : role === "inspector"
                ? "Field Inspector"
                : role === "contractor"
                ? "Remediation Contractor"
                : "System Administrator"}
            </span>{" "}
            &bull; {profile.title}
          </p>
        </div>

        {/* Action Buttons tailored by role */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {role === "admin" && (
            <>
              <Link
                href="/app/settings"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#79566F] text-white text-xs font-semibold shadow-xs hover:bg-[#67475E] transition-all cursor-pointer"
              >
                <SettingsIcon size={14} />
                <span>System Settings</span>
              </Link>
              <Link
                href="/app/contractors"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F7EDE5] border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#EFE4EC] transition-all cursor-pointer"
              >
                <UsersIcon size={14} />
                <span>Contractor Network ({pendingContractors.length} Pending)</span>
              </Link>
            </>
          )}

          {role === "manager" && (
            <>
              <Link
                href="/app/work-orders"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#79566F] text-white text-xs font-semibold shadow-xs hover:bg-[#67475E] transition-all cursor-pointer"
              >
                <WrenchIcon size={14} />
                <span>Manage Work Orders</span>
              </Link>
              <Link
                href="/app/reports"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F7EDE5] border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#EFE4EC] transition-all cursor-pointer"
              >
                <span>Export Audit Pack</span>
              </Link>
            </>
          )}

          {role === "inspector" && (
            <>
              <Link
                href="/app/inspections/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#79566F] text-white text-xs font-semibold shadow-md shadow-[#79566F]/20 hover:bg-[#67475E] transition-all cursor-pointer"
              >
                <CameraIcon size={14} />
                <span>Start New Field Survey</span>
              </Link>
              <Link
                href="/app/multi-defect"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F7EDE5] border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#EFE4EC] transition-all cursor-pointer"
              >
                <SparklesIcon size={14} />
                <span>Cross-Modal Triage</span>
              </Link>
            </>
          )}

          {role === "contractor" && (
            <>
              <Link
                href="/app/deadlines"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#B86B35] text-white text-xs font-semibold shadow-xs hover:bg-[#9e5a2b] transition-all cursor-pointer"
              >
                <ClockIcon size={14} />
                <span>Statutory SLA Timers</span>
              </Link>
              <Link
                href="/app/work-orders"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F7EDE5] border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#EFE4EC] transition-all cursor-pointer"
              >
                <WrenchIcon size={14} />
                <span>My Active Jobs ({workOrders.filter((w) => w.status !== "Completed").length})</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 2. ROLE-SPECIFIC 4 SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {role === "admin" && (
          <>
            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Total Properties</span>
                <div className="w-9 h-9 rounded-xl bg-[#EFE4EC] text-[#79566F] flex items-center justify-center">
                  <BuildingIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">{properties.length}</span>
                <span className="text-[11px] font-semibold text-[#4A8B71]">All Portfolios</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Unrestricted system-wide registry</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">All Work Orders</span>
                <div className="w-9 h-9 rounded-xl bg-[#EDFBFB] text-[#B995AD] flex items-center justify-center">
                  <WrenchIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">{workOrders.length}</span>
                <span className="text-[11px] font-semibold text-[#B86B35]">
                  {workOrders.filter((w) => w.priority.includes("Emergency")).length} Emergency
                </span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Active &amp; completed remediation jobs</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Total Inspections</span>
                <div className="w-9 h-9 rounded-xl bg-[#EFE4EC] text-[#79566F] flex items-center justify-center">
                  <FileCheckIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">{inspections.length}</span>
                <span className="text-[11px] font-semibold text-[#4A8B71]">Multi-Modal Audits</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Optical, acoustic &amp; weather records</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Contractor Network</span>
                <div className="w-9 h-9 rounded-xl bg-[#FDF5ED] text-[#B86B35] flex items-center justify-center">
                  <UsersIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">{approvedContractors.length}</span>
                <span className="text-[11px] font-semibold text-[#B86B35]">
                  {pendingContractors.length} Pending Review
                </span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Accredited trade partner network</div>
            </div>
          </>
        )}

        {role === "manager" && (
          <>
            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Managed Portfolio</span>
                <div className="w-9 h-9 rounded-xl bg-[#EFE4EC] text-[#79566F] flex items-center justify-center">
                  <BuildingIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">{properties.length}</span>
                <span className="text-[11px] font-semibold text-[#4A8B71]">Authorized Units</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">{profile.organization}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Pending Surveys</span>
                <div className="w-9 h-9 rounded-xl bg-[#EFE4EC] text-[#B995AD] flex items-center justify-center">
                  <FileCheckIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">
                  {inspections.filter((i) => i.status === "Pending Review" || i.status === "Requires Review").length}
                </span>
                <span className="text-[11px] font-semibold text-[#B86B35]">Awaiting Signoff</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Field diagnostic submissions</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#C84661]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">High / Critical Risk</span>
                <div className="w-9 h-9 rounded-xl bg-[#FDF2F4] text-[#C84661] flex items-center justify-center">
                  <AlertTriangleIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#C84661]">{criticalCount + highCount}</span>
                <span className="text-[11px] font-semibold text-[#C84661]">Priority Attention</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Awaab&apos;s Law severe damp flags</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#B995AD]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Open Work Orders</span>
                <div className="w-9 h-9 rounded-xl bg-[#EDFBFB] text-[#B995AD] flex items-center justify-center">
                  <WrenchIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">
                  {workOrders.filter((w) => w.status !== "Completed").length}
                </span>
                <span className="text-[11px] font-semibold text-[#4A8B71]">
                  {workOrders.filter((w) => w.status === "In Progress").length} Active
                </span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Contractors actively deployed</div>
            </div>
          </>
        )}

        {role === "inspector" && (
          <>
            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">My Assigned Surveys</span>
                <div className="w-9 h-9 rounded-xl bg-[#EFE4EC] text-[#79566F] flex items-center justify-center">
                  <FileCheckIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">{inspections.length}</span>
                <span className="text-[11px] font-semibold text-[#4A8B71]">Assigned Audits</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Registered under {profile.name}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Pending Field Reviews</span>
                <div className="w-9 h-9 rounded-xl bg-[#FDF5ED] text-[#B86B35] flex items-center justify-center">
                  <ClockIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">
                  {inspections.filter((i) => i.status === "Pending Review" || i.status === "Requires Review").length}
                </span>
                <span className="text-[11px] font-semibold text-[#B86B35]">Action Required</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Awaiting sensor corroboration</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#C84661]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Moisture Anomalies</span>
                <div className="w-9 h-9 rounded-xl bg-[#FDF2F4] text-[#C84661] flex items-center justify-center">
                  <DropletIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#C84661]">
                  {inspections.filter((i) => (i.ambient_moisture_index || 0) > 60).length}
                </span>
                <span className="text-[11px] font-semibold text-[#C84661]">Specular Sheen &gt; 60%</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">OpenCV computer vision anomalies</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Acoustic Leak Peaks</span>
                <div className="w-9 h-9 rounded-xl bg-[#EFE4EC] text-[#B995AD] flex items-center justify-center">
                  <AcousticIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">
                  {inspections.filter((i) => Boolean(i.acoustic_leak_frequency_hz)).length}
                </span>
                <span className="text-[11px] font-semibold text-[#4A8B71]">Resonant Leaks</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">SciPy FFT frequency verified</div>
            </div>
          </>
        )}

        {role === "contractor" && (
          <>
            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">My Assigned Jobs</span>
                <div className="w-9 h-9 rounded-xl bg-[#EDFBFB] text-[#79566F] flex items-center justify-center">
                  <WrenchIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#493344]">{workOrders.length}</span>
                <span className="text-[11px] font-semibold text-[#4A8B71]">Assigned Work Orders</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">{profile.organization}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#C84661]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Emergency 24h SLAs</span>
                <div className="w-9 h-9 rounded-xl bg-[#FDF2F4] text-[#C84661] flex items-center justify-center">
                  <ClockIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#C84661]">{emergencyWorkOrders.length}</span>
                <span className="text-[11px] font-semibold text-[#C84661]">24h Awaab&apos;s Law</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Immediate response statutory clock</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#B86B35]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Urgent 7d SLAs</span>
                <div className="w-9 h-9 rounded-xl bg-[#FDF5ED] text-[#B86B35] flex items-center justify-center">
                  <AlertTriangleIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#B86B35]">{urgentWorkOrders.length}</span>
                <span className="text-[11px] font-semibold text-[#B86B35]">7d Mandatory</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Remediation start deadline</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs hover:border-[#4A8B71]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">Completed / Signoff</span>
                <div className="w-9 h-9 rounded-xl bg-[#EFF8F3] text-[#4A8B71] flex items-center justify-center">
                  <CheckCircleIcon size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#4A8B71]">
                  {workOrders.filter((w) => w.status === "Completed" || w.status === "Awaiting Signoff").length}
                </span>
                <span className="text-[11px] font-semibold text-[#4A8B71]">Ready for Audit</span>
              </div>
              <div className="mt-2 text-[11px] text-[#806C7B]">Evidence uploaded on file</div>
            </div>
          </>
        )}
      </div>

      {/* 3. ROLE-SPECIFIC MAIN CONTENT PANELS */}

      {/* --- ADMIN DASHBOARD MAIN CONTENT --- */}
      {role === "admin" && (
        <div className="space-y-6">
          {/* Analytical Pipelines & Infrastructure Status Card */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E6D5DC] mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#79566F] text-white">
                  <CpuIcon size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#493344]">
                    System Analytical Pipelines &amp; RLS Infrastructure
                  </h2>
                  <p className="text-xs text-[#806C7B]">
                    Platform health, Row Level Security boundary enforcement, and multi-modal algorithms
                  </p>
                </div>
              </div>
              <Link
                href="/app/settings"
                className="px-3.5 py-1.5 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#79566F] hover:bg-[#F7EDE5]"
              >
                Configure Calibration &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[#493344]">OpenCV Vision Pipeline</span>
                  <span className="text-[10px] font-bold text-[#4A8B71] px-1.5 py-0.5 rounded bg-white">ONLINE</span>
                </div>
                <div className="text-xs text-[#806C7B]">Specular Threshold: 68/100</div>
                <div className="text-[10px] text-[#806C7B] mt-1 font-mono">FastAPI /api/analyze-image</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[#493344]">SciPy FFT Acoustic Engine</span>
                  <span className="text-[10px] font-bold text-[#4A8B71] px-1.5 py-0.5 rounded bg-white">ONLINE</span>
                </div>
                <div className="text-xs text-[#806C7B]">Band: 900 Hz – 1500 Hz</div>
                <div className="text-[10px] text-[#806C7B] mt-1 font-mono">FastAPI /api/analyze-audio</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[#493344]">Open-Meteo Weather API</span>
                  <span className="text-[10px] font-bold text-[#4A8B71] px-1.5 py-0.5 rounded bg-white">LIVE</span>
                </div>
                <div className="text-xs text-[#806C7B]">Dew Point: Magnus Equation</div>
                <div className="text-[10px] text-[#806C7B] mt-1 font-mono">api.open-meteo.com/v1/forecast</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[#493344]">PostgreSQL Row Security</span>
                  <span className="text-[10px] font-bold text-[#79566F] px-1.5 py-0.5 rounded bg-white">STRICT RLS</span>
                </div>
                <div className="text-xs text-[#806C7B]">4 Operational Roles Enforced</div>
                <div className="text-[10px] text-[#806C7B] mt-1 font-mono">20261031_strict_rbac.sql</div>
              </div>
            </div>
          </div>

          {/* Pending Contractor Registrations & Role Management Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#493344]">Contractor Verification Queue</h2>
                  <p className="text-xs text-[#806C7B]">Pending administrative accreditation approvals</p>
                </div>
                <Link href="/app/contractors" className="text-xs font-semibold text-[#79566F] hover:underline">
                  View All &rarr;
                </Link>
              </div>

              {pendingContractors.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#806C7B] bg-[#EFF8F3] rounded-2xl border border-[#4A8B71]/20">
                  <CheckCircleIcon size={22} className="mx-auto text-[#4A8B71] mb-1.5" />
                  <p className="font-bold text-[#493344]">No pending contractor registrations.</p>
                  <p className="text-[11px] text-[#806C7B] mt-0.5">All contractor accreditations have been audited.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingContractors.slice(0, 3).map((c) => (
                    <div key={c.id} className="p-3.5 rounded-2xl bg-[#FDF5ED] border border-[#B86B35]/30 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs text-[#493344]">{c.company_name}</div>
                        <div className="text-[11px] text-[#806C7B]">{c.trade} &bull; {c.location}</div>
                        <div className="text-[10px] text-[#B86B35] mt-0.5 font-semibold">Accreditation: {c.accreditation_details}</div>
                      </div>
                      <Link
                        href="/app/contractors"
                        className="px-3 py-1.5 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-colors shrink-0"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#493344]">Role Allocation &amp; Access Controls</h2>
                  <p className="text-xs text-[#806C7B]">Active personas and security boundaries</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#79566F]">RBAC Active</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#79566F]" />
                    <span className="font-bold text-[#493344]">Platform Admin (Dr. Alexander Wright)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#79566F] bg-white px-2 py-0.5 rounded border border-[#E6D5DC]">Full Access</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B995AD]" />
                    <span className="font-bold text-[#493344]">Property Manager (Eleanor Vance)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#806C7B] bg-white px-2 py-0.5 rounded border border-[#E6D5DC]">Portfolio Scoped</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4A8B71]" />
                    <span className="font-bold text-[#493344]">Field Inspector (Markus Thorne, MRICS)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#4A8B71] bg-white px-2 py-0.5 rounded border border-[#E6D5DC]">Assigned Only</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B86B35]" />
                    <span className="font-bold text-[#493344]">Remediation Contractor (David Jenkins)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#B86B35] bg-white px-2 py-0.5 rounded border border-[#E6D5DC]">Work Orders Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MANAGER DASHBOARD MAIN CONTENT --- */}
      {role === "manager" && (
        <div className="space-y-6">
          {/* Statutory Compliance Countdown (Awaab's Law) */}
          <div className="bg-linear-to-r from-[#79566F] to-[#67475E] rounded-3xl p-5 sm:p-6 text-white border border-[#E6D5DC] shadow-md">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B86B35] text-white">
                    Statutory Compliance
                  </span>
                  <span className="text-xs text-white/85">
                    UK Social Housing (Regulation) Act &amp; Awaab&apos;s Law
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  24-Hour Emergency SLAs &bull; Active Countdowns
                </h2>
                <p className="text-xs text-white/85 max-w-2xl">
                  Mandatory statutory investigation timelines for severe damp hazards. Correlate multi-modal evidence to protect tenants and automate compliance packs.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex-1 lg:flex-initial text-center min-w-[130px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/85">Trinity Court</div>
                  <div className="text-xl font-black text-[#B86B35] mt-0.5">18h 12m</div>
                  <div className="text-[9px] text-white/85">24h SLA remaining</div>
                </div>

                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex-1 lg:flex-initial text-center min-w-[130px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/85">Pendleton Tower</div>
                  <div className="text-xl font-black text-[#B86B35] mt-0.5">21h 45m</div>
                  <div className="text-[9px] text-white/85">24h SLA remaining</div>
                </div>

                <Link
                  href="/app/deadlines"
                  className="px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold shrink-0 transition-colors"
                >
                  View SLA Board &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Managed Portfolio Risk Breakdown & Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#493344]">Managed Portfolio Inspection Activity</h2>
                  <p className="text-xs text-[#806C7B]">Monthly inspections conducted vs. moisture anomalies in your portfolio</p>
                </div>
                <span className="text-[10px] font-semibold text-[#79566F] bg-[#EFE4EC] px-2.5 py-1 rounded-lg">Last 6 Months</span>
              </div>

              <div className="h-60 w-full">
                <PortfolioInspectionTrendChart trendData={trendData} />
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-[#493344]">Portfolio Risk Triage</h2>
                <p className="text-xs text-[#806C7B] mb-3">Units categorized by multi-modal severity</p>

                <div className="h-40 w-full">
                  <PortfolioRiskPieChart riskDistributionData={riskDistributionData} />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E6D5DC]">
                {riskDistributionData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[#493344]">{item.name}</span>
                    </div>
                    <span className="font-bold text-[#493344]">{item.count} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- INSPECTOR DASHBOARD MAIN CONTENT --- */}
      {role === "inspector" && (
        <div className="space-y-6">
          {/* Quick Action Survey Hero Card */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/20">
                <ShieldCheckIcon size={12} />
                <span>Diagnostic Equipment Calibrated</span>
              </div>
              <h2 className="text-lg font-bold text-[#493344]">Conduct On-Site Multi-Modal Field Survey</h2>
              <p className="text-xs text-[#806C7B]">
                Upload dual ambient/flash photographs for OpenCV specular highlight subtraction and record acoustic frequency samples for SciPy FFT resonance leak analysis.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/app/inspections/new"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold shadow-md shadow-[#79566F]/20 transition-all cursor-pointer"
              >
                <CameraIcon size={16} />
                <span>+ Launch New Survey</span>
              </Link>
              <Link
                href="/app/multi-defect"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#EFE4EC] transition-all cursor-pointer"
              >
                <SparklesIcon size={15} />
                <span>Run Detection</span>
              </Link>
            </div>
          </div>

          {/* Assigned Inspections Queue Table */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#493344]">My Assigned Survey Queue</h2>
                <p className="text-xs text-[#806C7B]">Field inspections allocated to your surveyor profile</p>
              </div>
              <Link href="/app/inspections" className="text-xs font-semibold text-[#79566F] hover:underline">
                View All Inspections &rarr;
              </Link>
            </div>

            {inspections.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#806C7B] bg-[#F7EDE5]/50 rounded-2xl border border-dashed border-[#E6D5DC]">
                <FileCheckIcon size={24} className="mx-auto text-[#806C7B] mb-2 opacity-50" />
                <p className="font-semibold text-[#493344]">No assigned inspections pending.</p>
                <Link href="/app/inspections/new" className="mt-2 inline-block text-xs font-bold text-[#79566F] hover:underline">
                  + Create New Field Survey
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E6D5DC] text-[#806C7B] font-bold text-[11px] uppercase tracking-wider">
                      <th className="pb-3 pl-2">Inspection ID &amp; Property</th>
                      <th className="pb-3">Zone / Room</th>
                      <th className="pb-3">Moisture Sheen</th>
                      <th className="pb-3">Acoustic FFT</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 pr-2 text-right">Diagnostic Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D5DC]">
                    {inspections.slice(0, 5).map((i) => (
                      <tr key={i.id} className="hover:bg-[#F7EDE5]/50 transition-colors">
                        <td className="py-3 pl-2">
                          <div className="font-bold text-[#493344]">{i.property_name}</div>
                          <div className="font-mono text-[10px] text-[#79566F]">{i.id}</div>
                        </td>
                        <td className="py-3 text-[#493344]">
                          <div>{i.room_name}</div>
                          <div className="text-[10px] text-[#806C7B]">{i.inspection_zone}</div>
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-[#493344]">
                            {i.ambient_moisture_index ? `${i.ambient_moisture_index}%` : "Pending Scan"}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-[#493344]">
                            {i.acoustic_leak_frequency_hz ? `${i.acoustic_leak_frequency_hz} Hz` : "No Peak"}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              i.status === "Flagged for Contractor"
                                ? "bg-[#FDF2F4] text-[#C84661]"
                                : i.status === "Pending Review"
                                ? "bg-[#FDF5ED] text-[#B86B35]"
                                : "bg-[#EFF8F3] text-[#4A8B71]"
                            }`}
                          >
                            {i.status}
                          </span>
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <Link
                            href="/app/multi-defect"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFE4EC] text-[#79566F] hover:bg-[#79566F] hover:text-white transition-colors text-[11px] font-bold"
                          >
                            <span>Analyze</span>
                            <ArrowRightIcon size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CONTRACTOR DASHBOARD MAIN CONTENT --- */}
      {role === "contractor" && (
        <div className="space-y-6">
          {/* Awaab's Law Statutory SLAs Banner */}
          <div className="bg-linear-to-r from-[#B86B35] to-[#8f4e20] rounded-3xl p-5 sm:p-6 text-white border border-[#E6D5DC] shadow-md">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#B86B35]">
                    Mandatory Contractor SLA
                  </span>
                  <span className="text-xs text-white/90">
                    Awaab&apos;s Law Emergency 24-Hour &amp; 7-Day Deadlines
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  Active Remediation Dispatch &amp; Work Orders
                </h2>
                <p className="text-xs text-white/90 max-w-2xl">
                  As an accredited partner ({profile.organization}), prompt remediation and photographic completion evidence are required to close work orders and maintain compliance.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/app/deadlines"
                  className="px-4 py-2.5 rounded-xl bg-white text-[#B86B35] text-xs font-bold hover:bg-white/90 transition-colors"
                >
                  View SLA Timers &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Assigned Work Orders List with Status Toggle & Upload Evidence */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#493344]">Assigned Remediation Work Orders</h2>
                <p className="text-xs text-[#806C7B]">Active repair tasks assigned to {profile.organization}</p>
              </div>
              <span className="text-xs font-bold text-[#79566F] bg-[#EFE4EC] px-2.5 py-1 rounded-lg">
                {workOrders.length} Total Jobs
              </span>
            </div>

            {workOrders.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#806C7B] bg-[#F7EDE5]/50 rounded-2xl border border-dashed border-[#E6D5DC]">
                <WrenchIcon size={24} className="mx-auto text-[#806C7B] mb-2 opacity-50" />
                <p className="font-semibold text-[#493344]">No active work orders currently assigned.</p>
                <p className="text-[11px] text-[#806C7B] mt-0.5">You will receive notifications when new orders are dispatched.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workOrders.map((wo) => {
                  const isEmergency = wo.priority.includes("Emergency");
                  return (
                    <div
                      key={wo.id}
                      className="p-4 rounded-2xl border border-[#E6D5DC] hover:border-[#79566F]/40 bg-[#F7EDE5]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#79566F]">{wo.id}</span>
                          <span className="font-bold text-xs text-[#493344]">{wo.property_name || "Assigned Property"}</span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isEmergency
                                ? "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/30"
                                : "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/30"
                            }`}
                          >
                            {wo.priority}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white text-[#806C7B] border border-[#E6D5DC]">
                            {wo.trade_type}
                          </span>
                        </div>
                        <div className="text-xs text-[#493344]">{wo.issue_description}</div>
                        <div className="text-[11px] text-[#806C7B] flex items-center gap-3">
                          <span>Zone: <strong>{wo.zone}</strong></span>
                          <span>Deadline: <strong>{new Date(wo.deadline_date).toLocaleDateString("en-GB")}</strong></span>
                          {wo.completion_evidence && (
                            <span className="text-[#4A8B71] font-semibold flex items-center gap-1">
                              <CheckCircleIcon size={12} /> Evidence attached
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {/* Status dropdown / toggle */}
                        <select
                          value={wo.status}
                          onChange={(e) => handleQuickStatusChange(wo.id, e.target.value as WorkOrderRecord["status"])}
                          className="px-2.5 py-1.5 rounded-xl border border-[#E6D5DC] bg-white text-xs font-bold text-[#493344] focus:outline-none focus:border-[#79566F]"
                        >
                          <option value="Pending Dispatch">Pending Dispatch</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Awaiting Signoff">Awaiting Signoff</option>
                          <option value="Completed">Completed</option>
                        </select>

                        {/* Evidence Upload Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWorkOrder(wo);
                            setEvidenceNote(wo.completion_evidence || "");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <UploadCloudIcon size={13} />
                          <span>Upload Evidence</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CONTRACTOR EVIDENCE UPLOAD MODAL */}
      {selectedWorkOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E6D5DC] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D5DC]">
              <div className="flex items-center gap-2">
                <UploadCloudIcon size={18} className="text-[#79566F]" />
                <h3 className="text-base font-bold text-[#493344]">Submit Completion Evidence</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="p-1 rounded-lg text-[#806C7B] hover:bg-[#EFE4EC]"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="text-xs text-[#806C7B]">
              Job ID: <strong className="text-[#493344]">{selectedWorkOrder.id}</strong> &bull; Location:{" "}
              <strong className="text-[#493344]">{selectedWorkOrder.property_name} ({selectedWorkOrder.zone})</strong>
            </div>

            {evidenceSuccess && (
              <div className="p-3 rounded-2xl bg-[#EFF8F3] text-[#4A8B71] text-xs font-bold border border-[#4A8B71]/30 flex items-center gap-2">
                <CheckCircleIcon size={16} />
                <span>Completion evidence submitted successfully. Work order status updated to Awaiting Signoff!</span>
              </div>
            )}

            <form onSubmit={handleEvidenceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#493344] mb-1">
                  Remediation Work Notes &amp; Moisture Corroboration
                </label>
                <textarea
                  rows={3}
                  required
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  placeholder="E.g., Replaced defective section of copper pipe. Surface moisture dry readings 12% WME. Mold treatment applied..."
                  className="w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493344] mb-1">
                  Upload Photographic Proof / Inspection Evidence
                </label>
                <div className="border border-dashed border-[#E6D5DC] rounded-xl p-4 text-center bg-[#F7EDE5]/50">
                  <CameraIcon size={24} className="mx-auto text-[#79566F] mb-1 opacity-70" />
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEvidenceFileName(e.target.files[0].name);
                      }
                    }}
                    className="block w-full text-xs text-[#806C7B] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#79566F] file:text-white hover:file:bg-[#67475E]"
                  />
                  {evidenceFileName && (
                    <div className="mt-2 text-xs font-semibold text-[#4A8B71]">
                      File Selected: {evidenceFileName}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorkOrder(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#493344] hover:bg-[#F7EDE5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvidence}
                  className="px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmittingEvidence ? "Submitting..." : "Submit & Mark Awaiting Signoff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
