// ============================================
// API ROUTE: /api/purchasing/raw-materials
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Validation schema
const materialSchema = z.object({
  kode: z.string().max(20).optional().nullable(),
  nama: z.string().min(1, "Nama bahan wajib diisi").max(100),
  kategori: z.enum(["BAHAN_PANGAN", "BAHAN_NON_PANGAN", "KEMASAN", "BAHAN_BAKAR", "LAINNYA"]),
  deskripsi: z.string().optional().nullable(),
  satuan_besar_id: z.string().uuid("Satuan besar wajib dipilih"),
  satuan_kecil_id: z.string().uuid().optional().nullable(),
  konversi_factor: z.number().min(0).default(1),
  stok_minimum: z.number().min(0).default(0),
  stok_maximum: z.number().min(0).default(0),
  shelf_life_days: z.number().min(0).optional().nullable(),
  storage_condition: z.enum(["SUHU_RUANG", "DINGIN", "BEKU", "KHUSUS"]).optional().nullable(),
  coa: z.enum(["PRODUCTION", "RND", "ASSET"]).optional().nullable(),
  unit_conversions: z.array(z.object({
    satuan_id: z.string().uuid(),
    qty_in_base_unit: z.number().min(0.000001),
    is_base: z.boolean().optional(),
  })).optional().default([]),
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

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
      .select("*", { count: "exact" })
      .is("deleted_at", null);

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

    if (error) {
      console.error("Supabase error fetching raw materials:", error);
      throw error;
    }

    let materialsWithConversions = data || [];
    const materialIds = materialsWithConversions.map((material) => material.id).filter(Boolean);

    if (materialIds.length > 0) {
      const { data: conversions, error: conversionsError } = await supabase
        .from("raw_material_unit_conversions")
        .select(`
          *,
          satuan:satuan_id (*)
        `)
        .in("raw_material_id", materialIds)
        .eq("is_active", true)
        .order("is_base", { ascending: false })
        .order("qty_in_base_unit", { ascending: true });

      if (conversionsError) throw conversionsError;

      const conversionsByMaterial = new Map<string, typeof conversions>();
      for (const conversion of conversions || []) {
        const current = conversionsByMaterial.get(conversion.raw_material_id) || [];
        current.push(conversion);
        conversionsByMaterial.set(conversion.raw_material_id, current);
      }

      materialsWithConversions = materialsWithConversions.map((material) => ({
        ...material,
        unit_conversions: conversionsByMaterial.get(material.id) || [],
      }));
    }

    return Response.json({
      data: materialsWithConversions,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching raw materials:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mengambil data bahan baku") },
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

    // Generate kode otomatis jika tidak disediakan
    let finalKode = validated.kode;
    if (!finalKode) {
      const year = new Date().getFullYear();
      // Get last code
      const { data: lastCode } = await supabase
        .from("raw_materials")
 .select("kode")
        .ilike("kode", `BHN-${year}-%`)
        .is("deleted_at", null)
        .order("kode", { ascending: false })
        .limit(1)
        .single();

      let nextNum = 1;
      if (lastCode?.kode) {
        const match = lastCode.kode.match(/-(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }
      finalKode = `BHN-${year}-${String(nextNum).padStart(4, "0")}`;
    }

    // Cek kode unik
    const { data: existing } = await supabase
      .from("raw_materials")
      .select("id")
      .eq("kode", finalKode)
      .is("deleted_at", null)
      .single();

    if (existing) {
      return Response.json(
        { success: false, message: "Kode bahan sudah digunakan" },
        { status: 400 }
      );
    }

    const { unit_conversions, ...materialPayload } = validated;

    // Insert data
    const { data, error } = await supabase
      .from("raw_materials")
      .insert({
        ...materialPayload,
        kode: finalKode,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    const conversions = [
      ...(data.satuan_kecil_id
        ? [{ satuan_id: data.satuan_kecil_id, qty_in_base_unit: 1, is_base: true }]
        : []),
      { satuan_id: data.satuan_besar_id, qty_in_base_unit: data.satuan_kecil_id ? data.konversi_factor || 1 : 1, is_base: !data.satuan_kecil_id },
      ...unit_conversions.map((conversion) => ({ ...conversion, is_base: conversion.is_base ?? false })),
    ];

    if (conversions.length > 0) {
      const conversionsByUnit = new Map<string, (typeof conversions)[number]>();
      for (const conversion of conversions) {
        if (!conversionsByUnit.has(conversion.satuan_id)) {
          conversionsByUnit.set(conversion.satuan_id, conversion);
        }
      }
      const uniqueConversions = Array.from(conversionsByUnit.values());
      const { error: conversionError } = await supabase
        .from("raw_material_unit_conversions")
        .upsert(
          uniqueConversions.map((conversion) => ({
            raw_material_id: data.id,
            satuan_id: conversion.satuan_id,
            qty_in_base_unit: conversion.qty_in_base_unit,
            is_base: conversion.is_base,
            is_active: true,
          })),
          { onConflict: "raw_material_id,satuan_id" }
        );

      if (conversionError) throw conversionError;
    }

    return Response.json(
      { success: true, data, message: "Bahan baku berhasil ditambahkan" },
      { status: 201 }
    );
  } catch (error: unknown) {
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
      { success: false, message: getErrorMessage(error, "Gagal menambahkan bahan baku") },
      { status: 500 }
    );
  }
}
