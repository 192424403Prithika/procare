"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MenuIcon,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  LogOutIcon,
  UserIcon,
  SettingsIcon,
  CheckCircleIcon,
} from "@/components/Icons";
import { useRole, UserRole } from "./RoleContext";
import { apiClient } from "@/lib/apiClient";

interface TopNavProps {
  onOpenMobileMenu: () => void;
}

export default function TopNav({ onOpenMobileMenu }: TopNavProps) {
  const router = useRouter();
  const { role, actualRole, isAuthenticated, canSwitchRole, setRole, profile, signOut } = useRole();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState<number>(2);

  useEffect(() => {
    async function loadUnread() {
      try {
        const data = await apiClient.get<any>("/api/v1/notifications/unread-count");
        if (data && typeof data.unread_count === "number") {
          setUnreadCount(data.unread_count);
        }
      } catch (err) {
        // fallback gracefully
      }
    }
    loadUnread();
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    if (canSwitchRole) {
      setRole(newRole);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E6D5DC] bg-white px-4 sm:px-6 shadow-xs">
      {/* Left: Mobile hamburger & Search bar */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-lg">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#806C7B] hover:text-[#493344] hover:bg-[#EFE4EC] cursor-pointer"
          aria-label="Open sidebar"
        >
          <MenuIcon size={20} />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full max-w-xs sm:max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#806C7B]">
            <SearchIcon size={16} />
          </div>
          <input
            type="text"
            placeholder="Search properties, UPRN, work orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E6D5DC] bg-[#F7EDE5] py-2 pl-9 pr-3 text-xs text-[#493344] placeholder-[#806C7B] focus:border-[#79566F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#79566F]"
          />
        </div>
      </div>

      {/* Right: Role Badge or Switcher, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* If authenticated as a non-admin: locked role badge */}
        {actualRole !== "admin" ? (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#EFE4EC] rounded-xl border border-[#E6D5DC]">
            <ShieldCheckIcon size={14} className="text-[#4A8B71]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#806C7B] uppercase tracking-wider">Role:</span>
              <span className="text-xs font-bold text-[#493344] capitalize">
                {actualRole === "manager" ? "Property Manager" : actualRole === "inspector" ? "Field Inspector" : actualRole === "contractor" ? "Contractor" : actualRole}
              </span>
            </div>
            <span className="text-[10px] text-[#4A8B71] font-semibold px-1.5 py-0.5 rounded bg-white/80 border border-[#4A8B71]/20">
              Verified
            </span>
          </div>
        ) : canSwitchRole ? (
          /* Admin View-As previewer (Only rendered for authenticated Platform Administrator) */
          <div className="hidden md:flex items-center gap-1.5 p-1 bg-[#EFE4EC] rounded-xl border border-[#E6D5DC]">
            <span className="text-[10px] font-bold text-[#806C7B] px-2 uppercase tracking-wider">
              Admin View:
            </span>
            <button
              type="button"
              onClick={() => handleRoleChange("manager")}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === "manager"
                  ? "bg-[#79566F] text-white shadow-xs"
                  : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("inspector")}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === "inspector"
                  ? "bg-[#79566F] text-white shadow-xs"
                  : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              Inspector
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("contractor")}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === "contractor"
                  ? "bg-[#79566F] text-white shadow-xs"
                  : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              Contractor
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("admin")}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === "admin"
                  ? "bg-[#79566F] text-white shadow-xs"
                  : "text-[#806C7B] hover:text-[#493344]"
              }`}
            >
              Admin (Full)
            </button>
          </div>
        ) : null}

        {/* Notifications Icon */}
        <Link
          href="/app/notifications"
          className="relative p-2 text-[#806C7B] hover:text-[#493344] hover:bg-[#EFE4EC] rounded-xl transition-colors"
          title="Notifications"
        >
          <BellIcon size={19} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C84661] text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#EFE4EC] transition-all cursor-pointer border border-transparent hover:border-[#E6D5DC]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#79566F] text-white font-bold text-xs shadow-xs">
              {profile.avatar}
            </div>
            <div className="hidden sm:block text-left pr-1">
              <div className="text-xs font-bold text-[#493344] leading-tight truncate max-w-[120px]">
                {profile.name}
              </div>
              <div className="text-[10px] text-[#806C7B] capitalize">
                {role === "manager" ? "Property Manager" : role}
              </div>
            </div>
            <ChevronDownIcon size={14} className="text-[#806C7B]" />
          </button>

          {profileDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl border border-[#E6D5DC] z-50 animate-in fade-in slide-in-from-top-1"
              onMouseLeave={() => setProfileDropdownOpen(false)}
            >
              <div className="px-3 py-2 border-b border-[#E6D5DC] mb-1">
                <div className="text-xs font-bold text-[#493344]">{profile.name}</div>
                <div className="text-[10px] text-[#806C7B] truncate">{profile.email}</div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[#4A8B71] font-medium">
                  <CheckCircleIcon size={12} />
                  <span>{profile.organization || "Verified Organization"}</span>
                </div>
              </div>

              {/* Mobile Role Switcher (shown only if authorized to switch role) */}
              {canSwitchRole && (
                <div className="md:hidden px-3 py-2 border-b border-[#E6D5DC] mb-1">
                  <div className="text-[10px] font-bold uppercase text-[#806C7B] mb-1.5">
                    {actualRole === "admin" ? "Admin Preview" : "Switch Role"}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {(["manager", "inspector", "contractor", "admin"] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          handleRoleChange(r);
                          setProfileDropdownOpen(false);
                        }}
                        className={`px-2 py-1 rounded text-left font-semibold ${
                          role === r ? "bg-[#79566F] text-white" : "text-[#806C7B] hover:bg-[#EFE4EC]"
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href="/app/profile"
                onClick={() => setProfileDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#493344] hover:bg-[#EFE4EC]"
              >
                <UserIcon size={15} className="text-[#806C7B]" />
                <span>My Profile</span>
              </Link>

              {/* Only show Settings link if admin */}
              {(role === "admin" || actualRole === "admin") && (
                <Link
                  href="/app/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#493344] hover:bg-[#EFE4EC]"
                >
                  <SettingsIcon size={15} className="text-[#806C7B]" />
                  <span>Platform Settings</span>
                </Link>
              )}

              <div className="my-1 border-t border-[#E6D5DC]" />

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#C84661] hover:bg-[#FDF2F4] cursor-pointer"
              >
                <LogOutIcon size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
