import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import { formatRupiah } from "@/lib/purchasing/utils";

// GET /api/purchasing/reports/inventory-valuation
// Inventory valuation report - supports CSV/Excel export

const querySchema = z.object({
  date: z.string().optional(), // valuation date (default: today)
  kategori: z.string().optional(),
  export: z.enum(["json", "csv", "xlsx"]).default("json"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_manager", "purchasing_staff"]);
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));
    const { kategori, export: exportFormat } = params;

    // Fetch all inventory with bahan_baku
    let query = supabase
      .from("inventory")
      .select(
        `
        *,
        bahan_baku:bahan_baku_id(
          id, kode, nama, kategori,
          satuan:satuan_id(id, kode, nama),
          minimum_stock
        )
      `
      )
      .gte("qty_in_stock", 0);

    if (kategori) {
      query = query.eq("bahan_baku.kategori", kategori);
    }

    const { data: inventory, error } = await query;

    if (error) throw error;

    // Build valuation report
    const valuation = (inventory || []).map((item: any) => {
      const qty = item.qty_in_stock || 0;
      const avgCost = item.avg_cost || 0;
      const totalValue = qty * avgCost;
      const minStock = item.bahan_baku?.minimum_stock || 0;
      const isBelowMin = qty > 0 && qty < minStock;

      return {
        kode_bahan: item.bahan_baku?.kode,
        nama_bahan: item.bahan_baku?.nama,
        kategori: item.bahan_baku?.kategori,
        satuan: item.bahan_baku?.satuan?.nama,
        qty_onhand: qty,
        avg_cost: Math.round(avgCost * 100) / 100,
        total_value: Math.round(totalValue * 100) / 100,
        total_value_formatted: formatRupiah(totalValue),
        below_minimum: isBelowMin,
        minimum_stock: minStock,
        location: item.bahan_baku?.lokasi_rak,
      };
    });

    const totalNilaiStok = valuation.reduce((sum, v) => sum + v.total_value, 0);
    const totalItems = valuation.length;
    const itemsBelowMin = valuation.filter((v: any) => v.below_minimum).length;

    const summary = {
      total_items: totalItems,
      total_nilai_stok: Math.round(totalNilaiStok * 100) / 100,
      total_nilai_stok_formatted: formatRupiah(totalNilaiStok),
      items_below_minimum: itemsBelowMin,
      valuation_date: new Date().toISOString(),
    };

    if (exportFormat === "csv") {
      const header =
        "Kode,Nama,Kategori,Satuan,Qty On Hand,Avg Cost,Total Value,Below Minimum,Min Stock,Location\n";
      const rows = valuation
        .map(
          (v: any) =>
            `${v.kode_bahan},"${v.nama_bahan}",${v.kategori || ""},${v.satuan || ""},${v.qty_onhand},${v.avg_cost},${v.total_value},${v.below_minimum},${v.minimum_stock},${v.location || ""}`
        )
        .join("\n");

      return new NextResponse(header + rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="inventory-valuation-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return successResponse({ summary, items: valuation });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Invalid query params", error.issues).toResponse();
    }
    console.error("Error generating inventory valuation:", error);
    return ApiError.server("Failed to generate report").toResponse();
  }
}
