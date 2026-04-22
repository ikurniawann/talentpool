import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiRole, paginatedResponse } from "@/lib/api/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["warehouse_staff", "warehouse_admin", "purchasing_admin", "purchasing_staff", "admin"]);
    const supabase = createAdminClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 25);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("inventory_movements")
      .select("*", { count: "exact" })
      .eq("inventory_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return paginatedResponse(data || [], { page, limit, total: count || 0 }, "Movements retrieved");
  } catch (e: any) {
    console.error("Error fetching movements:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
