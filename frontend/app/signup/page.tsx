"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BuildingShieldIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  EyeIcon,
  EyeOffIcon,
} from "@/components/Icons";
import { UserRole } from "@/components/app/RoleContext";
import { apiClient } from "@/lib/apiClient";

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("manager");
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const validateForm = () => {
    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return false;
    }
    if (!orgName.trim()) {
      setErrorMsg("Please provide your housing provider or organization name.");
      return false;
    }
    if (!email || !email.includes("@") || !email.includes(".")) {
      setErrorMsg("Please provide a valid official email address.");
      return false;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters in length.");
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify both inputs.");
      return false;
    }
    if (!agreed) {
      setErrorMsg("Please accept the Terms of Service & statutory Awaab's Law standards.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!validateForm()) return;

    setIsLoading(true);

    // Register with FastAPI + MongoDB Atlas Backend
    try {
      const regResp = await apiClient.post("/api/v1/auth/register", {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        organization: orgName.trim(),
      });

      if (regResp && regResp.access_token) {
        apiClient.setTokens(regResp.access_token, regResp.refresh_token);
        const assignedRole = regResp.user?.role || role || "manager";
        document.cookie = `propcare_role=${assignedRole}; path=/; max-age=604800; SameSite=Lax`;
        setSuccessMsg("Account created and authorized! Redirecting to dashboard...");
        setTimeout(() => {
          router.push(`/app/dashboard?role=${assignedRole}`);
        }, 600);
        return;
      } else {
        setErrorMsg("Failed to initialize account. Please try again.");
        setIsLoading(false);
      }
    } catch (apiErr: any) {
      if (apiErr?.status === 409) {
        setErrorMsg("An account with this email address already exists. Please log in.");
      } else {
        setErrorMsg(apiErr?.message || "Registration failed. Please check network connection.");
      }
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
          Create your account
        </h2>
        <p className="mt-1 text-xs text-[#806C7B]">
          Deploy predictive moisture diagnostics across your housing stock
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
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
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-[#493344] mb-1.5">
                Primary Operational Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRole("manager")}
                  className={`py-2 px-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                    role === "manager"
                      ? "border-[#79566F] bg-[#EFE4EC] text-[#79566F]"
                      : "border-[#E6D5DC] text-[#806C7B] hover:bg-[#F7EDE5]"
                  }`}
                >
                  <div className="font-bold">Property Manager</div>
                  <div className="text-[10px] opacity-75">Social Housing &amp; Portfolios</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("inspector")}
                  className={`py-2 px-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                    role === "inspector"
                      ? "border-[#79566F] bg-[#EFE4EC] text-[#79566F]"
                      : "border-[#E6D5DC] text-[#806C7B] hover:bg-[#F7EDE5]"
                  }`}
                >
                  <div className="font-bold">Field Surveyor</div>
                  <div className="text-[10px] opacity-75">Multi-Modal Data Capture</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("contractor")}
                  className={`py-2 px-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                    role === "contractor"
                      ? "border-[#79566F] bg-[#EFE4EC] text-[#79566F]"
                      : "border-[#E6D5DC] text-[#806C7B] hover:bg-[#F7EDE5]"
                  }`}
                >
                  <div className="font-bold">Contractor</div>
                  <div className="text-[10px] opacity-75">Remediation &amp; Repairs</div>
                </button>
              </div>
            </div>

            {/* Full Name & Organization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="full-name" className="block text-xs font-bold text-[#493344]">
                  Full Legal Name
                </label>
                <div className="mt-1">
                  <input
                    id="full-name"
                    name="fullName"
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-[#E6D5DC] rounded-xl shadow-xs text-sm text-[#493344] bg-[#F7EDE5]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#79566F]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="org-name" className="block text-xs font-bold text-[#493344]">
                  Housing Organization
                </label>
                <div className="mt-1">
                  <input
                    id="org-name"
                    name="orgName"
                    type="text"
                    required
                    placeholder="Salford Housing Trust"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-[#E6D5DC] rounded-xl shadow-xs text-sm text-[#493344] bg-[#F7EDE5]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#79566F]"
                  />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[#493344]">
                Official Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@organization.gov.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3.5 py-2.5 border border-[#E6D5DC] rounded-xl shadow-xs text-sm text-[#493344] bg-[#F7EDE5]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#79566F]"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-[#493344]">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pr-9 border border-[#E6D5DC] rounded-xl shadow-xs text-sm text-[#493344] bg-[#F7EDE5]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#79566F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#806C7B]"
                  >
                    {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-bold text-[#493344]">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pr-9 border border-[#E6D5DC] rounded-xl shadow-xs text-sm text-[#493344] bg-[#F7EDE5]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#79566F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#806C7B]"
                  >
                    {showConfirmPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs text-[#806C7B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#E6D5DC] text-[#79566F] focus:ring-[#79566F]"
                />
                <span>
                  I agree to PropCare NW <span className="text-[#79566F] font-semibold">Terms of Service</span> and statutory protocols under <span className="text-[#79566F] font-semibold">Awaab&apos;s Law</span>.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#79566F] hover:bg-[#67475E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#79566F] transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Enterprise Seat...</span>
                  </span>
                ) : (
                  <>
                    <span>Initialize Portal Access</span>
                    <ArrowRightIcon size={14} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E6D5DC] text-center">
            <span className="text-xs text-[#806C7B]">
              Already have an enterprise seat?{" "}
              <Link href="/login" className="font-semibold text-[#79566F] hover:underline">
                Sign in here
              </Link>
            </span>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center text-[11px] text-[#806C7B] flex items-center justify-center gap-1.5">
          <CheckCircleIcon size={14} className="text-[#4A8B71]" />
          <span>Encrypted with TLS 1.3 &amp; Argon2 Password Hashing</span>
        </div>
      </div>
    </div>
  );
}
