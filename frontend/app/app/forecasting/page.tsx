"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BuildingIcon,
  WrenchIcon,
  DropletIcon,
  ArrowRightIcon,
  SparklesIcon,
  RefreshCwIcon,
  SearchIcon,
  FilterIcon,
} from "@/components/Icons";
import {
  fetchPortfolioForecast,
  PortfolioForecastItem,
  PortfolioForecastResponse,
} from "@/lib/services/forecastingService";

export default function PredictiveMaintenanceForecastingPage() {
  const [forecastData, setForecastData] = useState<PortfolioForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [defectFilter, setDefectFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchPortfolioForecast(defectFilter, riskFilter);
    setForecastData(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [defectFilter, riskFilter]);

  const properties = forecastData?.properties || [];
  const filteredProperties = properties.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.property_name.toLowerCase().includes(q) ||
      p.uprn.toLowerCase().includes(q) ||
      p.postcode.toLowerCase().includes(q) ||
      p.predicted_defect.toLowerCase().includes(q)
    );
  });

  const criticalCount = properties.filter((p) => p.risk_level === "critical").length;
  const highCount = properties.filter((p) => p.risk_level === "high").length;
  const moderateCount = properties.filter((p) => p.risk_level === "moderate").length;

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
            <span>Maintenance Forecasting</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Predictive Maintenance Forecasting
          </h1>
          <p className="text-xs text-[#806C7B]">
            Portfolio risk degradation trajectories, recommended inspection deadlines, and upcoming maintenance priorities
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#E6D5DC] rounded-xl text-xs font-semibold text-[#493344] hover:bg-[#EFE4EC] shadow-xs cursor-pointer"
        >
          <RefreshCwIcon size={14} className={isLoading ? "animate-spin" : ""} />
          Recalculate Forecasts
        </button>
      </div>

      {/* Statutory Scientific Disclaimer Banner */}
      <div className="p-3.5 rounded-xl bg-[#EFF8F3] border border-[#4A8B71]/30 text-xs text-[#285A44] flex items-start gap-2.5">
        <SparklesIcon size={16} className="text-[#4A8B71] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Explainable Predictive Basis: </span>
          {forecastData?.disclaimer ||
            "Forecasts represent mathematical hazard projections based on building materials, age, and historical inspection records. They clearly distinguish estimated risk from confirmed defects and require physical surveyor verification."}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#806C7B]">Total Properties Monitored</span>
            <BuildingIcon size={16} className="text-[#79566F]" />
          </div>
          <div className="text-2xl font-extrabold text-[#493344]">
            {forecastData?.total_properties_analyzed || properties.length}
          </div>
          <span className="text-[11px] text-[#806C7B]">Active social housing stock</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#C84661]">Statutory 24h Deadlines</span>
            <AlertTriangleIcon size={16} className="text-[#C84661]" />
          </div>
          <div className="text-2xl font-extrabold text-[#C84661]">{criticalCount}</div>
          <span className="text-[11px] text-[#C84661] font-medium">Awaab's Law Section 10A</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#B86B35]">Urgent 7-Day Surveys</span>
            <ClockIcon size={16} className="text-[#B86B35]" />
          </div>
          <div className="text-2xl font-extrabold text-[#B86B35]">{highCount}</div>
          <span className="text-[11px] text-[#806C7B]">High psychrometric vulnerability</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#4A8B71]">Routine Reviews</span>
            <CheckCircleIcon size={16} className="text-[#4A8B71]" />
          </div>
          <div className="text-2xl font-extrabold text-[#4A8B71]">
            {properties.length - criticalCount - highCount}
          </div>
          <span className="text-[11px] text-[#4A8B71] font-medium">Nominal degradation rate</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <SearchIcon size={15} className="absolute left-3 top-2.5 text-[#806C7B]" />
          <input
            type="text"
            placeholder="Search property name, UPRN, or postcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E6D5DC] bg-[#F7EDE5]/50 focus:bg-white focus:outline-none focus:border-[#79566F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Defect Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#806C7B] font-semibold text-[11px]">Defect:</span>
            <select
              value={defectFilter}
              onChange={(e) => setDefectFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
            >
              <option value="all">All Pathology Categories</option>
              <option value="plumbing">Plumbing & Pinhole Leaks</option>
              <option value="condensation">Condensation & Interstitial Mould</option>
              <option value="envelope">External Thermal Envelope & Roof</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#806C7B] font-semibold text-[11px]">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical (Score ≥ 75)</option>
              <option value="high">High (Score 55-74)</option>
              <option value="moderate">Moderate (Score 35-54)</option>
              <option value="low">Low (Score &lt; 35)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-2xl border border-[#E6D5DC] shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E6D5DC] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#493344]">Properties Requiring Future Inspections</h2>
          <span className="text-xs text-[#806C7B]">{filteredProperties.length} records</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#806C7B]">
            <div className="w-8 h-8 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Calculating multi-factor risk degradation curves...
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#806C7B]">
            No properties match the selected defect or risk filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7EDE5]/60 text-[#806C7B] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Property</th>
                  <th className="px-4 py-3">Predicted Defect</th>
                  <th className="px-4 py-3">Estimated Risk</th>
                  <th className="px-4 py-3">Rec. Inspection Date</th>
                  <th className="px-4 py-3">Statutory Urgency</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D5DC]">
                {filteredProperties.map((p) => {
                  const riskBadge =
                    p.risk_level === "critical"
                      ? "bg-[#FDF2F4] text-[#C84661] border-[#C84661]/30"
                      : p.risk_level === "high"
                      ? "bg-[#FDF5ED] text-[#B86B35] border-[#B86B35]/30"
                      : p.risk_level === "moderate"
                      ? "bg-[#FEF9E7] text-[#8C6D1F] border-[#8C6D1F]/30"
                      : "bg-[#EFF8F3] text-[#4A8B71] border-[#4A8B71]/30";

                  return (
                    <tr key={p.property_id} className="hover:bg-[#F7EDE5]/30 transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          href={`/app/properties/${p.property_id}`}
                          className="font-bold text-[#493344] hover:text-[#79566F]"
                        >
                          {p.property_name}
                        </Link>
                        <div className="text-[11px] text-[#806C7B]">
                          UPRN: {p.uprn || "N/A"} • {p.postcode}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#493344]">
                        {p.predicted_defect}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskBadge}`}>
                            {p.estimated_risk_score} / 100 ({p.risk_level})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#493344]">
                        {p.recommended_inspection_date}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold text-[#493344]">{p.urgency}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/app/properties/${p.property_id}/forecasting`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#79566F] hover:bg-[#EFE4EC] rounded-lg transition-colors"
                        >
                          5-Yr Model
                          <ArrowRightIcon size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
