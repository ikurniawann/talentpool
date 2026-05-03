import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect old HRIS paths to new /dashboard/hris/* structure
  const hrisModules = ['candidates', 'pipeline', 'talent-pool', 'staff', 'analytics'];
  
  for (const module of hrisModules) {
    // Match /dashboard/{module}/* but NOT /dashboard/hris/{module}/*
    if (pathname.startsWith(`/dashboard/${module}`) && !pathname.startsWith('/dashboard/hris/')) {
      const newPath = pathname.replace(`/dashboard/${module}`, `/dashboard/hris/${module}`);
      return NextResponse.redirect(new URL(newPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
};
