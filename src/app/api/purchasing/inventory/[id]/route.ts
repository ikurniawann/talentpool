// ============================================
// API ROUTE: /api/purchasing/inventory/[id]
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/purchasing/inventory/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get inventory dengan detail bahan
    const { data: inventory, error: invError } = await supabase
      .from("v_raw_materials_stock")
      .select("*")
      .eq("id", id)
      .single();

    if (invError) {
      if (invError.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Inventory tidak ditemukan" },
          { status: 404 }
        );
      }
      throw invError;
    }

    return Response.json({ success: true, data: inventory });
  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data inventory" },
      { status: 500 }
    );
  }
}
