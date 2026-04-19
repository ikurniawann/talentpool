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

// Zod schemas
const createSatuanSchema = z.object({
  kode: z.string().min(1, "Kode satuan wajib diisi").max(20),
  nama: z.string().min(1, "Nama satuan wajib diisi").max(100),
  deskripsi: z.string().optional(),
});

const updateSatuanSchema = createSatuanSchema.partial();

const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional(),
});

// GET /api/purchasing/units - List with filter & pagination
export async function GET(request: NextRequest) {
  try {
    await requireApiUser();
    const supabase = await createClient();

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = queryParamsSchema.parse(rawParams);
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("satuan")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    if (search) {
      query = query.or(`nama.ilike.%${search}%,kode.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order("nama")
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
    console.error("Error fetching satuan:", error);
    return ApiError.server("Failed to fetch satuan").toResponse();
  }
}

// POST /api/purchasing/units - Create
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const supabase = await createClient();

    const body = await request.json();
    const validated = createSatuanSchema.parse(body);

    // Check duplicate kode
    const { data: existing } = await supabase
      .from("satuan")
      .select("id")
      .eq("kode", validated.kode)
      .eq("is_active", true)
      .single();

    if (existing) {
      throw ApiError.conflict("Kode satuan sudah ada");
    }

    const { data, error } = await supabase
      .from("satuan")
      .insert({
        ...validated,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return createdResponse(data, "Satuan berhasil dibuat");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error creating satuan:", error);
    return ApiError.server("Failed to create satuan").toResponse();
  }
}
