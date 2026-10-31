import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isRouteAllowed } from "@/lib/authPermissions";
import { UserRole } from "@/components/app/RoleContext";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConnected = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id")
  );

  // If Supabase is not configured yet (local template mode before .env.local setup),
  // allow developer exploration with security alert
  if (!isConnected) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Authenticate user session from Supabase cookies
  const { data: { user } } = await supabase.auth.getUser();

  // 1. If visiting /login while already authenticated with a valid role, redirect to dashboard
  if (pathname === "/login" || pathname === "/signup") {
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const verifiedRole = profile?.role as UserRole | undefined;
      if (verifiedRole && ["admin", "manager", "inspector", "contractor"].includes(verifiedRole)) {
        return NextResponse.redirect(new URL(`/app/dashboard?role=${verifiedRole}`, request.url));
      }
    }
    return response;
  }

  // 2. Protect all /app routes
  if (pathname.startsWith("/app")) {
    // If not authenticated, redirect to /login with return URL
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Query trusted profile from database to determine user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const verifiedRole = (profile?.role || user.user_metadata?.role) as UserRole | undefined;

    // 3. User is authenticated, but has NO assigned role
    if (!verifiedRole || !["admin", "manager", "inspector", "contractor"].includes(verifiedRole)) {
      if (pathname !== "/app/unauthorized") {
        const noRoleUrl = new URL("/app/unauthorized", request.url);
        noRoleUrl.searchParams.set("reason", "no_role");
        return NextResponse.redirect(noRoleUrl);
      }
      return response;
    }

    // 4. Role Authorization Checks
    if (verifiedRole === "admin") {
      // Platform Admin has full access to every feature, page, and setting
      // Admin can optionally preview another persona if cookie is set
      const roleCookie = request.cookies.get("propcare_role")?.value as UserRole | undefined;
      const effectiveRole = roleCookie && ["admin", "manager", "inspector", "contractor"].includes(roleCookie)
        ? roleCookie
        : "admin";

      response.cookies.set("propcare_role", effectiveRole, {
        path: "/",
        maxAge: 604800,
        sameSite: "lax",
      });
      return response;
    }

    // Non-admin: Strictly enforce verified role from database
    response.cookies.set("propcare_role", verifiedRole, {
      path: "/",
      maxAge: 604800,
      sameSite: "lax",
    });

    if (pathname === "/app/unauthorized") {
      return response;
    }

    // Verify role permissions for target path
    if (!isRouteAllowed(pathname, verifiedRole)) {
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
