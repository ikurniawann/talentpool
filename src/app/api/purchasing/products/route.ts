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
const createProductSchema = z.object({
  kode: z.string().min(1, "Kode produk wajib diisi").max(50),
  nama: z.string().min(1, "Nama produk wajib diisi").max(200),
  deskripsi: z.string().optional(),
  satuan_id: z.string().uuid("Satuan ID tidak valid"),
  kategori: z.string().optional(),
  harga_jual: z.number().positive().optional(),
});

const updateProductSchema = createProductSchema.omit({ kode: true }).partial();

const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  kategori: z.string().optional(),
});

// BOM item schema (inline)
const bomItemSchema = z.object({
  bahan_baku_id: z.string().uuid(),
  jumlah: z.number().positive(),
  satuan_id: z.string().uuid(),
  waste_percentage: z.number().min(0).max(100).default(0),
  urutan: z.number().min(0).default(0).refine(v => Number.isInteger(v)),
  catatan: z.string().optional(),
});

// GET /api/purchasing/products - List with filter & pagination
export async function GET(request: NextRequest) {
  try {
    await requireApiUser();
    const supabase = await createClient();

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = queryParamsSchema.parse(rawParams);
    const { page, limit, search, kategori } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("produk")
      .select(`
        *,
        satuan:satuan_id (id, kode, nama)
      `, { count: "exact" })
      .eq("is_active", true);

    if (kategori) query = query.eq("kategori", kategori);
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
    console.error("Error fetching products:", error);
    return ApiError.server("Failed to fetch products").toResponse();
  }
}

// POST /api/purchasing/products - Create product (with optional BOM)
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();

    const body = await request.json();

    // Separate product data from BOM items
    const { bom: bomItems, ...productData } = body;

    const validated = createProductSchema.parse(productData);

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
      .from("produk")
      .select("id")
      .eq("kode", validated.kode)
      .eq("is_active", true)
      .single();

    if (existing) {
      throw ApiError.conflict("Kode produk sudah ada");
    }

    // Create product first
    const { data: product, error: productError } = await supabase
      .from("produk")
      .insert({ ...validated, created_by: user.id })
      .select(`*, satuan:satuan_id (id, kode, nama)`)
      .single();

    if (productError) throw productError;

    // Insert BOM items if provided
    if (bomItems && Array.isArray(bomItems) && bomItems.length > 0) {
      // Validate each BOM item
      const validatedBomItems = bomItems.map((item: unknown) => bomItemSchema.parse(item));

      // Verify all bahan_baku exist
      const bahanBakuIds = validatedBomItems.map(item => item.bahan_baku_id);
      const { data: bahanBakus } = await supabase
        .from("bahan_baku")
        .select("id")
        .in("id", bahanBakuIds)
        .eq("is_active", true);

      if (!bahanBakus || bahanBakus.length !== bahanBakuIds.length) {
        throw ApiError.badRequest("Salah satu bahan baku di BOM tidak ditemukan");
      }

      // Verify all satuan exist
      const satuanIds = validatedBomItems.map(item => item.satuan_id);
      const { data: satuans } = await supabase
        .from("satuan")
        .select("id")
        .in("id", satuanIds)
        .eq("is_active", true);

      if (!satuans || satuans.length !== satuanIds.length) {
        throw ApiError.badRequest("Salah satu satuan di BOM tidak ditemukan");
      }

      const bomInserts = validatedBomItems.map(item => ({
        produk_id: product.id,
        ...item,
        created_by: user.id,
      }));

      const { error: bomError } = await supabase
        .from("bom")
        .insert(bomInserts);

      if (bomError) throw bomError;

      // Fetch product with BOM
      const { data: productWithBom } = await supabase
        .from("produk")
        .select(`
          *,
          satuan:satuan_id (id, kode, nama),
          bom_items:bom (
            *,
            bahan_baku:bahan_baku_id (id, kode, nama),
            satuan:satuan_id (id, kode, nama)
          )
        `)
        .eq("id", product.id)
        .single();

      return createdResponse(productWithBom, "Produk dan BOM berhasil dibuat");
    }

    return createdResponse(product, "Produk berhasil dibuat");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error creating product:", error);
    return ApiError.server("Failed to create product").toResponse();
  }
}
