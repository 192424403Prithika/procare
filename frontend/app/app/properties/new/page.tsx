"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BuildingIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  SparklesIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "@/components/Icons";
import { createProperty } from "@/lib/services/propertyService";
import { useRole } from "@/components/app/RoleContext";

export default function NewPropertyPage() {
  const router = useRouter();
  const { profile } = useRole();

  // Form State
  const [propertyName, setPropertyName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState("53.4808");
  const [longitude, setLongitude] = useState("-2.2426");
  const [buildingType, setBuildingType] = useState("Multi-Storey Social Housing");
  const [buildYear, setBuildYear] = useState<number>(1985);
  const [numberOfFloors, setNumberOfFloors] = useState<number>(4);
  const [pipeType, setPipeType] = useState("Copper");
  const [roofMembraneAge, setRoofMembraneAge] = useState<number>(6);
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!propertyName.trim()) {
      errors.propertyName = "Property name is required.";
    }
    if (!address.trim()) {
      errors.address = "Full street address is required.";
    }
    if (!postalCode.trim()) {
      errors.postalCode = "Postal code is required (e.g. M3 5LE).";
    } else if (!/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(postalCode.trim())) {
      errors.postalCode = "Please provide a valid UK postal code format.";
    }
    if (!buildYear || buildYear < 1800 || buildYear > new Date().getFullYear()) {
      errors.buildYear = `Build year must be between 1800 and ${new Date().getFullYear()}.`;
    }
    if (!numberOfFloors || numberOfFloors < 1 || numberOfFloors > 60) {
      errors.numberOfFloors = "Number of floors must be between 1 and 60.";
    }
    if (roofMembraneAge < 0 || roofMembraneAge > 50) {
      errors.roofMembraneAge = "Roof membrane age must be between 0 and 50 years.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setSuccessMsg("");

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const created = await createProperty({
        property_name: propertyName.trim(),
        address: address.trim(),
        postal_code: postalCode.trim().toUpperCase(),
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        building_type: buildingType,
        build_year: Number(buildYear),
        number_of_floors: Number(numberOfFloors),
        pipe_type: pipeType,
        roof_membrane_age: Number(roofMembraneAge),
        risk_level: "low",
        risk_score: 20,
        inspection_status: "Scheduled",
        last_inspected: "Pending initial baseline audit",
        notes: notes.trim(),
        created_by: profile.email,
      });

      setIsLoading(false);
      setSuccessMsg(`Property "${created.property_name}" enrolled successfully with unique ID: ${created.id}! Redirecting to property profile...`);

      setTimeout(() => {
        router.push(`/app/properties/${created.id}`);
      }, 900);
    } catch (err: unknown) {
      setIsLoading(false);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to register property. Please check input parameters.";
      setGeneralError(message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/properties" className="hover:text-[#79566F]">
              &larr; Back to Properties
            </Link>
            <span>/</span>
            <span>Enrollment Portal</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Register New Property Unit
          </h1>
          <p className="text-xs text-[#806C7B]">
            Enrolls building specs into the OpenCV difference and Open-Meteo microclimate monitoring schedules
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EFE4EC] text-[#79566F] border border-[#79566F]/20">
          <ShieldCheckIcon size={14} />
          <span>Officer: {profile.name}</span>
        </span>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6D5DC] shadow-xs">
        {generalError && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FDF2F4] border border-[#C84661]/30 text-xs text-[#C84661] flex items-start gap-2.5">
            <AlertTriangleIcon size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Submission Error:</strong> {generalError}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-[#EFF8F3] border border-[#4A8B71]/30 text-xs text-[#4A8B71] flex items-start gap-2.5">
            <CheckCircleIcon size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Success:</strong> {successMsg}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Property Location & Identification */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-[#E6D5DC] mb-4">
              <BuildingIcon size={18} className="text-[#79566F]" />
              <h2 className="text-sm font-bold text-[#493344]">
                1. Property Identification &amp; Address
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#493344]">
                  Property Name / Estate Block <span className="text-[#C84661]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Irwell Reach Apartments Block B"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  className={`mt-1 w-full rounded-xl border p-2.5 text-xs text-[#493344] focus:outline-none ${
                    validationErrors.propertyName
                      ? "border-[#C84661] bg-[#FDF2F4]"
                      : "border-[#E6D5DC] focus:border-[#79566F]"
                  }`}
                />
                {validationErrors.propertyName && (
                  <span className="text-[10px] text-[#C84661] mt-1 block font-semibold">
                    {validationErrors.propertyName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#493344]">
                    Full Street Address <span className="text-[#C84661]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 54 Silk Street, Salford"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`mt-1 w-full rounded-xl border p-2.5 text-xs text-[#493344] focus:outline-none ${
                      validationErrors.address
                        ? "border-[#C84661] bg-[#FDF2F4]"
                        : "border-[#E6D5DC] focus:border-[#79566F]"
                    }`}
                  />
                  {validationErrors.address && (
                    <span className="text-[10px] text-[#C84661] mt-1 block font-semibold">
                      {validationErrors.address}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344]">
                    Postal Code <span className="text-[#C84661]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M3 6LN"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className={`mt-1 w-full rounded-xl border p-2.5 text-xs text-[#493344] font-mono focus:outline-none ${
                      validationErrors.postalCode
                        ? "border-[#C84661] bg-[#FDF2F4]"
                        : "border-[#E6D5DC] focus:border-[#79566F]"
                    }`}
                  />
                  {validationErrors.postalCode && (
                    <span className="text-[10px] text-[#C84661] mt-1 block font-semibold">
                      {validationErrors.postalCode}
                    </span>
                  )}
                </div>
              </div>

              {/* Coordinates for Open-Meteo Integration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#493344]">
                    Latitude (Decimal Degrees)
                  </label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="53.4808"
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] font-mono focus:border-[#79566F] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#806C7B] mt-1 block">
                    Used for localized Open-Meteo weather station correlation
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344]">
                    Longitude (Decimal Degrees)
                  </label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="-2.2426"
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] font-mono focus:border-[#79566F] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#806C7B] mt-1 block">
                    Greater Manchester default: -2.2426
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Building Typology & Fabric */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-[#E6D5DC] mb-4">
              <SparklesIcon size={18} className="text-[#B995AD]" />
              <h2 className="text-sm font-bold text-[#493344]">
                2. Architectural Typology &amp; Structural Fabric
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#493344]">
                  Building Type <span className="text-[#C84661]">*</span>
                </label>
                <select
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                >
                  <option value="Multi-Storey Social Housing">Multi-Storey Social Housing</option>
                  <option value="High-Rise Residential (Concrete Frame)">High-Rise Residential (Concrete Frame)</option>
                  <option value="Victorian Solid Brick Conversion">Victorian Solid Brick Conversion</option>
                  <option value="Modern Steel Frame (Low-Rise)">Modern Steel Frame (Low-Rise)</option>
                  <option value="Community Housing (Timber Frame)">Community Housing (Timber Frame)</option>
                  <option value="Inter-war Cavity Brick">Inter-war Cavity Brick</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493344]">
                  Construction Year <span className="text-[#C84661]">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={buildYear}
                  onChange={(e) => setBuildYear(Number(e.target.value))}
                  className={`mt-1 w-full rounded-xl border p-2.5 text-xs text-[#493344] focus:outline-none ${
                    validationErrors.buildYear
                      ? "border-[#C84661] bg-[#FDF2F4]"
                      : "border-[#E6D5DC] focus:border-[#79566F]"
                  }`}
                />
                {validationErrors.buildYear && (
                  <span className="text-[10px] text-[#C84661] mt-1 block font-semibold">
                    {validationErrors.buildYear}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493344]">
                  Number of Floors <span className="text-[#C84661]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={60}
                  value={numberOfFloors}
                  onChange={(e) => setNumberOfFloors(Number(e.target.value))}
                  className={`mt-1 w-full rounded-xl border p-2.5 text-xs text-[#493344] focus:outline-none ${
                    validationErrors.numberOfFloors
                      ? "border-[#C84661] bg-[#FDF2F4]"
                      : "border-[#E6D5DC] focus:border-[#79566F]"
                  }`}
                />
                {validationErrors.numberOfFloors && (
                  <span className="text-[10px] text-[#C84661] mt-1 block font-semibold">
                    {validationErrors.numberOfFloors}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Plumbing & Envelope Engineering */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-[#E6D5DC] mb-4">
              <MapPinIcon size={18} className="text-[#B995AD]" />
              <h2 className="text-sm font-bold text-[#493344]">
                3. Plumbing Infrastructure &amp; Moisture Risk Profile
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#493344]">
                  Primary Plumbing Pipe Type <span className="text-[#C84661]">*</span>
                </label>
                <select
                  value={pipeType}
                  onChange={(e) => setPipeType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                >
                  <option value="Copper">Copper (Standard 15/22mm)</option>
                  <option value="Multilayer PEX">Multilayer PEX Barrier Pipe</option>
                  <option value="Galvanized Steel">Galvanized Steel (Legacy Riser)</option>
                  <option value="Cast Iron">Cast Iron (Drainage &amp; Stacks)</option>
                  <option value="Polybutylene (PB)">Polybutylene (PB)</option>
                </select>
                <span className="text-[10px] text-[#806C7B] mt-1 block">
                  Calibrates acoustic leak resonance frequencies (e.g. Copper 900-1500 Hz)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493344]">
                  Roof Membrane / Damp Proof Age (Years) <span className="text-[#C84661]">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={roofMembraneAge}
                  onChange={(e) => setRoofMembraneAge(Number(e.target.value))}
                  className={`mt-1 w-full rounded-xl border p-2.5 text-xs text-[#493344] focus:outline-none ${
                    validationErrors.roofMembraneAge
                      ? "border-[#C84661] bg-[#FDF2F4]"
                      : "border-[#E6D5DC] focus:border-[#79566F]"
                  }`}
                />
                {validationErrors.roofMembraneAge && (
                  <span className="text-[10px] text-[#C84661] mt-1 block font-semibold">
                    {validationErrors.roofMembraneAge}
                  </span>
                )}
                <span className="text-[10px] text-[#806C7B] mt-1 block">
                  Weighted in overall interstitial condensation risk triage
                </span>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-[#493344]">
                Additional Structural Notes &amp; Historical Context
              </label>
              <textarea
                rows={3}
                placeholder="Prior damp treatment history, known cold bridges, tenant vulnerability notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-[#E6D5DC] flex items-center justify-between">
            <Link
              href="/app/properties"
              className="px-4 py-2.5 rounded-xl border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-[#79566F] hover:bg-[#67475E] active:bg-[#4336D0] text-white text-xs font-bold shadow-md shadow-[#79566F]/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enrolling into Supabase...</span>
                </>
              ) : (
                <>
                  <span>Save Property Record</span>
                  <ArrowRightIcon size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
