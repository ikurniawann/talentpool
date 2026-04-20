// ============================================
// API ROUTE: /api/purchasing/reports/low-stock
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/purchasing/reports/low-stock
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get bahan dengan stok menipis atau habis
    const { data, error } = await supabase
      .from("v_raw_materials_stock")
      .select("*")
      .eq("is_active", true)
      .or("status_stok.eq.MENIPIS,status_stok.eq.HABIS")
      .order("qty_onhand", { ascending: true });

    if (error) throw error;

    // Hitung ringkasan
    const summary = {
      total_items: data?.length || 0,
      habis: data?.filter((d: any) => d.status_stok === "HABIS").length || 0,
      menipis: data?.filter((d: any) => d.status_stok === "MENIPIS").length || 0,
    };

    return Response.json({
      success: true,
      data,
      summary,
    });
  } catch (error: any) {
    console.error("Error fetching low stock report:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil laporan stok menipis" },
      { status: 500 }
    );
  }
}
