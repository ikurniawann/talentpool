import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import { validateTransition, POStatus } from "@/lib/purchasing/po";

// ============================================================
// Schemas
// ============================================================

const receiveItemSchema = z.object({
  po_item_id: z.string().uuid("PO item ID tidak valid"),
  qty_received: z.number().positive("Qty received harus lebih dari 0"),
});

const receivePOSchema = z.object({
  items: z.array(receiveItemSchema).min(1, "Minimal 1 item"),
  notes: z.string().optional(),
  received_at: z.string().optional(), // ISO datetime
});

// POST /api/purchasing/po/:id/receive
// Transitions: SENT → PARTIAL (some items) or RECEIVED (all items)
// Only purchasing_admin or purchasing_staff can receive
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();

    const { id } = await params;

    const body = await request.json();
    const validated = receivePOSchema.parse(body);

    // Get PO with items
    const { data: po, error } = await supabase
      .from("purchase_orders")
      .select("*, items:po_items(*)")
      .eq("id", id)
      .single();

    if (error || !po) {
      throw ApiError.notFound("PO tidak ditemukan");
    }

    // ============================================================
    // STATE MACHINE: SENT → PARTIAL or SENT → RECEIVED
    // ============================================================
    const currentStatus = po.status as POStatus;

    // Check if PO can receive (must be SENT or already PARTIAL)
    if (currentStatus !== "sent" && currentStatus !== "partial") {
      throw ApiError.badRequest(
        `PO tidak dapat diterima — status harus SENT atau PARTIAL, saat ini: "${currentStatus}"`
      );
    }

    // Validate items and determine new status
    const poItemMap = new Map((po.items as any[]).map((i) => [i.id, i]));

    for (const inputItem of validated.items) {
      const poItem = poItemMap.get(inputItem.po_item_id);
      if (!poItem) {
        throw ApiError.badRequest(`PO item ${inputItem.po_item_id} tidak ditemukan`);
      }

      const maxReceivable = (poItem.qty || 0) - (poItem.qty_received || 0);
      if (inputItem.qty_received > maxReceivable) {
        throw ApiError.badRequest(
          `Qty diterima untuk "${poItem.description}" melebihi sisa: ${maxReceivable}`
        );
      }
    }

    // Calculate if all items fully received
    let allFullyReceived = true;
    const updatedItems: { id: string; qty_received: number }[] = [];

    for (const poItem of po.items as any[]) {
      const inputItem = validated.items.find((i) => i.po_item_id === poItem.id);
      const newQtyReceived = (poItem.qty_received || 0) + (inputItem?.qty_received || 0);

      updatedItems.push({ id: poItem.id, qty_received: newQtyReceived });

      if (newQtyReceived < (poItem.qty || 0)) {
        allFullyReceived = false;
      }
    }

    // Determine new PO status
    const newStatus: POStatus = allFullyReceived ? "received" : "partial";

    // Update PO items with received qty
    for (const item of updatedItems) {
      await supabase
        .from("po_items")
        .update({ qty_received: item.qty_received })
        .eq("id", item.id);
    }

    // Update inventory: qty_in_stock += received, qty_on_order -= received
    for (const inputItem of validated.items) {
      const poItem = poItemMap.get(inputItem.po_item_id);
      if (!poItem?.bahan_baku_id) continue;

      // Get current inventory
      const { data: inventory } = await supabase
        .from("inventory")
        .select("qty_in_stock, qty_on_order")
        .eq("bahan_baku_id", poItem.bahan_baku_id)
        .single();

      if (inventory) {
        await supabase
          .from("inventory")
          .update({
            qty_in_stock: (inventory.qty_in_stock || 0) + inputItem.qty_received,
            qty_on_order: Math.max(0, (inventory.qty_on_order || 0) - inputItem.qty_received),
          })
          .eq("bahan_baku_id", poItem.bahan_baku_id);
      } else {
        // Create inventory record if not exists
        await supabase.from("inventory").insert({
          bahan_baku_id: poItem.bahan_baku_id,
          qty_in_stock: inputItem.qty_received,
          qty_on_order: 0,
        });
      }
    }

    // Update PO header status
    const { data: updatedPO, error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        status: newStatus,
        received_by: user.id,
        received_at: validated.received_at || new Date().toISOString(),
        notes: validated.notes ? `${po.notes || ""}\n${validated.notes}`.trim() : po.notes,
      })
      .eq("id", id)
      .select(
        `
        *,
        supplier:supplier_id (id, kode, nama),
        receiver:received_by (id, full_name),
        items:po_items (
          *,
          bahan_baku:bahan_baku_id (id, kode, nama),
          satuan:satuan_id (id, kode, nama)
        )
      `
      )
      .single();

    if (updateError) throw updateError;

    const statusLabel = newStatus === "received" ? "diterima sepenuhnya" : "diterima sebagian (PARTIAL)";
    return successResponse(
      updatedPO,
      `PO ${po.po_number} ${statusLabel}`
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error receiving PO:", error);
    return ApiError.server("Failed to receive PO").toResponse();
  }
}
