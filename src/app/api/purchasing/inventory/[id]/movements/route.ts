// ============================================
// API ROUTE: /api/purchasing/inventory/[id]/movements
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/purchasing/inventory/:id/movements
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get movements dengan limit
    const { data, error } = await supabase
      .from("inventory_movements")
      .select(`
        *,
        raw_material:raw_material_id (*)
      `)
      .eq("raw_material_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return Response.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching movements:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data pergerakan stok" },
      { status: 500 }
    );
  }
}
