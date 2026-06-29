import { createServerPgClient } from "@/lib/pg/create-client";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
  noContentResponse,
} from "@/lib/api/auth";

const updateMaterialSchema = z.object({
  nama: z.string().min(1).optional(),
  kode: z.string().min(1).optional(),
  kategori: z.string().optional(),
  satuan_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
});

// ========================
// GET /api/purchasing/materials/:id
// ========================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "purchasing_manager", "super_admin"]);
    const { id } = await params;
    const db = await createServerPgClient();

    const { data, error } = await db
      .from("bahan_baku")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw ApiError.notFound("Bahan baku tidak ditemukan");
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching material:", error);
    return ApiError.server("Gagal mengambil detail bahan baku").toResponse();
  }
}

// ========================
// PUT /api/purchasing/materials/:id
// ========================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff", "purchasing_manager", "super_admin"]);
    const { id } = await params;
    const db = await createServerPgClient();

    const body = await request.json();
    const validated = updateMaterialSchema.parse(body);

    const { data, error } = await db
      .from("bahan_baku")
      .update({
        ...validated,
        updated_by: user.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw ApiError.notFound("Bahan baku tidak ditemukan");
    }

    return successResponse(data, "Bahan baku berhasil diperbarui");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validasi gagal", error.issues).toResponse();
    }
    console.error("Error updating material:", error);
    return ApiError.server("Gagal memperbarui bahan baku").toResponse();
  }
}

// ========================
// DELETE /api/purchasing/materials/:id - Soft delete
// ========================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_manager", "purchasing_staff", "super_admin"]);
    const { id } = await params;
    const db = await createServerPgClient();

    const { error } = await db
      .from("bahan_baku")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", id);

    if (error) throw error;

    return noContentResponse();
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error deleting material:", error);
    return ApiError.server("Gagal menghapus bahan baku").toResponse();
  }
}
