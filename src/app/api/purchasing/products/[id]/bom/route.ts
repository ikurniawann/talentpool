// ============================================
// API ROUTE: /api/purchasing/products/[id]/bom
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const bomSchema = z.object({
  raw_material_id: z.string().uuid("Bahan baku wajib dipilih"),
  qty_required: z.number().min(0.0001, "Jumlah harus lebih dari 0"),
  satuan_id: z.string().uuid().optional(),
  waste_factor: z.number().min(0).max(1).default(0),
});

// GET /api/purchasing/products/:id/bom
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get BOM items dengan detail bahan
    const { data, error } = await supabase
      .from("bom_items")
      .select(`
        *,
        raw_material:raw_material_id (
          *,
          satuan_besar:satuan_besar_id (*),
          satuan_kecil:satuan_kecil_id (*)
        ),
        satuan:satuan_id (*)
      `)
      .eq("product_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Hitung cost untuk setiap item
    const bomWithCost = (data || []).map((item: any) => {
      const materialCost = item.raw_material?.avg_cost || 0;
      const qtyWithWaste = item.qty_required * (1 + item.waste_factor);
      return {
        ...item,
        cost_per_unit: materialCost,
        total_cost: materialCost * qtyWithWaste,
      };
    });

    return Response.json({ success: true, data: bomWithCost });
  } catch (error: any) {
    console.error("Error fetching BOM:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data BOM" },
      { status: 500 }
    );
  }
}

// POST /api/purchasing/products/:id/bom
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validasi input
    const validated = bomSchema.parse(body);

    // Cek apakah produk ada
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", id)
      .single();

    if (productError || !product) {
      return Response.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek apakah bahan sudah ada di BOM
    const { data: existingItem } = await supabase
      .from("bom_items")
      .select("id")
      .eq("product_id", id)
      .eq("raw_material_id", validated.raw_material_id)
      .eq("is_active", true)
      .single();

    if (existingItem) {
      return Response.json(
        { success: false, message: "Bahan ini sudah ada di BOM produk" },
        { status: 400 }
      );
    }

    // Insert BOM item
    const { data, error } = await supabase
      .from("bom_items")
      .insert({
        ...validated,
        product_id: id,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json(
      { success: true, data, message: "Bahan berhasil ditambahkan ke BOM" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating BOM item:", error);

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
      { success: false, message: error.message || "Gagal menambahkan bahan ke BOM" },
      { status: 500 }
    );
  }
}
