/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCheckIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@/components/Icons";
import { fetchInspections, InspectionReport } from "@/lib/services/inspectionService";
import { useRole } from "@/components/app/RoleContext";

export default function InspectionsManagementPage() {
  const { role, profile } = useRole();
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchInspections(role, profile.email);
    setInspections(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [role, profile.email]);

  // Metric aggregates
  const totalInspections = inspections.length;
  const pendingInspections = inspections.filter(
    (i) => i.status === "Pending Review" || i.status === "Flagged for Contractor"
  ).length;
  const completedInspections = inspections.filter(
    (i) => i.status === "Completed" || i.status === "Approved"
  ).length;
  const requiringReviewInspections = inspections.filter(
    (i) => i.status === "Requires Review"
  ).length;

  // Filtered rows
  const filtered = inspections.filter((i) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      i.id.toLowerCase().includes(term) ||
      i.property_name.toLowerCase().includes(term) ||
      i.inspection_zone.toLowerCase().includes(term) ||
      i.inspector_name.toLowerCase().includes(term) ||
      i.symptom_tags.some((s) => s.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === "all" || i.status === statusFilter;

    const matchesRisk =
      riskFilter === "all" || i.risk_level === riskFilter;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  const getStatusBadge = (status: InspectionReport["status"]) => {
    switch (status) {
      case "Flagged for Contractor":
        return "bg-[#79566F] text-white border-transparent";
      case "Requires Review":
        return "bg-[#FDF2F4] text-[#C84661] border-[#C84661]/30";
      case "Pending Review":
        return "bg-[#FDF5ED] text-[#B86B35] border-[#B86B35]/30";
      case "Completed":
      case "Approved":
        return "bg-[#EFF8F3] text-[#4A8B71] border-[#4A8B71]/30";
      default:
        return "bg-[#F7EDE5] text-[#806C7B] border-[#E6D5DC]";
    }
  };

  const getRiskBadge = (risk: InspectionReport["risk_level"]) => {
    switch (risk) {
      case "critical":
        return "bg-[#FDF2F4] text-[#C84661] border-[#C84661]/30";
      case "high":
        return "bg-[#FDF5ED] text-[#B86B35] border-[#B86B35]/30";
      case "moderate":
        return "bg-[#FEF9C3] text-[#CA8A04] border-[#CA8A04]/30";
      case "low":
        return "bg-[#EFF8F3] text-[#4A8B71] border-[#4A8B71]/30";
      default:
        return "bg-[#F7EDE5] text-[#806C7B] border-[#E6D5DC]";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/dashboard" className="hover:text-[#79566F]">
              Dashboard
            </Link>
            <span>/</span>
            <span>Inspection Management</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Diagnostic Inspection Registry
          </h1>
          <p className="text-xs text-[#806C7B]">
            Field telemetry audit trail &bull; Multi-modal evidence repository &bull; Statutory compliance records
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl border border-[#E6D5DC] bg-white text-[#806C7B] hover:text-[#493344] hover:bg-[#F7EDE5] transition-colors cursor-pointer"
            title="Refresh Inspections"
          >
            <RefreshCwIcon size={16} />
          </button>

          {(role === "admin" || role === "inspector") && (
            <Link
              href="/app/inspections/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#79566F] text-white text-xs font-semibold shadow-md shadow-[#79566F]/20 hover:bg-[#67475E] transition-all cursor-pointer"
            >
              <PlusIcon size={14} />
              <span>New Inspection</span>
            </Link>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inspections */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
              Total Inspections
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EFE4EC] text-[#79566F] flex items-center justify-center">
              <FileCheckIcon size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#493344] mt-2">
            {isLoading ? "..." : totalInspections}
          </div>
          <div className="text-[11px] text-[#806C7B] mt-1">
            Registered pathology surveys
          </div>
        </div>

        {/* Pending Inspections */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
              Pending Inspections
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FDF5ED] text-[#B86B35] flex items-center justify-center">
              <ClockIcon size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#493344] mt-2">
            {isLoading ? "..." : pendingInspections}
          </div>
          <div className="text-[11px] text-[#B86B35] font-semibold mt-1">
            Awaiting assessment or contractor action
          </div>
        </div>

        {/* Completed Inspections */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
              Completed Inspections
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EFF8F3] text-[#4A8B71] flex items-center justify-center">
              <CheckCircleIcon size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#493344] mt-2">
            {isLoading ? "..." : completedInspections}
          </div>
          <div className="text-[11px] text-[#4A8B71] font-semibold mt-1">
            Verified with full analytical clearance
          </div>
        </div>

        {/* Inspections Requiring Review */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
              Requiring Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FDF2F4] text-[#C84661] flex items-center justify-center">
              <AlertTriangleIcon size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#C84661] mt-2">
            {isLoading ? "..." : requiringReviewInspections}
          </div>
          <div className="text-[11px] text-[#C84661] font-semibold mt-1">
            High moisture or acoustic anomalies flagged
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6D5DC] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#806C7B]">
            <SearchIcon size={16} />
          </div>
          <input
            type="text"
            placeholder="Search inspections by ID, property, zone, surveyor, symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 pl-9 pr-3 text-xs text-[#493344] placeholder-[#806C7B] focus:border-[#79566F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#79566F]"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#806C7B]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Requires Review">Requires Review</option>
              <option value="Completed">Completed</option>
              <option value="Approved">Approved</option>
              <option value="Flagged for Contractor">Flagged for Contractor</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#806C7B]">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none cursor-pointer"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
              <option value="low">Low</option>
              <option value="pending">Pending Analysis</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inspection History Table */}
      <div className="bg-white rounded-3xl border border-[#E6D5DC] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6D5DC] bg-[#F7EDE5]/70 text-[11px] font-bold uppercase tracking-wider text-[#806C7B]">
                <th className="py-3.5 px-4">Inspection ID</th>
                <th className="py-3.5 px-4">Property</th>
                <th className="py-3.5 px-4">Inspection Zone</th>
                <th className="py-3.5 px-4">Inspector</th>
                <th className="py-3.5 px-4">Inspection Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Risk Level</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6D5DC] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#806C7B]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin" />
                      <span>Loading inspection records...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#806C7B]">
                    <FileCheckIcon size={32} className="mx-auto text-[#806C7B]/40 mb-2" />
                    <p className="font-semibold text-sm text-[#493344]">No inspection records found</p>
                    <p className="text-xs text-[#806C7B] mt-0.5">
                      {searchQuery || statusFilter !== "all" || riskFilter !== "all"
                        ? "Try clearing filters to see more results."
                        : "Launch a new inspection to register the first survey."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F7EDE5]/50 transition-colors group"
                  >
                    {/* Inspection ID */}
                    <td className="py-4 px-4 font-mono font-bold text-[#79566F]">
                      <Link
                        href={`/app/inspections/${item.id}`}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <span>{item.id}</span>
                      </Link>
                    </td>

                    {/* Property */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-[#493344]">{item.property_name}</div>
                      <div className="text-[11px] text-[#806C7B] mt-0.5">
                        {item.property_address} {item.property_postal_code && `(${item.property_postal_code})`}
                      </div>
                    </td>

                    {/* Inspection Zone */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#493344]">{item.inspection_zone}</div>
                      <div className="text-[11px] text-[#806C7B] mt-0.5">
                        {item.floor} &bull; {item.room_name || "General Area"}
                      </div>
                    </td>

                    {/* Inspector */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#79566F]/10 text-[#79566F] flex items-center justify-center font-bold text-[10px]">
                          {item.inspector_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-[#493344]">{item.inspector_name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Inspection Date */}
                    <td className="py-4 px-4 text-[#806C7B]">
                      {new Date(item.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Risk Level */}
                    <td className="py-4 px-4">
                      {item.risk_level && item.risk_level !== "pending" ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getRiskBadge(
                              item.risk_level
                            )}`}
                          >
                            {item.risk_level}
                          </span>
                          {item.risk_score > 0 && (
                            <span className="text-[10px] font-mono text-[#806C7B]">
                              ({item.risk_score})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F7EDE5] text-[#806C7B] border border-[#E6D5DC]">
                          Pending Analysis
                        </span>
                      )}
                    </td>

                    {/* View Details */}
                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/app/inspections/${item.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6D5DC] bg-white text-xs font-semibold text-[#493344] hover:border-[#79566F] hover:text-[#79566F] hover:bg-[#EFE4EC] transition-all cursor-pointer shadow-xs"
                      >
                        <span>View Details</span>
                        <ArrowRightIcon size={12} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
