import { redirect } from "next/navigation";
import { UserRole } from "@/types";
import { cache } from "react";
import { createServerPgClient } from "@/lib/pg/create-client";

export interface AuthUser {
  id: string;
  full_name: string;
  role: UserRole;
  email: string;
  brand_id: string | null;
}

export const getUser = cache(async (): Promise<{
  user: AuthUser | null;
  db: Awaited<ReturnType<typeof createServerPgClient>>;
}> => {
  const db = await createServerPgClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) return { user: null, db };

  const { data: profile } = await db
    .from("users")
    .select("full_name, role, brand_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { user: null, db };

  return {
    user: {
      id: user.id,
      full_name: profile.full_name,
      role: profile.role as UserRole,
      email: user.email ?? "",
      brand_id: profile.brand_id,
    },
    db,
  };
});

export const requireUser = cache(async (): Promise<AuthUser> => {
  const { user } = await getUser();
  if (!user) redirect("/login");
  return user;
});

export async function requireRole(roles: UserRole[]): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== "super_admin" && !roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}
