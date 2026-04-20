// ============================================
// API ROUTE: /api/purchasing/raw-materials/[id]
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const materialSchema = z.object({
  nama: z.string().min(1).max(100).optional(),
  kategori: z.enum(["BAHAN_PANGAN", "BAHAN_NON_PANGAN", "KEMASAN", "BAHAN_BAKAR", "LAINNYA"]).optional(),
  deskripsi: z.string().optional(),
  satuan_besar_id: z.string().uuid().optional().nullable(),
  satuan_kecil_id: z.string().uuid().optional().nullable(),
  konversi_factor: z.number().min(0).optional(),
  stok_minimum: z.number().min(0).optional(),
  stok_maximum: z.number().min(0).optional(),
  shelf_life_days: z.number().min(0).optional().nullable(),
  storage_condition: z.enum(["SUHU_RUANG", "DINGIN", "BEKU", "KHUSUS"]).optional().nullable(),
  is_active: z.boolean().optional(),
});

// GET /api/purchasing/raw-materials/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get material dengan stok info
    const { data, error } = await supabase
      .from("v_raw_materials_stock")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Bahan baku tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }

    // Get suppliers dengan harga
    const { data: suppliers, error: suppliersError } = await supabase
      .from("supplier_price_list")
      .select(`
        *,
        supplier:supplier_id (
          id,
          kode,
          nama_supplier
        ),
        satuan:satuan_id (*)
      `)
      .eq("raw_material_id", id)
      .eq("is_active", true)
      .order("is_preferred", { ascending: false });

    if (suppliersError) throw suppliersError;

    // Get inventory movements terakhir
    const { data: movements, error: movementsError } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("raw_material_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (movementsError) throw movementsError;

    // Get products yang menggunakan bahan ini
    const { data: products, error: productsError } = await supabase
      .from("bom_items")
      .select(`
        *,
        product:product_id (*)
      `)
      .eq("raw_material_id", id)
      .eq("is_active", true);

    if (productsError) throw productsError;

    return Response.json({
      success: true,
      data: {
        ...data,
        suppliers: suppliers || [],
        movements: movements || [],
        products: products || [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching raw material:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data bahan baku" },
      { status: 500 }
    );
  }
}

// PUT /api/purchasing/raw-materials/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validasi input
    const validated = materialSchema.parse(body);

    // Cek apakah material ada
    const { data: existingMaterial, error: findError } = await supabase
      .from("raw_materials")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !existingMaterial) {
      return Response.json(
        { success: false, message: "Bahan baku tidak ditemukan" },
        { status: 404 }
      );
    }

    // Warning jika konversi_factor berubah dan ada di BOM
    if (validated.konversi_factor !== undefined &&
        validated.konversi_factor !== existingMaterial.konversi_factor) {
      const { data: bomItems } = await supabase
        .from("bom_items")
        .select("id")
        .eq("raw_material_id", id)
        .eq("is_active", true)
        .limit(1);

      if (bomItems && bomItems.length > 0) {
        // Log warning tapi tetap update
        console.warn(`Konversi factor ${id} berubah dan mempengaruhi ${bomItems.length} BOM items`);
      }
    }

    // Update data
    const { data, error } = await supabase
      .from("raw_materials")
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
      message: "Bahan baku berhasil diupdate",
    });
  } catch (error: any) {
    console.error("Error updating raw material:", error);

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
      { success: false, message: error.message || "Gagal mengupdate bahan baku" },
      { status: 500 }
    );
  }
}

// DELETE /api/purchasing/raw-materials/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Cek apakah material ada
    const { data: material, error: findError } = await supabase
      .from("raw_materials")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !material) {
      return Response.json(
        { success: false, message: "Bahan baku tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek apakah ada stok > 0
    const { data: inventory } = await supabase
      .from("inventory")
      .select("qty_onhand")
      .eq("raw_material_id", id)
      .single();

    if (inventory && inventory.qty_onhand > 0) {
      return Response.json(
        {
          success: false,
          message: `Bahan baku tidak bisa dihapus karena masih ada stok ${inventory.qty_onhand} ${material.satuan_besar_id || 'unit'}`,
        },
        { status: 400 }
      );
    }

    // Cek apakah digunakan di BOM
    const { data: bomItems } = await supabase
      .from("bom_items")
      .select("id")
      .eq("raw_material_id", id)
      .eq("is_active", true)
      .limit(1);

    if (bomItems && bomItems.length > 0) {
      return Response.json(
        {
          success: false,
          message: "Bahan baku tidak bisa dihapus karena masih digunakan di BOM produk",
        },
        { status: 400 }
      );
    }

    // Soft delete
    const { error } = await supabase
      .from("raw_materials")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return Response.json({
      success: true,
      message: "Bahan baku berhasil dinonaktifkan",
    });
  } catch (error: any) {
    console.error("Error deleting raw material:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal menghapus bahan baku" },
      { status: 500 }
    );
  }
}
