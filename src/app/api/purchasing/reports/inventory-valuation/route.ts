// ============================================
// API ROUTE: /api/purchasing/reports/inventory-valuation
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/purchasing/reports/inventory-valuation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get semua inventory aktif dengan stok > 0
    const { data, error } = await supabase
      .from("v_raw_materials_stock")
      .select("*")
      .eq("is_active", true)
      .gt("qty_onhand", 0)
      .order("kategori", { ascending: true });

    if (error) throw error;

    // Calculate total value
    let totalValue = 0;
    const byCategory: Record<string, { kategori: string; total_value: number; item_count: number }> = {};

    data?.forEach((item: any) => {
      const value = (item.qty_onhand || 0) * (item.avg_cost || 0);
      totalValue += value;

      if (!byCategory[item.kategori]) {
        byCategory[item.kategori] = {
          kategori: item.kategori,
          total_value: 0,
          item_count: 0,
        };
      }
      byCategory[item.kategori].total_value += value;
      byCategory[item.kategori].item_count += 1;
    });

    const kategoriLabels: Record<string, string> = {
      BAHAN_PANGAN: "Bahan Pangan",
      BAHAN_NON_PANGAN: "Bahan Non-Pangan",
      KEMASAN: "Kemasan",
      BAHAN_BAKAR: "Bahan Bakar",
      LAINNYA: "Lainnya",
    };

    return Response.json({
      success: true,
      data,
      summary: {
        total_value: totalValue,
        total_items: data?.length || 0,
        by_category: Object.values(byCategory).map((cat) => ({
          ...cat,
          kategori: kategoriLabels[cat.kategori] || cat.kategori,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching inventory valuation:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil laporan valuasi" },
      { status: 500 }
    );
  }
}
