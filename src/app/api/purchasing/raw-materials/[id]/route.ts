import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiUser,
  requireApiRole,
  ApiError,
  successResponse,
  noContentResponse,
} from "@/lib/api/auth";

// ─── Constants ───────────────────────────────────────────────────────────────

const KATEGORI_OPTIONS = [
  "BAHAN_PANGAN",
  "BAHAN_NON_PANGAN",
  "KEMASAN",
  "BAHAN_BAKAR",
  "LAINNYA",
] as const;

const STOK_STATUS = {
  AMAN: "AMAN",
  MENIPIS: "MENIPIS",
  HABIS: "HABIS",
} as const;

// ─── Schemas ─────────────────────────────────────────────────────────────────

const updateRawMaterialSchema = z.object({
  nama_bahan: z.string().min(1).max(200).optional(),
  kategori: z.enum(KATEGORI_OPTIONS).optional(),
  satuan_besar_id: z.string().uuid("Satuan besar ID tidak valid").optional(),
  satuan_kecil_id: z.string().uuid("Satuan kecil ID tidak valid").optional().nullable,
  konversi_factor: z.number().positive().optional(),
  stok_minimum: z.number().min(0).optional(),
  stok_maximum: z.number().positive().optional().nullable,
  shelf_life_days: z.number().min(0).optional(),
  storage_condition: z.string().max(50).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcStokStatus(qtyOnhand: number, minStock: number) {
  if (qtyOnhand === 0) return STOK_STATUS.HABIS;
  if (qtyOnhand <= minStock) return STOK_STATUS.MENIPIS;
  return STOK_STATUS.AMAN;
}

async function getInventoryData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bahanBakuId: string
) {
  const { data: inv } = await supabase
    .from("inventory")
    .select(
      "jumlah_tersedia, jumlah_dipesan, jumlah_maksimum, unit_cost, konversi_factor"
    )
    .eq("bahan_baku_id", bahanBakuId)
    .maybeSingle();

  return {
    qtyOnhand: Number(inv?.jumlah_tersedia ?? 0),
    qtyReserved: Number(inv?.jumlah_dipesan ?? 0),
    qtyOnOrder: 0,
    avgCost: Number(inv?.unit_cost ?? 0),
    konversiFactor: Number(inv?.konversi_factor ?? 1),
    inv,
  };
}

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

async function getStokMovements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inventoryId: string,
  bahanBakuId: string
) {
  const { data: movements } = await supabase
    .from("inventory_movements")
    .select(
      `
      id,
      tipe,
      jumlah,
      unit_cost,
      total_cost,
      sebelum,
      sesudah,
      reference_type,
      reference_id,
      alasan,
      tanggal_movement,
      catatan,
      created_at
    `
    )
    .eq("inventory_id", inventoryId)
    .eq("bahan_baku_id", bahanBakuId)
    .eq("is_active", true)
    .order("tanggal_movement", { ascending: false })
    .limit(10);

  return movements ?? [];
}

async function getBomProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bahanBakuId: string
) {
  const { data: bomItems } = await supabase
    .from("bom")
    .select(
      `
      id,
      jumlah,
      waste_percentage,
      satuan:satuan_id(id, kode, nama),
      produk:produk_id(id, kode, nama, is_active)
    `
    )
    .eq("bahan_baku_id", bahanBakuId)
    .eq("is_active", true);

  return bomItems ?? [];
}

// ─── GET /api/purchasing/raw-materials/:id ───────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiUser();
    const { id } = await params;
    const supabase = await createClient();

    // Fetch bahan_baku with satuan info
    const { data: bb, error: bbError } = await supabase
      .from("bahan_baku")
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
        updated_at,
        created_by,
        satuan_besar:satuan_id(id, kode, nama),
        satuan_kecil:satuan_kecil_id(id, kode, nama)
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (bbError || !bb) {
      throw ApiError.notFound("Bahan baku tidak ditemukan");
    }

    // Parallel fetch: inventory, supplier prices, movements, BOM
    const [invData, spl, movements, bomProducts] = await Promise.all([
      getInventoryData(supabase, id),
      getSupplierPriceLists(supabase, id),
      getStokMovements(supabase, invData.inv?.id ?? "", id),
      getBomProducts(supabase, id),
    ]);

    const minStock = Number(bb.minimum_stock ?? 0);

    const response = {
      ...bb,
      stok: {
        qty_onhand: invData.qtyOnhand,
        qty_reserved: invData.qtyReserved,
        qty_on_order: invData.qtyOnOrder,
        avg_cost: invData.avgCost,
        qty_minimum: minStock,
        qty_maximum: Number(bb.maximum_stock ?? 0),
        konversi_factor: invData.konversiFactor,
        status_stok: calcStokStatus(invData.qtyOnhand, minStock),
      },
      supplier_price_lists: spl.map((item: any) => ({
        id: item.id,
        harga: item.harga,
        minimum_qty: item.minimum_qty,
        lead_time_days: item.lead_time_days,
        is_preferred: item.is_preferred,
        berlaku_dari: item.berlaku_dari,
        berlaku_sampai: item.berlaku_sampai,
        supplier: {
          id: item.supplier?.id,
          nama: item.supplier?.nama_supplier,
          pic_name: item.supplier?.pic_name,
          pic_phone: item.supplier?.pic_phone,
          is_active: item.supplier?.is_active,
        },
        satuan: item.satuan,
      })),
      movements: movements,
      bom_products: bomProducts.map((item: any) => ({
        id: item.id,
        jumlah: item.jumlah,
        waste_percentage: item.waste_percentage,
        satuan: item.satuan,
        produk: item.produk,
      })),
    };

    return successResponse(response);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching raw material detail:", error);
    return ApiError.server("Failed to fetch raw material detail").toResponse();
  }
}

