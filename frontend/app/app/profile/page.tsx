"use client";

import React from "react";
import Link from "next/link";
import {
  UserIcon,
  ShieldCheckIcon,
  BuildingIcon,
  CheckCircleIcon,
  ClockIcon,
  WrenchIcon,
  LogOutIcon,
} from "@/components/Icons";
import { useRole } from "@/components/app/RoleContext";

export default function ProfilePage() {
  const { role, setRole, profile, canSwitchRole, actualRole, signOut } = useRole();

  const roleDescriptions: Record<string, string> = {
    admin: "Full platform governance, OpenCV/FFT threshold calibration, organization management, and audit export.",
    manager: "Manage authorized housing stock, review triage models, approve inspections, and dispatch contractors within Awaab Law SLAs.",
    inspector: "Collect multi-modal ambient/flash photos and acoustic audio telemetry, record symptoms, and submit evidence.",
    contractor: "Receive dispatched work orders, execute physical damp/pipe repairs, and upload photographic completion evidence.",
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
            <span>Account Profile</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            User Profile &amp; Role Authorization
          </h1>
          <p className="text-xs text-[#806C7B]">
            Authenticated officer identity, role-based access control (RBAC), and professional credentials
          </p>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#E6D5DC] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-[#E6D5DC]">
          <div className="w-18 h-18 rounded-3xl bg-[#79566F] text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-[#79566F]/30">
            {profile.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#493344]">{profile.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFE4EC] text-[#79566F] border border-[#79566F]/20 uppercase">
                {role}
              </span>
            </div>
            <p className="text-xs text-[#806C7B] mt-0.5">{profile.title}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-[#806C7B]">
              <span>Organization: <strong className="text-[#493344]">{profile.organization}</strong></span>
              <span>&bull;</span>
              <span>Email: <strong className="text-[#493344]">{profile.email}</strong></span>
            </div>
          </div>
        </div>

        {/* Role Permissions Description */}
        <div className="mt-6 p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC]">
          <span className="text-[10px] uppercase font-bold text-[#806C7B] block">
            Role Scope &amp; Responsibilities ({role.toUpperCase()}):
          </span>
          <p className="text-xs text-[#493344] mt-1 font-medium leading-relaxed">
            {roleDescriptions[role]}
          </p>
        </div>

        {/* Role Governance & Session Management */}
        <div className="mt-6 pt-5 border-t border-[#E6D5DC]">
          {canSwitchRole ? (
            /* Admin View-As previewer (Only rendered for authenticated Platform Administrator) */
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#493344]">
                    Platform Administrator View-As Previewer
                  </h3>
                  <p className="text-xs text-[#806C7B]">
                    As an authenticated Platform Administrator, you hold full permissions and can preview UI perspectives for specific operational roles
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("manager")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    role === "manager"
                      ? "border-[#79566F] bg-[#EFE4EC] text-[#79566F] ring-1 ring-[#79566F]"
                      : "border-[#E6D5DC] hover:bg-[#F7EDE5] text-[#806C7B]"
                  }`}
                >
                  <div className="font-bold text-xs">Property Manager</div>
                  <div className="text-[10px] opacity-75">Triage, SLAs &amp; Dispatch</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("inspector")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    role === "inspector"
                      ? "border-[#79566F] bg-[#EFE4EC] text-[#79566F] ring-1 ring-[#79566F]"
                      : "border-[#E6D5DC] hover:bg-[#F7EDE5] text-[#806C7B]"
                  }`}
                >
                  <div className="font-bold text-xs">Field Inspector</div>
                  <div className="text-[10px] opacity-75">Multi-Modal Survey Upload</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("contractor")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    role === "contractor"
                      ? "border-[#79566F] bg-[#EFE4EC] text-[#79566F] ring-1 ring-[#79566F]"
                      : "border-[#E6D5DC] hover:bg-[#F7EDE5] text-[#806C7B]"
                  }`}
                >
                  <div className="font-bold text-xs">Contractor</div>
                  <div className="text-[10px] opacity-75">Sign-off &amp; Photographic Evidence</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    role === "admin"
                      ? "border-[#79566F] bg-[#EFE4EC] text-[#79566F] ring-1 ring-[#79566F]"
                      : "border-[#E6D5DC] hover:bg-[#F7EDE5] text-[#806C7B]"
                  }`}
                >
                  <div className="font-bold text-xs">Platform Admin</div>
                  <div className="text-[10px] opacity-75">Full Governance &amp; Config</div>
                </button>
              </div>
            </div>
          ) : (
            /* Non-Admin Locked Persona View */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#F7EDE5] border border-[#E6D5DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon size={16} className="text-[#4A8B71]" />
                    <span className="text-xs font-bold text-[#493344]">
                      Role Locked to PostgreSQL Profile ({actualRole.toUpperCase()})
                    </span>
                  </div>
                  <p className="text-[11px] text-[#806C7B]">
                    Your role is verified via Supabase Auth and strictly enforced by PostgreSQL Row Level Security. Role modifications can only be performed by a Platform Administrator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Secure Logout Action */}
          <div className="mt-6 pt-5 border-t border-[#E6D5DC] flex justify-end">
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/20 hover:bg-[#FBE4E8] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <LogOutIcon size={15} />
              <span>Sign Out of PropCare NW</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
