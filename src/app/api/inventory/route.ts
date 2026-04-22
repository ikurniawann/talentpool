import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiRole, paginatedResponse } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(["warehouse_staff", "warehouse_admin", "purchasing_admin", "purchasing_staff", "admin"]);
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("v_inventory")
      .select("*", { count: "exact" })
      .order("material_nama", { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) query = query.or(`material_nama.ilike.%${search}%,material_kode.ilike.%${search}%`);
    if (status) query = query.eq("stock_status", status);

    const { data, error, count } = await query;
    if (error) throw error;

    return paginatedResponse(data || [], { page, limit, total: count || 0 }, "Inventory retrieved");
  } catch (e: any) {
    console.error("Error fetching inventory:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
