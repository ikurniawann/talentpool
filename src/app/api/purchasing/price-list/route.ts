// ============================================
// API ROUTE: /api/purchasing/price-list
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const priceListSchema = z.object({
  supplier_id: z.string().uuid("Supplier wajib dipilih"),
  raw_material_id: z.string().uuid("Bahan baku wajib dipilih"),
  harga: z.number().min(0, "Harga tidak boleh negatif"),
  satuan_id: z.string().uuid().optional(),
  min_qty: z.number().min(0).default(1),
  lead_time_days: z.number().min(0).default(0),
  is_preferred: z.boolean().default(false),
  berlaku_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD"),
  berlaku_sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").optional(),
});

// GET /api/purchasing/price-list
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const supplierId = searchParams.get("supplier_id");
    const rawMaterialId = searchParams.get("raw_material_id");
    const isActive = searchParams.get("is_active");

    let query = supabase
      .from("supplier_price_list")
      .select(`
        *,
        supplier:supplier_id (
          id,
          kode,
          nama_supplier,
          kontak_hp
        ),
        raw_material:raw_material_id (*),
        satuan:satuan_id (*)
      `)
      .order("is_preferred", { ascending: false });

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }
    if (rawMaterialId) {
      query = query.eq("raw_material_id", rawMaterialId);
    }
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data, error } = await query;

    if (error) throw error;

    return Response.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching price list:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data harga" },
      { status: 500 }
    );
  }
}

// POST /api/purchasing/price-list
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validasi input
    const validated = priceListSchema.parse(body);

    // Cek apakah sudah ada harga untuk kombinasi ini
    const { data: existing } = await supabase
      .from("supplier_price_list")
      .select("id")
      .eq("supplier_id", validated.supplier_id)
      .eq("raw_material_id", validated.raw_material_id)
      .eq("is_active", true)
      .single();

    if (existing) {
      // Update existing price
      const { data, error } = await supabase
        .from("supplier_price_list")
        .update({
          ...validated,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return Response.json({
        success: true,
        data,
        message: "Harga berhasil diupdate",
      });
    }

    // Insert new price
    const { data, error } = await supabase
      .from("supplier_price_list")
      .insert({
        ...validated,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json(
      { success: true, data, message: "Harga berhasil ditambahkan" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating price list:", error);

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
      { success: false, message: error.message || "Gagal menambahkan harga" },
      { status: 500 }
    );
  }
}
