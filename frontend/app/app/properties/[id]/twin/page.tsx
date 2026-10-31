"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BuildingIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  DropletIcon,
  AcousticIcon,
  WrenchIcon,
  FileTextIcon,
  ClockIcon,
  ArrowRightIcon,
  XIcon,
  SparklesIcon,
  CameraIcon,
} from "@/components/Icons";
import { fetchPropertyById, PropertyRecord } from "@/lib/services/propertyService";
import {
  fetchBuildingZonesByPropertyId,
  BuildingZoneRecord,
  fetchZoneAnnotations,
  addZoneAnnotation,
} from "@/lib/services/buildingZoneService";

export default function PropertyDigitalTwinPage() {
  const params = useParams();
  const propertyId = (params?.id as string) || "PROP-0914";

  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [zones, setZones] = useState<BuildingZoneRecord[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number | "all">("all");
  const [activeLayer, setActiveLayer] = useState<"all" | "moisture" | "acoustic" | "statutory">("all");
  const [selectedZone, setSelectedZone] = useState<BuildingZoneRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [newDefectType, setNewDefectType] = useState("moisture");
  const [newFindingNote, setNewFindingNote] = useState("");
  const [newRiskLevel, setNewRiskLevel] = useState("high");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [pData, zData, aData] = await Promise.all([
        fetchPropertyById(propertyId),
        fetchBuildingZonesByPropertyId(propertyId),
        fetchZoneAnnotations(propertyId),
      ]);
      setProperty(pData);
      setZones(zData);
      setAnnotations(aData || []);
      // Auto-select critical zone if present
      const crit = zData.find((z) => z.risk_level === "critical") || zData[0] || null;
      setSelectedZone(crit);
      setIsLoading(false);
    }
    load();
  }, [propertyId]);

  const handleSaveAnnotation = async () => {
    if (!newFindingNote.trim()) return;
    const pinX = selectedZone ? selectedZone.x + selectedZone.width / 2 : 50;
    const pinY = selectedZone ? selectedZone.y + selectedZone.height / 2 : 50;

    const saved = await addZoneAnnotation(propertyId, {
      zone_id: selectedZone?.id,
      defect_type: newDefectType,
      finding_note: newFindingNote,
      risk_level: newRiskLevel,
      x: pinX,
      y: pinY,
    });

    if (saved) {
      setAnnotations((prev) => [saved, ...prev]);
    }
    setNewFindingNote("");
    setShowAnnotationModal(false);
  };

  const filteredZones = zones.filter((z) => {
    if (selectedFloor === "all") return true;
    return z.floor_number === selectedFloor;
  });

  const criticalCount = zones.filter((z) => z.risk_level === "critical").length;
  const activeOrdersCount = zones.reduce((acc, z) => acc + z.active_work_orders, 0);

  const getRiskColor = (risk: BuildingZoneRecord["risk_level"]) => {
    switch (risk) {
      case "critical":
        return {
          fill: "fill-[#FDF2F4]",
          stroke: "stroke-[#C84661]",
          text: "text-[#C84661]",
          bg: "bg-[#FDF2F4]",
          border: "border-[#C84661]",
          badge: "bg-[#C84661] text-white",
        };
      case "high":
        return {
          fill: "fill-[#FDF5ED]",
          stroke: "stroke-[#B86B35]",
          text: "text-[#B86B35]",
          bg: "bg-[#FDF5ED]",
          border: "border-[#B86B35]",
          badge: "bg-[#B86B35] text-white",
        };
      case "moderate":
        return {
          fill: "fill-[#F8F9FD]",
          stroke: "stroke-[#79566F]",
          text: "text-[#79566F]",
          bg: "bg-[#F8F9FD]",
          border: "border-[#79566F]",
          badge: "bg-[#79566F] text-white",
        };
      default:
        return {
          fill: "fill-[#EFF8F3]",
          stroke: "stroke-[#4A8B71]",
          text: "text-[#4A8B71]",
          bg: "bg-[#EFF8F3]",
          border: "border-[#4A8B71]",
          badge: "bg-[#4A8B71] text-white",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-[#806C7B] font-medium">
          Loading Property Digital Twin architectural coordinates and sensor nodes...
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
            <span>Digital Twin</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Interactive Property Digital Twin
          </h1>
          <p className="text-xs text-[#806C7B]">
            Spatial architectural cross-section mapping OpenCV moisture plumes, acoustic FFT pipe leaks, and repair orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnnotationModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#79566F] text-xs font-semibold hover:bg-[#EFE4EC] transition-colors cursor-pointer"
          >
            + Add Annotation
          </button>
          <Link
            href={`/app/properties/${propertyId}/forecasting`}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            Predictive Forecast
          </Link>
          <Link
            href="/app/work-orders"
            className="px-3.5 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] shadow-md shadow-[#79566F]/20 transition-colors"
          >
            Dispatch Remediation &rarr;
          </Link>
        </div>
      </div>

      {/* Building Overview Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E6D5DC] shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#806C7B] block">Monitored Zones</span>
          <div className="text-2xl font-black text-[#493344] mt-0.5">{zones.length} Units &amp; Chases</div>
          <span className="text-[10px] text-[#79566F] font-semibold">Across {property?.number_of_floors || 4} Floors</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E6D5DC] shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#806C7B] block">Category 1 Hazards</span>
          <div className="text-2xl font-black text-[#C84661] mt-0.5">{criticalCount} Critical</div>
          <span className="text-[10px] text-[#C84661] font-bold">Awaab 24h statutory window</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E6D5DC] shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#806C7B] block">Active Work Orders</span>
          <div className="text-2xl font-black text-[#79566F] mt-0.5">{activeOrdersCount} Dispatched</div>
          <span className="text-[10px] text-[#806C7B]">PCA &amp; CIPHE Contractors</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E6D5DC] shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#806C7B] block">Structural Pipework</span>
          <div className="text-2xl font-black text-[#493344] mt-0.5">{property?.pipe_type || "Copper"}</div>
          <span className="text-[10px] text-[#4A8B71] font-semibold">Design life: 45 yrs</span>
        </div>
      </div>

      {/* Layer Controls & Floor Filter */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6D5DC] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Telemetry Layer Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#493344] mr-1">Telemetry Layer:</span>
          <button
            type="button"
            onClick={() => setActiveLayer("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeLayer === "all"
                ? "bg-[#79566F] text-white shadow-xs"
                : "bg-[#F8F9FD] text-[#806C7B] hover:text-[#493344]"
            }`}
          >
            Unified Twin
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("moisture")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
              activeLayer === "moisture"
                ? "bg-[#79566F] text-white shadow-xs"
                : "bg-[#F8F9FD] text-[#806C7B] hover:text-[#493344]"
            }`}
          >
            <DropletIcon size={13} />
            <span>Moisture Heatmap</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("acoustic")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
              activeLayer === "acoustic"
                ? "bg-[#C84661] text-white shadow-xs"
                : "bg-[#F8F9FD] text-[#806C7B] hover:text-[#493344]"
            }`}
          >
            <AcousticIcon size={13} />
            <span>Acoustic Riser</span>
          </button>
        </div>

        {/* Floor Level Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#493344] mr-1">Floor Elevation:</span>
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="text-xs font-bold text-[#493344] bg-[#F8F9FD] border border-[#E6D5DC] rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="all">All Structural Levels</option>
            <option value="4">Roof Level (Floor 4)</option>
            <option value="3">Floor 3 (Flat 14 Riser)</option>
            <option value="2">Floor 2 (Flat 10 Riser)</option>
            <option value="1">Floor 1 (Entrance &amp; Plant)</option>
            <option value="0">Sub-Floor Void (Basement)</option>
          </select>
        </div>
      </div>

      {/* Main Digital Twin Canvas + Zone Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Architectural Cross-Section SVG */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-[#E6D5DC] shadow-xs relative overflow-hidden">
          {/* Subtle architectural grid pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#79566F_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Canvas Top Bar */}
          <div className="flex items-center justify-between text-xs text-[#493344] pb-4 border-b border-[#E6D5DC] relative z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4A8B71] animate-pulse" />
              <span className="font-mono font-bold text-[#493344] uppercase text-[11px]">
                {property?.property_name || "Trinity Court"} &bull; Live Twin View
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#806C7B]">
              Interactive SVG Mesh &bull; Click any zone to inspect
            </span>
          </div>

          {/* Interactive Building Cross Section Visualizer */}
          <div className="mt-6 relative z-10 w-full aspect-4/3 max-h-[520px]">
            <svg
              viewBox="0 0 100 105"
              className="w-full h-full select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Building Structural Frame */}
              <rect
                x="8"
                y="5"
                width="84"
                height="95"
                rx="3"
                fill="none"
                stroke="#B995AD"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />

              {/* Floor Separation Grid Lines */}
              <line x1="8" y1="23" x2="92" y2="23" stroke="#E6D5DC" strokeWidth="0.8" />
              <line x1="8" y1="45" x2="92" y2="45" stroke="#E6D5DC" strokeWidth="0.8" />
              <line x1="8" y1="67" x2="92" y2="67" stroke="#E6D5DC" strokeWidth="0.8" />
              <line x1="8" y1="88" x2="92" y2="88" stroke="#E6D5DC" strokeWidth="0.8" />

              {/* Vertical Service Riser Stack Spine */}
              <rect
                x="44"
                y="10"
                width="12"
                height="80"
                fill="#DFCECF"
                opacity="0.4"
                stroke="#79566F"
                strokeWidth="0.5"
                strokeDasharray="1,1"
              />

              {/* Interactive Building Zones */}
              {filteredZones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                const colors = getRiskColor(zone.risk_level);

                return (
                  <g
                    key={zone.id}
                    onClick={() => setSelectedZone(zone)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    {/* Zone Boundary Box */}
                    <rect
                      x={zone.x}
                      y={zone.y}
                      width={zone.width}
                      height={zone.height}
                      rx="2"
                      className={`${
                        isSelected
                          ? "stroke-white stroke-[1.2] fill-[#79566F]/30 filter drop-shadow-md"
                          : `${colors.stroke} stroke-[0.8] ${colors.fill}/20 hover:fill-[#79566F]/20`
                      }`}
                    />

                    {/* Zone Code Label */}
                    <text
                      x={zone.x + 2}
                      y={zone.y + 4.5}
                      fontSize="2.6"
                      fontWeight="bold"
                      fill="#FFFFFF"
                      className="font-mono select-none"
                    >
                      {zone.zone_code}
                    </text>

                    {/* Telemetry pill */}
                    {activeLayer !== "acoustic" && zone.moisture_index > 0 && (
                      <g transform={`translate(${zone.x + 2}, ${zone.y + 7.5})`}>
                        <rect
                          width="14"
                          height="3.6"
                          rx="1"
                          fill={zone.risk_level === "critical" ? "#C84661" : "#79566F"}
                        />
                        <text
                          x="7"
                          y="2.6"
                          fontSize="2"
                          fontWeight="bold"
                          fill="#FFFFFF"
                          textAnchor="middle"
                          className="font-mono select-none"
                        >
                          {zone.moisture_index}% Moisture
                        </text>
                      </g>
                    )}

                    {/* Acoustic Frequency Node */}
                    {activeLayer !== "moisture" && zone.acoustic_freq_hz > 0 && (
                      <g transform={`translate(${zone.x + zone.width - 16}, ${zone.y + 7.5})`}>
                        <rect width="14" height="3.6" rx="1" fill="#79566F" />
                        <text
                          x="7"
                          y="2.6"
                          fontSize="2"
                          fontWeight="bold"
                          fill="#FFFFFF"
                          textAnchor="middle"
                          className="font-mono select-none"
                        >
                          {zone.acoustic_freq_hz} Hz
                        </text>
                      </g>
                    )}

                    {/* Pulsing Alert Indicator on Critical Zones */}
                    {zone.risk_level === "critical" && (
                      <circle
                        cx={zone.x + zone.width - 3}
                        cy={zone.y + 3}
                        r="1.8"
                        fill="#C84661"
                        className="animate-ping"
                      />
                    )}
                  </g>
                );
              })}

              {/* Pinned Surveyor Defect Annotations */}
              {annotations.map((ann, idx) => (
                <g key={ann.id || idx} transform={`translate(${ann.x}, ${ann.y})`}>
                  <circle r="2.2" fill="#79566F" stroke="#FFFFFF" strokeWidth="0.6" className="drop-shadow-sm cursor-pointer" />
                  <circle r="0.9" fill="#FFFFFF" />
                  <title>{`${(ann.defect_type || 'Defect').toUpperCase()}: ${ann.finding_note || ''}`}</title>
                </g>
              ))}
            </svg>
          </div>

          {/* Canvas Bottom Legend */}
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300 relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C84661]" />
                <span className="text-[#806C7B] text-[11px]">Critical Egress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B86B35]" />
                <span className="text-[#806C7B] text-[11px]">Elevated Moisture</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#79566F]" />
                <span className="text-[#806C7B] text-[11px]">Acoustic Leak Peak</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4A8B71]" />
                <span className="text-[#806C7B] text-[11px]">Nominal Dry Envelope</span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-[#B995AD]">Model: Salford 1974 Brick Cavity Twin</span>
          </div>
        </div>

        {/* Right 1 Col: Zone Inspector Flyout Drawer */}
        <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs flex flex-col justify-between">
          {selectedZone ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-[#E6D5DC]">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#79566F] uppercase block">
                    {selectedZone.zone_code} &bull; {selectedZone.floor_label}
                  </span>
                  <h3 className="text-base font-extrabold text-[#493344] mt-0.5">
                    {selectedZone.zone_name}
                  </h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${getRiskColor(selectedZone.risk_level).badge}`}>
                  {selectedZone.risk_level}
                </span>
              </div>

              {/* Real Telemetry Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E6D5DC]">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#806C7B]">
                    <DropletIcon size={12} className="text-[#79566F]" />
                    <span>Moisture Index</span>
                  </div>
                  <div className="text-xl font-black text-[#493344] mt-1">
                    {selectedZone.moisture_index}%
                  </div>
                  <span className="text-[9px] text-[#806C7B]">OpenCV Specular Sheen</span>
                </div>

                <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E6D5DC]">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#806C7B]">
                    <AcousticIcon size={12} className="text-[#79566F]" />
                    <span>Acoustic FFT</span>
                  </div>
                  <div className="text-xl font-black text-[#79566F] mt-1">
                    {selectedZone.acoustic_freq_hz > 0 ? `${selectedZone.acoustic_freq_hz} Hz` : "0 Hz"}
                  </div>
                  <span className="text-[9px] text-[#806C7B]">
                    {selectedZone.acoustic_freq_hz > 0 ? "Active Pipe Hiss" : "Quiescent Floor"}
                  </span>
                </div>
              </div>

              {/* Field Surveyor Notes */}
              <div className="p-3.5 bg-[#F8F9FD] rounded-xl border border-[#E6D5DC] text-xs">
                <span className="text-[10px] font-bold uppercase text-[#806C7B] block mb-1">Survey Diagnostics</span>
                <p className="text-[#493344] leading-relaxed">
                  {selectedZone.inspection_notes || "Structural components nominal with no elevated thermal anomalies."}
                </p>
              </div>

              {/* Photo Evidence Thumbnail if available */}
              {selectedZone.photo_url && (
                <div className="rounded-xl border border-[#E6D5DC] overflow-hidden bg-slate-900 p-1.5">
                  <div className="h-28 w-full rounded-lg overflow-hidden flex items-center justify-center bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedZone.photo_url}
                      alt={selectedZone.zone_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[9px] text-slate-300 block text-center mt-1 font-mono">
                    Flash Specular Optical Mapping &bull; {selectedZone.zone_code}
                  </span>
                </div>
              )}

              {/* Active Work Order / Remediation status */}
              <div className="p-3 bg-[#EEF2FF]/60 rounded-xl border border-[#79566F]/20 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#806C7B] block">Statutory Repairs</span>
                  <span className="font-bold text-[#493344]">
                    {selectedZone.active_work_orders > 0
                      ? `${selectedZone.active_work_orders} Dispatched Work Order`
                      : "0 Active Orders"}
                  </span>
                </div>
                <Link
                  href="/app/work-orders"
                  className="px-2.5 py-1 rounded-lg bg-[#79566F] text-white font-bold text-[10px] hover:bg-[#67475E]"
                >
                  View Order
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-[#806C7B]">
              Select any building zone from the digital twin canvas to view structural parameters.
            </div>
          )}

          {/* Quick Action Navigation */}
          <div className="mt-4 pt-3 border-t border-[#E6D5DC] space-y-2">
            <Link
              href={
                selectedZone?.latest_inspection_id
                  ? `/app/inspections/${selectedZone.latest_inspection_id}/report`
                  : `/app/inspections/INSP-2026-0914/report`
              }
              className="w-full py-2.5 rounded-xl border border-[#E6D5DC] hover:bg-[#F7EDE5] text-[#493344] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <FileTextIcon size={14} />
              <span>Generate Zone Forensic Dossier</span>
            </Link>

            <Link
              href={`/app/moisture-analysis?inspection=${selectedZone?.latest_inspection_id || "INSP-2026-0914"}`}
              className="w-full py-2.5 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-[#79566F]/20"
            >
              <DropletIcon size={14} />
              <span>Inspect Full OpenCV Heatmap</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Surveyor Inspection Annotation Modal */}
      {showAnnotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E6D5DC] shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E6D5DC] pb-3">
              <h3 className="text-sm font-bold text-[#493344]">Add Floor Plan Inspection Annotation</h3>
              <button
                onClick={() => setShowAnnotationModal(false)}
                className="text-[#806C7B] hover:text-[#493344]"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#493344] block mb-1">Target Zone / Room</label>
                <div className="p-2.5 rounded-xl bg-[#F7EDE5]/50 border border-[#E6D5DC] text-[#493344] font-semibold">
                  {selectedZone ? `${selectedZone.zone_name} (${selectedZone.zone_code})` : "General Building Envelope"}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#493344] block mb-1">Defect Category</label>
                <select
                  value={newDefectType}
                  onChange={(e) => setNewDefectType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
                >
                  <option value="moisture">Moisture &amp; Dampness Plume</option>
                  <option value="pipe_pinhole">Pressurized Supply Pipe Acoustic Leak</option>
                  <option value="wall_crack">Visible Wall Crack / Substrate Discontinuity</option>
                  <option value="mould_biofilm">Interstitial Condensation &amp; Mould</option>
                  <option value="peeling_paint">Coating Delamination / Peeling Paint</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#493344] block mb-1">Risk Classification</label>
                <select
                  value={newRiskLevel}
                  onChange={(e) => setNewRiskLevel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
                >
                  <option value="critical">Critical (Awaab's Law 24h statutory window)</option>
                  <option value="high">High (Priority 7-day remedial survey)</option>
                  <option value="moderate">Moderate (Standard inspection cycle)</option>
                  <option value="low">Low (Cosmetic / routine monitoring)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#493344] block mb-1">Surveyor Observation Note</label>
                <textarea
                  rows={3}
                  value={newFindingNote}
                  onChange={(e) => setNewFindingNote(e.target.value)}
                  placeholder="Record physical inspection findings, acoustic notes, or protimeter pin depth..."
                  className="w-full p-2.5 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] focus:outline-none focus:border-[#79566F]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E6D5DC]">
              <button
                onClick={() => setShowAnnotationModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#806C7B] hover:bg-[#F7EDE5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAnnotation}
                className="px-5 py-2 rounded-xl bg-[#79566F] hover:bg-[#63445A] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Annotation Pin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

