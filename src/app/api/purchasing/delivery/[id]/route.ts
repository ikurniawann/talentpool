import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import {
  validateDeliveryTransition,
  validateDeliveryForGRN,
  DeliveryStatus,
} from "@/lib/purchasing/delivery";

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
// GET /api/purchasing/delivery/:id
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();
    const { id } = await params;

    const { data: delivery, error } = await supabase
      .from("deliveries")
      .select(
        `
        *,
        supplier:supplier_id(id, kode, nama),
        purchase_order:purchase_order_id(
          id, po_number, status, supplier_id,
          items:po_items(
            id, bahan_baku_id, description, qty, qty_received,
            satuan:satuan_id(id, kode, nama),
            bahan_baku:bahan_baku_id(id, kode, nama)
          )
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !delivery) {
      throw ApiError.notFound("Delivery tidak ditemukan");
    }

    return successResponse(delivery, "Delivery retrieved");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching delivery:", error);
    return ApiError.server("Failed to fetch delivery").toResponse();
  }
}

// ============================================================
// PUT /api/purchasing/delivery/:id - Update delivery
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
    const validated = updateDeliverySchema.parse(body);

    // Get current delivery
    const { data: existing, error: fetchError } = await supabase
      .from("deliveries")
      .select("*, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      throw ApiError.notFound("Delivery tidak ditemukan");
    }

    // If status transition is requested, validate it
    if (validated.status && validated.status !== existing.status) {
      validateDeliveryTransition(existing.status as DeliveryStatus, validated.status as DeliveryStatus);
    }

    // Build update payload
    const updateData: Record<string, unknown> = { updated_by: user.id };
    if (validated.no_surat_jalan) updateData.no_surat_jalan = validated.no_surat_jalan;
    if (validated.ekspedisi !== undefined) updateData.kurir = validated.ekspedisi;
    if (validated.no_resi !== undefined) updateData.nomor_resi = validated.no_resi;
    if (validated.tanggal_kirim) updateData.tanggal_kirim = validated.tanggal_kirim;
    if (validated.tanggal_estimasi_tiba) updateData.tanggal_estimasi_tiba = validated.tanggal_estimasi_tiba;
    if (validated.tanggal_aktual_tiba) updateData.tanggal_aktual_tiba = validated.tanggal_aktual_tiba;
    if (validated.status) updateData.status = validated.status;
    if (validated.catatan !== undefined) updateData.catatan = validated.catatan;

    const { data: updated, error: updateError } = await supabase
      .from("deliveries")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        supplier:supplier_id(id, kode, nama),
        purchase_order:purchase_order_id(id, po_number, status)
      `
      )
      .single();

    if (updateError) throw updateError;

    return successResponse(updated, "Delivery updated");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error updating delivery:", error);
    return ApiError.server("Failed to update delivery").toResponse();
  }
}

// ============================================================
// DELETE /api/purchasing/delivery/:id - Soft delete
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
      .from("deliveries")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      throw ApiError.notFound("Delivery tidak ditemukan");
    }

    if (existing.status !== "pending" && existing.status !== "cancelled") {
      throw ApiError.badRequest(
        `Delivery berstatus "${existing.status}" — hanya delivery berstatus PENDING atau CANCELLED yang dapat dihapus`
      );
    }

    await supabase
      .from("deliveries")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", id);

    return successResponse(null, "Delivery berhasil dihapus");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error deleting delivery:", error);
    return ApiError.server("Failed to delete delivery").toResponse();
  }
}
