import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiUser,
  ApiError,
  paginatedResponse,
} from "@/lib/api/auth";

// GET /api/purchasing/inventory - List all inventory with stock status

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  kategori: z.string().optional(),
  status: z.enum(["normal", "warning", "critical", "empty"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireApiUser();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));
    const { page, limit, search, kategori, status } = params;
    const offset = (page - 1) * limit;

    // Join inventory with bahan_baku
    let query = supabase
      .from("inventory")
      .select(
        `
        *,
        bahan_baku:bahan_baku_id(
          id, kode, nama, kategori, minimum_stock, maximum_stock,
          lokasi_rak, satuan:satuan_id(id, kode, nama)
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `bahan_baku.nama.ilike.%${search}%,bahan_baku.kode.ilike.%${search}%`
      );
    }

    if (kategori) {
      query = query.eq("bahan_baku.kategori", kategori);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Compute stock status per item
    const enriched = (data || []).map((item: any) => {
      const qty = item.qty_in_stock || 0;
      const min = item.bahan_baku?.minimum_stock || 0;
      const max = item.bahan_baku?.maximum_stock || null;

      let stock_status: "normal" | "warning" | "critical" | "empty" = "normal";
      if (qty === 0) stock_status = "empty";
      else if (qty < min) stock_status = "critical";
      else if (max !== null && qty > max) stock_status = "warning";

      return {
        ...item,
        stock_status,
        is_below_minimum: qty < min && qty > 0,
        is_above_maximum: max !== null && qty > max,
        is_empty: qty === 0,
        total_value: (item.qty_in_stock || 0) * (item.avg_cost || 0),
      };
    });

    // Filter by status if provided
    const filtered = status
      ? enriched.filter((item: any) => item.stock_status === status)
      : enriched;

    // Since filtering happens in JS, recount against full dataset for pagination
    return paginatedResponse(filtered, {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Invalid query params", error.issues).toResponse();
    }
    console.error("Error fetching inventory:", error);
    return ApiError.server("Failed to fetch inventory").toResponse();
  }
}
