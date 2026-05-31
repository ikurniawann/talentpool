import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, requireApiRole, validateBody } from "@/lib/api/auth";
import { createAdminUserSchema } from "@/lib/admin/user-management";

async function listAuthUsers() {
  const supabase = createAdminClient();
  const users = [];
  let page = 1;

  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 100) break;
    page += 1;
  }

  return users;
}

export async function GET() {
  try {
    await requireApiRole(["super_admin"]);
    const supabase = createAdminClient();

    const [{ data: profiles, error: profilesError }, authUsers] = await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, email, role, brand_id, status, created_at, updated_at, brands(id, name), user_approval_permissions(*)")
        .order("created_at", { ascending: false }),
      listAuthUsers(),
    ]);

    if (profilesError) throw profilesError;

    const authById = new Map(authUsers.map((user) => [user.id, user]));
    const data = (profiles ?? []).map((profile) => {
      const auth = authById.get(profile.id);
      return {
        ...profile,
        email: auth?.email ?? profile.email ?? "",
        auth_status: auth?.banned_until && new Date(auth.banned_until) > new Date() ? "banned" : "enabled",
        last_sign_in_at: auth?.last_sign_in_at ?? null,
        email_confirmed_at: auth?.email_confirmed_at ?? null,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error listing admin users:", error);
    return NextResponse.json({ error: "Gagal mengambil data user" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  let authUserId: string | null = null;

  try {
    const actor = await requireApiRole(["super_admin"]);
    const body = await validateBody(request, createAdminUserSchema);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
      app_metadata: { role: body.role },
    });

    if (authError) throw ApiError.badRequest(authError.message);
    if (!authData.user) throw ApiError.server("Gagal membuat user auth");
    authUserId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({
        id: authUserId,
        full_name: body.full_name,
        email: body.email,
        role: body.role,
        brand_id: body.brand_id ?? null,
        status: body.status,
      })
      .select("id, full_name, email, role, brand_id, status, created_at")
      .single();

    if (profileError) throw profileError;

    if (body.status === "inactive") {
      await supabase.auth.admin.updateUserById(
        authUserId,
        { ban_duration: "876000h" } as Parameters<typeof supabase.auth.admin.updateUserById>[1]
      );
    }

    const activePermissions = body.approval_permissions.filter((permission) => permission.is_active);
    if (activePermissions.length > 0) {
      const { error: permissionError } = await supabase.from("user_approval_permissions").insert(
        activePermissions.map((permission) => ({
          user_id: authUserId,
          module: permission.module,
          workflow: permission.workflow,
          approval_level: permission.approval_level,
          approval_limit: permission.approval_limit ?? null,
          is_active: permission.is_active,
          created_by: actor.id,
          updated_by: actor.id,
        }))
      );
      if (permissionError) throw permissionError;
    }

    await supabase.from("admin_user_audit_logs").insert({
      actor_id: actor.id,
      target_user_id: authUserId,
      action: "create_user",
      details: { email: body.email, role: body.role, status: body.status },
    });

    return NextResponse.json({ data: profile, message: "User berhasil dibuat" }, { status: 201 });
  } catch (error) {
    if (authUserId) {
      await supabase.auth.admin.deleteUser(authUserId);
    }
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error creating admin user:", error);
    return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });
  }
}
