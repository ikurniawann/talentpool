import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
  paginatedResponse,
} from "@/lib/api/auth";
import { GRNStatus } from "@/lib/purchasing/delivery";

// ============================================================
// Schemas
// ============================================================

const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["pending", "partial", "completed", "rejected"]).optional(),
  po_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

// ============================================================
// GET /api/purchasing/grn - List GRNs
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff", "warehouse_staff"]);
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const params = queryParamsSchema.parse(Object.fromEntries(searchParams));
    const { page, limit, search, status, po_id, date_from, date_to } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("goods_receipts")
      .select(
        `
        *,
        purchase_order:purchase_order_id(id, po_number, status),
        delivery:delivery_id(id, nomor_resi, no_surat_jalan, kurir),
        penerima:penerima_id(id, full_name)
      `,
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (po_id) query = query.eq("purchase_order_id", po_id);
    if (date_from) query = query.gte("tanggal_terima", date_from);
    if (date_to) query = query.lte("tanggal_terima", date_to);
    if (search) {
      query = query.or(`nomor_gr.ilike.%${search}%,catatan.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return paginatedResponse(
      data || [],
      {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      "GRN list retrieved"
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error fetching GRNs:", error);
    return ApiError.server("Failed to fetch GRNs").toResponse();
  }
}
