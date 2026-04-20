// ============================================
// API ROUTE: /api/purchasing/raw-materials
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Validation schema
const materialSchema = z.object({
  kode: z.string().max(20).optional(),
  nama: z.string().min(1, "Nama bahan wajib diisi").max(100),
  kategori: z.enum(["BAHAN_PANGAN", "BAHAN_NON_PANGAN", "KEMASAN", "BAHAN_BAKAR", "LAINNYA"]),
  deskripsi: z.string().optional(),
  satuan_besar_id: z.string().uuid().optional(),
  satuan_kecil_id: z.string().uuid().optional(),
  konversi_factor: z.number().min(0).default(1),
  stok_minimum: z.number().min(0).default(0),
  stok_maximum: z.number().min(0).default(0),
  shelf_life_days: z.number().min(0).optional(),
  storage_condition: z.enum(["SUHU_RUANG", "DINGIN", "BEKU", "KHUSUS"]).optional(),
});

// GET /api/purchasing/raw-materials
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Query params
    const search = searchParams.get("search");
    const kategori = searchParams.get("kategori");
    const satuan_besar_id = searchParams.get("satuan_besar_id");
    const isActive = searchParams.get("is_active");
    const belowMinimum = searchParams.get("below_minimum");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sort_by") || "nama";
    const sortDir = searchParams.get("sort_dir")?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    // Build query
    let query = supabase
      .from("v_raw_materials_stock")
      .select("*", { count: "exact" });

    // Filters
    if (search) {
      query = query.or(`nama.ilike.%${search}%,kode.ilike.%${search}%`);
    }
    if (kategori) {
      query = query.eq("kategori", kategori);
    }
    if (satuan_besar_id) {
      query = query.eq("satuan_besar_id", satuan_besar_id);
    }
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }
    if (belowMinimum === "true") {
      query = query.or(`status_stok.eq.MENIPIS,status_stok.eq.HABIS`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Execute query
    const { data, error, count } = await query
      .order(sortBy, { ascending: sortDir === "ASC" })
      .range(from, to);

    if (error) throw error;

    return Response.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching raw materials:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data bahan baku" },
      { status: 500 }
    );
  }
}

// POST /api/purchasing/raw-materials
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validasi input
    const validated = materialSchema.parse(body);

    // Cek kode unik jika disediakan
    if (validated.kode) {
      const { data: existing } = await supabase
        .from("raw_materials")
        .select("id")
        .eq("kode", validated.kode)
        .single();

      if (existing) {
        return Response.json(
          { success: false, message: "Kode bahan sudah digunakan" },
          { status: 400 }
        );
      }
    }

    // Insert data
    const { data, error } = await supabase
      .from("raw_materials")
      .insert({
        ...validated,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json(
      { success: true, data, message: "Bahan baku berhasil ditambahkan" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating raw material:", error);

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
      { success: false, message: error.message || "Gagal menambahkan bahan baku" },
      { status: 500 }
    );
  }
}
