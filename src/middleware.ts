import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect old HRIS paths to new /dashboard/hris/* structure.
  // Must run before the session check so the redirect target is also authenticated.
  const hrisModules = ["candidates", "pipeline", "talent-pool", "staff", "analytics"];
  for (const hrisModule of hrisModules) {
    // Match /dashboard/{module}/* but NOT /dashboard/hris/{module}/*
    if (
      pathname.startsWith(`/dashboard/${hrisModule}`) &&
      !pathname.startsWith("/dashboard/hris/")
    ) {
      const newPath = pathname.replace(
        `/dashboard/${hrisModule}`,
        `/dashboard/hris/${hrisModule}`
      );
      return NextResponse.redirect(new URL(newPath, request.url));
    }
  }

  // Refresh the Supabase session cookie and enforce auth on non-public routes
  // (including /api/*). This previously lived in the root middleware.ts, which
  // Next.js ignores when a src/ directory exists — so it never ran.
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
