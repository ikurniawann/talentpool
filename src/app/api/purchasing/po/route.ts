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
  generatePONumber,
  validatePOCreate,
  calculatePO,
  updateInventoryOnOrder,
  POItemInput,
} from "@/lib/purchasing/po";

// ============================================================
// Schemas
// ============================================================

const poItemSchema = z.object({
  bahan_baku_id: z.string().uuid("Bahan baku ID tidak valid").optional(),
  description: z.string().min(1, "Deskripsi wajib diisi").optional(),
  qty: z.number().positive("Qty harus lebih dari 0"),
  satuan_id: z.string().uuid("Satuan ID tidak valid"),
  unit_price: z.number().nonnegative("Harga tidak boleh negatif"),
  discount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

const createPOSchema = z.object({
  supplier_id: z.string().uuid("Supplier ID tidak valid"),
  items: z.array(poItemSchema).min(1, "Minimal 1 item"),
  tax_percent: z.number().min(0).max(100).default(11),
  shipping_cost: z.number().nonnegative().default(0),
  payment_terms: z.string().optional(),
  delivery_address: z.string().optional(),
  notes: z.string().optional(),
  delivery_date: z.string().optional(), // YYYY-MM-DD
});

const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["draft", "approved", "sent", "partial", "received", "cancelled", "closed"]).optional(),
  supplier_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

// ============================================================
// GET /api/purchasing/po - List PO with filter & pagination
// ============================================================

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "purchasing_manager"]);

    const supabase = await createClient();

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = queryParamsSchema.parse(rawParams);
    const { page, limit, search, status, supplier_id, date_from, date_to } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("purchase_orders")
      .select(
        `
        *,
        supplier:supplier_id (id, kode, nama),
        items:po_items (id, description, qty, unit_price, qty_received, satuan:satuan_id (nama))
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (supplier_id) query = query.eq("supplier_id", supplier_id);
    if (date_from) query = query.gte("order_date", date_from);
    if (date_to) query = query.lte("order_date", date_to);
    if (search) {
      query = query.or(`po_number.ilike.%${search}%,suppliers.nama.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json(
      paginatedResponse(data ?? [], {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      })
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Invalid query parameters", error.issues).toResponse();
    }
    console.error("Error fetching PO list:", error);
    return ApiError.server("Failed to fetch PO list").toResponse();
  }
}

// ============================================================
// POST /api/purchasing/po - Create PO
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();

    const body = await request.json();
    const validated = createPOSchema.parse(body);

    // 1. Validate input — supplier aktif, bahan baku aktif, harga ada
    const { valid, errors } = await validatePOCreate(supabase, {
      supplier_id: validated.supplier_id,
      items: validated.items as POItemInput[],
    });

    if (!valid) {
      throw ApiError.badRequest("Validasi gagal", errors);
    }

    // 2. Generate PO number: PO-{YYYY}{MM}-{SEQ:4}
    const poNumber = await generatePONumber(supabase);

    // 3. Calculate totals
    const calc = calculatePO({
      items: validated.items as POItemInput[],
      tax_percent: validated.tax_percent,
      shipping_cost: validated.shipping_cost,
    });

    // 4. Use db rpc for transaction (multi-step insert)
    // Since Supabase-js doesn't have native transaction, we do sequential with error handling
    // Insert PO
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: poNumber,
        supplier_id: validated.supplier_id,
        status: "draft",
        subtotal: calc.subtotal,
        tax_percent: validated.tax_percent,
        tax_amount: calc.tax_amount,
        shipping_cost: calc.shipping_cost,
        total: calc.total,
        payment_terms: validated.payment_terms,
        delivery_address: validated.delivery_address,
        notes: validated.notes,
        delivery_date: validated.delivery_date,
        created_by: user.id,
      })
      .select()
      .single();

    if (poError) throw poError;

    // 5. Insert PO items
    const poItems = (validated.items as POItemInput[]).map((item) => ({
      po_id: po.id,
      bahan_baku_id: item.bahan_baku_id || null,
      description: item.description || "",
      qty: item.qty,
      satuan_id: item.satuan_id,
      unit_price: item.unit_price,
      discount: item.discount || 0,
      total: item.qty * item.unit_price - (item.discount || 0),
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabase.from("po_items").insert(poItems);

    if (itemsError) {
      // Rollback: delete PO if items failed
      await supabase.from("purchase_orders").delete().eq("id", po.id);
      throw itemsError;
    }

    // 6. Update qty_on_order di inventory (only when PO is approved, not on draft)
    // This is done in the approve step instead

    return createdResponse(
      { ...po, items: poItems },
      `Purchase Order ${poNumber} berhasil dibuat`
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error creating PO:", error);
    return ApiError.server("Failed to create PO").toResponse();
  }
}
