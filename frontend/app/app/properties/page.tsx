/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BuildingIcon,
  SearchIcon,
  PlusIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshCwIcon,
} from "@/components/Icons";
import { fetchProperties, seedBenchmarkPropertiesIfEmpty, PropertyRecord } from "@/lib/services/propertyService";
import { SparklesIcon } from "@/components/Icons";
import { useRole } from "@/components/app/RoleContext";

export default function PropertiesDashboardPage() {
  const { role } = useRole();
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [buildingTypeFilter, setBuildingTypeFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const loadProperties = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchProperties();
      setProperties(data);
    } catch (err: unknown) {
      console.error("Failed to load properties", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to fetch property records from database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  // Summary Metrics calculations
  const totalProperties = properties.length;
  const highRiskCount = properties.filter(
    (p) => p.risk_level === "critical" || p.risk_level === "high"
  ).length;
  const awaitingInspectionCount = properties.filter(
    (p) => p.inspection_status === "Pending Review" || p.inspection_status === "Overdue"
  ).length;
  const recentlyAddedCount = properties.filter((p) => {
    if (!p.created_at) return false;
    const diffDays =
      (new Date().getTime() - new Date(p.created_at).getTime()) /
      (1000 * 3600 * 24);
    return diffDays <= 30;
  }).length;

  // Filter properties
  const filtered = properties.filter((p) => {
    const matchesSearch =
      p.property_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.postal_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBuildingType =
      buildingTypeFilter === "all" ||
      p.building_type.toLowerCase().includes(buildingTypeFilter.toLowerCase());

    const matchesRisk = riskFilter === "all" || p.risk_level === riskFilter;
    const matchesStatus =
      statusFilter === "all" || p.inspection_status === statusFilter;

    return (
      matchesSearch &&
      matchesBuildingType &&
      matchesRisk &&
      matchesStatus
    );
  });

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
            <span>Portfolio Registry</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Property Management &amp; Housing Stock
          </h1>
          <p className="text-xs text-[#806C7B]">
            Centralized housing asset registry &bull; MongoDB Atlas Cloud sync &bull; Risk triage monitoring
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadProperties}
            className="p-2.5 rounded-xl border border-[#E6D5DC] bg-white text-[#806C7B] hover:text-[#493344] hover:bg-[#F7EDE5] transition-colors cursor-pointer"
            title="Refresh from Database"
          >
            <RefreshCwIcon size={16} />
          </button>

          {(role === "admin" || role === "manager") && (
            <Link
              href="/app/properties/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#79566F] text-white text-xs font-semibold shadow-md shadow-[#79566F]/20 hover:bg-[#67475E] transition-all cursor-pointer"
            >
              <PlusIcon size={14} />
              <span>Add Property</span>
            </Link>
          )}

          <div className="inline-flex rounded-xl border border-[#E6D5DC] bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#79566F] text-white"
                  : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-[#79566F] text-white"
                  : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Dashboard Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Properties */}
        <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
              Total Properties
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#EFE4EC] text-[#79566F] flex items-center justify-center">
              <BuildingIcon size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isLoading ? (
              <span className="inline-block w-12 h-7 bg-[#E6D5DC] animate-pulse rounded-md" />
            ) : (
              <span className="text-2xl font-black text-[#493344]">{totalProperties}</span>
            )}
            <span className="text-[11px] font-semibold text-[#806C7B]">active units</span>
          </div>
          <div className="mt-2 text-[11px] text-[#806C7B]">
            Social housing &amp; residential portfolio
          </div>
        </div>

        {/* High Risk Properties */}
        <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
              High / Critical Risk
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FDF2F4] text-[#C84661] flex items-center justify-center">
              <AlertTriangleIcon size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isLoading ? (
              <span className="inline-block w-12 h-7 bg-[#FDF2F4] animate-pulse rounded-md" />
            ) : (
              <span className="text-2xl font-black text-[#C84661]">{highRiskCount}</span>
            )}
            <span className="text-[11px] font-semibold text-[#C84661]">urgent priority</span>
          </div>
          <div className="mt-2 text-[11px] text-[#806C7B]">
            Sub-surface moisture or acoustic anomaly
          </div>
        </div>

        {/* Properties Awaiting Inspection */}
        <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
              Awaiting Inspection
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FDF5ED] text-[#B86B35] flex items-center justify-center">
              <ClockIcon size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isLoading ? (
              <span className="inline-block w-12 h-7 bg-[#FDF5ED] animate-pulse rounded-md" />
            ) : (
              <span className="text-2xl font-black text-[#493344]">{awaitingInspectionCount}</span>
            )}
            <span className="text-[11px] font-semibold text-[#B86B35]">pending review</span>
          </div>
          <div className="mt-2 text-[11px] text-[#806C7B]">
            Awaab&apos;s Law 24h statutory compliance
          </div>
        </div>

        {/* Recently Added */}
        <div className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#806C7B] uppercase tracking-wider">
              Recently Added
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#EFF8F3] text-[#4A8B71] flex items-center justify-center">
              <CheckCircleIcon size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isLoading ? (
              <span className="inline-block w-12 h-7 bg-[#EFF8F3] animate-pulse rounded-md" />
            ) : (
              <span className="text-2xl font-black text-[#493344]">{recentlyAddedCount}</span>
            )}
            <span className="text-[11px] font-semibold text-[#4A8B71]">in last 30 days</span>
          </div>
          <div className="mt-2 text-[11px] text-[#806C7B]">
            Integrated into predictive monitoring
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E6D5DC] shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-96">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#806C7B]">
            <SearchIcon size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by property name, address, postal code, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 pl-9 pr-3 text-xs text-[#493344] placeholder-[#806C7B] focus:border-[#79566F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#79566F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Building Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#806C7B]">Type:</span>
            <select
              value={buildingTypeFilter}
              onChange={(e) => setBuildingTypeFilter(e.target.value)}
              className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
            >
              <option value="all">All Typologies</option>
              <option value="social housing">Social Housing</option>
              <option value="high-rise">High-Rise Concrete</option>
              <option value="victorian">Victorian Brick</option>
              <option value="steel">Steel Frame</option>
              <option value="timber">Timber Frame</option>
              <option value="cavity">Cavity Brick</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#806C7B]">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
            >
              <option value="all">All Risks</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#806C7B]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Overdue">Overdue</option>
              <option value="Inspected">Inspected</option>
              <option value="Scheduled">Scheduled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#C84661]/30 text-xs text-[#C84661] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon size={16} />
            <span><strong>Database Error:</strong> {errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={loadProperties}
            className="px-3 py-1 rounded-lg bg-[#C84661] text-white font-semibold text-xs hover:bg-[#A8324B] cursor-pointer"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-[#E6D5DC] text-center shadow-xs">
          <div className="w-6 h-6 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-[#493344]">Loading housing asset records...</p>
          <p className="text-[11px] text-[#806C7B]">Applying portfolio filters &amp; predictive telemetry</p>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div className="bg-white p-12 rounded-3xl border border-[#E6D5DC] text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#EFE4EC] text-[#79566F] mx-auto flex items-center justify-center mb-3">
            <BuildingIcon size={24} />
          </div>
          <h3 className="text-base font-bold text-[#493344]">
            {properties.length === 0 ? "Portfolio Registry Is Empty" : "No Properties Match Search Filters"}
          </h3>
          <p className="text-xs text-[#806C7B] max-w-md mx-auto mt-1">
            {properties.length === 0
              ? "No property assets registered in the database yet. Click below to add your first property unit or load benchmark housing stock."
              : "No properties matched your current search filters. Try adjusting your search query or reset your filters."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {(role === "admin" || role === "manager") && (
              <Link
                href="/app/properties/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] shadow-xs cursor-pointer"
              >
                <PlusIcon size={14} />
                <span>Add Property</span>
              </Link>
            )}
            {properties.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  const seeded = seedBenchmarkPropertiesIfEmpty();
                  setProperties(seeded);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] text-[#493344] text-xs font-semibold hover:bg-[#EFE4EC] cursor-pointer"
              >
                <SparklesIcon size={14} className="text-[#79566F]" />
                <span>Load Benchmark Housing Stock (4 Properties)</span>
              </button>
            )}
            {properties.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setBuildingTypeFilter("all");
                  setRiskFilter("all");
                  setStatusFilter("all");
                }}
                className="px-3.5 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#806C7B] hover:text-[#493344] cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* Responsive Table View */
        <div className="bg-white rounded-3xl border border-[#E6D5DC] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6D5DC] bg-[#F7EDE5] text-[#806C7B] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Property &amp; ID</th>
                  <th className="py-3.5 px-4">Address &amp; Postcode</th>
                  <th className="py-3.5 px-4">Typology</th>
                  <th className="py-3.5 px-4">Built / Floors</th>
                  <th className="py-3.5 px-4">Risk Level</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date Added</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D5DC] text-[#493344]">
                {filtered.map((p) => {
                  const dateAdded = p.created_at
                    ? new Date(p.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Baseline";

                  return (
                    <tr key={p.id} className="hover:bg-[#EFE4EC]/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold">
                        <Link
                          href={`/app/properties/${p.id}`}
                          className="font-bold text-[#493344] hover:text-[#79566F] block"
                        >
                          {p.property_name}
                        </Link>
                        <span className="text-[10px] text-[#79566F] font-mono">{p.id}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="max-w-[200px] truncate">{p.address}</div>
                        <div className="text-[10px] text-[#806C7B] font-mono">{p.postal_code}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="max-w-[180px] truncate">{p.building_type}</div>
                        <div className="text-[10px] text-[#806C7B]">Pipes: {p.pipe_type}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>Built {p.build_year}</div>
                        <div className="text-[10px] text-[#806C7B]">{p.number_of_floors} storeys</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            p.risk_level === "critical"
                              ? "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/20"
                              : p.risk_level === "high"
                              ? "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/20"
                              : p.risk_level === "moderate"
                              ? "bg-[#EFE4EC] text-[#B995AD] border border-[#B995AD]/20"
                              : "bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/20"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{p.risk_level} ({p.risk_score}/100)</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            p.inspection_status === "Overdue"
                              ? "bg-[#FDF2F4] text-[#C84661]"
                              : p.inspection_status === "Pending Review"
                              ? "bg-[#FDF5ED] text-[#B86B35]"
                              : p.inspection_status === "Inspected"
                              ? "bg-[#EFF8F3] text-[#4A8B71]"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {p.inspection_status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#806C7B] font-mono text-[11px]">
                        {dateAdded}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/app/properties/${p.id}`}
                            className="px-2.5 py-1 rounded-lg bg-[#EFE4EC] text-[#79566F] hover:bg-[#79566F] hover:text-white font-semibold transition-colors"
                          >
                            View
                          </Link>
                          {(role === "admin" || role === "manager") && (
                            <Link
                              href={`/app/properties/${p.id}?edit=true`}
                              className="px-2.5 py-1 rounded-lg border border-[#E6D5DC] text-[#493344] hover:bg-[#F7EDE5] font-semibold transition-colors"
                            >
                              Edit
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#79566F] font-bold">{p.id}</span>
                    <h3 className="text-sm font-bold text-[#493344] mt-0.5">{p.property_name}</h3>
                    <p className="text-xs text-[#806C7B]">{p.address}, {p.postal_code}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
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

                <div className="mt-4 p-3 bg-[#F7EDE5] rounded-2xl space-y-1.5 text-[11px] text-[#806C7B]">
                  <div className="flex justify-between">
                    <span>Typology:</span>
                    <span className="font-semibold text-[#493344] truncate max-w-[150px]">{p.building_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Built / Storeys:</span>
                    <span className="font-semibold text-[#493344]">Year {p.build_year} &bull; {p.number_of_floors} fl</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plumbing:</span>
                    <span className="font-semibold text-[#493344]">{p.pipe_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-semibold text-[#493344]">{p.inspection_status}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E6D5DC] flex items-center justify-between">
                <span className="text-[10px] text-[#806C7B] font-mono">
                  Score: {p.risk_score}/100
                </span>
                <div className="flex items-center gap-2">
                  {(role === "admin" || role === "manager") && (
                    <Link
                      href={`/app/properties/${p.id}?edit=true`}
                      className="px-2.5 py-1 text-xs font-semibold text-[#806C7B] hover:text-[#493344]"
                    >
                      Edit
                    </Link>
                  )}
                  <Link
                    href={`/app/properties/${p.id}`}
                    className="px-3 py-1.5 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] transition-colors"
                  >
                    View Details &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
