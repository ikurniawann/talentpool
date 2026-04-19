import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import { getOrCreateInventory, recordMovement } from "@/lib/purchasing/inventory";

// POST /api/purchasing/inventory/adjustment
// Stock opname / manual correction - purchasing_admin only

const adjustmentSchema = z.object({
  bahan_baku_id: z.string().uuid("ID bahan baku tidak valid"),
  adjustment: z.number().refine((v) => v !== 0, {
    message: "Adjustment tidak boleh 0",
  }),
  alasan: z.string().min(10, "Alasan minimal 10 karakter").max(500),
  dokumen_lampiran: z
    .object({
      nama: z.string(),
      url: z.string().url(),
      tipe: z.string(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin"]);
    const supabase = await createClient();

    const body = await request.json();
    const { bahan_baku_id, adjustment, alasan, dokumen_lampiran } =
      adjustmentSchema.parse(body);

    // Get or create inventory record
    const inventory = await getOrCreateInventory(supabase, bahan_baku_id);
    const sebelum = inventory.qty_in_stock || 0;
    const sesudah = sebelum + adjustment;

    // Prevent negative stock (allow positive adjustment only for new items)
    if (sesudah < 0) {
      throw ApiError.badRequest(
        `Stok tidak bisa negatif. Stok saat ini: ${sebelum}, adjustment: ${adjustment}`
      );
    }

    // Get avg_cost for movement record
    const avgCost = inventory.avg_cost || 0;

    // Update inventory
    const { error: updateError } = await supabase
      .from("inventory")
      .update({ qty_in_stock: sesudah })
      .eq("id", inventory.id);

    if (updateError) throw updateError;

    // Record movement
    await recordMovement(supabase, {
      inventory_id: inventory.id,
      bahan_baku_id,
      tipe: "adjustment",
      jumlah: Math.abs(adjustment),
      unit_cost: avgCost,
      total_cost: Math.abs(adjustment) * avgCost,
      reference_type: "adjustment",
      reference_id: crypto.randomUUID(), // temporary ID for adjustment
      sebelum,
      sesudah,
      alasan,
      catatan: `Stock opname: ${alasan}`,
      created_by: user.id,
    });

    // Store attachment if provided
    if (dokumen_lampiran) {
      await supabase.from("inventory_adjustment_docs").insert({
        inventory_id: inventory.id,
        bahan_baku_id,
        nama_dokumen: dokumen_lampiran.nama,
        url_dokumen: dokumen_lampiran.url,
        tipe_dokumen: dokumen_lampiran.tipe,
        alasan,
        adjustment_amount: adjustment,
        created_by: user.id,
      });
    }

    // Fetch updated record
    const { data: updated } = await supabase
      .from("inventory")
      .select(
        `*, bahan_baku:bahan_baku_id(id, kode, nama, satuan_id, minimum_stock)`
      )
      .eq("id", inventory.id)
      .single();

    return successResponse(updated, "Stock adjustment berhasil");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error adjusting inventory:", error);
    return ApiError.server("Failed to adjust inventory").toResponse();
  }
}
