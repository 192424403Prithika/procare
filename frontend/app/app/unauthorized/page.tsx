"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangleIcon, ArrowRightIcon, LogOutIcon, ShieldCheckIcon } from "@/components/Icons";
import { useRole } from "@/components/app/RoleContext";

function UnauthorizedContent() {
  const { role, profile, canSwitchRole, signOut } = useRole();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const deniedPath = searchParams.get("from") || "this protected resource";

  if (reason === "no_role") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center border border-[#E6D5DC] shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-[#FDF5ED] text-[#B86B35] mx-auto flex items-center justify-center shadow-md">
            <AlertTriangleIcon size={32} />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FDF5ED] text-[#B86B35] border border-[#B86B35]/30 uppercase">
              <span>Account Pending Role Assignment</span>
            </div>
            <h1 className="text-xl font-extrabold text-[#493344] mt-2">
              Operational Role Required
            </h1>
            <p className="text-xs text-[#806C7B] mt-1.5 leading-relaxed">
              Your account has been authenticated with Supabase Auth, but an administrator has not yet assigned an operational role (<strong className="text-[#493344]">Admin, Manager, Inspector, or Contractor</strong>) to your profile.
            </p>
          </div>

          <div className="p-4 bg-[#F7EDE5] rounded-2xl border border-[#E6D5DC] text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#806C7B]">Account Email:</span>
              <span className="font-semibold text-[#493344] font-mono">{profile.email || "Authenticated Account"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#806C7B]">Current Status:</span>
              <span className="font-semibold text-[#B86B35]">Pending Admin Role Grant</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#806C7B]">Security Enforcement:</span>
              <span className="font-semibold text-[#4A8B71]">PostgreSQL Row Level Security</span>
            </div>
          </div>

          <p className="text-[11px] text-[#806C7B]">
            Please contact your PropCare NW System Administrator to grant role access in the Supabase management console.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => signOut()}
              className="flex-1 inline-flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <LogOutIcon size={14} />
              <span>Sign Out to Switch Account</span>
            </button>
            <Link
              href="/"
              className="flex-1 inline-flex justify-center items-center py-2.5 px-4 rounded-xl border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
            >
              <span>Return to Public Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center border border-[#E6D5DC] shadow-xl space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-[#FDF2F4] text-[#C84661] mx-auto flex items-center justify-center shadow-md">
          <AlertTriangleIcon size={32} />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FDF2F4] text-[#C84661] border border-[#C84661]/30 uppercase">
            <span>403 Access Forbidden</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#493344] mt-2">
            Role Authorization Required
          </h1>
          <p className="text-xs text-[#806C7B] mt-1.5">
            Your current operational role (<strong className="capitalize text-[#493344]">{role}</strong>) does not hold authorization to access <code className="bg-[#EFE4EC] text-[#79566F] px-1.5 py-0.5 rounded font-mono font-bold">{deniedPath}</code>.
          </p>
        </div>

        <div className="p-4 bg-[#F7EDE5] rounded-2xl border border-[#E6D5DC] text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-[#806C7B]">Active Persona:</span>
            <span className="font-semibold text-[#493344]">{profile.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#806C7B]">Enforcement Layer:</span>
            <span className="font-semibold text-[#4A8B71]">Server Middleware &amp; Supabase RLS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#806C7B]">Permitted Roles:</span>
            <span className="font-semibold text-[#79566F]">
              {deniedPath.includes("settings")
                ? "Platform Administrator Only"
                : deniedPath.includes("new")
                ? "Field Inspector & Admin"
                : deniedPath.includes("contractors") || deniedPath.includes("work-orders")
                ? "Contractor, Property Manager & Admin"
                : "Admin & Designated Roles"}
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/app/dashboard?role=${role}`}
            className="flex-1 inline-flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl bg-[#79566F] hover:bg-[#67475E] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Return to Safe Dashboard</span>
            <ArrowRightIcon size={12} />
          </Link>
          {canSwitchRole && (
            <Link
              href="/app/profile"
              className="flex-1 inline-flex justify-center items-center py-2.5 px-4 rounded-xl border border-[#E6D5DC] text-[#493344] text-xs font-semibold hover:bg-[#F7EDE5] transition-colors"
            >
              Platform Role Governance
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="text-xs text-[#806C7B]">Checking authorization...</div>
        </div>
      }
    >
      <UnauthorizedContent />
    </Suspense>
  );
}
