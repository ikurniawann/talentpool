import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@/lib/api/auth";
import {
  generateDeliveryNumber,
  validatePOCanDelivery,
  validateDeliveryTransition,
  DeliveryStatus,
} from "@/lib/purchasing/delivery";

// ============================================================
// Schemas
// ============================================================

const createDeliverySchema = z.object({
  po_id: z.string().uuid("PO ID tidak valid"),
  no_surat_jalan: z.string().min(1, "No. Surat Jalan wajib diisi"),
  ekspedisi: z.string().optional(),
  no_resi: z.string().optional(),
  tanggal_kirim: z.string().optional(), // YYYY-MM-DD
  tanggal_estimasi_tiba: z.string().optional(), // YYYY-MM-DD
  catatan: z.string().optional(),
});

const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["pending", "shipped", "in_transit", "delivered", "cancelled"]).optional(),
  po_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

const updateDeliverySchema = z.object({
  no_surat_jalan: z.string().min(1).optional(),
  ekspedisi: z.string().optional(),
  no_resi: z.string().optional(),
  tanggal_kirim: z.string().optional(),
  tanggal_estimasi_tiba: z.string().optional(),
  tanggal_aktual_tiba: z.string().optional(),
  status: z.enum(["pending", "shipped", "in_transit", "delivered", "cancelled"]).optional(),
  catatan: z.string().optional(),
});

// ============================================================
// GET /api/purchasing/delivery - List deliveries
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const params = queryParamsSchema.parse(Object.fromEntries(searchParams));
    const { page, limit, search, status, po_id, supplier_id, date_from, date_to } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("deliveries")
      .select(
        `
        *,
        supplier:supplier_id(id, kode, nama),
        purchase_order:purchase_order_id(id, po_number, status)
      `,
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (po_id) query = query.eq("purchase_order_id", po_id);
    if (supplier_id) query = query.eq("supplier_id", supplier_id);
    if (date_from) query = query.gte("tanggal_kirim", date_from);
    if (date_to) query = query.lte("tanggal_kirim", date_to);
    if (search) {
      query = query.or(`no_surat_jalan.ilike.%${search}%,nomor_resi.ilike.%${search}%,ekspedisi.ilike.%${search}%`);
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
      "Delivery list retrieved"
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error fetching deliveries:", error);
    return ApiError.server("Failed to fetch deliveries").toResponse();
  }
}

// ============================================================
// POST /api/purchasing/delivery - Create delivery
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();

    const body = await request.json();
    const validated = createDeliverySchema.parse(body);

    // Validate PO can have delivery
    const { valid, errors, po } = await validatePOCanDelivery(supabase, validated.po_id);
    if (!valid) {
      throw ApiError.badRequest(errors.join("; "));
    }

    // Generate delivery number
    const deliveryNumber = await generateDeliveryNumber(supabase);

    // Create delivery record
    const { data: delivery, error } = await supabase
      .from("deliveries")
      .insert({
        nomor_resi: deliveryNumber,
        purchase_order_id: validated.po_id,
        supplier_id: po.supplier_id,
        tanggal_kirim: validated.tanggal_kirim || new Date().toISOString().split("T")[0],
        tanggal_estimasi_tiba: validated.tanggal_estimasi_tiba || null,
        kurir: validated.ekspedisi || null,
        no_surat_jalan: validated.no_surat_jalan,
        status: "pending",
        catatan: validated.catatan || null,
        created_by: user.id,
      })
      .select(
        `
        *,
        supplier:supplier_id(id, kode, nama),
        purchase_order:purchase_order_id(id, po_number, status)
      `
      )
      .single();

    if (error) throw error;

    return createdResponse(delivery, `Delivery ${deliveryNumber} berhasil dibuat`);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error creating delivery:", error);
    return ApiError.server("Failed to create delivery").toResponse();
  }
}
