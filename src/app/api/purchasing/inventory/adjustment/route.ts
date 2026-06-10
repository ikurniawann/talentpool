// ============================================
// API ROUTE: /api/purchasing/inventory/adjustment
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, requireApiRole } from "@/lib/api/auth";
import { z } from "zod";

const adjustmentSchema = z.object({
  raw_material_id: z.string().uuid("Bahan baku wajib dipilih"),
  qty_actual: z.number().min(0, "Stok aktual minimal 0"),
  notes: z.string().optional(),
});

const ADJUST_ROLES = ["super_admin", "warehouse_admin", "purchasing_admin"] as const;

// POST /api/purchasing/inventory/adjustment
export async function POST(request: NextRequest) {
  try {
    await requireApiRole([...ADJUST_ROLES]);
    const supabase = await createClient();
    const body = await request.json();

    // Validasi input
    const validated = adjustmentSchema.parse(body);

    // Get current inventory
    const { data: currentInv, error: invError } = await supabase
      .from("inventory")
      .select("*")
      .eq("raw_material_id", validated.raw_material_id)
      .single();

    if (invError || !currentInv) {
      return Response.json(
        { success: false, message: "Data inventory tidak ditemukan" },
        { status: 404 }
      );
    }

    // Hitung selisih
    const qtyBefore = Number(currentInv.qty_available || 0);
    const qtyDiff = validated.qty_actual - qtyBefore;

    // Update inventory
    const { data: updatedInv, error: updateError } = await supabase
      .from("inventory")
      .update({
        qty_available: validated.qty_actual,
        last_movement_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("raw_material_id", validated.raw_material_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Record movement jika ada perubahan
    if (qtyDiff !== 0) {
      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert({
          inventory_id: currentInv.id,
          raw_material_id: validated.raw_material_id,
          tipe: "adjustment",
          jumlah: Math.abs(qtyDiff),
          qty_before: qtyBefore,
          qty_after: validated.qty_actual,
          unit_cost: currentInv.unit_cost || 0,
          total_cost: Math.abs(qtyDiff) * Number(currentInv.unit_cost || 0),
          reference_type: "adjustment",
          alasan: validated.notes || `Stok opname: ${qtyDiff > 0 ? "+" : ""}${qtyDiff}`,
        });

      if (movementError) throw movementError;
    }

    return Response.json({
      success: true,
      data: updatedInv,
      message: "Stok berhasil disesuaikan",
      adjustment: {
        qty_before: qtyBefore,
        qty_after: validated.qty_actual,
        qty_diff: qtyDiff,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error adjusting inventory:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          message: "Validasi gagal",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, message: "Gagal menyesuaikan stok" },
      { status: 500 }
    );
  }
}
