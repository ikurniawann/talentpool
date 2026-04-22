import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import {
  validateGrnTransition,
  updateDeliveryStatusAfterGrn,
  updatePOItemReceivedQty,
  updatePOStatusAfterGrn,
  GrnStatus,
} from "@/lib/purchasing/grn";
import { removeInventoryFromGrn } from "@/lib/inventory";

const updateGrnSchema = z.object({
  status: z.enum(["pending", "partially_received", "received", "rejected"]).optional(),
  catatan: z.string().optional(),
});

// GET /api/purchasing/grn/[id] - Get GRN detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole([
      "warehouse_staff",
      "warehouse_admin",
      "purchasing_admin",
      "purchasing_staff",
      "qc_staff",
      "admin",
    ]);
    const supabase = createAdminClient(); // bypass RLS
    const { id } = await params;

    // Get GRN with items
    const { data: grn, error: grnError } = await supabase
      .from("grn")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (grnError || !grn) {
      return ApiError.notFound("GRN tidak ditemukan").toResponse();
    }

    // Get GRN items with raw material details
    const { data: items, error: itemsError } = await supabase
      .from("grn_items")
      .select(`
        *,
        raw_material:raw_material_id(id, nama, kode)
      `)
      .eq("grn_id", id)
      .eq("is_active", true);

    if (itemsError) throw itemsError;

    // Get related data
    const [{ data: delivery }, { data: po }, { data: supplier }] = await Promise.all([
      supabase.from("deliveries").select("id, nomor_resi, no_resi").eq("id", grn.delivery_id).single(),
      supabase.from("purchase_orders").select("id, nomor_po").eq("id", grn.purchase_order_id).single(),
      supabase.from("suppliers").select("id, nama_supplier, kode").eq("id", grn.supplier_id).single(),
    ]);

    return successResponse(
      {
        ...grn,
        delivery_number: delivery?.no_resi || delivery?.nomor_resi,
        po_number: po?.nomor_po,
        supplier_name: supplier?.nama_supplier,
        items: items || [],
      },
      "GRN detail retrieved"
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching GRN:", error);
    return ApiError.server("Failed to fetch GRN").toResponse();
  }
}

// PATCH /api/purchasing/grn/[id] - Update GRN status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole([
      "warehouse_staff",
      "warehouse_admin",
      "purchasing_admin",
      "purchasing_staff",
      "qc_staff",
      "admin",
    ]);
    const supabase = createAdminClient(); // bypass RLS
    const { id } = await params;

    const body = await request.json();
    const validated = updateGrnSchema.parse(body);

    // Get current GRN
    const { data: currentGrn, error: fetchError } = await supabase
      .from("grn")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (fetchError || !currentGrn) {
      return ApiError.notFound("GRN tidak ditemukan").toResponse();
    }

    // Validate status transition
    if (validated.status && validated.status !== currentGrn.status) {
      validateGrnTransition(currentGrn.status as GrnStatus, validated.status);
    }

    // Update GRN
    const updateData: any = {
      ...validated,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data: grn, error } = await supabase
      .from("grn")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Update delivery status if GRN status changed
    if (validated.status && currentGrn.delivery_id) {
      await updateDeliveryStatusAfterGrn(supabase, currentGrn.delivery_id, validated.status);
    }

    return successResponse(grn, `GRN ${grn.nomor_grn} berhasil diupdate`);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error updating GRN:", error);
    return ApiError.server("Failed to update GRN").toResponse();
  }
}

// DELETE /api/purchasing/grn/[id] - Soft delete GRN
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole([
      "warehouse_admin",
      "purchasing_admin",
      "admin",
    ]);
    const supabase = createAdminClient(); // bypass RLS
    const { id } = await params;

    // 1. Ambil GRN + items sebelum dihapus
    const { data: grn, error: grnError } = await supabase
      .from("grn")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (grnError || !grn) {
      return ApiError.notFound("GRN tidak ditemukan").toResponse();
    }

    const { data: grnItems } = await supabase
      .from("grn_items")
      .select("purchase_order_item_id, raw_material_id, qty_diterima")
      .eq("grn_id", id)
      .eq("is_active", true);

    // 2. Kurangi qty_received di PO items
    if (grnItems && grnItems.length > 0) {
      for (const item of grnItems) {
        if (item.purchase_order_item_id) {
          const { data: poItem } = await supabase
            .from("purchase_order_items")
            .select("qty_received")
            .eq("id", item.purchase_order_item_id)
            .single();
          if (poItem) {
            const newQty = Math.max(0, (poItem.qty_received || 0) - (item.qty_diterima || 0));
            await updatePOItemReceivedQty(supabase, item.purchase_order_item_id, newQty);
          }
        }
      }
    }

    // 3. Soft delete GRN dan items
    await supabase.from("grn_items").update({ is_active: false }).eq("grn_id", id);
    const { data: deletedGrn, error } = await supabase
      .from("grn")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 4. Update PO status
    if (grn.purchase_order_id) {
      await updatePOStatusAfterGrn(supabase, grn.purchase_order_id);
    }

    // 5. Kurangi inventory
    if (grnItems) {
      for (const item of grnItems) {
        if (item.qty_diterima > 0 && item.raw_material_id) {
          try {
            await removeInventoryFromGrn(
              supabase,
              item.raw_material_id,
              item.qty_diterima,
              id,
              grn.nomor_grn,
              user.id
            );
          } catch (invErr) {
            console.error("Inventory remove error (non-fatal):", invErr);
          }
        }
      }
    }

    return successResponse(deletedGrn, `GRN ${grn.nomor_grn} berhasil dihapus`);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error deleting GRN:", error);
    return ApiError.server("Failed to delete GRN").toResponse();
  }
}
