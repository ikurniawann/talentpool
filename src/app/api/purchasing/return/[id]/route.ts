import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import {
  validateReturnTransition,
  ReturnStatus,
} from "@/lib/purchasing/delivery";
import { reduceStockOnReturn, getOrCreateInventory, recordMovement } from "@/lib/purchasing/inventory";

// ============================================================
// Schemas
// ============================================================

const updateReturnSchema = z.object({
  jumlah: z.number().positive().optional(),
  alasan: z.string().optional(),
  satuan_id: z.string().uuid().optional(),
  tanggal_pengembalian: z.string().optional(),
  no_resi: z.string().optional(),
  status: z.enum(["pending", "approved", "shipped", "received_by_supplier", "completed", "cancelled"]).optional(),
  catatan: z.string().optional(),
  jenis_pengembalian: z.enum(["replacement", "refund"]).optional(), // for COMPLETED
});

// ============================================================
// GET /api/purchasing/return/:id
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();
    const { id } = await params;

    const { data: ret, error } = await supabase
      .from("returns")
      .select(
        `
        *,
        supplier:supplier_id(id, kode, nama),
        bahan_baku:bahan_baku_id(id, kode, nama),
        satuan:satuan_id(id, kode, nama),
        goods_receipt:goods_receipt_id(id, nomor_gr, purchase_order_id),
        approved_by_user:approved_by(id, full_name)
      `
      )
      .eq("id", id)
      .single();

    if (error || !ret) {
      throw ApiError.notFound("Return tidak ditemukan");
    }

    return successResponse(ret, "Return retrieved");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching return:", error);
    return ApiError.server("Failed to fetch return").toResponse();
  }
}

// ============================================================
// PUT /api/purchasing/return/:id
// Handle status transitions:
// PENDING → APPROVED: reduce stock immediately
// APPROVED → SHIPPED: confirm shipment
// SHIPPED → RECEIVED_BY_SUPPLIER: supplier received
// RECEIVED_BY_SUPPLIER → COMPLETED: with refund/replacement type
// * → CANCELLED: restore stock if was already reduced
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();
    const { id } = await params;

    const body = await request.json();
    const validated = updateReturnSchema.parse(body);

    // Get current return
    const { data: existing, error: fetchError } = await supabase
      .from("returns")
      .select("*, inventory:inventory(qty_in_stock, avg_cost)")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      throw ApiError.notFound("Return tidak ditemukan");
    }

    const fromStatus = existing.status as ReturnStatus;

    // Validate state transition
    if (validated.status && validated.status !== fromStatus) {
      validateReturnTransition(fromStatus, validated.status as ReturnStatus);
    }

    // ── APPROVED ──────────────────────────────────────────
    if (validated.status === "approved" || fromStatus === "pending" && validated.status === undefined) {
      const targetStatus = validated.status || "approved";

      // Reduce stock when return is approved (barang belum keluar gudang)
      await reduceStockOnReturn(supabase, {
        returnId: existing.id,
        bahanBakuId: existing.bahan_baku_id,
        qtyReturned: existing.jumlah,
        unitCost: (existing as any).inventory?.avg_cost || 0,
        userId: user.id,
      });
    }

    // ── CANCELLED ─────────────────────────────────────────
    if (validated.status === "cancelled") {
      // If stock was already reduced (approved or later), restore it
      const alreadyReduced = fromStatus !== "pending";
      if (alreadyReduced) {
        const inv = await getOrCreateInventory(supabase, existing.bahan_baku_id);
        const sebelum = inv.qty_in_stock || 0;
        const sesudah = sebelum + Number(existing.jumlah);

        await supabase
          .from("inventory")
          .update({ qty_in_stock: sesudah })
          .eq("id", inv.id);

        await recordMovement(supabase, {
          inventory_id: inv.id,
          bahan_baku_id: existing.bahan_baku_id,
          tipe: "return",
          jumlah: Number(existing.jumlah),
          unit_cost: (existing as any).inventory?.avg_cost || 0,
          total_cost: Number(existing.jumlah) * ((existing as any).inventory?.avg_cost || 0),
          reference_type: "return",
          reference_id: existing.id,
          sebelum,
          sesudah,
          alasan: "Return dibatalkan",
          catatan: `Return ${existing.nomor_return} dibatalkan — stock dikembalikan`,
          created_by: user.id,
        });
      }
    }

    // ── Build update payload ───────────────────────────────
    const updateData: Record<string, unknown> = { updated_by: user.id };
    if (validated.jumlah !== undefined) updateData.jumlah = validated.jumlah;
    if (validated.alasan !== undefined) updateData.alasan = validated.alasan;
    if (validated.satuan_id) updateData.satuan_id = validated.satuan_id;
    if (validated.tanggal_pengembalian) updateData.tanggal_pengembalian = validated.tanggal_pengembalian;
    if (validated.no_resi !== undefined) updateData.nomor_resi = validated.no_resi;
    if (validated.catatan !== undefined) updateData.catatan = validated.catatan;
    if (validated.status) updateData.status = validated.status;
    if (validated.jenis_pengembalian) {
      updateData.catatan = `${existing.catatan || ""}\nJenis pengembalian: ${validated.jenis_pengembalian}`.trim();
    }

    // Auto-set approved_by / approved_at
    if (validated.status === "approved" && !existing.approved_by) {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from("returns")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        supplier:supplier_id(id, kode, nama),
        bahan_baku:bahan_baku_id(id, kode, nama),
        satuan:satuan_id(id, kode, nama),
        approved_by_user:approved_by(id, full_name)
      `
      )
      .single();

    if (updateError) throw updateError;

    return successResponse(updated, `Return ${existing.nomor_return} diupdate — status: ${updated.status}`);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error updating return:", error);
    return ApiError.server("Failed to update return").toResponse();
  }
}

// ============================================================
// DELETE /api/purchasing/return/:id - Soft delete
// Only allowed if PENDING
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin"]);
    const supabase = await createClient();
    const { id } = await params;

    const { data: existing, error: fetchError } = await supabase
      .from("returns")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      throw ApiError.notFound("Return tidak ditemukan");
    }

    if (existing.status !== "pending") {
      throw ApiError.badRequest(
        `Hanya return berstatus PENDING yang dapat dihapus — saat ini: "${existing.status}"`
      );
    }

    await supabase
      .from("returns")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", id);

    return successResponse(null, "Return berhasil dihapus");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error deleting return:", error);
    return ApiError.server("Failed to delete return").toResponse();
  }
}
