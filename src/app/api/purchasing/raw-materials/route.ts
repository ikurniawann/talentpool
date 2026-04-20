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

// ─── Constants ───────────────────────────────────────────────────────────────

const KATEGORI_OPTIONS = [
  "BAHAN_PANGAN",
  "BAHAN_NON_PANGAN",
  "KEMASAN",
  "BAHAN_BAKAR",
  "LAINNYA",
] as const;

type Kategori = (typeof KATEGORI_OPTIONS)[number];

const STOK_STATUS = {
  AMAN: "AMAN",
  MENIPIS: "MENIPIS",
  HABIS: "HABIS",
} as const;

type StokStatus = (typeof STOK_STATUS)[keyof typeof STOK_STATUS];

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createRawMaterialSchema = z.object({
  kode_bahan: z.string().min(1, "Kode bahan wajib diisi").max(50),
  nama_bahan: z.string().min(1, "Nama bahan wajib diisi").max(200),
  kategori: z.enum(KATEGORI_OPTIONS).optional(),
  satuan_besar_id: z.string().uuid("Satuan besar ID tidak valid"),
  satuan_kecil_id: z.string().uuid("Satuan kecil ID tidak valid").optional(),
  konversi_factor: z.number().positive().default(1),
  stok_minimum: z.number().min(0).default(0),
  stok_maximum: z.number().positive().optional(),
  shelf_life_days: z.number().min(0).default(0).optional(),
  storage_condition: z.string().max(50).default("ambient").optional(),
});

const updateRawMaterialSchema = createRawMaterialSchema
  .omit({ kode_bahan: true })
  .partial();

const listQuerySchema = z.object({
  search: z.string().optional(),
  kategori: z.enum(KATEGORI_OPTIONS).optional(),
  satuan_besar_id: z.string().uuid().optional(),
  is_active: z.coerce.boolean().optional(),
  below_minimum: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort_by: z
    .enum(["kode_bahan", "nama_bahan", "kategori", "created_at"])
    .default("created_at"),
  sort_dir: z.enum(["ASC", "DESC"]).default("DESC"),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcStokStatus(
  qtyOnhand: number,
  minStock: number
): StokStatus {
  if (qtyOnhand === 0) return STOK_STATUS.HABIS;
  if (qtyOnhand <= minStock) return STOK_STATUS.MENIPIS;
  return STOK_STATUS.AMAN;
}

/**
 * Get inventory data + avg cost for a single bahan_baku
 */
async function getInventoryData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bahanBakuId: string
) {
  const { data: inv } = await supabase
    .from("inventory")
    .select(
      "jumlah_tersedia, jumlah_dipesan, jumlah_maksimum, unit_cost"
    )
    .eq("bahan_baku_id", bahanBakuId)
    .maybeSingle();

  const qtyOnhand = Number(inv?.jumlah_tersedia ?? 0);
  const qtyReserved = Number(inv?.jumlah_dipesan ?? 0);
  const qtyOnOrder = 0; // TODO: calculate from open POs
  const avgCost = Number(inv?.unit_cost ?? 0);

  return { qtyOnhand, qtyReserved, qtyOnOrder, avgCost, inv };
}

/**
 * Get preferred supplier for a bahan_baku
 */
async function getPreferredSupplier(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bahanBakuId: string
) {
  const { data: spl } = await supabase
    .from("supplier_price_lists")
    .select(
      `
      id,
      harga,
      satuan_id,
      supplier:suppliers!inner(id, nama_supplier, pic_name, pic_phone)
    `
    )
    .eq("bahan_baku_id", bahanBakuId)
    .eq("is_preferred", true)
    .eq("is_active", true)
    .maybeSingle();

  return spl ?? null;
}

/**
 * Get supplier price list (active) for detail view
 */
async function getSupplierPriceLists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bahanBakuId: string
) {
  const { data: spl } = await supabase
    .from("supplier_price_lists")
    .select(
      `
      id,
      harga,
      minimum_qty,
      lead_time_days,
      is_preferred,
      berlaku_dari,
      berlaku_sampai,
      supplier:suppliers!inner(id, nama_supplier, pic_name, pic_phone, is_active),
      satuan:satuan_id(id, kode, nama)
    `
    )
    .eq("bahan_baku_id", bahanBakuId)
    .eq("is_active", true)
    .order("is_preferred", { ascending: false })
    .order("harga", { ascending: true });

  return spl ?? [];
}

