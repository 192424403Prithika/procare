import React, { Suspense } from "react";
import { cookies } from "next/headers";
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

  const serverProfile: UserProfile = roleProfiles[serverRole];

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