// ─── PUT /api/purchasing/raw-materials/:id ──────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);
    const { id } = await params;
    const supabase = await createClient();

    // Fetch existing record
    const { data: existing, error: fetchError } = await supabase
      .from("bahan_baku")
      .select("id, konversi_factor")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      throw ApiError.notFound("Bahan baku tidak ditemukan");
    }

    const body = await request.json();
    const validated = updateRawMaterialSchema.parse(body);

    // Verify satuan_besar if being updated
    if (validated.satuan_besar_id) {
      const { data: satuan } = await supabase
        .from("satuan")
        .select("id")
        .eq("id", validated.satuan_besar_id)
        .eq("is_active", true)
        .single();

      if (!satuan) {
        throw ApiError.badRequest("Satuan besar tidak ditemukan");
      }
    }

    // Verify satuan_kecil if being updated
    if (validated.satuan_kecil_id !== undefined) {
      if (validated.satuan_kecil_id === null) {
        // Allow setting to null
      } else {
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
    }

    // Check if konversi_factor changed
    const oldKonversi = Number(existing.konversi_factor ?? 1);
    const newKonversi = validated.konversi_factor ?? oldKonversi;
    const konversiChanged = newKonversi !== oldKonversi;

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      updated_by: user.id,
    };
    if (validated.nama_bahan !== undefined) updatePayload.nama = validated.nama_bahan;
    if (validated.kategori !== undefined) updatePayload.kategori = validated.kategori;
    if (validated.satuan_besar_id !== undefined) updatePayload.satuan_id = validated.satuan_besar_id;
    if (validated.satuan_kecil_id !== undefined) updatePayload.satuan_kecil_id = validated.satuan_kecil_id;
    if (validated.konversi_factor !== undefined) updatePayload.konversi_factor = validated.konversi_factor;
    if (validated.stok_minimum !== undefined) updatePayload.minimum_stock = validated.stok_minimum;
    if (validated.stok_maximum !== undefined) updatePayload.maximum_stock = validated.stok_maximum;
    if (validated.shelf_life_days !== undefined) updatePayload.shelf_life_days = validated.shelf_life_days;
    if (validated.storage_condition !== undefined) updatePayload.storage_condition = validated.storage_condition;

    // Update inventory konversi_factor if changed
    if (konversiChanged) {
      await supabase
        .from("inventory")
        .update({ konversi_factor: newKonversi })
        .eq("bahan_baku_id", id);
    }

    const { data: updated, error: updateError } = await supabase
      .from("bahan_baku")
      .update(updatePayload)
      .eq("id", id)
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
        updated_at,
        satuan_besar:satuan_id(id, kode, nama),
        satuan_kecil:satuan_kecil_id(id, kode, nama)
      `
      )
      .single();

    if (updateError) throw updateError;

    // Return with warning if konversi changed
    let warning: string | null = null;
    if (konversiChanged) {
      const { data: affectedBom } = await supabase
        .from("bom")
        .select("id, produk:produk_id(kode, nama)")
        .eq("bahan_baku_id", id)
        .eq("is_active", true);

      if (affectedBom && affectedBom.length > 0) {
        warning =
          `Konversi factor berubah dari ${oldKonversi} ke ${newKonversi}. ` +
          `Perubahan ini berdampak pada ${affectedBom.length} BOM (Bill of Materials). ` +
          `Product: ${affectedBom
            .map((b: any) => b.produk?.kode + " - " + b.produk?.nama)
            .join(", ")}.`;
      }
    }

    return successResponse(
      { ...updated, warning },
      warning ? "Bahan baku diperbarui dengan notice" : "Bahan baku berhasil diperbarui"
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error updating raw material:", error);
    return ApiError.server("Failed to update raw material").toResponse();
  }
}

// ─── DELETE /api/purchasing/raw-materials/:id ───────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin"]);
    const { id } = await params;
    const supabase = await createClient();

    // Fetch existing to check current stock
    const { data: existing } = await supabase
      .from("bahan_baku")
      .select("id, kode, nama")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      throw ApiError.notFound("Bahan baku tidak ditemukan");
    }

    // Check if used in active BOM
    const { data: usedInBom } = await supabase
      .from("bom")
      .select("id")
      .eq("bahan_baku_id", id)
      .eq("is_active", true)
      .limit(1);

    if (usedInBom && usedInBom.length > 0) {
      throw ApiError.conflict(
        `Bahan baku "${existing.nama}" (${existing.kode}) sedang digunakan di BOM aktif. Tidak dapat dihapus.`
      );
    }

    // Check current stock > 0
    const { data: inv } = await supabase
      .from("inventory")
      .select("jumlah_tersedia")
      .eq("bahan_baku_id", id)
      .maybeSingle();

    const qtyOnhand = Number(inv?.jumlah_tersedia ?? 0);
    if (qtyOnhand > 0) {
      throw ApiError.conflict(
        `Bahan baku "${existing.nama}" (${existing.kode}) memiliki stok ${qtyOnhand}. Harap kosongkan stok sebelum menghapus.`
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from("bahan_baku")
      .update({ is_active: false })
      .eq("id", id);

    if (deleteError) throw deleteError;

    return noContentResponse();
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error deleting raw material:", error);
    return ApiError.server("Failed to delete raw material").toResponse();
  }
}
