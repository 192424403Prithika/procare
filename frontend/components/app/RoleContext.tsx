"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { isRouteAllowed } from "@/lib/authPermissions";
import { apiClient } from "@/lib/apiClient";

export type UserRole = "admin" | "manager" | "inspector" | "contractor";

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatar: string;
  organization: string;
}

export const roleProfiles: Record<UserRole, UserProfile> = {
  admin: {
    name: "Platform Administrator",
    email: "admin@propcare.gov.uk",
    role: "admin",
    title: "System Administrator & Data Architect",
    avatar: "PA",
    organization: "PropCare NW Executive",
  },
  manager: {
    name: "Vaishu Reddy",
    email: "vaishureddy26096@gmail.com",
    role: "manager",
    title: "Lead Housing Operations Manager",
    avatar: "VR",
    organization: "PropCare NW Housing Authority",
  },
  inspector: {
    name: "Field Building Inspector",
    email: "inspector@propcare.gov.uk",
    role: "inspector",
    title: "Chartered Building Diagnostic Surveyor",
    avatar: "FI",
    organization: "RICS Northwest Inspections",
  },
  contractor: {
    name: "Apex Remediation NW",
    email: "contractor@propcare.gov.uk",
    role: "contractor",
    title: "Approved Remediation Contractor",
    avatar: "AR",
    organization: "Apex Remediation NW Ltd",
  },
};

interface RoleContextType {
  role: UserRole;
  actualRole: UserRole;
  isAuthenticated: boolean;
  canSwitchRole: boolean;
  setRole: (role: UserRole) => void;
  profile: UserProfile;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: "manager",
  actualRole: "manager",
  isAuthenticated: false,
  canSwitchRole: false,
  setRole: () => {},
  profile: roleProfiles.manager,
  signOut: async () => {},
  isLoading: false,
});

interface RoleProviderProps {
  children: React.ReactNode;
  initialRole?: UserRole;
  initialProfile?: UserProfile;
}

export function RoleProvider({
  children,
  initialRole = "manager",
  initialProfile,
}: RoleProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Validate initial role prop received from server
  const startingRole: UserRole =
    initialRole && ["admin", "manager", "inspector", "contractor"].includes(initialRole)
      ? initialRole
      : "manager";
  const startingProfile: UserProfile = initialProfile || roleProfiles[startingRole];

  const [role, setRoleState] = useState<UserRole>(startingRole);
  const [actualRole, setActualRole] = useState<UserRole>(startingRole);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(startingProfile?.id));
  const [profile, setProfile] = useState<UserProfile>(startingProfile);
  const [isLoading, setIsLoading] = useState(false);

  const syncRoleCookie = (newRole: UserRole) => {
    document.cookie = `propcare_role=${newRole}; path=/; max-age=604800; SameSite=Lax`;
  };

  useEffect(() => {
    async function initSession() {
      // Check active session from FastAPI backend + MongoDB Atlas
      try {
        const me = await apiClient.get<any>("/api/v1/auth/me");
        if (me && me.id && me.role) {
          setIsAuthenticated(true);
          const vRole = me.role as UserRole;
          setActualRole(vRole);

          let activeRole = vRole;
          if (vRole === "admin") {
            const roleParam = searchParams.get("role") as UserRole | null;
            if (roleParam && ["admin", "manager", "inspector", "contractor"].includes(roleParam)) {
              activeRole = roleParam;
            }
          }
          setRoleState(activeRole);
          syncRoleCookie(activeRole);

          setProfile({
            id: me.id,
            name: me.full_name || me.email,
            email: me.email,
            role: activeRole,
            title: me.title || roleProfiles[activeRole]?.title || "Housing Officer",
            avatar: (me.full_name || me.email || "AU").slice(0, 2).toUpperCase(),
            organization: me.organization || roleProfiles[activeRole]?.organization || "PropCare NW Housing Authority",
          });
          setIsLoading(false);
          return;
        }
      } catch {
        // Fall back to default role profile if not authenticated
      }
      setIsLoading(false);
    }

    initSession();
  }, [searchParams]);

  // Client-side route access verification
  useEffect(() => {
    if (pathname && pathname.startsWith("/app") && pathname !== "/app/unauthorized") {
      if (!isRouteAllowed(pathname, role)) {
        router.push(`/app/unauthorized?from=${encodeURIComponent(pathname)}`);
      }
    }
  }, [pathname, role, router]);

  // Can switch role preview only if authenticated user is explicitly an Administrator
  const canSwitchRole = isAuthenticated && actualRole === "admin";

  const setRole = (newRole: UserRole) => {
    if (actualRole !== "admin") {
      console.warn(`Role change rejected: Authenticated user role is strictly locked to '${actualRole}'`);
      return;
    }
    setRoleState(newRole);
    syncRoleCookie(newRole);
    setProfile((prev) => ({
      ...prev,
      role: newRole,
    }));
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await apiClient.post("/api/v1/auth/logout");
    } catch {}

    document.cookie = "propcare_access_token=; path=/; max-age=0;";
    document.cookie = "propcare_role=; path=/; max-age=0; SameSite=Lax";
    localStorage.removeItem("propcare_access_token");
    localStorage.removeItem("propcare_refresh_token");
    localStorage.removeItem("propcare_role");
    localStorage.removeItem("propcare_user_email");
    setIsAuthenticated(false);
    setIsLoading(false);
    router.push("/login");
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        actualRole,
        isAuthenticated,
        canSwitchRole,
        setRole,
        profile,
        signOut,
        isLoading,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
