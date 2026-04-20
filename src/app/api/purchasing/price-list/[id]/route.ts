// ============================================
// API ROUTE: /api/purchasing/price-list/[id]
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const priceListSchema = z.object({
  harga: z.number().min(0).optional(),
  satuan_id: z.string().uuid().optional().nullable(),
  min_qty: z.number().min(0).optional(),
  lead_time_days: z.number().min(0).optional(),
  is_preferred: z.boolean().optional(),
  berlaku_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  berlaku_sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
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
      .from("supplier_price_list")
      .select(`
        *,
        supplier:supplier_id (
          id,
          kode,
          nama_supplier
        ),
        raw_material:raw_material_id (*),
        satuan:satuan_id (*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Data harga tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }

    return Response.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching price list:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data harga" },
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

    // Validasi input
    const validated = priceListSchema.parse(body);

    // Handle is_preferred = true - reset preferred lain untuk bahan yang sama
    if (validated.is_preferred) {
      const { data: currentPrice } = await supabase
        .from("supplier_price_list")
        .select("raw_material_id")
        .eq("id", id)
        .single();

      if (currentPrice) {
        await supabase
          .from("supplier_price_list")
          .update({ is_preferred: false })
          .eq("raw_material_id", currentPrice.raw_material_id)
          .neq("id", id);
      }
    }

    // Update data
    const { data, error } = await supabase
      .from("supplier_price_list")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Data harga tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }

    return Response.json({
      success: true,
      data,
      message: "Harga berhasil diupdate",
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
      { success: false, message: error.message || "Gagal mengupdate harga" },
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

    // Soft delete
    const { error } = await supabase
      .from("supplier_price_list")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Data harga tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }

    return Response.json({
      success: true,
      message: "Harga berhasil dinonaktifkan",
    });
  } catch (error: any) {
    console.error("Error deleting price list:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal menghapus harga" },
      { status: 500 }
    );
  }
}
