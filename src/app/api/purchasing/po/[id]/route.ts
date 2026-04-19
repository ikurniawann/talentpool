import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import { canTransition, validateTransition, POStatus } from "@/lib/purchasing/po";

// ============================================================
// Schemas
// ============================================================

const updatePOSchema = z.object({
  supplier_id: z.string().uuid("Supplier ID tidak valid").optional(),
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(), // existing item
        bahan_baku_id: z.string().uuid("Bahan baku ID tidak valid").optional(),
        description: z.string().min(1, "Deskripsi wajib diisi").optional(),
        qty: z.number().positive("Qty harus lebih dari 0").optional(),
        satuan_id: z.string().uuid("Satuan ID tidak valid").optional(),
        unit_price: z.number().nonnegative("Harga tidak boleh negatif").optional(),
        discount: z.number().nonnegative().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
  tax_percent: z.number().min(0).max(100).optional(),
  shipping_cost: z.number().nonnegative().optional(),
  payment_terms: z.string().optional(),
  delivery_address: z.string().optional(),
  notes: z.string().optional(),
  delivery_date: z.string().optional(),
});

// ============================================================
// GET /api/purchasing/po/:id - Get PO detail with all line items
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "purchasing_manager"]);

    const { id } = await params;
    const supabase = await createClient();

    const { data: po, error } = await supabase
      .from("purchase_orders")
      .select(
        `
        *,
        supplier:supplier_id (id, kode, nama, alamat, telepon, email),
        creator:created_by (id, full_name),
        approver:approved_by (id, full_name),
        sender:sent_by (id, full_name),
        receiver:received_by (id, full_name),
        items:po_items (
          *,
          bahan_baku:bahan_baku_id (id, kode, nama),
          satuan:satuan_id (id, kode, nama)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !po) {
      throw ApiError.notFound("PO tidak ditemukan");
    }

    return successResponse(po);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching PO detail:", error);
    return ApiError.server("Failed to fetch PO detail").toResponse();
  }
}

// ============================================================
// PUT /api/purchasing/po/:id - Update PO (DRAFT only)
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);

    const { id } = await params;
    const supabase = await createClient();

    const body = await request.json();
    const validated = updatePOSchema.parse(body);

    // Fetch current PO
    const { data: currentPO } = await supabase
      .from("purchase_orders")
      .select("*, items:po_items(*)")
      .eq("id", id)
      .single();

    if (!currentPO) {
      throw ApiError.notFound("PO tidak ditemukan");
    }

    // ============================================================
    // STATE MACHINE: Only DRAFT PO can be edited
    // ============================================================
    if (currentPO.status !== "draft") {
      throw ApiError.badRequest(
        `PO tidak dapat diedit — status saat ini: "${currentPO.status}". ` +
          `Hanya PO dengan status DRAFT yang dapat diedit.`
      );
    }

    // If changing supplier, validate new supplier
    if (validated.supplier_id && validated.supplier_id !== currentPO.supplier_id) {
      const { data: newSupplier } = await supabase
        .from("suppliers")
        .select("id, status, is_active")
        .eq("id", validated.supplier_id)
        .single();

      if (!newSupplier || !newSupplier.is_active) {
        throw ApiError.badRequest("Supplier tidak valid atau tidak aktif");
      }
    }

    // Prepare update payload
    const updatePayload: Record<string, unknown> = {
      updated_by: user.id,
    };

    if (validated.supplier_id) updatePayload.supplier_id = validated.supplier_id;
    if (validated.tax_percent !== undefined) updatePayload.tax_percent = validated.tax_percent;
    if (validated.shipping_cost !== undefined) updatePayload.shipping_cost = validated.shipping_cost;
    if (validated.payment_terms !== undefined) updatePayload.payment_terms = validated.payment_terms;
    if (validated.delivery_address !== undefined) updatePayload.delivery_address = validated.delivery_address;
    if (validated.notes !== undefined) updatePayload.notes = validated.notes;
    if (validated.delivery_date !== undefined) updatePayload.delivery_date = validated.delivery_date;

    // Recalculate totals if items changed
    if (validated.items) {
      const subtotal = validated.items.reduce((sum, item) => {
        const qty = item.qty ?? 0;
        const unit_price = item.unit_price ?? 0;
        const discount = item.discount ?? 0;
        return sum + qty * unit_price - discount;
      }, 0);

      const tax_percent = validated.tax_percent ?? currentPO.tax_percent;
      const shipping_cost = validated.shipping_cost ?? currentPO.shipping_cost;
      const tax_amount = (subtotal * tax_percent) / 100;
      const total = subtotal + tax_amount + shipping_cost;

      updatePayload.subtotal = subtotal;
      updatePayload.tax_amount = tax_amount;
      updatePayload.total = total;

      // Replace all items (delete old, insert new)
      // Delete old items
      await supabase.from("po_items").delete().eq("po_id", id);

      // Insert new items
      const newItems = validated.items.map((item) => ({
        po_id: id,
        bahan_baku_id: item.bahan_baku_id || null,
        description: item.description || "",
        qty: item.qty!,
        satuan_id: item.satuan_id!,
        unit_price: item.unit_price!,
        discount: item.discount ?? 0,
        total: item.qty! * item.unit_price! - (item.discount ?? 0),
        notes: item.notes ?? null,
      }));

      await supabase.from("po_items").insert(newItems);
    }

    // Update PO header
    const { data: updatedPO, error: updateError } = await supabase
      .from("purchase_orders")
      .update(updatePayload)
      .eq("id", id)
      .select(
        `
        *,
        supplier:supplier_id (id, kode, nama),
        items:po_items (
          *,
          bahan_baku:bahan_baku_id (id, kode, nama),
          satuan:satuan_id (id, kode, nama)
        )
      `
      )
      .single();

    if (updateError) throw updateError;

    return successResponse(updatedPO, "Purchase Order berhasil diperbarui");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error updating PO:", error);
    return ApiError.server("Failed to update PO").toResponse();
  }
}