// ─── GET /api/purchasing/raw-materials ──────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await requireApiUser();
    const supabase = await createClient();

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = listQuerySchema.parse(rawParams);
    const {
      search,
      kategori,
      satuan_besar_id,
      is_active,
      below_minimum,
      page,
      limit,
      sort_by,
      sort_dir,
    } = params;
    const offset = (page - 1) * limit;

    // Build base query
    let query = supabase
      .from("bahan_baku")
      .select(
        `
        id,
        kode,
        nama,
        kategori,
        shelf_life_days,
        storage_condition,
        minimum_stock,
        maximum_stock,
        konversi_factor,
        is_active,
        created_at,
        satuan_besar:satuan_id(id, kode, nama),
        satuan_kecil:satuan_kecil_id(id, kode, nama)
      `,
        { count: "exact" }
      );

    // Filters
    if (kategori) query = query.eq("kategori", kategori);
    if (satuan_besar_id) query = query.eq("satuan_id", satuan_besar_id);
    if (is_active !== undefined) query = query.eq("is_active", is_active);
    if (search) {
      query = query.or(`nama.ilike.%${search}%,kode.ilike.%${search}%`);
    }

    // Sorting
    const sortColumn = sort_by === "kode_bahan" ? "kode" : 
                        sort_by === "nama_bahan" ? "nama" : 
                        sort_by === "kategori" ? "kategori" : "created_at";
    query = query.order(sortColumn, { ascending: sort_dir === "ASC" });

    const { data: materials, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Fetch inventory + preferred supplier for all items in parallel
    const enriched = await Promise.all(
      (materials ?? []).map(async (mat) => {
        const [invData, prefSupplier] = await Promise.all([
          getInventoryData(supabase, mat.id),
          getPreferredSupplier(supabase, mat.id),
        ]);

        const minStock = Number(mat.minimum_stock ?? 0);
        const statusStok: StokStatus = calcStokStatus(invData.qtyOnhand, minStock);

        return {
          ...mat,
          qty_onhand: invData.qtyOnhand,
          avg_cost: invData.avgCost,
          status_stok: statusStok,
          supplier_utama: prefSupplier
            ? {
                id: (prefSupplier.supplier as any)?.id,
                nama: (prefSupplier.supplier as any)?.nama_supplier,
                harga: prefSupplier.harga,
              }
            : null,
        };
      })
    );

    // Filter below_minimum after enrichment (requires inventory lookup)
    let filtered = enriched;
    if (below_minimum) {
      filtered = enriched.filter(
        (m) =>
          m.status_stok === STOK_STATUS.MENIPIS ||
          m.status_stok === STOK_STATUS.HABIS
      );
    }

    return paginatedResponse(filtered, {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Invalid query parameters", error.issues).toResponse();
    }
    console.error("Error fetching raw materials:", error);
    return ApiError.server("Failed to fetch raw materials").toResponse();
  }
}

// ─── POST /api/purchasing/raw-materials ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();

    const body = await request.json();
    const validated = createRawMaterialSchema.parse(body);

    // Verify satuan_besar exists
    const { data: satuanBesar } = await supabase
      .from("satuan")
      .select("id, kode, nama")
      .eq("id", validated.satuan_besar_id)
      .eq("is_active", true)
      .single();

    if (!satuanBesar) {
      throw ApiError.badRequest("Satuan besar tidak ditemukan");
    }

    // Verify satuan_kecil if provided
    if (validated.satuan_kecil_id) {
      const { data: satuanKecil } = await supabase
        .from("satuan")
        .select("id")
        .eq("id", validated.satuan_kecil_id)
        .eq("is_active", true)
        .single();

      if (!satuanKecil) {
        throw ApiError.badRequest("Satuan kecil tidak ditemukan");
      }
    }

    // Check duplicate kode
    const { data: existing } = await supabase
      .from("bahan_baku")
      .select("id")
      .eq("kode", validated.kode_bahan)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      throw ApiError.conflict("Kode bahan sudah ada");
    }

    // Insert bahan_baku
    const { data: bahanBaku, error: bbError } = await supabase
      .from("bahan_baku")
      .insert({
        kode: validated.kode_bahan,
        nama: validated.nama_bahan,
        kategori: validated.kategori ?? null,
        satuan_id: validated.satuan_besar_id,
        satuan_kecil_id: validated.satuan_kecil_id ?? null,
        konversi_factor: validated.konversi_factor,
        minimum_stock: validated.stok_minimum,
        maximum_stock: validated.stok_maximum ?? null,
        shelf_life_days: validated.shelf_life_days ?? 0,
        storage_condition: validated.storage_condition ?? "ambient",
        created_by: user.id,
      })
      .select(
        `
        id,
        kode,
        nama,
        kategori,
        minimum_stock,
        maximum_stock,
        konversi_factor,
        shelf_life_days,
        storage_condition,
        is_active,
        created_at,
        satuan_besar:satuan_id(id, kode, nama),
        satuan_kecil:satuan_kecil_id(id, kode, nama)
      `
      )
      .single();

    if (bbError) throw bbError;

    // Auto-initialize inventory record (qty_onhand = 0)
    const { error: invError } = await supabase.from("inventory").insert({
      bahan_baku_id: bahanBaku.id,
      jumlah_tersedia: 0,
      jumlah_dipesan: 0,
      jumlah_minimum: validated.stok_minimum,
      jumlah_maksimum: validated.stok_maximum ?? null,
      konversi_factor: validated.konversi_factor,
      created_by: user.id,
    });

    if (invError) {
      // Rollback: delete the bahan_baku if inventory insert fails
      await supabase.from("bahan_baku").delete().eq("id", bahanBaku.id);
      throw ApiError.server("Gagal menginisialisasi inventory: " + invError.message);
    }

    return createdResponse(
      {
        ...bahanBaku,
        qty_onhand: 0,
        avg_cost: 0,
        status_stok: STOK_STATUS.HABIS,
        supplier_utama: null,
      },
      "Bahan baku berhasil dibuat"
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error creating raw material:", error);
    return ApiError.server("Failed to create raw material").toResponse();
  }
}
