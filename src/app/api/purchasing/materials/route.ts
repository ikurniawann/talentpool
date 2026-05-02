import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiUser,
  requireApiRole,
  ApiError,
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@/lib/api/auth";

// Zod schemas
const createMaterialSchema = z.object({
  kode: z.string().min(1, "Kode bahan baku wajib diisi").max(50),
  nama: z.string().min(1, "Nama bahan baku wajib diisi").max(200),
  deskripsi: z.string().optional(),
  satuan_id: z.string().uuid("Satuan ID tidak valid"),
  kategori: z.string().optional(),
  harga_estimasi: z.number().positive().optional(),
  minimum_stock: z.number().min(0).default(0),
  maximum_stock: z.number().positive().optional(),
  current_stock: z.number().min(0).default(0),
  lokasi_rak: z.string().optional(),
  lead_time_days: z.number().min(0).default(0).refine(v => Number.isInteger(v)),
  coa_production: z.string().max(50).optional(),
  coa_rnd: z.string().max(50).optional(),
  coa_asset: z.string().max(50).optional(),
});

const updateMaterialSchema = createMaterialSchema.omit({ kode: true }).partial();

const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  kategori: z.string().optional(),
  satuan_id: z.string().uuid().optional(),
});

// Helper: include related satuan
function buildMaterialWithSatuan(materials: any[]) {
  return materials;
}

// GET /api/purchasing/materials - List with filter & pagination
export async function GET(request: NextRequest) {
  try {
    await requireApiUser();
    const supabase = await createClient();

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = queryParamsSchema.parse(rawParams);
    const { page, limit, search, kategori, satuan_id } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("bahan_baku")
      .select(`
        *,
        satuan:satuan_id (id, kode, nama)
      `, { count: "exact" })
      .eq("is_active", true);

    if (kategori) query = query.eq("kategori", kategori);
    if (satuan_id) query = query.eq("satuan_id", satuan_id);
    if (search) {
      query = query.or(`nama.ilike.%${search}%,kode.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json(
      paginatedResponse(data, {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      })
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Invalid query parameters", error.issues).toResponse();
    }
    console.error("Error fetching materials:", error);
    return ApiError.server("Failed to fetch materials").toResponse();
  }
}

// POST /api/purchasing/materials - Create
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();

    const body = await request.json();
    const validated = createMaterialSchema.parse(body);

    // Verify satuan exists
    const { data: satuan } = await supabase
      .from("satuan")
      .select("id")
      .eq("id", validated.satuan_id)
      .eq("is_active", true)
      .single();

    if (!satuan) {
      throw ApiError.badRequest("Satuan tidak ditemukan");
    }

    // Check duplicate kode
    const { data: existing } = await supabase
      .from("bahan_baku")
      .select("id")
      .eq("kode", validated.kode)
      .eq("is_active", true)
      .single();

    if (existing) {
      throw ApiError.conflict("Kode bahan baku sudah ada");
    }

    const { data, error } = await supabase
      .from("bahan_baku")
      .insert({
        ...validated,
        created_by: user.id,
      })
      .select(`
        *,
        satuan:satuan_id (id, kode, nama)
      `)
      .single();

    if (error) throw error;

    return createdResponse(data, "Bahan baku berhasil dibuat");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error creating material:", error);
    return ApiError.server("Failed to create material").toResponse();
  }
}
