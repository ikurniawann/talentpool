import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it hard to debug.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes — customer/kiosk-facing surfaces that intentionally have no login.
  // (table-order is a QR self-order flow; its hardening is rate-limiting + table-session
  // validation at the route level, not authentication.)
  const publicRoutes = [
    "/arkiv-os",
    "/qa",
    "/login",
    "/portal",
    "/career",
    "/table-order",
    "/photobooth",
    "/api/job-openings/public",
    "/api/portal",
    "/api/table-order",
  ];
  const isPublicRoute = pathname === "/" || publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!user && !isPublicRoute) {
    // API routes get a clean 401 (a redirect to an HTML login page would break fetch);
    // page routes are redirected to /login.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
