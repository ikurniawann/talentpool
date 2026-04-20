// ============================================
// API ROUTE: /api/purchasing/products/[id]
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const productSchema = z.object({
  nama: z.string().min(1).max(100).optional(),
  deskripsi: z.string().optional().nullable(),
  kategori: z.string().optional().nullable(),
  satuan_id: z.string().uuid().optional().nullable(),
  harga_jual: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

// GET /api/purchasing/products/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get product dengan HPP
    const { data: product, error: productError } = await supabase
      .from("v_products_cogs")
      .select("*")
      .eq("id", id)
      .single();

    if (productError) {
      if (productError.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Produk tidak ditemukan" },
          { status: 404 }
        );
      }
      throw productError;
    }

    // Get BOM items
    const { data: bomItems, error: bomError } = await supabase
      .from("bom_items")
      .select(`
        *,
        raw_material:raw_material_id (*),
        satuan:satuan_id (*)
      `)
      .eq("product_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (bomError) throw bomError;

    // Calculate total HPP dari BOM
    let totalHPP = 0;
    const bomWithCost = (bomItems || []).map((item: any) => {
      const materialCost = item.raw_material?.avg_cost || 0;
      const qtyNeeded = item.qty_required * (1 + (item.waste_factor || 0));
      const itemCost = materialCost * qtyNeeded;
      totalHPP += itemCost;
      return {
        ...item,
        cost_per_unit: materialCost,
        total_cost: itemCost,
      };
    });

    return Response.json({
      success: true,
      data: {
        ...product,
        bom_items: bomWithCost,
        hpp_calculated: totalHPP,
      },
    });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data produk" },
      { status: 500 }
    );
  }
}

// PUT /api/purchasing/products/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validasi input
    const validated = productSchema.parse(body);

    // Cek apakah produk ada
    const { data: existingProduct, error: findError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !existingProduct) {
      return Response.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    // Update data
    const { data, error } = await supabase
      .from("products")
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
      message: "Produk berhasil diupdate",
    });
  } catch (error: any) {
    console.error("Error updating product:", error);

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
      { success: false, message: error.message || "Gagal mengupdate produk" },
      { status: 500 }
    );
  }
}

// DELETE /api/purchasing/products/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Cek apakah produk ada
    const { data: product, error: findError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !product) {
      return Response.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    // Soft delete
    const { error } = await supabase
      .from("products")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return Response.json({
      success: true,
      message: "Produk berhasil dinonaktifkan",
    });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal menghapus produk" },
      { status: 500 }
    );
  }
}
