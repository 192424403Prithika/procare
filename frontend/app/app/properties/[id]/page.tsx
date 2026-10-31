/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  BuildingIcon,
  AlertTriangleIcon,
  DropletIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  MapPinIcon,
  WrenchIcon,
  FileCheckIcon,
} from "@/components/Icons";
import {
  fetchPropertyById,
  updateProperty,
  PropertyRecord,
} from "@/lib/services/propertyService";
import { fetchInspectionsByPropertyId, InspectionReport } from "@/lib/services/inspectionService";
import { fetchWorkOrdersByPropertyId, WorkOrderRecord } from "@/lib/services/workOrderService";
import { deleteProperty } from "@/lib/services/propertyService";
import { useRouter } from "next/navigation";
import { useRole } from "@/components/app/RoleContext";
import { apiClient } from "@/lib/apiClient";

function PropertyDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { role, profile } = useRole();

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<{ qr_code_image: string; scan_url: string; qr_token: string } | null>(null);

  const propertyId = (params?.id as string) || "";

  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");
  const [relatedInspections, setRelatedInspections] = useState<InspectionReport[]>([]);
  const [relatedWorkOrders, setRelatedWorkOrders] = useState<WorkOrderRecord[]>([]);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<PropertyRecord>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Check if opened with ?edit=true
  useEffect(() => {
    if (searchParams.get("edit") === "true" && (role === "admin" || role === "manager")) {
      setIsEditing(true);
    }
  }, [searchParams, role]);

  // Load property record and real linked data
  const loadData = async () => {
    if (!propertyId) return;
    setIsLoading(true);
    const data = await fetchPropertyById(propertyId);
    if (data) {
      setProperty(data);
      setEditForm(data);
    }
    setIsLoading(false);

    try {
      const [insps, wos] = await Promise.all([
        fetchInspectionsByPropertyId(propertyId),
        fetchWorkOrdersByPropertyId(propertyId),
      ]);
      setRelatedInspections(insps);
      setRelatedWorkOrders(wos);
    } catch (err) {
      console.warn("Failed to load linked records for property", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [propertyId]);

  const handleDelete = async () => {
    if (!property) return;
    if (!confirm(`Are you sure you want to delete property "${property.property_name}"? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteProperty(property.id);
      router.push("/app/properties");
    } catch (err) {
      alert("Failed to delete property.");
      setIsDeleting(false);
    }
  };

  // Contractor access restriction check:
  const isContractorRestricted =
    role === "contractor" &&
    !relatedWorkOrders.some(
      (w) => w.property_id === propertyId
    );

  const canEdit = role === "admin" || role === "manager";

  const handleEditChange = (
    field: keyof PropertyRecord,
    value: string | number | null
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateEdit = (): boolean => {
    const errors: Record<string, string> = {};
    if (!editForm.property_name?.trim()) {
      errors.property_name = "Property name is required.";
    }
    if (!editForm.address?.trim()) {
      errors.address = "Address is required.";
    }
    if (!editForm.postal_code?.trim()) {
      errors.postal_code = "Postal code is required.";
    }
    if (
      editForm.build_year &&
      (editForm.build_year < 1800 || editForm.build_year > new Date().getFullYear())
    ) {
      errors.build_year = `Year must be between 1800 and ${new Date().getFullYear()}.`;
    }
    if (
      editForm.number_of_floors &&
      (editForm.number_of_floors < 1 || editForm.number_of_floors > 60)
    ) {
      errors.number_of_floors = "Floors must be between 1 and 60.";
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEdit() || !property) return;

    setIsSaving(true);
    setSaveErrorMsg("");
    setSaveSuccessMsg("");

    try {
      const updated = await updateProperty(property.id, {
        property_name: editForm.property_name?.trim(),
        address: editForm.address?.trim(),
        postal_code: editForm.postal_code?.trim().toUpperCase(),
        latitude: editForm.latitude ? Number(editForm.latitude) : null,
        longitude: editForm.longitude ? Number(editForm.longitude) : null,
        building_type: editForm.building_type,
        build_year: Number(editForm.build_year),
        number_of_floors: Number(editForm.number_of_floors),
        pipe_type: editForm.pipe_type,
        roof_membrane_age: Number(editForm.roof_membrane_age),
        risk_level: editForm.risk_level,
        risk_score: editForm.risk_score ? Number(editForm.risk_score) : property.risk_score,
        inspection_status: editForm.inspection_status,
        notes: editForm.notes?.trim(),
      });

      if (updated) {
        setProperty(updated);
        setEditForm(updated);
        setSaveSuccessMsg("Property record updated and persisted to database successfully.");
        setTimeout(() => {
          setIsEditing(false);
          setSaveSuccessMsg("");
        }, 1200);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update property";
      setSaveErrorMsg(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-[#E6D5DC] text-center shadow-xs">
        <div className="w-8 h-8 border-3 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-[#493344]">Loading property record {propertyId}...</p>
        <p className="text-[11px] text-[#806C7B]">Querying database and associated telemetry</p>
      </div>
    );
  }

  // Contractor Isolation Guard
  if (isContractorRestricted) {
    return (
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#E6D5DC] text-center max-w-xl mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#FDF2F4] text-[#C84661] mx-auto flex items-center justify-center mb-4">
          <AlertTriangleIcon size={28} />
        </div>
        <h2 className="text-xl font-bold text-[#493344]">Access Restricted</h2>
        <div className="mt-2 text-xs text-[#806C7B] leading-relaxed">
          Under PropCare NW role-based access control, contractors do not have unrestricted property portfolio access.
          You may only inspect properties with active remediation work orders dispatched to your team.
        </div>
        <div className="mt-4 p-3 rounded-xl bg-[#F7EDE5] border border-[#E6D5DC] text-[11px] text-[#806C7B] font-mono">
          Property ID: {propertyId} &bull; Contractor Role: {profile.organization}
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/app/work-orders"
            className="px-4 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] transition-colors"
          >
            Go to My Dispatched Work Orders
          </Link>
          <Link
            href="/app/dashboard"
            className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Property Not Found State
  if (!property) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-[#E6D5DC] text-center max-w-lg mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-[#EFE4EC] text-[#79566F] mx-auto flex items-center justify-center mb-3">
          <BuildingIcon size={24} />
        </div>
        <h2 className="text-base font-bold text-[#493344]">Property Not Found</h2>
        <p className="text-xs text-[#806C7B] mt-1">
          No property record matches ID <span className="font-mono font-bold text-[#79566F]">{propertyId}</span>.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            href="/app/properties"
            className="px-4 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E]"
          >
            Back to Properties List
          </Link>
          {canEdit && (
            <Link
              href="/app/properties/new"
              className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5]"
            >
              Enroll New Property
            </Link>
          )}
        </div>
      </div>
    );
  }

  const healthScore = Math.max(10, 100 - property.risk_score);

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#806C7B]">
          <Link href="/app/properties" className="hover:text-[#79566F]">
            &larr; Back to Properties
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#493344]">{property.property_name}</span>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#79566F]/30 bg-[#EFE4EC] text-[#79566F] text-xs font-semibold hover:bg-[#79566F] hover:text-white transition-all cursor-pointer"
            >
              <SparklesIcon size={14} />
              <span>Edit Property</span>
            </button>
          )}

          {(role === "admin" || role === "inspector") && (
            <Link
              href={`/app/inspections/new?property=${property.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#79566F] text-white text-xs font-semibold hover:bg-[#67475E] transition-colors"
            >
              <DropletIcon size={14} />
              <span>Conduct Survey</span>
            </Link>
          )}

          <button
            onClick={async () => {
              setShowQRModal(true);
              if (property) {
                try {
                  const res = await apiClient.get<any>(`/api/v1/qr/properties/${property.id}`);
                  setQrData(res);
                } catch (err) {
                  console.warn("Failed to fetch property QR code:", err);
                }
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors cursor-pointer"
          >
            <span>QR Tag &amp; Card</span>
          </button>

          <Link
            href={`/app/properties/${property.id}/twin`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#79566F]/30 bg-[#EFE4EC] text-[#79566F] text-xs font-semibold hover:bg-[#79566F] hover:text-white transition-all"
          >
            <BuildingIcon size={14} />
            <span>Digital Twin</span>
          </Link>

          <Link
            href={`/app/properties/${property.id}/forecasting`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            <ClockIcon size={14} />
            <span>Maintenance Forecast</span>
          </Link>

          <Link
            href="/app/reports"
            className="px-3.5 py-2 rounded-xl border border-[#E6D5DC] bg-white text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            Export Pack
          </Link>
        </div>
      </div>

      {/* Main Header & Overview Card */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E6D5DC] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono font-bold text-[#79566F] bg-[#EFE4EC] px-2.5 py-1 rounded-md">
                {property.id}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  property.risk_level === "critical"
                    ? "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/20"
                    : property.risk_level === "high"
                    ? "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/20"
                    : property.risk_level === "moderate"
                    ? "bg-[#EFE4EC] text-[#B995AD] border border-[#B995AD]/20"
                    : "bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/20"
                }`}
              >
                <span>Risk Level: {property.risk_level} ({property.risk_score}/100)</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                  property.inspection_status === "Overdue"
                    ? "bg-[#FDF2F4] text-[#C84661]"
                    : property.inspection_status === "Pending Review"
                    ? "bg-[#FDF5ED] text-[#B86B35]"
                    : property.inspection_status === "Inspected"
                    ? "bg-[#EFF8F3] text-[#4A8B71]"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Status: {property.inspection_status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#493344] mt-3">
              {property.property_name}
            </h1>
            <p className="text-xs text-[#806C7B] mt-1.5 flex items-center gap-1.5">
              <MapPinIcon size={14} className="text-[#79566F]" />
              <span>{property.address}, {property.postal_code}</span>
              {property.latitude && property.longitude && (
                <span className="font-mono text-[#806C7B] ml-2">
                  ({property.latitude.toFixed(4)}°N, {Math.abs(property.longitude).toFixed(4)}°W)
                </span>
              )}
            </p>
          </div>

          {/* Quick Telemetry Widgets */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3.5 bg-[#F7EDE5] rounded-2xl text-center min-w-[120px] border border-[#E6D5DC]">
              <div className="text-[10px] uppercase font-bold text-[#806C7B]">Health Score</div>
              <div className={`text-xl font-black mt-0.5 ${healthScore >= 70 ? "text-[#4A8B71]" : healthScore >= 40 ? "text-[#B86B35]" : "text-[#C84661]"}`}>
                {healthScore}/100
              </div>
              <div className="text-[9px] text-[#806C7B]">Fabric integrity</div>
            </div>

            <div className="p-3.5 bg-[#F7EDE5] rounded-2xl text-center min-w-[120px] border border-[#E6D5DC]">
              <div className="text-[10px] uppercase font-bold text-[#806C7B]">Dew-Point Delta</div>
              <div className="text-xl font-black text-[#C84661] mt-0.5">
                0.9°C
              </div>
              <div className="text-[9px] text-[#806C7B]">Surface vs Air</div>
            </div>

            <div className="p-3.5 bg-[#F7EDE5] rounded-2xl text-center min-w-[120px] border border-[#E6D5DC]">
              <div className="text-[10px] uppercase font-bold text-[#806C7B]">Work Orders</div>
              <div className="text-xl font-black text-[#493344] mt-0.5">
                {relatedWorkOrders.length}
              </div>
              <div className="text-[9px] text-[#806C7B]">In remediation</div>
            </div>
          </div>
        </div>

        {/* Building Technical Specs Grid */}
        <div className="mt-6 pt-5 border-t border-[#E6D5DC] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <span className="text-[10px] uppercase text-[#806C7B] font-bold block">Building Typology</span>
            <span className="font-semibold text-[#493344] block mt-0.5 truncate" title={property.building_type}>
              {property.building_type}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-[#806C7B] font-bold block">Construction Era</span>
            <span className="font-semibold text-[#493344] block mt-0.5">Year {property.build_year}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-[#806C7B] font-bold block">Floors / Storeys</span>
            <span className="font-semibold text-[#493344] block mt-0.5">{property.number_of_floors} Floors</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-[#806C7B] font-bold block">Plumbing Pipes</span>
            <span className="font-semibold text-[#493344] block mt-0.5">{property.pipe_type}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-[#806C7B] font-bold block">Roof Membrane Age</span>
            <span className="font-semibold text-[#493344] block mt-0.5">{property.roof_membrane_age} Years</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-[#806C7B] font-bold block">Last Forensic Audit</span>
            <span className="font-semibold text-[#493344] block mt-0.5 truncate">{property.last_inspected}</span>
          </div>
        </div>

        {/* Additional Notes Banner */}
        {property.notes && (
          <div className="mt-5 p-3.5 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] text-xs">
            <span className="font-bold text-[#493344] block mb-0.5">Technical &amp; Surveyor Notes:</span>
            <p className="text-[#806C7B] leading-relaxed">{property.notes}</p>
          </div>
        )}
      </div>

      {/* Two-Column Layout: Left (Inspections & Work Orders) | Right (Health Summary & Microclimate) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Forensic Surveys and Work Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Multi-Modal Inspection Records */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#493344]">Forensic Inspection History</h2>
                <p className="text-xs text-[#806C7B]">OpenCV visual difference and acoustic FFT spectral evidence</p>
              </div>
              {(role === "admin" || role === "inspector") && (
                <Link
                  href={`/app/inspections/new?property=${property.id}`}
                  className="text-xs font-semibold text-[#79566F] hover:underline"
                >
                  + New Audit
                </Link>
              )}
            </div>

            {relatedInspections.length > 0 ? (
              <div className="space-y-3">
                {relatedInspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="p-4 rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5]/50 hover:border-[#79566F]/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#493344]">{insp.inspection_zone}</span>
                          <span className="text-[10px] font-mono text-[#79566F]">{insp.id}</span>
                        </div>
                        <p className="text-[11px] text-[#806C7B] mt-0.5">
                          Surveyed by {insp.inspector_name} &bull; {new Date(insp.created_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                          insp.risk_level === "critical"
                            ? "bg-[#FDF2F4] text-[#C84661]"
                            : insp.risk_level === "high"
                            ? "bg-[#FDF5ED] text-[#B86B35]"
                            : "bg-[#EFF8F3] text-[#4A8B71]"
                        }`}
                      >
                        {insp.risk_level} risk
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {insp.symptom_tags?.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-white border border-[#E6D5DC] text-[10px] text-[#493344]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {insp.notes && (
                      <p className="mt-2 text-xs text-[#806C7B] bg-white p-2.5 rounded-xl border border-[#E6D5DC]">
                        {insp.notes}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-[#E6D5DC]">
                      <div className="flex items-center gap-3 text-[#806C7B]">
                        <span>Moisture: <strong className="text-[#493344]">{insp.ambient_moisture_index ? `${insp.ambient_moisture_index}%` : "Pending"}</strong></span>
                        <span>Reflection: <strong className="text-[#493344]">{insp.flash_reflection_score ? `${insp.flash_reflection_score}%` : "Pending"}</strong></span>
                        <span>FFT Peak: <strong className="text-[#493344]">{insp.acoustic_leak_frequency_hz ? `${insp.acoustic_leak_frequency_hz} Hz` : "Pending"}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/app/inspections/${insp.id}`}
                          className="font-semibold text-[#79566F] hover:underline"
                        >
                          View Details &rarr;
                        </Link>
                        <Link
                          href={`/app/inspections/${insp.id}/report`}
                          className="font-semibold text-[#806C7B] hover:text-[#493344]"
                        >
                          Dossier
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[#806C7B] bg-[#F7EDE5]/50 rounded-2xl border border-dashed border-[#E6D5DC]">
                <FileCheckIcon size={24} className="mx-auto text-[#806C7B] mb-2 opacity-50" />
                <p className="font-semibold text-[#493344]">No forensic inspection audits recorded yet.</p>
                <p className="text-[11px] mt-0.5">Use the button above to conduct the initial OpenCV &amp; acoustic baseline survey.</p>
              </div>
            )}
          </div>

          {/* Section: Associated Work Orders & Remediation */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#493344]">Maintenance History &amp; Work Orders</h2>
                <p className="text-xs text-[#806C7B]">Contractor assignments, statutory repair progress and cost estimates</p>
              </div>
              <Link
                href="/app/work-orders"
                className="text-xs font-semibold text-[#79566F] hover:underline"
              >
                All Orders &rarr;
              </Link>
            </div>

            {relatedWorkOrders.length > 0 ? (
              <div className="space-y-3">
                {relatedWorkOrders.map((wo) => (
                  <div
                    key={wo.id}
                    className="p-4 rounded-2xl border border-[#E6D5DC] bg-[#F7EDE5]/50 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#493344]">{wo.trade_type}</span>
                        <span className="text-[10px] font-mono text-[#79566F]">{wo.id}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#B86B35]/10 text-[#B86B35]">
                          {wo.priority}
                        </span>
                      </div>
                      <p className="text-xs text-[#806C7B] mt-1">{wo.issue_description}</p>
                      <div className="mt-2 text-[11px] text-[#806C7B] flex flex-wrap gap-x-3">
                        <span>Assigned: <strong className="text-[#493344]">{wo.contractor_name}</strong></span>
                        <span>Deadline: <strong className="text-[#493344]">{new Date(wo.deadline_date).toLocaleDateString("en-GB")}</strong></span>
                        <span>Estimate: <strong className="text-[#493344]">£{Number(wo.cost_estimate).toFixed(2)}</strong></span>
                      </div>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg bg-[#79566F] text-white">
                      {wo.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[#806C7B] bg-[#F7EDE5]/50 rounded-2xl border border-dashed border-[#E6D5DC]">
                <WrenchIcon size={24} className="mx-auto text-[#806C7B] mb-2 opacity-50" />
                <p className="font-semibold text-[#493344]">Zero active maintenance work orders.</p>
                <p className="text-[11px] mt-0.5">All structural envelope components are operating within normal tolerances.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Health Summary & Microclimate */}
        <div className="space-y-6">
          {/* Property Health Summary */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
            <h2 className="text-base font-bold text-[#493344] mb-1">Property Health Summary</h2>
            <p className="text-xs text-[#806C7B] mb-4">Multi-factor structural integrity composite</p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#806C7B]">Overall Fabric Score:</span>
                  <span className="font-bold text-[#493344]">{healthScore}%</span>
                </div>
                <div className="w-full bg-[#E6D5DC] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      healthScore >= 70 ? "bg-[#4A8B71]" : healthScore >= 40 ? "bg-[#B86B35]" : "bg-[#C84661]"
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#806C7B]">Moisture Saturation Index:</span>
                  <span className="font-bold text-[#C84661]">{property.risk_score}%</span>
                </div>
                <div className="w-full bg-[#E6D5DC] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#C84661]"
                    style={{ width: `${property.risk_score}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#806C7B]">Acoustic Leak Probability:</span>
                  <span className="font-bold text-[#B86B35]">
                    {property.pipe_type.includes("Steel") || property.pipe_type.includes("Cast") ? "72%" : "34%"}
                  </span>
                </div>
                <div className="w-full bg-[#E6D5DC] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#B86B35]"
                    style={{
                      width: property.pipe_type.includes("Steel") || property.pipe_type.includes("Cast") ? "72%" : "34%",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Awaab's Law Compliance Notice */}
            <div className="mt-5 p-3.5 rounded-2xl bg-[#FDF5ED] border border-[#B86B35]/30 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#B86B35]">
                <ClockIcon size={14} />
                <span>Awaab&apos;s Law Statutory Compliance</span>
              </div>
              <p className="mt-1 text-[11px] text-[#493344]">
                {property.risk_level === "critical"
                  ? "Statutory 24-hour mandatory emergency investigation clock active. Landlords must remediate severe mould or damp hazards within strict regulatory timelines."
                  : "Routine compliance monitoring active. Schedule quarterly thermal envelope audit before the heating season."}
              </p>
            </div>
          </div>

          {/* Microclimate Telemetry */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#493344]">Open-Meteo Telemetry</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDFBFB] text-[#B995AD] border border-[#B995AD]/30">
                Live Station
              </span>
            </div>
            <p className="text-xs text-[#806C7B] mb-4">
              Localised meteorological telemetry for {property.postal_code}
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-[#F7EDE5] rounded-2xl flex items-center justify-between text-xs">
                <span className="text-[#806C7B]">Ambient Air Temperature:</span>
                <span className="font-bold text-[#493344]">11.4 °C</span>
              </div>
              <div className="p-3 bg-[#F7EDE5] rounded-2xl flex items-center justify-between text-xs">
                <span className="text-[#806C7B]">External Relative Humidity:</span>
                <span className="font-bold text-[#493344]">88%</span>
              </div>
              <div className="p-3 bg-[#F7EDE5] rounded-2xl flex items-center justify-between text-xs">
                <span className="text-[#806C7B]">Calculated Dew Point:</span>
                <span className="font-bold text-[#C84661]">9.5 °C</span>
              </div>
              <div className="p-3 bg-[#F7EDE5] rounded-2xl flex items-center justify-between text-xs">
                <span className="text-[#806C7B]">Internal Wall Surface Temp:</span>
                <span className="font-bold text-[#493344]">10.4 °C</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6D5DC]">
              <Link
                href="/app/weather"
                className="w-full inline-flex justify-center items-center gap-1.5 py-2 px-3 rounded-xl bg-[#EFE4EC] text-[#79566F] text-xs font-semibold hover:bg-[#79566F] hover:text-white transition-colors"
              >
                <span>View Full Meteorological Model</span>
                <ArrowRightIcon size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROPERTY MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E6D5DC] shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E6D5DC]">
              <div>
                <h3 className="text-lg font-bold text-[#493344]">Edit Property Details</h3>
                <p className="text-xs text-[#806C7B]">
                  Update asset specs and persist modifications to PropCare database
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-[#806C7B] hover:text-[#493344] p-1 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {saveErrorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-[#FDF2F4] border border-[#C84661]/30 text-xs text-[#C84661] flex items-center gap-2">
                <AlertTriangleIcon size={16} />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            {saveSuccessMsg && (
              <div className="mt-4 p-3 rounded-xl bg-[#EFF8F3] border border-[#4A8B71]/30 text-xs text-[#4A8B71] flex items-center gap-2">
                <CheckCircleIcon size={16} />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#493344]">Property Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.property_name || ""}
                  onChange={(e) => handleEditChange("property_name", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
                {editErrors.property_name && (
                  <span className="text-[10px] text-[#C84661] mt-1 block font-semibold">{editErrors.property_name}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#493344]">Address *</label>
                  <input
                    type="text"
                    required
                    value={editForm.address || ""}
                    onChange={(e) => handleEditChange("address", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  />
                  {editErrors.address && (
                    <span className="text-[10px] text-[#C84661] mt-1 block font-semibold">{editErrors.address}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344]">Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={editForm.postal_code || ""}
                    onChange={(e) => handleEditChange("postal_code", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] font-mono focus:border-[#79566F] focus:outline-none"
                  />
                  {editErrors.postal_code && (
                    <span className="text-[10px] text-[#C84661] mt-1 block font-semibold">{editErrors.postal_code}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#493344]">Building Typology</label>
                  <input
                    type="text"
                    value={editForm.building_type || ""}
                    onChange={(e) => handleEditChange("building_type", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#493344]">Build Year</label>
                    <input
                      type="number"
                      value={editForm.build_year || 1980}
                      onChange={(e) => handleEditChange("build_year", Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#493344]">Floors</label>
                    <input
                      type="number"
                      value={editForm.number_of_floors || 4}
                      onChange={(e) => handleEditChange("number_of_floors", Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#493344]">Plumbing Pipe Type</label>
                  <select
                    value={editForm.pipe_type || "Copper"}
                    onChange={(e) => handleEditChange("pipe_type", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  >
                    <option value="Copper">Copper</option>
                    <option value="Multilayer PEX">Multilayer PEX</option>
                    <option value="Galvanized Steel">Galvanized Steel</option>
                    <option value="Cast Iron">Cast Iron</option>
                    <option value="Polybutylene (PB)">Polybutylene (PB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344]">Roof Membrane Age (Years)</label>
                  <input
                    type="number"
                    value={editForm.roof_membrane_age ?? 5}
                    onChange={(e) => handleEditChange("roof_membrane_age", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#493344]">Risk Level</label>
                  <select
                    value={editForm.risk_level || "low"}
                    onChange={(e) =>
                      handleEditChange("risk_level", e.target.value as PropertyRecord["risk_level"])
                    }
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="moderate">Moderate</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344]">Inspection Status</label>
                  <select
                    value={editForm.inspection_status || "Pending Review"}
                    onChange={(e) =>
                      handleEditChange("inspection_status", e.target.value as PropertyRecord["inspection_status"])
                    }
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  >
                    <option value="Pending Review">Pending Review</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Inspected">Inspected</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493344]">Structural Notes</label>
                <textarea
                  rows={3}
                  value={editForm.notes || ""}
                  onChange={(e) => handleEditChange("notes", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E6D5DC] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#79566F] text-white text-xs font-bold hover:bg-[#67475E] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Property QR Tag & Identifier Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E6D5DC] shadow-xl p-6 space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E6D5DC] pb-3">
              <h3 className="text-sm font-bold text-[#493344]">Property Physical QR Tag</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-[#806C7B] hover:text-[#493344] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {qrData?.qr_code_image ? (
              <div className="space-y-3">
                <div className="p-3 bg-[#F7EDE5]/40 rounded-xl border border-[#E6D5DC] inline-block">
                  <img
                    src={qrData.qr_code_image}
                    alt="Property QR"
                    className="w-48 h-48 mx-auto object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#493344]">{property?.property_name}</h4>
                  <p className="text-[11px] text-[#806C7B]">{property?.address}, {property?.postal_code}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#EFF8F3] text-[10px] text-[#285A44] border border-[#4A8B71]/20">
                  Cryptographically signed QR token. Scanning opens authorized inspection session without exposing private tenant records.
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={qrData.qr_code_image}
                    download={`QR_${property?.property_name?.replace(/\s+/g, "_")}.png`}
                    className="flex-1 py-2 px-3 bg-[#79566F] hover:bg-[#63445A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Download QR
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2 px-3 border border-[#E6D5DC] bg-white hover:bg-[#F7EDE5] text-[#493344] text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Print Tag Card
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-xs text-[#806C7B]">
                <div className="w-6 h-6 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Generating cryptographically signed QR identifier...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PropertyDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white p-12 rounded-3xl border border-[#E6D5DC] text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-[#493344]">Loading Property...</p>
        </div>
      }
    >
      <PropertyDetailContent />
    </Suspense>
  );
}
