"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isRouteAllowed } from "@/lib/authPermissions";

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
    name: "Dr. Alexander Wright",
    email: "admin@propcare-nw.com",
    role: "admin",
    title: "System Administrator & Data Architect",
    avatar: "AW",
    organization: "PropCare NW Engineering",
  },
  manager: {
    name: "Eleanor Vance",
    email: "e.vance@housingtrust.org.uk",
    role: "manager",
    title: "Portfolio Director (North West)",
    avatar: "EV",
    organization: "Greater Manchester Housing Trust",
  },
  inspector: {
    name: "Markus Thorne, MRICS",
    email: "m.thorne@forensicspec.com",
    role: "inspector",
    title: "Senior Building Diagnostic Surveyor",
    avatar: "MT",
    organization: "North West Damp & Acoustic Audits",
  },
  contractor: {
    name: "David Jenkins",
    email: "dispatch@envirodry-remediation.com",
    role: "contractor",
    title: "Lead Remediation Supervisor",
    avatar: "DJ",
    organization: "EnviroDry Remediation UK",
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
  const supabase = createClient();
  const isConnected = isSupabaseConfigured();

  // Validate initial role prop received from server
  const startingRole: UserRole = initialRole && ["admin", "manager", "inspector", "contractor"].includes(initialRole)
    ? initialRole
    : "manager";
  const startingProfile: UserProfile = initialProfile || roleProfiles[startingRole];

  // Initialize state directly from server props so SSR and client hydration are identical
  const [role, setRoleState] = useState<UserRole>(startingRole);
  const [actualRole, setActualRole] = useState<UserRole>(startingRole);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(startingProfile?.id));
  const [profile, setProfile] = useState<UserProfile>(startingProfile);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to sync cookie for server middleware and subsequent SSR requests
  const syncRoleCookie = (newRole: UserRole) => {
    document.cookie = `propcare_role=${newRole}; path=/; max-age=604800; SameSite=Lax`;
  };

  useEffect(() => {
    async function initSession() {
      if (isConnected) {
        // Fetch real Supabase session
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          let verifiedRole: UserRole = startingRole;
          let dbFullName = "";
          let dbOrganization = "";
          let dbTitle = "";

          try {
            const { data: dbProfile } = await supabase
              .from("profiles")
              .select("role, full_name, organization, title")
              .eq("id", user.id)
              .maybeSingle();

            if (dbProfile?.role && ["admin", "manager", "inspector", "contractor"].includes(dbProfile.role)) {
              verifiedRole = dbProfile.role as UserRole;
            } else if (user.user_metadata?.role && ["admin", "manager", "inspector", "contractor"].includes(user.user_metadata.role)) {
              verifiedRole = user.user_metadata.role as UserRole;
            }
            dbFullName = dbProfile?.full_name || "";
            dbOrganization = dbProfile?.organization || "";
            dbTitle = dbProfile?.title || "";
          } catch {
            if (user.user_metadata?.role && ["admin", "manager", "inspector", "contractor"].includes(user.user_metadata.role)) {
              verifiedRole = user.user_metadata.role as UserRole;
            }
          }

          setActualRole(verifiedRole);

          let activeRole = verifiedRole;

          // Non-admins must strictly operate in their verified authenticated role
          if (verifiedRole !== "admin") {
            activeRole = verifiedRole;
          } else {
            // Admins can preview other roles if requested via url or starting prop
            const roleParam = searchParams.get("role") as UserRole | null;
            if (roleParam && ["admin", "manager", "inspector", "contractor"].includes(roleParam)) {
              activeRole = roleParam;
            } else {
              activeRole = startingRole;
            }
          }

          setRoleState(activeRole);
          syncRoleCookie(activeRole);

          const userMeta = user.user_metadata;
          setProfile({
            id: user.id,
            name: dbFullName || userMeta?.full_name || user.email?.split("@")[0] || "Authorized User",
            email: user.email || "",
            role: activeRole,
            title: dbTitle || userMeta?.title || roleProfiles[activeRole]?.title || "Officer",
            avatar: (dbFullName || userMeta?.full_name || user.email || "AU").substring(0, 2).toUpperCase(),
            organization: dbOrganization || userMeta?.organization || roleProfiles[activeRole]?.organization || "Greater Manchester Housing Trust",
          });
          setIsLoading(false);
          return;
        } else {
          setIsAuthenticated(false);
        }
      }

      setIsLoading(false);
    }

    initSession();

    if (isConnected) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_OUT" || !session?.user) {
            setIsAuthenticated(false);
            document.cookie = "propcare_role=; path=/; max-age=0; SameSite=Lax";
            if (pathname.startsWith("/app")) {
              router.push("/login");
              router.refresh();
            }
            return;
          }

          if (session?.user) {
            setIsAuthenticated(true);
            let verifiedRole: UserRole = "manager";
            let dbFullName = "";
            let dbOrganization = "";
            let dbTitle = "";

            try {
              const { data: dbProfile } = await supabase
                .from("profiles")
                .select("role, full_name, organization, title")
                .eq("id", session.user.id)
                .maybeSingle();

              if (dbProfile?.role && ["admin", "manager", "inspector", "contractor"].includes(dbProfile.role)) {
                verifiedRole = dbProfile.role as UserRole;
              }
              dbFullName = dbProfile?.full_name || "";
              dbOrganization = dbProfile?.organization || "";
              dbTitle = dbProfile?.title || "";
            } catch {
              if (session.user.user_metadata?.role) {
                verifiedRole = session.user.user_metadata.role as UserRole;
              }
            }

            setActualRole(verifiedRole);
            const activeRole = verifiedRole;
            setRoleState(activeRole);
            syncRoleCookie(activeRole);
            setProfile({
              id: session.user.id,
              name: dbFullName || session.user.user_metadata?.full_name || session.user.email || "Authorized User",
              email: session.user.email || "",
              role: activeRole,
              title: dbTitle || session.user.user_metadata?.title || roleProfiles[activeRole]?.title || "Officer",
              avatar: (dbFullName || session.user.user_metadata?.full_name || "AU").substring(0, 2).toUpperCase(),
              organization: dbOrganization || session.user.user_metadata?.organization || "Greater Manchester Housing Trust",
            });
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [searchParams, startingRole, isConnected, pathname, router]);

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
    // Only Platform Administrators can switch role previews
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
      if (isConnected) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn("Sign out error:", err);
    } finally {
      document.cookie = "propcare_role=; path=/; max-age=0; SameSite=Lax";
      localStorage.removeItem("propcare_role");
      localStorage.removeItem("propcare_user_email");
      setIsAuthenticated(false);
      setIsLoading(false);
      router.push("/login");
      router.refresh();
    }
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
