import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserRole } from "@/types";
import { cache } from "react";

export interface AuthUser {
  id: string;
  full_name: string;
  role: UserRole;
  brand_id: string | null;
}

// Cache per request — layout + page hanya 1x auth call
export const getUser = cache(async (): Promise<{ user: AuthUser | null; supabase: Awaited<ReturnType<typeof createClient>> }> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, supabase };

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, brand_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { user: null, supabase };

  return {
    user: {
      id: user.id,
      full_name: profile.full_name,
      role: profile.role as UserRole,
      brand_id: profile.brand_id,
    },
    supabase,
  };
});

// Cache version for requireUser too
export const requireUser = cache(async (): Promise<AuthUser> => {
  const { user } = await getUser();
  if (!user) redirect("/login");
  return user;
});

export async function requireRole(roles: UserRole[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}
