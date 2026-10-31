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
import { UserRole } from "@/components/app/RoleContext";
import { isRouteAllowed } from "@/lib/authPermissions";
import { apiClient } from "@/lib/apiClient";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const resetParam = searchParams.get("reset");
  const registeredParam = searchParams.get("registered");
  const nextParam = searchParams.get("next");

  const bannerMessage =
    successMsg ||
    (resetParam === "success"
      ? "Password successfully reset. Please sign in with your new credentials."
      : registeredParam === "success"
      ? "Account registered successfully! Please sign in."
      : "");

  const validateForm = () => {
    if (!email || !email.includes("@") || !email.includes(".")) {
      setErrorMsg("Please enter a valid official email address.");
      return false;
    }
    if (!password) {
      setErrorMsg("Please enter your password.");
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

    try {
      // Authenticate directly with Python FastAPI + MongoDB Atlas Backend
      const authResp = await apiClient.post("/api/v1/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      if (authResp && authResp.access_token) {
        apiClient.setTokens(authResp.access_token, authResp.refresh_token);
        const verifiedRole = (authResp.user?.role as UserRole) || "manager";
        document.cookie = `propcare_role=${verifiedRole}; path=/; max-age=604800; SameSite=Lax`;

        const roleDisplayNames: Record<UserRole, string> = {
          admin: "Platform Administrator",
          manager: "Property Manager",
          inspector: "Field Inspector",
          contractor: "Contractor",
        };

        setSuccessMsg(
          `Welcome back, ${authResp.user?.full_name || email}! Loading ${
            roleDisplayNames[verifiedRole] || "operational"
          } dashboard...`
        );

        let destination = `/app/dashboard?role=${verifiedRole}`;
        if (nextParam && nextParam.startsWith("/app") && nextParam !== "/app/unauthorized") {
          if (isRouteAllowed(nextParam, verifiedRole)) {
            destination = nextParam;
          }
        }
        setTimeout(() => {
          router.push(destination);
        }, 500);
        return;
      } else {
        setErrorMsg("Authentication failed. Please verify credentials.");
        setIsLoading(false);
      }
    } catch (apiErr: any) {
      console.error("Login request error:", apiErr);
      if (apiErr?.status === 401) {
        setErrorMsg("Invalid email address or password. Please verify your credentials and try again.");
      } else if (apiErr?.status === 403) {
        setErrorMsg(apiErr?.message || "Account access restricted. Please contact administrator.");
      } else {
        setErrorMsg(
          apiErr?.message || "Could not connect to FastAPI backend service. Please ensure the backend is running."
        );
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
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-[#806C7B]">
          Enter your official credentials to access moisture telemetry, acoustic audits &amp; work orders
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-[#E6D5DC] sm:px-10">
          {/* Error Message Alert */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-[#FDF2F4] border border-[#C84661]/30 text-xs text-[#C84661] flex items-start gap-2.5">
              <AlertTriangleIcon size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {bannerMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-[#EFF8F3] border border-[#4A8B71]/30 text-xs text-[#4A8B71] flex items-start gap-2.5">
              <CheckCircleIcon size={16} className="shrink-0 mt-0.5" />
              <span>{bannerMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Field */}
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
                  className="appearance-none block w-full px-3.5 py-2.5 border border-[#E6D5DC] rounded-xl shadow-xs placeholder-[#806C7B]/50 focus:outline-none focus:ring-2 focus:ring-[#79566F] focus:border-[#79566F] text-sm text-[#493344] bg-[#F7EDE5]/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-bold text-[#493344]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#79566F] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3.5 py-2.5 pr-10 border border-[#E6D5DC] rounded-xl shadow-xs placeholder-[#806C7B]/50 focus:outline-none focus:ring-2 focus:ring-[#79566F] focus:border-[#79566F] text-sm text-[#493344] bg-[#F7EDE5]/50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#806C7B] hover:text-[#493344] cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-[#79566F] focus:ring-[#79566F] border-[#E6D5DC] rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-[#806C7B] cursor-pointer">
                  Remember this session
                </label>
              </div>
            </div>

            {/* Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#79566F] hover:bg-[#67475E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#79566F] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRightIcon size={14} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Demo account quick login buttons */}
          <div className="mt-5 pt-4 border-t border-[#E6D5DC]/60">
            <p className="text-[11px] font-semibold text-[#806C7B] mb-2 text-center">Quick Fill Official Demo Accounts:</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  setEmail("vaishureddy26096@gmail.com");
                  setPassword("vaishu@2623");
                }}
                className="p-1.5 rounded-lg bg-[#EFE4EC]/70 hover:bg-[#EFE4EC] text-[#493344] font-medium text-left truncate transition-colors"
              >
                👤 Vaishu Reddy
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@propcare.gov.uk");
                  setPassword("admin123");
                }}
                className="p-1.5 rounded-lg bg-[#EFE4EC]/70 hover:bg-[#EFE4EC] text-[#493344] font-medium text-left truncate transition-colors"
              >
                🛡️ Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("inspector@propcare.gov.uk");
                  setPassword("inspector123");
                }}
                className="p-1.5 rounded-lg bg-[#EFE4EC]/70 hover:bg-[#EFE4EC] text-[#493344] font-medium text-left truncate transition-colors"
              >
                🔍 Inspector
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("contractor@propcare.gov.uk");
                  setPassword("contractor123");
                }}
                className="p-1.5 rounded-lg bg-[#EFE4EC]/70 hover:bg-[#EFE4EC] text-[#493344] font-medium text-left truncate transition-colors"
              >
                🔧 Contractor
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#E6D5DC] text-center">
            <span className="text-xs text-[#806C7B]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-[#79566F] hover:underline">
                Sign up for PropCare NW
              </Link>
            </span>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center text-[11px] text-[#806C7B] flex items-center justify-center gap-1.5">
          <CheckCircleIcon size={14} className="text-[#4A8B71]" />
          <span>Protected by PropCare NW FastAPI &amp; Argon2 Encryption</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#EFE4EC] flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#79566F]">
            <span className="w-4 h-4 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin" />
            <span>Loading authentication...</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
