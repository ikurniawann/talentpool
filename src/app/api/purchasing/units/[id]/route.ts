import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
  noContentResponse,
} from "@/lib/api/auth";

const updateSatuanSchema = z.object({
  kode: z.string().min(1).max(20).optional(),
  nama: z.string().min(1).max(100).optional(),
  deskripsi: z.string().optional(),
});

// GET /api/purchasing/units/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "purchasing_manager"]);
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("satuan")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      throw ApiError.notFound("Satuan tidak ditemukan");
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching satuan:", error);
    return ApiError.server("Failed to fetch satuan").toResponse();
  }
}

// PUT /api/purchasing/units/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const { id } = await params;
    const supabase = await createClient();

    const body = await request.json();
    const validated = updateSatuanSchema.parse(body);

    // Check duplicate kode if being updated
    if (validated.kode) {
      const { data: existing } = await supabase
        .from("satuan")
        .select("id")
        .eq("kode", validated.kode)
        .eq("is_active", true)
        .neq("id", id)
        .single();

      if (existing) {
        throw ApiError.conflict("Kode satuan sudah digunakan");
      }
    }

    const { data, error } = await supabase
      .from("satuan")
      .update({ ...validated, updated_by: user.id })
      .eq("id", id)
      .eq("is_active", true)
      .select()
      .single();

    if (error || !data) {
      throw ApiError.notFound("Satuan tidak ditemukan");
    }

    return successResponse(data, "Satuan berhasil diperbarui");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error updating satuan:", error);
    return ApiError.server("Failed to update satuan").toResponse();
  }
}

// DELETE /api/purchasing/units/:id - Soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin"]);
    const { id } = await params;
    const supabase = await createClient();

    // Check if used by bahan_baku or produk
    const { data: usedInBahanBaku } = await supabase
      .from("bahan_baku")
      .select("id")
      .eq("satuan_id", id)
      .eq("is_active", true)
      .limit(1);

    const { data: usedInProduk } = await supabase
      .from("produk")
      .select("id")
      .eq("satuan_id", id)
      .eq("is_active", true)
      .limit(1);

    if (usedInBahanBaku?.length || usedInProduk?.length) {
      throw ApiError.conflict("Satuan sedang digunakan, tidak dapat dihapus");
    }

    const { error } = await supabase
      .from("satuan")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;

    return noContentResponse();
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error deleting satuan:", error);
    return ApiError.server("Failed to delete satuan").toResponse();
  }
}
