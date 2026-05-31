import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, requireApiRole } from "@/lib/api/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireApiRole(["super_admin"]);
    const supabase = createAdminClient();

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id);
    if (authError || !authUser.user?.email) {
      throw ApiError.notFound("Email user tidak ditemukan");
    }

    const origin = new URL(request.url).origin;
    const { error } = await supabase.auth.resetPasswordForEmail(authUser.user.email, {
      redirectTo: `${origin}/login`,
    });

    if (error) throw ApiError.badRequest(error.message);

    await supabase.from("admin_user_audit_logs").insert({
      actor_id: actor.id,
      target_user_id: id,
      action: "reset_password",
      details: { email: authUser.user.email },
    });

    return NextResponse.json({ message: "Link reset password berhasil dikirim" });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error sending reset password:", error);
    return NextResponse.json({ error: "Gagal mengirim reset password" }, { status: 500 });
  }
}
