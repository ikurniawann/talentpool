import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import {
  validateTransition,
  updateInventoryOnOrder,
  POStatus,
} from "@/lib/purchasing/po";

// POST /api/purchasing/po/:id/approve
// Transitions: DRAFT → APPROVED
// Only purchasing_admin can approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin"]);
    const supabase = await createClient();

    const { id } = await params;

    // Get current PO
    const { data: po, error } = await supabase
      .from("purchase_orders")
      .select("*, items:po_items(*)")
      .eq("id", id)
      .single();

    if (error || !po) {
      throw ApiError.notFound("PO tidak ditemukan");
    }

    // ============================================================
    // STATE MACHINE: DRAFT → APPROVED
    // ============================================================
    try {
      validateTransition(po.status as POStatus, "approved");
    } catch (e) {
      throw ApiError.badRequest((e as Error).message);
    }

    // Update PO status to APPROVED
    const { data: updatedPO, error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        supplier:supplier_id (id, kode, nama),
        approver:approved_by (id, full_name)
      `
      )
      .single();

    if (updateError) throw updateError;

    // Update qty_on_order di inventory (book the order)
    await updateInventoryOnOrder(
      supabase,
      (po.items as any[]).map((item) => ({
        bahan_baku_id: item.bahan_baku_id,
        qty: item.qty,
        satuan_id: item.satuan_id,
        unit_price: item.unit_price,
        discount: item.discount,
      })),
      true // increment
    );

    return successResponse(updatedPO, `PO ${po.po_number} berhasil disetujui`);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error approving PO:", error);
    return ApiError.server("Failed to approve PO").toResponse();
  }
}
