import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, ApiError } from "@/lib/api/auth";

// ========================
// ZOD SCHEMAS
// ========================

const createSupplierSchema = z.object({
  kode_supplier: z.string().min(1, "Kode supplier wajib diisi").max(50).optional(),
  nama_supplier: z.string().min(1, "Nama supplier wajib diisi").max(200),
  pic_name: z.string().max(100).optional(),
  pic_phone: z.string().max(30).optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  alamat: z.string().optional(),
  kota: z.string().max(100).optional(),
  npwp: z.string().max(50).optional(),
  payment_terms: z
    .enum(["COD", "NET7", "NET14", "NET30", "NET45", "NET60"])
    .default("NET30"),
  currency: z.enum(["IDR", "USD", "EUR"]).default("IDR"),
  bank_nama: z.string().optional(),
  bank_rekening: z.string().optional(),
  bank_atas_nama: z.string().optional(),
  kategori: z.string().optional(),
});

const queryParamsSchema = z.object({
  search: z.string().optional(),
  is_active: z.coerce.boolean().default(true),
  payment_terms: z.enum(["COD", "NET7", "NET14", "NET30", "NET45", "NET60"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort_by: z
    .enum(["nama_supplier", "kode_supplier", "kota", "created_at"])
    .default("nama_supplier"),
  sort_dir: z.enum(["ASC", "DESC"]).default("ASC"),
});

// ========================
// HELPER: Generate supplier code
// ========================
async function generateSupplierCode(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from("suppliers")
    .select("kode")
    .ilike("kode", `SUP-${year}-%`)
    .order("kode", { ascending: false })
    .limit(1);

  let seq = 1;
  if (data && data.length > 0) {
    const parts = data[0].kode.split("-");
    seq = parseInt(parts[parts.length - 1]) + 1;
  }
  return `SUP-${year}-${String(seq).padStart(4, "0")}`;
}

// ========================
// GET /api/purchasing/suppliers
// ========================
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "purchasing_manager"]);

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = queryParamsSchema.parse(rawParams);
    const { page, limit, search, is_active, payment_terms, sort_by, sort_dir } = params;
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    const sortColumnMap: Record<string, string> = {
      nama_supplier: "nama_supplier",
      kode_supplier: "kode",
      kota: "kota",
      created_at: "created_at",
    };
    const sortColumn = sortColumnMap[sort_by] ?? "nama_supplier";

    let query = supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .eq("is_active", is_active);

    if (payment_terms) {
      query = query.eq("payment_terms", payment_terms);
    }

    if (search) {
      query = query.or(
        `nama_supplier.ilike.%${search}%,kode.ilike.%${search}%,kota.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query
      .order(sortColumn, { ascending: sort_dir === "ASC" })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Return format tanpa wrapper success
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Parameter query tidak valid", error.issues).toResponse();
    }
    console.error("Error fetching suppliers:", error);
    return ApiError.server("Gagal mengambil data supplier").toResponse();
  }
}

// ========================
// POST /api/purchasing/suppliers
// ========================
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const body = await request.json();
    const validated = createSupplierSchema.parse(body);

    const supabase = await createClient();

    // Auto-generate kode if not provided, placeholder, or empty
    let kodeSupplier = validated.kode_supplier;
    if (!kodeSupplier || kodeSupplier.trim() === "" || kodeSupplier.includes("XXXX")) {
      kodeSupplier = await generateSupplierCode(supabase);
    }

    // Check if kode_supplier already exists
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id")
      .eq("kode", kodeSupplier)
      .single();

    if (existing) {
      throw ApiError.conflict("Kode supplier sudah digunakan");
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        kode: kodeSupplier,
        nama_supplier: validated.nama_supplier,
        pic_name: validated.pic_name,
        pic_phone: validated.pic_phone,
        email: validated.email,
        alamat: validated.alamat,
        kota: validated.kota,
        npwp: validated.npwp,
        payment_terms: validated.payment_terms,
        currency: validated.currency,
        bank_nama: validated.bank_nama,
        bank_rekening: validated.bank_rekening,
        bank_atas_nama: validated.bank_atas_nama,
        kategori: validated.kategori,
        status: "active",
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw ApiError.conflict("Kode supplier sudah digunakan");
      }
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validasi gagal", error.issues).toResponse();
    }
    console.error("Error creating supplier:", error);
    return ApiError.server("Gagal membuat supplier").toResponse();
  }
}
