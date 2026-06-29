import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/middleware";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Legacy employees path (was under /dashboard/hris/employees).
  if (pathname.startsWith("/dashboard/hris/employees")) {
    const target = pathname.replace("/dashboard/hris/employees", "/dashboard/employees");
    return NextResponse.redirect(new URL(`${target}${search}`, request.url));
  }

  // Legacy create URL: .../new → .../insert
  const legacyNew = pathname.match(/^(\/dashboard\/(?:[^/]+\/)+)new$/);
  if (legacyNew) {
    return NextResponse.redirect(new URL(`${legacyNew[1]}insert${search}`, request.url));
  }

  // Legacy edit URL: .../{id}/edit → .../edit/{id}
  const legacyEdit = pathname.match(/^(\/dashboard\/(?:.+\/)+)([^/]+)\/edit$/);
  if (legacyEdit) {
    return NextResponse.redirect(
      new URL(`${legacyEdit[1]}edit/${legacyEdit[2]}${search}`, request.url)
    );
  }

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

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
