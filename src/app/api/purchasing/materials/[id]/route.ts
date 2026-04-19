import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
  noContentResponse,
} from "@/lib/api/auth";

const updateMaterialSchema = z.object({
  nama: z.string().min(1).max(200).optional(),
  deskripsi: z.string().optional(),
  satuan_id: z.string().uuid().optional(),
  kategori: z.string().optional(),
  harga_estimasi: z.number().positive().optional(),
  minimum_stock: z.number().min(0).optional(),
  maximum_stock: z.number().positive().optional(),
  current_stock: z.number().min(0).optional(),
  lokasi_rak: z.string().optional(),
  lead_time_days: z.number().min(0).optional().refine(v => v === undefined || Number.isInteger(v)),
});

// GET /api/purchasing/materials/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "purchasing_manager"]);
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bahan_baku")
      .select(`*, satuan:satuan_id (id, kode, nama)`)
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      throw ApiError.notFound("Bahan baku tidak ditemukan");
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching material:", error);
    return ApiError.server("Failed to fetch material").toResponse();
  }
}

// PUT /api/purchasing/materials/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const { id } = await params;
    const supabase = await createClient();

    const body = await request.json();
    const validated = updateMaterialSchema.parse(body);

    // Verify satuan if being updated
    if (validated.satuan_id) {
      const { data: satuan } = await supabase
        .from("satuan")
        .select("id")
        .eq("id", validated.satuan_id)
        .eq("is_active", true)
        .single();

      if (!satuan) {
        throw ApiError.badRequest("Satuan tidak ditemukan");
      }
    }

    const { data, error } = await supabase
      .from("bahan_baku")
      .update({ ...validated, updated_by: user.id })
      .eq("id", id)
      .eq("is_active", true)
      .select(`*, satuan:satuan_id (id, kode, nama)`)
      .single();

    if (error || !data) {
      throw ApiError.notFound("Bahan baku tidak ditemukan");
    }

    return successResponse(data, "Bahan baku berhasil diperbarui");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error updating material:", error);
    return ApiError.server("Failed to update material").toResponse();
  }
}

// DELETE /api/purchasing/materials/:id - Soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin"]);
    const { id } = await params;
    const supabase = await createClient();

    // Check if used in BOM
    const { data: usedInBom } = await supabase
      .from("bom")
      .select("id")
      .eq("bahan_baku_id", id)
      .eq("is_active", true)
      .limit(1);

    if (usedInBom?.length) {
      throw ApiError.conflict("Bahan baku sedang digunakan di BOM, tidak dapat dihapus");
    }

    // Check if used in supplier price lists
    const { data: usedInSpl } = await supabase
      .from("supplier_price_lists")
      .select("id")
      .eq("bahan_baku_id", id)
      .eq("is_active", true)
      .limit(1);

    if (usedInSpl?.length) {
      throw ApiError.conflict("Bahan baku sedang digunakan di daftar harga supplier, tidak dapat dihapus");
    }

    const { error } = await supabase
      .from("bahan_baku")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;

    return noContentResponse();
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error deleting material:", error);
    return ApiError.server("Failed to delete material").toResponse();
  }
}
