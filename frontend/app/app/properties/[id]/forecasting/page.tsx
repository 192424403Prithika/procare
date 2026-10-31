"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BuildingIcon,
  WrenchIcon,
  DropletIcon,
  AcousticIcon,
  ArrowRightIcon,
  SparklesIcon,
  RefreshCwIcon,
} from "@/components/Icons";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  fetchForecastByPropertyId,
  PropertyForecast,
} from "@/lib/services/forecastingService";
import { fetchPropertyById, PropertyRecord } from "@/lib/services/propertyService";

export default function PropertyForecastingPage() {
  const params = useParams();
  const propertyId = (params?.id as string) || "PROP-0914";

  const [forecast, setForecast] = useState<PropertyForecast | null>(null);
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [fData, pData] = await Promise.all([
        fetchForecastByPropertyId(propertyId),
        fetchPropertyById(propertyId),
      ]);
      setForecast(fData);
      setProperty(pData);
      setIsLoading(false);
    }
    load();
  }, [propertyId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-[#806C7B] font-medium">
          Computing Weibull reliability degradation curves & psychrometric trajectories...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/properties" className="hover:text-[#79566F]">
              Properties
            </Link>
            <span>/</span>
            <Link href={`/app/properties/${propertyId}`} className="hover:text-[#79566F]">
              {property?.property_name || propertyId}
            </Link>
            <span>/</span>
            <span>Predictive Maintenance</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Predictive Maintenance & Asset Lifecycle Trajectory
          </h1>
          <p className="text-xs text-[#806C7B]">
            Engineering decay modeling combining Weibull component aging with Greater Manchester psychrometric dew-point stress
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/app/properties/${propertyId}`}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            Property Overview
          </Link>
          <Link
            href="/app/work-orders"
            className="px-3.5 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] shadow-md shadow-[#79566F]/20 transition-colors"
          >
            Schedule Preventative Repair &rarr;
          </Link>
        </div>
      </div>

      {/* Statutory Hazard Warning Banner */}
      {forecast?.statutory_warning && (
        <div className="bg-[#FDF5ED] border border-[#B86B35]/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangleIcon size={20} className="text-[#B86B35] shrink-0 mt-0.5" />
          <div className="text-xs text-[#493344]">
            <strong className="font-bold text-[#B86B35]">Statutory Escalation Forecast (Awaab’s Law)</strong>
            <p className="text-[#806C7B] mt-1">{forecast.statutory_warning}</p>
          </div>
        </div>
      )}

      {/* Proactive vs Reactive Cost Delta & Savings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-[#E6D5DC] shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#806C7B] block">
            Proactive Intervention Cost
          </span>
          <div className="text-3xl font-black text-[#4A8B71] mt-1">
            £{forecast?.proactive_cost_estimate.toFixed(2)}
          </div>
          <p className="text-[11px] text-[#806C7B] mt-1.5">
            Targeted localized repairs (e.g. press-fit copper splice & DPC moisture injection) prior to structural breakout.
          </p>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-[#E6D5DC] shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#806C7B] block">
            Projected Reactive Failure Cost
          </span>
          <div className="text-3xl font-black text-[#C84661] mt-1">
            £{forecast?.reactive_failure_cost.toFixed(2)}
          </div>
          <p className="text-[11px] text-[#806C7B] mt-1.5">
            Emergency contractor premiums, ceiling collapse reconstruction, structural dehumidification, and tenant decanting.
          </p>
        </div>

        <div className="p-6 bg-[#79566F] rounded-3xl text-white shadow-md flex flex-col justify-between border border-[#E6D5DC]">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#B995AD] block">
              Proactive Budget Savings
            </span>
            <div className="text-3xl font-black text-white mt-1">
              £{forecast?.savings_delta.toFixed(2)}
            </div>
            <p className="text-[11px] text-white/85 mt-1.5">
              Net savings realized by dispatching maintenance within statutory window.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-[#B995AD] font-bold">ROI: 8.9&times; Multiplier</span>
            <span className="text-white/70">PCA / CIPHE Accredited</span>
          </div>
        </div>
      </div>

      {/* 5-Year Quarter-by-Quarter Degradation Trajectory Chart */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#493344]">
              5-Year Component Degradation Trajectory (Weibull Model)
            </h2>
            <p className="text-xs text-[#806C7B]">
              Projected failure risk curves accounting for seasonal winter moisture spikes (Q4 / Q1)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/20 font-bold text-[10px] uppercase">
              Critical Threshold: &ge;75 Risk Score
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast?.quarters || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFE5EA" vertical={false} />
              <XAxis dataKey="quarter" stroke="#806C7B" fontSize={11} tickLine={false} />
              <YAxis stroke="#806C7B" fontSize={11} tickLine={false} domain={[20, 100]} unit="" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#493344",
                  borderColor: "#79566F",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line
                type="monotone"
                dataKey="projected_risk_score"
                name="Overall Compound Risk"
                stroke="#79566F"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="plumbing_risk"
                name="Plumbing Pipe Egress"
                stroke="#C84661"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="thermal_risk"
                name="Thermal / Condensation"
                stroke="#B86B35"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="roof_risk"
                name="Roof Membrane"
                stroke="#B995AD"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-3 border-t border-[#E6D5DC] text-[11px] text-[#806C7B]">
          <strong className="text-[#493344]">Calculation Basis: </strong>
          {forecast?.calculation_basis}
        </div>
      </div>

      {/* Component Design Life Exhaustion Matrix */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6D5DC] shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#493344]">Component Design Life Exhaustion</h3>
          <p className="text-xs text-[#806C7B]">
            Empirical service age compared against manufacturer and British Standard design lives
          </p>
        </div>

        <div className="space-y-4">
          {forecast?.components.map((comp, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-[#E6D5DC] bg-[#FAFAFC] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-[#493344]">{comp.component}</h4>
                  <span className="text-[11px] text-[#806C7B]">
                    Current Age: <strong className="text-[#493344]">{comp.current_age_years} yrs</strong> &bull; Standard Design Life: {comp.design_life_years} yrs
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      comp.life_exhausted_pct >= 90
                        ? "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/20"
                        : comp.life_exhausted_pct >= 60
                        ? "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/20"
                        : "bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/20"
                    }`}
                  >
                    {comp.degradation_trend}
                  </span>
                  <span className="text-sm font-black text-[#493344] font-mono">{comp.life_exhausted_pct}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#E6D5DC] h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    comp.life_exhausted_pct >= 90
                      ? "bg-[#C84661]"
                      : comp.life_exhausted_pct >= 60
                      ? "bg-[#B86B35]"
                      : "bg-[#4A8B71]"
                  }`}
                  style={{ width: `${Math.min(100, comp.life_exhausted_pct)}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                <p className="text-[#806C7B]">
                  <strong className="text-[#493344]">Recommended Proactive Intervention: </strong>
                  {comp.recommended_action}
                </p>
                <Link
                  href="/app/work-orders"
                  className="text-xs font-bold text-[#79566F] hover:underline shrink-0"
                >
                  Schedule Work Order &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

