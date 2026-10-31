"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  UsersIcon,
  SearchIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  WrenchIcon,
  ArrowRightIcon,
  XIcon,
  PlusIcon,
  ClockIcon,
  AlertTriangleIcon,
  FileCheckIcon,
  UploadCloudIcon,
  EyeIcon,
  RefreshCwIcon,
} from "@/components/Icons";
import {
  fetchContractors,
  registerContractor,
  reviewContractor,
  updateContractor,
  calculateActiveDeployments,
  ContractorRecord,
  RegisterContractorInput,
} from "@/lib/services/contractorService";
import {
  fetchWorkOrders,
  WorkOrderRecord,
  createWorkOrder,
} from "@/lib/services/workOrderService";
import { fetchProperties, PropertyRecord } from "@/lib/services/propertyService";
import { useRole } from "@/components/app/RoleContext";

export default function ContractorsPage() {
  const { role, profile } = useRole();
  const isAdmin = role === "admin";

  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const [contractors, setContractors] = useState<ContractorRecord[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [tradeFilter, setTradeFilter] = useState("all");

  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);
  const [regForm, setRegForm] = useState<RegisterContractorInput>({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    location: "",
    trade: "Damp & Mould Remediation",
    accreditation_details: "",
    document_file: null,
  });

  // Admin Review Modal State
  const [reviewingContractor, setReviewingContractor] = useState<ContractorRecord | null>(null);
  const [reviewAction, setReviewAction] = useState<"Approved" | "Rejected">("Approved");
  const [verifyAccreditation, setVerifyAccreditation] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Edit Contractor Modal State
  const [editingContractor, setEditingContractor] = useState<ContractorRecord | null>(null);
  const [editForm, setEditForm] = useState({
    contact_person: "",
    phone: "",
    email: "",
    location: "",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Dispatch Modal State
  const [selectedContractor, setSelectedContractor] = useState<ContractorRecord | null>(null);
  const [dispatchPropertyId, setDispatchPropertyId] = useState("");
  const [dispatchPriority, setDispatchPriority] = useState<"Emergency 24h" | "Urgent 7d" | "Standard 14d">("Urgent 7d");
  const [dispatchInstructions, setDispatchInstructions] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allContractors, allWorkOrders, allProps] = await Promise.all([
        fetchContractors(),
        fetchWorkOrders(),
        fetchProperties(),
      ]);
      setContractors(allContractors);
      setWorkOrders(allWorkOrders);
      setProperties(allProps);
      if (allProps.length > 0 && !dispatchPropertyId) {
        setDispatchPropertyId(allProps[0].id);
      }
    } catch (err) {
      console.error("Failed to load contractor network data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered lists
  const approvedContractors = contractors.filter((c) => c.verification_status === "Approved");
  const pendingContractors = contractors.filter((c) => c.verification_status === "Pending Verification");

  const displayedContractors = (activeTab === "approved" ? approvedContractors : pendingContractors).filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.company_name.toLowerCase().includes(q) ||
      c.trade.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.contact_person.toLowerCase().includes(q);

    const matchesTrade = tradeFilter === "all" || c.trade.toLowerCase().includes(tradeFilter.toLowerCase());
    return matchesSearch && matchesTrade;
  });

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRegistration(true);
    setRegistrationError(null);
    setRegistrationSuccess(null);

    try {
      const created = await registerContractor(regForm, profile.email);
      setRegistrationSuccess(
        `Registration for "${created.company_name}" submitted successfully. Your application status is "Pending Verification" awaiting administrator review.`
      );
      setRegForm({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        location: "",
        trade: "Damp & Mould Remediation",
        accreditation_details: "",
        document_file: null,
      });
      await loadData();
      setTimeout(() => {
        setIsRegisterOpen(false);
        setRegistrationSuccess(null);
      }, 3000);
    } catch (err) {
      setRegistrationError((err as Error).message || "Contractor registration failed.");
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  // Handle Admin Review Submit
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingContractor) return;

    setIsSubmittingReview(true);
    try {
      await reviewContractor(
        reviewingContractor.id,
        reviewAction,
        verifyAccreditation,
        adminNotes,
        profile.name
      );
      setReviewingContractor(null);
      setAdminNotes("");
      setVerifyAccreditation(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message || "Review submission failed.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContractor) return;

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await updateContractor(
        editingContractor.id,
        {
          contact_person: editForm.contact_person,
          phone: editForm.phone,
          email: editForm.email,
          location: editForm.location,
        },
        role,
        profile.email
      );
      setEditingContractor(null);
      await loadData();
    } catch (err) {
      setEditError((err as Error).message || "Update failed.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Dispatch Submit
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractor) return;

    setIsDispatching(true);
    try {
      const targetProp = properties.find((p) => p.id === dispatchPropertyId) || properties[0];
      const now = new Date();
      const deadline = new Date(now.getTime() + (dispatchPriority === "Emergency 24h" ? 24 : dispatchPriority === "Urgent 7d" ? 168 : 336) * 3600000);

      await createWorkOrder({
        property_id: targetProp?.id || "PROP-0914",
        property_name: targetProp?.property_name || "Authorized Property",
        zone: "Assigned Statutory Zone",
        contractor_id: selectedContractor.id,
        contractor_name: selectedContractor.company_name,
        trade_type: (selectedContractor.trade as any) || "Damp Remediation",
        priority: dispatchPriority,
        status: "Pending Dispatch",
        issue_description: dispatchInstructions || `Statutory dispatch for ${selectedContractor.trade}`,
        cost_estimate: 450.0,
        deadline_date: deadline.toISOString(),
      });

      setDispatchSuccess(true);
      await loadData();
      setTimeout(() => {
        setDispatchSuccess(false);
        setSelectedContractor(null);
        setDispatchInstructions("");
      }, 1800);
    } catch (err) {
      alert((err as Error).message || "Dispatch failed.");
    } finally {
      setIsDispatching(false);
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
            <span>Maintenance Logistics</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Accredited Contractor Network
          </h1>
          <p className="text-xs text-[#806C7B]">
            Real database of verified specialists in damp remediation, acoustic leak detection, and building services
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-all shadow-md shadow-[#79566F]/20 cursor-pointer"
          >
            <PlusIcon size={15} />
            <span>Register Contractor</span>
          </button>

          <Link
            href="/app/contractors/analytics"
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            SLA Performance Analytics
          </Link>
          <Link
            href="/app/work-orders"
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
          >
            Work Orders &rarr;
          </Link>
        </div>
      </div>

      {/* Admin / Manager Queue Tabs */}
      <div className="flex items-center gap-3 border-b border-[#E6D5DC] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("approved")}
          className={`flex items-center gap-2 pb-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "approved"
              ? "border-[#79566F] text-[#79566F]"
              : "border-transparent text-[#806C7B] hover:text-[#493344]"
          }`}
        >
          <ShieldCheckIcon size={16} />
          <span>Approved Contractor Network</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#79566F]/10 text-[#79566F]">
            {approvedContractors.length}
          </span>
        </button>

        {(isAdmin || role === "manager" || pendingContractors.length > 0) && (
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 pb-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "pending"
                ? "border-[#B86B35] text-[#B86B35]"
                : "border-transparent text-[#806C7B] hover:text-[#493344]"
            }`}
          >
            <ClockIcon size={16} />
            <span>Verification Queue</span>
            {pendingContractors.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#B86B35] text-white font-bold animate-pulse">
                {pendingContractors.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6D5DC] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#806C7B]">
            <SearchIcon size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by company name, trade, location, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 pl-9 pr-3 text-xs text-[#493344] placeholder-[#806C7B] focus:border-[#79566F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#79566F]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-[#806C7B]">Specialty:</span>
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none cursor-pointer"
          >
            <option value="all">All Specialties</option>
            <option value="damp">Damp &amp; Mould Remediation</option>
            <option value="acoustic">Acoustic Leak Detection</option>
            <option value="plumbing">Plumbing &amp; Drainage</option>
            <option value="thermal">Thermal Insulation</option>
            <option value="ventilation">Mechanical Ventilation</option>
          </select>
        </div>
      </div>

      {/* Empty State when no approved contractors exist */}
      {!isLoading && activeTab === "approved" && approvedContractors.length === 0 && (
        <div className="bg-white p-12 rounded-3xl border border-[#E6D5DC] shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#F7EDE5] text-[#79566F] flex items-center justify-center mx-auto">
            <UsersIcon size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#493344]">No Approved Contractors in Network</h3>
            <p className="text-xs text-[#806C7B] max-w-md mx-auto">
              There are currently no approved accredited contractors in the directory. Contractors must register and undergo administrative verification before appearing in the active network.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-all shadow-md shadow-[#79566F]/20 cursor-pointer"
            >
              <PlusIcon size={16} />
              <span>Register Contractor</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State for Pending Queue */}
      {!isLoading && activeTab === "pending" && pendingContractors.length === 0 && (
        <div className="bg-white p-12 rounded-3xl border border-[#E6D5DC] shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF8F3] text-[#4A8B71] flex items-center justify-center mx-auto">
            <CheckCircleIcon size={24} />
          </div>
          <h3 className="text-base font-bold text-[#493344]">No Pending Contractor Registrations</h3>
          <p className="text-xs text-[#806C7B]">
            All submitted contractor registrations have been reviewed and processed.
          </p>
        </div>
      )}

      {/* Contractors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {displayedContractors.map((c) => {
          const activeDeployments = calculateActiveDeployments(c.company_name, workOrders);
          const isUserContractor = c.user_id === profile.email || c.email === profile.email;

          return (
            <div
              key={c.id}
              className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E6D5DC]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#493344]">{c.company_name}</h3>
                      <span className="text-[10px] font-mono text-[#79566F] bg-[#79566F]/10 px-2 py-0.5 rounded-md">
                        {c.id}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#79566F] mt-0.5">{c.trade}</div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      c.verification_status === "Approved"
                        ? "bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/30"
                        : c.verification_status === "Pending Verification"
                        ? "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/30"
                        : "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/30"
                    }`}
                  >
                    {c.verification_status}
                  </span>
                </div>

                {/* Real Data Details */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#806C7B]">
                    <UsersIcon size={14} className="text-[#79566F] shrink-0" />
                    <span>Contact: <strong className="text-[#493344]">{c.contact_person}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 text-[#806C7B]">
                    <MapPinIcon size={14} className="text-[#79566F] shrink-0" />
                    <span>Location: <strong className="text-[#493344]">{c.location}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 text-[#806C7B]">
                    <ShieldCheckIcon
                      size={14}
                      className={c.accreditation_verified ? "text-[#4A8B71] shrink-0" : "text-[#B86B35] shrink-0"}
                    />
                    <span>
                      Accreditation: <strong className="text-[#493344]">{c.accreditation_details}</strong>{" "}
                      {c.accreditation_verified ? (
                        <span className="text-[#4A8B71] font-bold text-[10px]">(Verified)</span>
                      ) : (
                        <span className="text-[#B86B35] text-[10px]">(Unverified)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[#806C7B]">
                    <PhoneIcon size={14} className="text-[#806C7B] shrink-0" />
                    <span className="font-mono">{c.phone}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[#806C7B]">
                    <MailIcon size={14} className="text-[#806C7B] shrink-0" />
                    <span>{c.email}</span>
                  </div>

                  {c.document_url && (
                    <div className="pt-1">
                      <a
                        href={c.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#79566F] hover:underline"
                      >
                        <FileCheckIcon size={13} />
                        <span>View Supporting Certificate &rarr;</span>
                      </a>
                    </div>
                  )}

                  {c.admin_notes && (
                    <div className="p-2 bg-[#F8F9FD] rounded-xl text-[11px] text-[#493344] border border-[#E6D5DC]">
                      <strong className="text-[#79566F]">Admin Note: </strong>
                      {c.admin_notes}
                    </div>
                  )}
                </div>

                {/* Real Deployments & Rating (No fake data) */}
                <div className="mt-4 p-3 bg-[#F7EDE5] rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#806C7B] block text-[10px] uppercase font-bold">Verified Rating</span>
                    <div className="font-bold text-[#493344]">
                      {c.rating !== null && c.rating !== undefined ? `⭐ ${c.rating.toFixed(1)} / 5.0` : "Not yet rated (New contractor)"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#806C7B] block text-[10px] uppercase font-bold">Active Deployments</span>
                    <div className="font-bold text-[#493344]">
                      {activeDeployments} active {activeDeployments === 1 ? "work order" : "work orders"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-[#E6D5DC] flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-[#806C7B]">
                  Standard SLA: Statutory 24h / 7d / 14d triage
                </span>

                <div className="flex items-center gap-2">
                  {/* Edit button: only for owner contractor or admin */}
                  {(isAdmin || isUserContractor) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingContractor(c);
                        setEditForm({
                          contact_person: c.contact_person,
                          phone: c.phone,
                          email: c.email,
                          location: c.location,
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl border border-[#E6D5DC] hover:bg-[#F7EDE5] text-[#493344] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  )}

                  {/* Admin review buttons for pending contractors */}
                  {isAdmin && c.verification_status === "Pending Verification" && (
                    <button
                      type="button"
                      onClick={() => {
                        setReviewingContractor(c);
                        setReviewAction("Approved");
                        setVerifyAccreditation(false);
                        setAdminNotes("");
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#4A8B71] hover:bg-[#3d735e] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Review &amp; Verify
                    </button>
                  )}

                  {/* Dispatch button: only for approved contractors */}
                  {c.verification_status === "Approved" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContractor(c);
                        setDispatchSuccess(false);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Dispatch Work Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. REGISTER CONTRACTOR MODAL */}
      {/* ========================================================================= */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E6D5DC] animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D5DC]">
              <div>
                <h3 className="text-base font-bold text-[#493344]">Register Contractor Organization</h3>
                <p className="text-xs text-[#806C7B]">Submit credentials for accreditation verification under Awaab&apos;s Law</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="p-1.5 text-[#806C7B] hover:text-[#493344] rounded-lg cursor-pointer"
              >
                <XIcon size={20} />
              </button>
            </div>

            {registrationError && (
              <div className="mt-3 p-3 bg-[#FDF2F4] border border-[#C84661]/30 rounded-xl text-xs text-[#C84661] flex items-center gap-2">
                <AlertTriangleIcon size={16} className="shrink-0" />
                <span>{registrationError}</span>
              </div>
            )}

            {registrationSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#4A8B71]/10 text-[#4A8B71] mx-auto flex items-center justify-center">
                  <CheckCircleIcon size={28} />
                </div>
                <h4 className="text-sm font-bold text-[#493344]">Application Submitted</h4>
                <p className="text-xs text-[#806C7B]">{registrationSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 mt-4">
                <div className="bg-[#FDF5ED] p-3 rounded-xl border border-[#B86B35]/30 text-xs text-[#B86B35]">
                  <strong>Verification Notice: </strong>
                  Submissions enter <strong>Pending Verification</strong> status. Accreditations must be manually verified by administrators before appearance in the approved directory.
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344]">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Fluid Dynamics Ltd"
                    value={regForm.company_name}
                    onChange={(e) => setRegForm({ ...regForm, company_name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#493344]">Contact Person *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. David Jenkins"
                      value={regForm.contact_person}
                      onChange={(e) => setRegForm({ ...regForm, contact_person: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#493344]">Business Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. operations@contractor.co.uk"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#493344]">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +44 161 902 4410"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#493344]">Operating Region / Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Salford & Manchester Central"
                      value={regForm.location}
                      onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344]">Primary Specialty / Trade *</label>
                  <select
                    value={regForm.trade}
                    onChange={(e) => setRegForm({ ...regForm, trade: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none cursor-pointer"
                  >
                    <option value="Damp & Mould Remediation">Damp &amp; Mould Remediation (PCA / PAS 2035)</option>
                    <option value="Acoustic Leak Detection & Plumbing">Acoustic Leak Detection &amp; Plumbing (CIPHE / Gas Safe)</option>
                    <option value="Plumbing & Drainage">Plumbing &amp; Drainage</option>
                    <option value="Thermal Envelope & Insulation">Thermal Envelope &amp; Cavity Insulation</option>
                    <option value="Mechanical Ventilation & MVHR">Mechanical Ventilation &amp; MVHR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344]">Accreditation Details &amp; Registration No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PCA Accredited Member #44012, Gas Safe Reg #58921"
                    value={regForm.accreditation_details}
                    onChange={(e) => setRegForm({ ...regForm, accreditation_details: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344]">Supporting Document / Certificate (PDF, PNG, JPG)</label>
                  <div className="mt-1 border border-dashed border-[#E6D5DC] rounded-xl p-3 bg-[#FAFAFC] text-center">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => setRegForm({ ...regForm, document_file: e.target.files?.[0] || null })}
                      className="text-xs text-[#806C7B] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#79566F] file:text-white cursor-pointer"
                    />
                    <span className="block text-[10px] text-[#806C7B] mt-1">
                      Max file size: 20 MB (Certificate of insurance, trade accreditation license)
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E6D5DC] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#806C7B] hover:bg-[#F7EDE5] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRegistration}
                    className="px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingRegistration ? "Submitting Registration..." : "Submit Registration"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADMIN REVIEW MODAL */}
      {/* ========================================================================= */}
      {reviewingContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6D5DC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D5DC]">
              <div>
                <h3 className="text-base font-bold text-[#493344]">Review Contractor Registration</h3>
                <p className="text-xs text-[#806C7B]">{reviewingContractor.company_name} ({reviewingContractor.id})</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingContractor(null)}
                className="p-1.5 text-[#806C7B] hover:text-[#493344] rounded-lg cursor-pointer"
              >
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#806C7B] block">Accreditation Submitted</span>
                <div className="p-2.5 bg-[#F7EDE5] rounded-xl font-bold text-[#493344] mt-1">
                  {reviewingContractor.accreditation_details}
                </div>
              </div>

              {reviewingContractor.document_url && (
                <div>
                  <a
                    href={reviewingContractor.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#79566F] hover:underline"
                  >
                    <FileCheckIcon size={14} />
                    <span>View Submitted Certificate (PDF/Image) &rarr;</span>
                  </a>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#493344]">Review Action</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setReviewAction("Approved")}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      reviewAction === "Approved"
                        ? "bg-[#EFF8F3] text-[#4A8B71] border-[#4A8B71]"
                        : "bg-white text-[#806C7B] border-[#E6D5DC]"
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("Rejected")}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      reviewAction === "Rejected"
                        ? "bg-[#FDF2F4] text-[#C84661] border-[#C84661]"
                        : "bg-white text-[#806C7B] border-[#E6D5DC]"
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {reviewAction === "Approved" && (
                <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E6D5DC] space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verifyAccreditation}
                      onChange={(e) => setVerifyAccreditation(e.target.checked)}
                      className="mt-0.5 rounded text-[#79566F] focus:ring-[#79566F]"
                    />
                    <span className="text-[11px] text-[#493344] leading-relaxed">
                      <strong>Verify Accreditation Credentials</strong>: Check this box only if you have confirmed this contractor&apos;s registration number against the official statutory register (e.g. PCA, Gas Safe, TrustMark).
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#493344]">Admin Review Notes</label>
                <textarea
                  rows={2}
                  placeholder="Record verification notes or reason for decision..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E6D5DC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingContractor(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#806C7B] hover:bg-[#F7EDE5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors cursor-pointer ${
                    reviewAction === "Approved" ? "bg-[#4A8B71] hover:bg-[#3b6f59]" : "bg-[#C84661] hover:bg-[#ab364f]"
                  }`}
                >
                  {isSubmittingReview ? "Processing..." : `Confirm ${reviewAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EDIT CONTRACTOR MODAL */}
      {/* ========================================================================= */}
      {editingContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6D5DC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D5DC]">
              <div>
                <h3 className="text-base font-bold text-[#493344]">Edit Contractor Contact Details</h3>
                <p className="text-xs text-[#806C7B]">{editingContractor.company_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingContractor(null)}
                className="p-1.5 text-[#806C7B] hover:text-[#493344] rounded-lg cursor-pointer"
              >
                <XIcon size={20} />
              </button>
            </div>

            {editError && (
              <div className="mt-3 p-3 bg-[#FDF2F4] border border-[#C84661]/30 rounded-xl text-xs text-[#C84661]">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-[#493344]">Contact Person</label>
                <input
                  type="text"
                  required
                  value={editForm.contact_person}
                  onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#493344]">Direct Phone Number</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#493344]">Business Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#493344]">Operating Location</label>
                <input
                  type="text"
                  required
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E6D5DC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingContractor(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#806C7B] hover:bg-[#F7EDE5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isSubmittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DISPATCH WORK ORDER MODAL */}
      {/* ========================================================================= */}
      {selectedContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6D5DC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D5DC]">
              <div>
                <h3 className="text-base font-bold text-[#493344]">Dispatch Contractor</h3>
                <p className="text-xs text-[#806C7B]">Issue statutory repair instruction under Awaab&apos;s Law</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContractor(null)}
                className="p-1.5 text-[#806C7B] hover:text-[#493344] rounded-lg cursor-pointer"
              >
                <XIcon size={20} />
              </button>
            </div>

            {dispatchSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#4A8B71]/10 text-[#4A8B71] mx-auto flex items-center justify-center">
                  <CheckCircleIcon size={28} />
                </div>
                <h4 className="text-sm font-bold text-[#493344]">Work Order Dispatched</h4>
                <p className="text-xs text-[#806C7B]">
                  Statutory instruction logged and assigned to <strong className="text-[#493344]">{selectedContractor.company_name}</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDispatchSubmit} className="space-y-3.5 mt-4 text-xs">
                <div>
                  <label className="block font-bold text-[#493344]">Assigned Specialist</label>
                  <div className="p-2.5 bg-[#F7EDE5] rounded-xl font-bold text-[#493344] mt-1 flex items-center justify-between">
                    <span>{selectedContractor.company_name}</span>
                    <span className="text-[10px] text-[#79566F] font-mono">{selectedContractor.trade}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#493344]">Target Subject Property *</label>
                  <select
                    value={dispatchPropertyId}
                    onChange={(e) => setDispatchPropertyId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none cursor-pointer"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.property_name} &bull; {p.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#493344]">Priority SLA SLA Window *</label>
                  <select
                    value={dispatchPriority}
                    onChange={(e) => setDispatchPriority(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none cursor-pointer"
                  >
                    <option value="Emergency 24h">Emergency 24-Hour (Statutory Awaab Emergency)</option>
                    <option value="Urgent 7d">Urgent 7-Day (Repair Commencement Window)</option>
                    <option value="Standard 14d">Standard 14-Day (Routine Maintenance)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#493344]">Scope &amp; Access Instructions</label>
                  <textarea
                    rows={2}
                    placeholder="Enter instructions for contractor..."
                    value={dispatchInstructions}
                    onChange={(e) => setDispatchInstructions(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-[#E6D5DC] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedContractor(null)}
                    className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#806C7B] hover:bg-[#F7EDE5] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDispatching}
                    className="px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {isDispatching ? "Logging Work Order..." : "Confirm Statutory Dispatch"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
