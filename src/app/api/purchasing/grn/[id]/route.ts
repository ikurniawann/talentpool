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
import { removeInventoryFromGrn, addInventoryFromGrn } from "@/lib/inventory";

const grnItemUpdateSchema = z.object({
  id: z.string().uuid().optional(),
  grn_id: z.string().uuid().optional(),
  purchase_order_item_id: z.string().uuid().optional(),
  raw_material_id: z.string().uuid(),
  qty_diterima: z.number().min(0),
  qty_ditolak: z.number().min(0),
  kondisi: z.enum(["baik", "rusak", "cacat"]).default("baik"),
  catatan: z.string().optional().nullable(),
});

const updateGrnSchema = z.object({
  status: z.enum(["pending", "partially_received", "received", "rejected"]).optional(),
  catatan: z.string().optional(),
  items: z.array(grnItemUpdateSchema).optional(),
  tanggal_penerimaan: z.string().optional(),
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
        id,
        grn_id,
        delivery_id,
        purchase_order_item_id,
        raw_material_id,
        qty_diterima,
        qty_ditolak,
        kondisi,
        catatan,
        satuan_id,
        is_active,
        created_at,
        updated_at,
        raw_material:raw_material_id(id, nama, kode)
      `)
      .eq("grn_id", id)
      .eq("is_active", true);

    if (itemsError) {
      console.error(`[GRN/${id}] Error fetching items:`, itemsError);
      throw itemsError;
    }

    console.log(`[GRN/${id}] Fetched ${items?.length || 0} items`);
    if (items && items.length > 0) {
      console.log(`[GRN/${id}] First item:`, JSON.stringify(items[0], null, 2));
      console.log(`[GRN/${id}] purchase_order_item_ids:`, items.map(i => i.purchase_order_item_id));
    }

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

// PATCH /api/purchasing/grn/[id] - Update GRN status and items
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Extract id at function scope
  
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

    console.log(`\n=== [PATCH GRN/${id}] START ===`);

    const body = await request.json();
    console.log(`[PATCH GRN/${id}] Request body:`, JSON.stringify(body, null, 2));
    
    const validated = updateGrnSchema.parse(body);
    console.log(`[PATCH GRN/${id}] Validated:`, JSON.stringify(validated, null, 2));

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

    // Get existing GRN items
    const { data: existingItems } = await supabase
      .from("grn_items")
      .select("*")
      .eq("grn_id", id)
      .eq("is_active", true);

    // Calculate qty changes for inventory and PO updates
    const qtyChanges: {
      raw_material_id: string;
      purchase_order_item_id?: string;
      oldQtyDiterima: number;
      newQtyDiterima: number;
      diff: number;
    }[] = [];

    // Build map of existing items
    const existingItemsMap = new Map(
      (existingItems || []).map((item) => [item.purchase_order_item_id || item.raw_material_id, item])
    );

    // Process new items from request
    if (validated.items && validated.items.length > 0) {
      for (const newItem of validated.items) {
        const existingItem = existingItemsMap.get(
          newItem.purchase_order_item_id || newItem.raw_material_id
        );
        const oldQty = existingItem?.qty_diterima || 0;
        const newQty = newItem.qty_diterima;
        const diff = newQty - oldQty;

        if (diff !== 0) {
          qtyChanges.push({
            raw_material_id: newItem.raw_material_id,
            purchase_order_item_id: newItem.purchase_order_item_id,
            oldQtyDiterima: oldQty,
            newQtyDiterima: newQty,
            diff,
          });
        }
      }
    }

    // Update GRN header
    const updateData: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Only include valid grn table columns (exclude items - handled separately)
    if (validated.status) updateData.status = validated.status;
    if (validated.catatan !== undefined) updateData.catatan = validated.catatan;
    if (validated.tanggal_penerimaan) updateData.tanggal_penerimaan = validated.tanggal_penerimaan;

    // Recalculate totals from items
    if (validated.items && validated.items.length > 0) {
      const totalDiterima = validated.items.reduce((sum, item) => sum + item.qty_diterima, 0);
      const totalDitolak = validated.items.reduce((sum, item) => sum + item.qty_ditolak, 0);
      updateData.total_item_diterima = totalDiterima;
      updateData.total_item_ditolak = totalDitolak;

      // Auto-calculate status based on PO completion
      const { data: poItems } = await supabase
        .from("purchase_order_items")
        .select("qty_ordered, qty_received")
        .eq("purchase_order_id", currentGrn.purchase_order_id)
        .eq("is_active", true);

      if (poItems && poItems.length > 0) {
        const totalOrdered = poItems.reduce((sum, item) => sum + (item.qty_ordered || 0), 0);
        // Calculate new total received (existing + changes from this update)
        const currentTotalReceived = poItems.reduce((sum, item) => sum + (item.qty_received || 0), 0);
        const additionalReceived = qtyChanges.reduce((sum, change) => sum + (change.diff > 0 ? change.diff : 0), 0);
        const newTotalReceived = currentTotalReceived + additionalReceived;

        if (validated.items.every(item => item.qty_diterima === 0) && totalDitolak > 0) {
          updateData.status = "rejected";
        } else if (newTotalReceived >= totalOrdered && totalDitolak === 0) {
          updateData.status = "received";
        } else if (newTotalReceived > 0) {
          updateData.status = "partially_received";
        }
      }
    }

    const { data: grn, error } = await supabase
      .from("grn")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    console.log(`[PATCH GRN/${id}] Update result:`, { grn, error });

    if (error) {
      console.error(`[PATCH GRN/${id}] Update error:`, error);
      throw error;
    }

    // Update GRN items if provided
    if (validated.items && validated.items.length > 0) {
      console.log(`[PATCH GRN/${id}] Updating ${validated.items.length} items...`);
      
      // Delete existing items
      const { error: deleteError } = await supabase.from("grn_items").update({ is_active: false }).eq("grn_id", id);
      if (deleteError) {
        console.error(`[PATCH GRN/${id}] Delete items error:`, deleteError);
        throw deleteError;
      }
      console.log(`[PATCH GRN/${id}] Deleted old items`);

      // Insert new items
      const grnItems = validated.items.map((item) => ({
        grn_id: id,
        delivery_id: currentGrn.delivery_id,
        purchase_order_item_id: item.purchase_order_item_id,
        raw_material_id: item.raw_material_id,
        qty_diterima: item.qty_diterima,
        qty_ditolak: item.qty_ditolak,
        kondisi: item.kondisi,
        catatan: item.catatan || null,
      }));
      
      console.log(`[PATCH GRN/${id}] Inserting items:`, JSON.stringify(grnItems, null, 2));

      const { error: itemsError } = await supabase.from("grn_items").insert(grnItems);
      if (itemsError) {
        console.error(`[PATCH GRN/${id}] Insert items error:`, itemsError);
        throw itemsError;
      }
      console.log(`[PATCH GRN/${id}] Inserted new items successfully`);

      // Update PO item received quantities based on qty changes
      console.log(`[PATCH GRN/${id}] Processing ${qtyChanges.length} qty changes...`);
      for (const change of qtyChanges) {
        if (change.purchase_order_item_id && change.diff !== 0) {
          console.log(`[PATCH GRN/${id}] Updating PO item ${change.purchase_order_item_id}, diff: ${change.diff}`);
          const { data: poItem, error: poError } = await supabase
            .from("purchase_order_items")
            .select("qty_received")
            .eq("id", change.purchase_order_item_id)
            .single();

          if (poError) {
            console.error(`[PATCH GRN/${id}] Fetch PO item error:`, poError);
            continue;
          }

          if (poItem) {
            const newQty = Math.max(0, (poItem.qty_received || 0) + change.diff);
            console.log(`[PATCH GRN/${id}] Setting qty_received to ${newQty}`);
            await updatePOItemReceivedQty(supabase, change.purchase_order_item_id, newQty);
          }
        }
      }
      console.log(`[PATCH GRN/${id}] PO items updated`);

      // Update inventory: REBUILD from scratch (remove old, add new)
      console.log(`[PATCH GRN/${id}] Updating inventory...`);
      
      for (const change of qtyChanges) {
        if (change.raw_material_id) {
          try {
            const oldQty = change.oldQtyDiterima || 0;
            const newQty = change.newQtyDiterima || 0;
            
            console.log(`[PATCH GRN/${id}] Material ${change.raw_material_id}: ${oldQty} → ${newQty}`);
            
            // Step 1: Remove OLD qty from inventory
            if (oldQty > 0) {
              console.log(`[PATCH GRN/${id}]   Removing old qty: ${oldQty}`);
              await removeInventoryFromGrn(
                supabase,
                change.raw_material_id,
                oldQty,
                id,
                currentGrn.nomor_grn,
                user.id
              );
            }
            
            // Step 2: Add NEW qty to inventory
            if (newQty > 0) {
              console.log(`[PATCH GRN/${id}]   Adding new qty: ${newQty}`);
              await addInventoryFromGrn(
                supabase,
                change.raw_material_id,
                newQty,
                0, // unit cost - would need to fetch from PO
                id,
                currentGrn.nomor_grn,
                user.id
              );
            }
          } catch (invErr) {
            console.error(`[PATCH GRN/${id}] Inventory update error for ${change.raw_material_id}:`, invErr);
          }
        }
      }
      console.log(`[PATCH GRN/${id}] Inventory rebuild complete`);
    }

    // Update delivery status if GRN status changed
    if (updateData.status && currentGrn.delivery_id) {
      await updateDeliveryStatusAfterGrn(supabase, currentGrn.delivery_id, updateData.status as GrnStatus);
    }

    // Update PO status based on received quantities
    if (currentGrn.purchase_order_id) {
      console.log(`[PATCH GRN/${id}] Updating PO status...`);
      await updatePOStatusAfterGrn(supabase, currentGrn.purchase_order_id);
      console.log(`[PATCH GRN/${id}] PO status updated`);
    }

    console.log(`[PATCH GRN/${id}] === SUCCESS ===\n`);
    return successResponse(grn, `GRN ${grn.nomor_grn} berhasil diupdate`);
  } catch (error) {
    console.error(`[PATCH GRN/${id}] === ERROR ===`);
    console.error(`[PATCH GRN/${id}] Error:`, error);
    console.error(`[PATCH GRN/${id}] Error stack:`, error instanceof Error ? error.stack : 'N/A');
    
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { 
        error: { 
          message: `Failed to update GRN: ${errorMessage}`,
          details: error instanceof Error ? error.stack : undefined
        } 
      },
      { status: 500 }
    );
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
