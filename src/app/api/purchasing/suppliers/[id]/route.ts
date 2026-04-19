import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
  noContentResponse,
} from "@/lib/api/auth";

const updateSupplierSchema = z.object({
  nama: z.string().min(1, "Nama supplier wajib diisi").optional(),
  alamat: z.string().optional(),
  telepon: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  npwp: z.string().optional(),
  bank_nama: z.string().optional(),
  bank_rekening: z.string().optional(),
  bank_atas_nama: z.string().optional(),
  kategori: z.string().optional(),
  status: z.enum(["active", "inactive", "blacklisted"]).optional(),
});

// GET /api/purchasing/suppliers/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "purchasing_manager"]);
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      throw ApiError.notFound("Supplier tidak ditemukan");
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching supplier:", error);
    return ApiError.server("Failed to fetch supplier").toResponse();
  }
}

// PUT /api/purchasing/suppliers/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const { id } = await params;
    const supabase = await createClient();

    const body = await request.json();
    const validated = updateSupplierSchema.parse(body);

    const { data, error } = await supabase
      .from("suppliers")
      .update({
        ...validated,
        updated_by: user.id,
      })
      .eq("id", id)
      .eq("is_active", true)
      .select()
      .single();

    if (error || !data) {
      throw ApiError.notFound("Supplier tidak ditemukan");
    }

    return successResponse(data, "Supplier berhasil diperbarui");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error updating supplier:", error);
    return ApiError.server("Failed to update supplier").toResponse();
  }
}

// DELETE /api/purchasing/suppliers/:id - Soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin"]);
    const { id } = await params;
    const supabase = await createClient();

    // Soft delete
    const { error } = await supabase
      .from("suppliers")
      .update({
        is_active: false,
        updated_by: user.id,
      })
      .eq("id", id);

    if (error) throw error;

    return noContentResponse();
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error deleting supplier:", error);
    return ApiError.server("Failed to delete supplier").toResponse();
  }
}
