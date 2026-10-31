import { UserRole } from "@/components/app/RoleContext";

export interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  {
    path: "/app/dashboard",
    allowedRoles: ["admin", "manager", "inspector", "contractor"],
  },
  {
    path: "/app/properties",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/inspections/new",
    allowedRoles: ["admin", "inspector"],
  },
  {
    path: "/app/inspections",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/moisture-analysis",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/analysis/moisture",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/analysis/breakage",
    allowedRoles: ["admin", "manager", "inspector", "contractor"],
  },
  {
    path: "/app/acoustic-analysis",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/multi-defect",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/weather",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/risk-triage",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/deadlines",
    allowedRoles: ["admin", "manager", "contractor"],
  },
  {
    path: "/app/contractors",
    allowedRoles: ["admin", "manager", "contractor"],
  },
  {
    path: "/app/work-orders",
    allowedRoles: ["admin", "manager", "contractor"],
  },
  {
    path: "/app/reports",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/forecasting",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/comparison",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/cost-estimator",
    allowedRoles: ["admin", "manager"],
  },
  {
    path: "/app/contractors/analytics",
    allowedRoles: ["admin", "manager", "contractor"],
  },
  {
    path: "/app/scan",
    allowedRoles: ["admin", "manager", "inspector"],
  },
  {
    path: "/app/assistant",
    allowedRoles: ["admin", "manager"],
  },
  {
    path: "/app/notifications",
    allowedRoles: ["admin", "manager", "inspector", "contractor"],
  },
  {
    path: "/app/profile",
    allowedRoles: ["admin", "manager", "inspector", "contractor"],
  },
  {
    path: "/app/settings",
    allowedRoles: ["admin"], // Strictly Admin only: System and analytical settings
  },
];

/**
 * Checks whether a given role is authorized to view or navigate to the target pathname.
 * Admins have unrestricted access to all routes.
 */
export function isRouteAllowed(pathname: string, role: UserRole): boolean {
  if (role === "admin") return true;

  // Exact or prefix match (handles sub-routes like /app/inspections/new before /app/inspections)
  // Sort by path length descending so more specific paths match first
  const sorted = [...ROUTE_PERMISSIONS].sort((a, b) => b.path.length - a.path.length);

  for (const perm of sorted) {
    if (pathname === perm.path || (perm.path !== "/app/dashboard" && pathname.startsWith(perm.path))) {
      return perm.allowedRoles.includes(role);
    }
  }

  // Deny access to unlisted /app routes for non-admins
  return false;
}
