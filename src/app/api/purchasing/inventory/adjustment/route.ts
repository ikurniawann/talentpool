// ============================================
// API ROUTE: /api/purchasing/inventory/adjustment
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const adjustmentSchema = z.object({
  raw_material_id: z.string().uuid("Bahan baku wajib dipilih"),
  qty_actual: z.number().min(0, "Stok aktual minimal 0"),
  notes: z.string().optional(),
});

// POST /api/purchasing/inventory/adjustment
export async function POST(request: NextRequest) {
  try {
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
    const qtyDiff = validated.qty_actual - currentInv.qty_onhand;

    // Update inventory
    const { data: updatedInv, error: updateError } = await supabase
      .from("inventory")
      .update({
        qty_onhand: validated.qty_actual,
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
          raw_material_id: validated.raw_material_id,
          movement_type: "ADJUSTMENT",
          qty: qtyDiff,
          reference_type: "ADJUSTMENT",
          notes: validated.notes || `Stok opname: ${qtyDiff > 0 ? "+" : ""}${qtyDiff}`,
        });

      if (movementError) throw movementError;
    }

    return Response.json({
      success: true,
      data: updatedInv,
      message: "Stok berhasil disesuaikan",
      adjustment: {
        qty_before: currentInv.qty_onhand,
        qty_after: validated.qty_actual,
        qty_diff: qtyDiff,
      },
    });
  } catch (error: any) {
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
      { success: false, message: error.message || "Gagal menyesuaikan stok" },
      { status: 500 }
    );
  }
}
