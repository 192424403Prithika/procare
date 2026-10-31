"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  WrenchIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  BuildingIcon,
  RefreshCwIcon,
} from "@/components/Icons";
import { apiClient } from "@/lib/apiClient";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";

interface CostEstimateItem {
  item: string;
  quantity: string;
  unit_rate: string;
  total: number;
}

interface CostEstimateResult {
  estimate_id: string;
  defect_category: string;
  category_label: string;
  severity: string;
  recommended_trade: string;
  labor_hours: number;
  labor_rate_hourly: number;
  labor_total: number;
  materials_cost: number;
  contingency_cost: number;
  vat_amount: number;
  estimated_total: number;
  min_range: number;
  max_range: number;
  breakdown: CostEstimateItem[];
  disclaimer: string;
}

interface ComparisonRecord {
  order_number: string;
  title: string;
  contractor_name: string;
  trade: string;
  completed_date: string;
  estimated_cost: number;
  actual_cost: number;
  variance: number;
  variance_pct: number;
  status: string;
}

export default function MaintenanceCostEstimatorPage() {
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [defectCategory, setDefectCategory] = useState("pipe_leak");
  const [severity, setSeverity] = useState("moderate");
  const [areaSqm, setAreaSqm] = useState(6.0);
  const [urgency, setUrgency] = useState("Standard 14d");

  const [estimate, setEstimate] = useState<CostEstimateResult | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonRecord[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<"calculator" | "audit" | "trends">("calculator");

  useEffect(() => {
    async function loadInitial() {
      try {
        const [props, compData] = await Promise.all([
          fetchProperties(),
          apiClient.get<{ records: ComparisonRecord[] }>("/api/v1/cost-estimator/comparison"),
        ]);
        setProperties(props);
        if (props.length > 0) setSelectedPropertyId(props[0].id);
        if (compData && Array.isArray(compData.records)) {
          setComparisons(compData.records);
        }
      } catch (err) {
        console.warn("Error loading cost data:", err);
      }
    }
    loadInitial();
    handleRunCalculation();
  }, []);

  const handleRunCalculation = async () => {
    setIsCalculating(true);
    try {
      const data = await apiClient.post<CostEstimateResult>("/api/v1/cost-estimator/estimate", {
        defect_category: defectCategory,
        severity: severity,
        area_sqm: areaSqm,
        property_id: selectedPropertyId,
        urgency: urgency,
      });
      setEstimate(data);
    } catch (err) {
      console.warn("Failed to generate estimate:", err);
    } finally {
      setIsCalculating(false);
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
            <span>Financial Controls</span>
            <span>/</span>
            <span>Maintenance Cost Estimator</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Maintenance Cost Estimator &amp; Invoice Variance
          </h1>
          <p className="text-xs text-[#806C7B]">
            Schedule of rates cost breakdowns, trade labor rates, and real work-order budget variance auditing
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 bg-white border border-[#E6D5DC] rounded-xl shadow-xs">
          <button
            onClick={() => setActiveTab("calculator")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "calculator" ? "bg-[#79566F] text-white" : "text-[#806C7B] hover:text-[#493344]"
            }`}
          >
            Cost Estimator
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "audit" ? "bg-[#79566F] text-white" : "text-[#806C7B] hover:text-[#493344]"
            }`}
          >
            Estimated vs Actual ({comparisons.length})
          </button>
        </div>
      </div>

      {/* Statutory Disclaimer */}
      <div className="p-3.5 rounded-xl bg-[#EFF8F3] border border-[#4A8B71]/30 text-xs text-[#285A44] flex items-start gap-2.5">
        <SparklesIcon size={16} className="text-[#4A8B71] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">RICS / NHBC Schedule Guidelines: </span>
          All figures represent approximate indicative projections based on standard North West social housing maintenance contracts.
          These calculations do not represent binding contractor quotations or guaranteed maximum costs.
        </div>
      </div>

      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="p-5 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#493344]">Defect Parameters</h2>

            <div>
              <label className="block text-xs font-bold text-[#493344] mb-1">Defect Category</label>
              <select
                value={defectCategory}
                onChange={(e) => setDefectCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
              >
                <option value="pipe_leak">Pressurized Pipe Pinhole &amp; Supply Plumbing</option>
                <option value="mould_remediation">Interstitial Condensation &amp; Mould Biofilm</option>
                <option value="wall_crack">Structural Wall Cracking &amp; Helical Ties</option>
                <option value="roof_membrane">Flat Roof Waterproofing Membrane</option>
                <option value="peeling_paint">Coating Delamination &amp; Breathable Plaster</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#493344] mb-1">Severity Rating</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
              >
                <option value="minor">Minor (Localized cosmetic breach)</option>
                <option value="moderate">Moderate (Standard trade intervention)</option>
                <option value="severe">Severe (Substrate saturation &amp; migration)</option>
                <option value="critical">Critical (Awaab's Law 24h Emergency hazard)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#493344] mb-1">
                Affected Surface Scope ({areaSqm} m² / linear m)
              </label>
              <input
                type="range"
                min="1"
                max="25"
                step="0.5"
                value={areaSqm}
                onChange={(e) => setAreaSqm(parseFloat(e.target.value))}
                className="w-full accent-[#79566F]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#493344] mb-1">Statutory Response Window</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
              >
                <option value="Emergency 24h">Emergency 24h (Out of hours / immediate dispatch)</option>
                <option value="Urgent 7d">Urgent 7d (Scheduled priority survey)</option>
                <option value="Standard 14d">Standard 14d (Planned maintenance cycle)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#493344] mb-1">Target Property</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.property_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunCalculation}
              disabled={isCalculating}
              className="w-full py-2 bg-[#79566F] hover:bg-[#63445A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isCalculating ? "Updating Estimate..." : "Recalculate Estimate"}
            </button>
          </div>

          {/* Breakdown & Totals Column */}
          <div className="lg:col-span-2 space-y-4">
            {estimate ? (
              <>
                {/* Cost KPI strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs">
                    <span className="text-[11px] font-semibold text-[#806C7B]">Estimated Expected Total</span>
                    <div className="mt-1 text-2xl font-extrabold text-[#493344]">
                      £{estimate.estimated_total.toFixed(2)}
                    </div>
                    <span className="text-[11px] text-[#806C7B]">Incl. VAT &amp; 10% contingency</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs">
                    <span className="text-[11px] font-semibold text-[#806C7B]">Probable Cost Range</span>
                    <div className="mt-1 text-lg font-bold text-[#79566F]">
                      £{estimate.min_range.toFixed(0)} - £{estimate.max_range.toFixed(0)}
                    </div>
                    <span className="text-[11px] text-[#806C7B]">±15% market variance</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs">
                    <span className="text-[11px] font-semibold text-[#806C7B]">Recommended Specialist</span>
                    <div className="mt-1 text-xs font-bold text-[#4A8B71] truncate">
                      {estimate.recommended_trade}
                    </div>
                    <span className="text-[11px] text-[#806C7B]">{estimate.labor_hours} hours @ £{estimate.labor_rate_hourly}/hr</span>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="p-5 rounded-2xl bg-white border border-[#E6D5DC] shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-[#493344]">
                    Itemized Cost Schedule ({estimate.category_label})
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7EDE5]/60 text-[#806C7B] font-semibold text-[10px] uppercase">
                        <tr>
                          <th className="px-4 py-2.5">Item Description</th>
                          <th className="px-4 py-2.5">Quantity / Scope</th>
                          <th className="px-4 py-2.5">Unit Rate</th>
                          <th className="px-4 py-2.5 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6D5DC]">
                        {estimate.breakdown.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#F7EDE5]/20">
                            <td className="px-4 py-2.5 font-medium text-[#493344]">{row.item}</td>
                            <td className="px-4 py-2.5 text-[#806C7B]">{row.quantity}</td>
                            <td className="px-4 py-2.5 text-[#806C7B]">{row.unit_rate}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-[#493344]">
                              £{row.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-[#E6D5DC] flex justify-between items-center text-xs">
                    <span className="text-[#806C7B]">Estimate Identifier: {estimate.estimate_id}</span>
                    <Link
                      href="/app/work-orders"
                      className="inline-flex items-center gap-1 font-bold text-[#79566F] hover:underline"
                    >
                      Create Associated Work Order
                      <ArrowRightIcon size={12} />
                    </Link>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-[#E6D5DC] shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E6D5DC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#493344]">Completed Work-Order Variance Audit</h2>
            <span className="text-xs text-[#806C7B]">{comparisons.length} audited orders</span>
          </div>

          {comparisons.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#806C7B]">
              No completed work orders with recorded invoices exist yet in database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7EDE5]/60 text-[#806C7B] font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Order Number</th>
                    <th className="px-4 py-3">Title &amp; Trade</th>
                    <th className="px-4 py-3">Contractor</th>
                    <th className="px-4 py-3">Estimated Cost</th>
                    <th className="px-4 py-3">Actual Invoice</th>
                    <th className="px-4 py-3">Variance (£ / %)</th>
                    <th className="px-4 py-3">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6D5DC]">
                  {comparisons.map((c) => (
                    <tr key={c.order_number} className="hover:bg-[#F7EDE5]/20">
                      <td className="px-5 py-3 font-bold text-[#493344]">{c.order_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#493344]">{c.title}</div>
                        <div className="text-[11px] text-[#806C7B]">{c.trade}</div>
                      </td>
                      <td className="px-4 py-3 text-[#493344]">{c.contractor_name}</td>
                      <td className="px-4 py-3 text-[#806C7B]">£{c.estimated_cost.toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold text-[#493344]">£{c.actual_cost.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            c.variance <= 0 ? "text-[#4A8B71]" : "text-[#C84661]"
                          }`}
                        >
                          {c.variance > 0 ? "+" : ""}£{c.variance.toFixed(2)} ({c.variance_pct}%)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.status === "Under Budget"
                              ? "bg-[#EFF8F3] text-[#4A8B71] border-[#4A8B71]/30"
                              : c.status === "Within Tolerance"
                              ? "bg-[#FEF9E7] text-[#8C6D1F] border-[#8C6D1F]/30"
                              : "bg-[#FDF2F4] text-[#C84661] border-[#C84661]/30"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
