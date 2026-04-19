import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
  noContentResponse,
} from "@/lib/api/auth";

const updateProductSchema = z.object({
  nama: z.string().min(1).max(200).optional(),
  deskripsi: z.string().optional(),
  satuan_id: z.string().uuid().optional(),
  kategori: z.string().optional(),
  harga_jual: z.number().positive().optional(),
});

const bomItemSchema = z.object({
  id: z.string().uuid().optional(), // if present, update existing
  bahan_baku_id: z.string().uuid(),
  jumlah: z.number().positive(),
  satuan_id: z.string().uuid(),
  waste_percentage: z.number().min(0).max(100).default(0),
  urutan: z.number().min(0).default(0).refine(v => Number.isInteger(v)),
  catatan: z.string().optional(),
});

const updateProductWithBomSchema = z.object({
  ...updateProductSchema.shape,
  bom: z.array(bomItemSchema).optional(),
});

// GET /api/purchasing/products/:id - Get product with BOM
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "purchasing_manager"]);
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
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
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      throw ApiError.notFound("Produk tidak ditemukan");
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching product:", error);
    return ApiError.server("Failed to fetch product").toResponse();
  }
}

// PUT /api/purchasing/products/:id - Update product + BOM
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const { id } = await params;
    const supabase = await createClient();

    const body = await request.json();
    const { bom: bomItems, ...productData } = body;
    const validated = updateProductSchema.parse(productData);

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

    // Update product
    const { data: product, error: productError } = await supabase
      .from("produk")
      .update({ ...validated, updated_by: user.id })
      .eq("id", id)
      .eq("is_active", true)
      .select(`*, satuan:satuan_id (id, kode, nama)`)
      .single();

    if (productError || !product) {
      throw ApiError.notFound("Produk tidak ditemukan");
    }

    // Update BOM if provided
    if (bomItems !== undefined) {
      // Delete existing BOM items
      await supabase.from("bom").delete().eq("produk_id", id);

      // Insert new BOM items
      if (Array.isArray(bomItems) && bomItems.length > 0) {
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
          produk_id: id,
          ...item,
          created_by: user.id,
        }));

        const { error: bomError } = await supabase
          .from("bom")
          .insert(bomInserts);

        if (bomError) throw bomError;
      }
    }

    // Fetch updated product with BOM
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
      .eq("id", id)
      .single();

    return successResponse(productWithBom, "Produk berhasil diperbarui");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error updating product:", error);
    return ApiError.server("Failed to update product").toResponse();
  }
}

// DELETE /api/purchasing/products/:id - Soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin"]);
    const { id } = await params;
    const supabase = await createClient();

    // BOM has ON DELETE CASCADE, so no need to check

    const { error } = await supabase
      .from("produk")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;

    return noContentResponse();
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error deleting product:", error);
    return ApiError.server("Failed to delete product").toResponse();
  }
}
