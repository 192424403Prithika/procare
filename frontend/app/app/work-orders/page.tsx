"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  WrenchIcon,
  SearchIcon,
  PlusIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingIcon,
  UsersIcon,
  XIcon,
  FileCheckIcon,
} from "@/components/Icons";
import { sampleWorkOrders, WorkOrder } from "@/lib/mockData";
import { useRole } from "@/components/app/RoleContext";

export default function WorkOrdersPage() {
  const { role, profile } = useRole();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(sampleWorkOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    propertyId: "PROP-0914",
    propertyName: "Trinity Court Blocks A-C",
    zone: "Unit 14 - Bathroom Wall Riser",
    issueDescription: "Acoustic leak detected. Pinhole moisture extraction needed.",
    tradeType: "Plumbing & Drainage" as WorkOrder["tradeType"],
    assignedContractor: "Apex Fluid Dynamics Ltd",
    priority: "Emergency 24h" as WorkOrder["priority"],
  });

  // Complete / Evidence Modal
  const [selectedOrderForEvidence, setSelectedOrderForEvidence] = useState<WorkOrder | null>(null);
  const [evidenceNote, setEvidenceNote] = useState("Pinhole copper fitting replaced with press-fit compression union. Ultrasonic test clean; 0dB leak resonance.");

  const filtered = workOrders.filter((wo) => {
    const matchesSearch =
      wo.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.issueDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.assignedContractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || wo.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const created: WorkOrder = {
      id: `WO-${Math.floor(8800 + Math.random() * 200)}`,
      propertyId: newOrder.propertyId,
      propertyName: newOrder.propertyName,
      zone: newOrder.zone,
      issueDescription: newOrder.issueDescription,
      tradeType: newOrder.tradeType,
      assignedContractor: newOrder.assignedContractor,
      priority: newOrder.priority,
      status: "In Progress",
      createdDate: new Date().toISOString().split("T")[0],
      deadlineDate: newOrder.priority === "Emergency 24h" ? "24 hours statutory" : "14 days",
      costEstimate: "£450.00",
    };

    setWorkOrders([created, ...workOrders]);
    setIsModalOpen(false);
  };

  const handleUpdateStatus = (id: string, newStatus: WorkOrder["status"], evidence?: string) => {
    setWorkOrders(
      workOrders.map((wo) =>
        wo.id === id ? { ...wo, status: newStatus, completionEvidence: evidence || wo.completionEvidence } : wo
      )
    );
    setSelectedOrderForEvidence(null);
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
            <span>Remediation Management</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Maintenance Work Orders &amp; Sign-off
          </h1>
          <p className="text-xs text-[#806C7B]">
            Contractor dispatch, real-time job progress tracking, and photographic evidence signoff
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Only Admin or Manager can issue new work orders */}
          {(role === "admin" || role === "manager") && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#79566F] text-white text-xs font-semibold shadow-md shadow-[#79566F]/20 hover:bg-[#67475E] transition-all cursor-pointer"
            >
              <PlusIcon size={14} />
              <span>Create Work Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6D5DC] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#806C7B]">
            <SearchIcon size={16} />
          </div>
          <input
            type="text"
            placeholder="Search work orders, properties, contractors, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 pl-9 pr-3 text-xs text-[#493344] placeholder-[#806C7B] focus:border-[#79566F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#79566F]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#806C7B]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Dispatch">Pending Dispatch</option>
              <option value="In Progress">In Progress</option>
              <option value="Awaiting Signoff">Awaiting Signoff</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#806C7B]">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="Emergency 24h">Emergency 24h</option>
              <option value="Urgent 7d">Urgent 7d</option>
              <option value="Standard 14d">Standard 14d</option>
            </select>
          </div>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="space-y-4">
        {filtered.map((wo) => (
          <div
            key={wo.id}
            className="bg-white p-5 rounded-3xl border border-[#E6D5DC] shadow-xs hover:border-[#79566F]/40 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E6D5DC]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#79566F]">{wo.id}</span>
                  <span className="text-sm font-bold text-[#493344]">{wo.propertyName}</span>
                  <span className="text-xs text-[#806C7B]">&bull; {wo.zone}</span>
                </div>
                <div className="text-[11px] text-[#806C7B] mt-0.5">
                  Assigned Contractor: <strong className="text-[#493344]">{wo.assignedContractor}</strong> &bull; Created: {wo.createdDate}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    wo.priority === "Emergency 24h"
                      ? "bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/20"
                      : wo.priority === "Urgent 7d"
                      ? "bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/20"
                      : "bg-[#EFE4EC] text-[#79566F] border border-[#79566F]/20"
                  }`}
                >
                  {wo.priority}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    wo.status === "Completed"
                      ? "bg-[#EFF8F3] text-[#4A8B71] border border-[#4A8B71]/30"
                      : wo.status === "In Progress"
                      ? "bg-[#79566F] text-white"
                      : "bg-[#FDF5ED] text-[#B86B35]"
                  }`}
                >
                  {wo.status}
                </span>
              </div>
            </div>

            {/* Issue Description & Trade */}
            <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="p-3 bg-[#F7EDE5] rounded-2xl flex-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#806C7B] block">
                  Remediation Scope &amp; Evidence:
                </span>
                <p className="text-[#493344] mt-0.5 font-medium">{wo.issueDescription}</p>
                {wo.completionEvidence && (
                  <div className="mt-2 text-[11px] text-[#4A8B71] bg-white p-2 rounded-xl border border-[#4A8B71]/20 font-medium">
                    Evidence Attached: {wo.completionEvidence}
                  </div>
                )}
              </div>

              <div className="p-3 bg-[#F7EDE5] rounded-2xl sm:min-w-[180px] text-xs">
                <div className="text-[10px] uppercase font-bold text-[#806C7B]">Trade &amp; Estimate</div>
                <div className="font-bold text-[#493344] mt-0.5">{wo.tradeType}</div>
                <div className="text-[#806C7B] font-mono mt-0.5">Est: {wo.costEstimate}</div>
              </div>
            </div>

            {/* Role-Aware Actions */}
            <div className="mt-4 pt-3 border-t border-[#E6D5DC] flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[11px] text-[#806C7B]">
                Deadline: <strong className="text-[#493344] font-mono">{wo.deadlineDate}</strong>
              </span>

              <div className="flex items-center gap-2">
                {/* Contractor can submit completion evidence */}
                {wo.status !== "Completed" && (role === "contractor" || role === "admin") && (
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForEvidence(wo)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Upload Completion Evidence
                  </button>
                )}

                {/* Property Manager or Admin can verify & sign off */}
                {wo.status !== "Completed" && (role === "manager" || role === "admin") && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStatus(
                        wo.id,
                        "Completed",
                        `Signed off by ${profile.name} (${profile.title}) after physical corroboration.`
                      )
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-[#4A8B71] hover:bg-[#1A8762] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Verify &amp; Close Order
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completion Evidence Modal */}
      {selectedOrderForEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6D5DC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D5DC]">
              <div>
                <h3 className="text-base font-bold text-[#493344]">Submit Completion Evidence</h3>
                <p className="text-xs text-[#806C7B]">
                  Order {selectedOrderForEvidence.id} &bull; {selectedOrderForEvidence.propertyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForEvidence(null)}
                className="p-1.5 text-[#806C7B] hover:text-[#493344] rounded-lg cursor-pointer"
              >
                <XIcon size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateStatus(selectedOrderForEvidence.id, "Completed", evidenceNote);
              }}
              className="space-y-3.5 mt-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#493344]">Completion Certification Note</label>
                <textarea
                  rows={3}
                  required
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#F7EDE5] rounded-2xl border border-[#E6D5DC] text-center">
                <span className="text-xs font-semibold text-[#79566F] block">
                  Photo Evidence: after_repair_fitting_0914.jpg attached
                </span>
                <span className="text-[10px] text-[#806C7B]">Signed by Contractor Lead Technician</span>
              </div>

              <div className="pt-3 border-t border-[#E6D5DC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForEvidence(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#806C7B] hover:bg-[#F7EDE5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#4A8B71] hover:bg-[#1A8762] text-white text-xs font-semibold cursor-pointer"
                >
                  Submit &amp; Mark Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E6D5DC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D5DC]">
              <div>
                <h3 className="text-base font-bold text-[#493344]">Create Maintenance Work Order</h3>
                <p className="text-xs text-[#806C7B]">Issue repair order with statutory priority classification</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#806C7B] hover:text-[#493344] rounded-lg cursor-pointer"
              >
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#493344]">Target Property &amp; Zone</label>
                <input
                  type="text"
                  required
                  value={`${newOrder.propertyName} (${newOrder.zone})`}
                  onChange={(e) => setNewOrder({ ...newOrder, zone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#493344]">Trade Type</label>
                  <select
                    value={newOrder.tradeType}
                    onChange={(e) => setNewOrder({ ...newOrder, tradeType: e.target.value as WorkOrder["tradeType"] })}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  >
                    <option value="Damp Remediation">Damp Remediation</option>
                    <option value="Plumbing & Drainage">Plumbing &amp; Drainage</option>
                    <option value="Thermal Insulation">Thermal Insulation</option>
                    <option value="Mechanical Ventilation">Mechanical Ventilation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493344]">Assigned Contractor</label>
                  <select
                    value={newOrder.assignedContractor}
                    onChange={(e) => setNewOrder({ ...newOrder, assignedContractor: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#E6D5DC] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                  >
                    <option value="Apex Fluid Dynamics Ltd">Apex Fluid Dynamics Ltd</option>
                    <option value="EnviroDry Remediation UK">EnviroDry Remediation UK</option>
                    <option value="NorthWest Cavity & Vent Ltd">NorthWest Cavity &amp; Vent Ltd</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493344]">Priority SLA</label>
                <select
                  value={newOrder.priority}
                  onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value as WorkOrder["priority"] })}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] py-2 px-3 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                >
                  <option value="Emergency 24h">Emergency 24h (Awaab Law Investigation)</option>
                  <option value="Urgent 7d">Urgent 7d (Sub-floor / Insulation)</option>
                  <option value="Standard 14d">Standard 14d (Scheduled Works)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493344]">Issue Scope Description</label>
                <textarea
                  rows={2}
                  required
                  value={newOrder.issueDescription}
                  onChange={(e) => setNewOrder({ ...newOrder, issueDescription: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E6D5DC] p-2.5 text-xs text-[#493344] focus:border-[#79566F] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E6D5DC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E6D5DC] text-xs font-semibold text-[#806C7B] hover:bg-[#F7EDE5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold cursor-pointer"
                >
                  Issue Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
