// ============================================
// API ROUTE: /api/purchasing/price-list/:id
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updatePriceListSchema = z.object({
  supplier_id: z.string().uuid().optional(),
  bahan_baku_id: z.string().uuid().optional(),
  harga: z.number().min(0).optional(),
  satuan_id: z.string().uuid().optional(),
  minimum_qty: z.number().min(0).optional(),
  lead_time_days: z.number().min(0).optional(),
  is_preferred: z.boolean().optional(),
  berlaku_dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  berlaku_sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  catatan: z.string().optional(),
  is_active: z.boolean().optional(),
});

// GET /api/purchasing/price-list/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("supplier_price_lists")
      .select(`
        *,
        supplier:supplier_id (
          id,
          kode,
          nama_supplier
        ),
        bahan_baku:bahan_baku_id (
          id,
          kode,
          nama
        ),
        satuan:satuan_id (
          id,
          kode,
          nama
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Price list tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }

    return Response.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching price list:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data" },
      { status: 500 }
    );
  }
}

// PUT /api/purchasing/price-list/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const validated = updatePriceListSchema.parse(body);

    const { data, error } = await supabase
      .from("supplier_price_lists")
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
      message: "Price list berhasil diupdate",
    });
  } catch (error: any) {
    console.error("Error updating price list:", error);

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
      { success: false, message: error.message || "Gagal mengupdate price list" },
      { status: 500 }
    );
  }
}

// DELETE /api/purchasing/price-list/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Soft delete - set is_active = false
    const { error } = await supabase
      .from("supplier_price_lists")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return Response.json({
      success: true,
      message: "Price list berhasil dihapus",
    });
  } catch (error: any) {
    console.error("Error deleting price list:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal menghapus price list" },
      { status: 500 }
    );
  }
}
