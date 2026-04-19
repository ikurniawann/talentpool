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
  noContentResponse,
} from "@/lib/api/auth";
import { UserRole } from "@/types";

// Zod schemas
const createSupplierSchema = z.object({
  nama: z.string().min(1, "Nama supplier wajib diisi"),
  alamat: z.string().optional(),
  telepon: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  npwp: z.string().optional(),
  bank_nama: z.string().optional(),
  bank_rekening: z.string().optional(),
  bank_atas_nama: z.string().optional(),
  kategori: z.string().optional(),
  status: z.enum(["active", "inactive", "blacklisted"]).default("active"),
});

const updateSupplierSchema = createSupplierSchema.partial();

const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "blacklisted"]).optional(),
  kategori: z.string().optional(),
});

// Helper: generate supplier code
async function generateSupplierCode(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
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

// GET /api/purchasing/suppliers - List with filter & pagination
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const supabase = await createClient();

    // Parse & validate query params
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = queryParamsSchema.parse(rawParams);
    const { page, limit, search, status, kategori } = params;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    if (status) query = query.eq("status", status);
    if (kategori) query = query.eq("kategori", kategori);
    if (search) {
      query = query.or(`nama.ilike.%${search}%,kode.ilike.%${search}%,alamat.ilike.%${search}%`);
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
    console.error("Error fetching suppliers:", error);
    return ApiError.server("Failed to fetch suppliers").toResponse();
  }
}

// POST /api/purchasing/suppliers - Create
export async function POST(request: NextRequest) {
  try {
    // Only purchasing_admin or purchasing_staff can create
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();

    const body = await request.json();
    const validated = createSupplierSchema.parse(body);

    // Generate code
    const kode = await generateSupplierCode(supabase);

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        kode,
        ...validated,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return createdResponse(data, "Supplier berhasil dibuat");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error creating supplier:", error);
    return ApiError.server("Failed to create supplier").toResponse();
  }
}
