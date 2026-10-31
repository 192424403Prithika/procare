import { NextResponse, type NextRequest } from "next/server";
import { isRouteAllowed } from "@/lib/authPermissions";
import { UserRole } from "@/components/app/RoleContext";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Check for PropCare FastAPI backend JWT and role cookies
  const tokenCookie = request.cookies.get("propcare_access_token")?.value;
  const roleCookie = request.cookies.get("propcare_role")?.value as UserRole | undefined;

  // 1. If visiting /login or /signup while already authenticated with a valid role, redirect to dashboard
  if ((pathname === "/login" || pathname === "/signup") && tokenCookie && roleCookie && ["admin", "manager", "inspector", "contractor"].includes(roleCookie)) {
    return NextResponse.redirect(new URL(`/app/dashboard?role=${roleCookie}`, request.url));
  }

  // 2. Protect /app routes
  if (pathname.startsWith("/app")) {
    // If accessing unauthorized page, allow through
    if (pathname === "/app/unauthorized") {
      return response;
    }

    // Role-based access control check
    const effectiveRole = roleCookie && ["admin", "manager", "inspector", "contractor"].includes(roleCookie)
      ? roleCookie
      : "manager"; // Default fallback role for active browsing

    // Platform Admin has full access to every feature
    if (effectiveRole === "admin") {
      return response;
    }

    // Enforce role permissions
    if (!isRouteAllowed(pathname, effectiveRole)) {
      const unauthorizedUrl = new URL("/app/unauthorized", request.url);
      unauthorizedUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/app/:path*",
    "/login",
    "/signup",
  ],
};
