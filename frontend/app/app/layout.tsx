import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { RoleProvider, UserRole, roleProfiles, UserProfile } from "@/components/app/RoleContext";
import AppShell from "./AppShell";
import Loading from "./loading";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get("propcare_role")?.value as UserRole | undefined;

  let serverRole: UserRole = "manager";
  if (roleCookie && ["admin", "manager", "inspector", "contractor"].includes(roleCookie)) {
    serverRole = roleCookie;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConnected = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id")
  );

  let serverProfile: UserProfile = roleProfiles[serverRole];

  if (isConnected) {
    const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        redirect("/login");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, organization, title")
        .eq("id", user.id)
        .maybeSingle();

      const verifiedRole = (profile?.role || user.user_metadata?.role) as UserRole | undefined;

      if (verifiedRole && ["admin", "manager", "inspector", "contractor"].includes(verifiedRole)) {
        if (verifiedRole !== "admin") {
          serverRole = verifiedRole;
        } else if (roleCookie && ["admin", "manager", "inspector", "contractor"].includes(roleCookie)) {
          serverRole = roleCookie;
        } else {
          serverRole = "admin";
        }
      }

      serverProfile = {
        id: user.id,
        name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Authorized User",
        email: user.email || "",
        role: serverRole,
        title: profile?.title || user.user_metadata?.title || roleProfiles[serverRole]?.title || "Officer",
        avatar: (profile?.full_name || user.user_metadata?.full_name || user.email || "AU").substring(0, 2).toUpperCase(),
        organization: profile?.organization || user.user_metadata?.organization || roleProfiles[serverRole]?.organization || "Greater Manchester Housing Trust",
      };
    } catch (err: unknown) {
      // Re-throw Next.js redirect errors so navigation functions properly
      if (err instanceof Error && "digest" in err && typeof (err as { digest: string }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      console.warn("Layout server authentication exception:", err);
    }
  }

  return (
    <RoleProvider initialRole={serverRole} initialProfile={serverProfile}>
      <AppShell>
        <Suspense fallback={<Loading />}>
          {children}
        </Suspense>
      </AppShell>
    </RoleProvider>
  );
}
