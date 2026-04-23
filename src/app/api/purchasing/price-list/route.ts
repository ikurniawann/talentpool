// ============================================
// API ROUTE: /api/purchasing/price-list
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const priceListSchema = z.object({
  supplier_id: z.string().uuid("Supplier wajib dipilih"),
  bahan_baku_id: z.string().uuid("Bahan baku wajib dipilih"),
  harga: z.number().min(0, "Harga tidak boleh negatif"),
  satuan_id: z.string().uuid().optional(),
  minimum_qty: z.number().min(0).default(1),
  lead_time_days: z.number().min(0).default(0),
  is_preferred: z.boolean().default(false),
  berlaku_dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").optional(),
  berlaku_sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").optional(),
  catatan: z.string().optional(),
});

// GET /api/purchasing/price-list
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const supplierId = searchParams.get("supplier_id");
    const bahanBakuId = searchParams.get("bahan_baku_id");
    const isActive = searchParams.get("is_active");

    let query = supabase
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
      `);

    // If ID provided, get single record
    if (id) {
      const { data, error } = await query.eq("id", id).single();
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
    }

    // Otherwise list with filters
    query = query
      .eq("is_active", isActive === "false" ? false : true)
      .order("is_preferred", { ascending: false })
      .order("created_at", { ascending: false });

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }
    if (bahanBakuId) {
      query = query.eq("bahan_baku_id", bahanBakuId);
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

    // Set default berlaku_dari to today if not provided
    if (!validated.berlaku_dari) {
      validated.berlaku_dari = new Date().toISOString().split("T")[0];
    }

    // Insert new price list
    const { data, error } = await supabase
      .from("supplier_price_lists")
      .insert({
        ...validated,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json(
      { success: true, data, message: "Price list berhasil dibuat" },
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
      { success: false, message: error.message || "Gagal membuat price list" },
      { status: 500 }
    );
  }
}
