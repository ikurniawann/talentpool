import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import { validateTransition, POStatus } from "@/lib/purchasing/po";

// POST /api/purchasing/po/:id/send
// Transitions: APPROVED → SENT
// purchasing_admin and purchasing_staff can send
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();

    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const sent_via = body.sent_via; // email, whatsapp, courier, etc.
    const sent_at = body.sent_at;   // custom datetime, defaults to now

    // Get current PO
    const { data: po, error } = await supabase
      .from("purchase_orders")
      .select("*, supplier:supplier_id (id, nama, email)")
      .eq("id", id)
      .single();

    if (error || !po) {
      throw ApiError.notFound("PO tidak ditemukan");
    }

    // ============================================================
    // STATE MACHINE: APPROVED → SENT
    // ============================================================
    try {
      validateTransition(po.status as POStatus, "sent");
    } catch (e) {
      throw ApiError.badRequest((e as Error).message);
    }

    // Update PO status to SENT
    const { data: updatedPO, error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        status: "sent",
        sent_by: user.id,
        sent_at: sent_at || new Date().toISOString(),
        sent_via: sent_via || null,
      })
      .eq("id", id)
      .select(
        `
        *,
        supplier:supplier_id (id, kode, nama),
        sender:sent_by (id, full_name)
      `
      )
      .single();

    if (updateError) throw updateError;

    return successResponse(updatedPO, `PO ${po.po_number} ditandai sudah dikirim ke ${po.supplier?.nama}`);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error sending PO:", error);
    return ApiError.server("Failed to mark PO as sent").toResponse();
  }
}
