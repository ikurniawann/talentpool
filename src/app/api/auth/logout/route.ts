import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, destroySession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  await destroySession(token);
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
