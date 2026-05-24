// ============================================
// API ROUTE: /api/purchasing/products/[id]/bom
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const bomSchema = z.object({
  raw_material_id: z.string().uuid("Bahan baku wajib dipilih"),
  qty_required: z.number().min(0.0001, "Jumlah harus lebih dari 0").optional(),
  qty_needed: z.number().min(0.0001, "Jumlah harus lebih dari 0").optional(),
  satuan_id: z.string().uuid().nullable().optional(),
  waste_factor: z.number().min(0).max(1).optional(),
  waste_persen: z.number().min(0).max(100).optional(),
}).transform((value) => ({
  raw_material_id: value.raw_material_id,
  qty_required: value.qty_required ?? value.qty_needed ?? 0,
  satuan_id: value.satuan_id || null,
  waste_factor: value.waste_factor ?? ((value.waste_persen ?? 0) / 100),
})).refine((value) => value.qty_required > 0, {
  message: "Jumlah harus lebih dari 0",
  path: ["qty_required"],
});

type BomItemRow = {
  raw_material_id?: string | null;
  qty_required?: number | null;
  waste_factor?: number | null;
  raw_material?: {
    avg_cost?: number | null;
    harga_avg?: number | null;
    harga_terakhir?: number | null;
  } | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getMaterialCost(
  item: BomItemRow,
  stockCostMap: Map<string, number>
) {
  const materialId = item.raw_material_id;
  if (materialId && stockCostMap.has(materialId)) {
    return stockCostMap.get(materialId) ?? 0;
  }

  return Number(
    item.raw_material?.avg_cost ??
      item.raw_material?.harga_avg ??
      item.raw_material?.harga_terakhir ??
      0
  );
}

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

    const materialIds = Array.from(
      new Set((data || []).map((item) => item.raw_material_id).filter(Boolean))
    );
    const { data: stockCosts } = materialIds.length > 0
      ? await supabase
          .from("v_raw_materials_stock")
          .select("id, avg_cost")
          .in("id", materialIds)
      : { data: [] };
    const stockCostMap = new Map(
      (stockCosts || []).map((material) => [material.id, Number(material.avg_cost ?? 0)])
    );

    const bomWithCost = (data || []).map((item) => {
      const bomItem = item as BomItemRow;
      const materialCost = getMaterialCost(bomItem, stockCostMap);
      const qtyWithWaste = Number(bomItem.qty_required ?? 0) * (1 + Number(bomItem.waste_factor ?? 0));
      return {
        ...item,
        cost_per_unit: materialCost,
        total_cost: materialCost * qtyWithWaste,
      };
    });

    return Response.json({ success: true, data: bomWithCost });
  } catch (error: unknown) {
    console.error("Error fetching BOM:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mengambil data BOM") },
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

    const { data: material, error: materialError } = await supabase
      .from("raw_materials")
      .select("id, source_product_id")
      .eq("id", validated.raw_material_id)
      .eq("is_active", true)
      .single();

    if (materialError || !material) {
      return Response.json(
        { success: false, message: "Bahan baku tidak ditemukan" },
        { status: 404 }
      );
    }

    if (material.source_product_id === id) {
      return Response.json(
        { success: false, message: "Produk tidak boleh memakai WIP dari produk yang sama sebagai BOM" },
        { status: 400 }
      );
    }

    // Cek apakah bahan sudah ada di BOM
    const { data: existingItem } = await supabase
      .from("bom_items")
      .select("id")
      .eq("product_id", id)
      .eq("raw_material_id", validated.raw_material_id)
      .eq("is_active", true)
      .maybeSingle();

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
  } catch (error: unknown) {
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
      { success: false, message: getErrorMessage(error, "Gagal menambahkan bahan ke BOM") },
      { status: 500 }
    );
  }
}
