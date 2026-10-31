"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BuildingShieldIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/Icons";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const isConnected = isSupabaseConfigured();

  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !email.includes("@") || !email.includes(".")) {
      setErrorMsg("Please enter a valid official email address.");
      return false;
    }

    setIsLoading(true);

    if (isConnected) {
      const redirectUrl = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      setIsLoading(false);

      if (error) {
        setErrorMsg(error.message);
      } else {
        setIsSubmitted(true);
      }
    } else {
      setTimeout(() => {
        setIsLoading(false);
        setIsSubmitted(true);
      }, 700);
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
          Reset your password
        </h2>
        <p className="mt-1 text-xs text-[#806C7B]">
          Enter your registered email address and we will issue a secure recovery link.
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

          {isSubmitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#4A8B71]/10 flex items-center justify-center text-[#4A8B71]">
                <CheckCircleIcon size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#493344]">
                  Reset Link Dispatched
                </h3>
                <p className="mt-2 text-xs text-[#806C7B]">
                  We have dispatched instructions to <span className="font-semibold text-[#493344]">{email}</span>. Click the link in the message to authenticate and establish a new credential.
                </p>
              </div>

              {!isConnected && (
                <div className="p-3 bg-[#EFE4EC] rounded-2xl border border-[#79566F]/20 text-[11px] text-[#79566F]">
                  Note: Local demo mode is active. You can proceed directly to establish a new password via the reset interface:
                  <div className="mt-2">
                    <Link
                      href="/reset-password"
                      className="font-bold underline"
                    >
                      Go to Reset Password Screen &rarr;
                    </Link>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Link
                  href="/login"
                  className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#79566F] hover:bg-[#67475E] transition-all"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-[#493344]">
                  Official Work Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="director@propcare-nw.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3.5 py-2.5 border border-[#E6D5DC] rounded-xl shadow-xs placeholder-[#806C7B]/50 focus:outline-none focus:ring-2 focus:ring-[#79566F] focus:border-[#79566F] text-sm text-[#493344]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#79566F] hover:bg-[#67475E] active:bg-[#4336D0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#79566F] transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Recovery Email...</span>
                    </span>
                  ) : (
                    <>
                      <span>Transmit Recovery Link</span>
                      <ArrowRightIcon size={14} />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-[#E6D5DC] text-center">
                <Link href="/login" className="text-xs font-semibold text-[#79566F] hover:underline">
                  &larr; Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
