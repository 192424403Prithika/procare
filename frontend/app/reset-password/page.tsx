"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BuildingShieldIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  EyeIcon,
  EyeOffIcon,
} from "@/components/Icons";
import { apiClient } from "@/lib/apiClient";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters in length.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/api/v1/auth/reset-password", {
        token: token || "manual_reset_token",
        new_password: password,
      });

      setSuccessMsg("Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || "Password update request failed. Please request a new recovery link.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EFE4EC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#EFE4EC] selection:text-[#79566F]">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#79566F] text-white shadow-md shadow-[#79566F]/20 transition-transform group-hover:scale-105">
            <BuildingShieldIcon size={24} className="text-white" />
          </div>
          <div className="text-left">
            <span className="text-xl font-bold tracking-tight text-[#493344] block">
              PropCare <span className="text-[#79566F]">NW</span>
            </span>
            <span className="text-[11px] font-medium text-[#806C7B] block">
              Predictive Property Intelligence
            </span>
          </div>
        </Link>
        <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-[#493344]">
          Establish New Password
        </h2>
        <p className="mt-1 text-xs text-[#806C7B]">
          Create a secure credential for your authorized telemetry account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-[#E6D5DC] sm:px-10">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-[#FDF2F4] border border-[#C84661]/30 text-xs text-[#C84661] flex items-start gap-2">
              <AlertTriangleIcon size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-[#EFF8F3] border border-[#4A8B71]/30 text-xs text-[#4A8B71] flex items-start gap-2">
              <CheckCircleIcon size={16} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[#493344]">
                New Password (min 8 characters)
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3.5 py-2.5 pr-10 border border-[#E6D5DC] rounded-xl shadow-xs placeholder-[#806C7B]/50 focus:outline-none focus:ring-2 focus:ring-[#79566F] focus:border-[#79566F] text-sm text-[#493344]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#806C7B] hover:text-[#493344] cursor-pointer"
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#493344]">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3.5 py-2.5 pr-10 border border-[#E6D5DC] rounded-xl shadow-xs placeholder-[#806C7B]/50 focus:outline-none focus:ring-2 focus:ring-[#79566F] focus:border-[#79566F] text-sm text-[#493344]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#806C7B] hover:text-[#493344] cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#79566F] hover:bg-[#67475E] active:bg-[#4336D0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#79566F] transition-all cursor-pointer"
              >
                {isLoading ? (
                  <span>Saving New Password...</span>
                ) : (
                  <>
                    <span>Update Credential &amp; Sign In</span>
                    <ArrowRightIcon size={14} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E6D5DC] text-center">
            <Link href="/login" className="text-xs font-semibold text-[#79566F] hover:underline">
              &larr; Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#EFE4EC] flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#79566F]">
            <span className="w-4 h-4 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin" />
            <span>Loading password reset...</span>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
