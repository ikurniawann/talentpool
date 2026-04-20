// ============================================
// API ROUTE: /api/purchasing/bom/[id]
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const bomSchema = z.object({
  qty_required: z.number().min(0.0001, "Jumlah harus lebih dari 0").optional(),
  satuan_id: z.string().uuid().optional().nullable(),
  waste_factor: z.number().min(0).max(1).optional(),
  is_active: z.boolean().optional(),
});

// PUT /api/purchasing/bom/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validasi input
    const validated = bomSchema.parse(body);

    // Cek apakah BOM item ada
    const { data: existingItem, error: findError } = await supabase
      .from("bom_items")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !existingItem) {
      return Response.json(
        { success: false, message: "Item BOM tidak ditemukan" },
        { status: 404 }
      );
    }

    // Update data
    const { data, error } = await supabase
      .from("bom_items")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({
      success: true,
      data,
      message: "Item BOM berhasil diupdate",
    });
  } catch (error: any) {
    console.error("Error updating BOM item:", error);

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
      { success: false, message: error.message || "Gagal mengupdate item BOM" },
      { status: 500 }
    );
  }
}

// DELETE /api/purchasing/bom/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Soft delete dengan set is_active = false
    const { error } = await supabase
      .from("bom_items")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Item BOM tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }

    return Response.json({
      success: true,
      message: "Bahan berhasil dihapus dari BOM",
    });
  } catch (error: any) {
    console.error("Error deleting BOM item:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal menghapus bahan dari BOM" },
      { status: 500 }
    );
  }
}
