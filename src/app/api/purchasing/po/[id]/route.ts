// ============================================
// API ROUTE: /api/purchasing/po/[id]
// ============================================

import { NextRequest } from "next/server";
import { createPgClient } from "@/lib/pg/create-client";
import { adjustInventoryOnOrder } from "@/lib/inventory";
import { z } from "zod";

const poSchema = z.object({
  supplier_id: z.string().uuid().optional(),
  tanggal_po: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tanggal_kirim_estimasi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  catatan: z.string().optional().nullable(),
  alamat_pengiriman: z.string().optional().nullable(),
  diskon_persen: z.number().min(0).max(100).optional(),
  diskon_nominal: z.number().min(0).optional(),
  ppn_persen: z.number().min(0).max(100).optional(),
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// GET /api/purchasing/po/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createPgClient();

    // Get PO header
    const { data: po, error: poError } = await db
      .from("v_purchase_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (poError) {
      if (poError.code === "PGRST116") {
        return Response.json(
          { success: false, message: "PO tidak ditemukan" },
          { status: 404 }
        );
      }
      throw poError;
    }

    // Get PO items.
    // Query builder hanya mendukung embed satu level, jadi satuan_besar/satuan_kecil
    // dari raw_material di-resolve manual lewat lookup units di bawah.
    const { data: items, error: itemsError } = await db
      .from("purchase_order_items")
      .select(`
        *,
        raw_material:raw_materials!raw_material_id (*),
        satuan:units!satuan_id (*)
      `)
      .eq("purchase_order_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;

    // Enrich raw_material dengan nama satuan besar/kecil (units).
    const itemUnitIds = Array.from(
      new Set(
        (items || []).flatMap((item) => {
          const rm = (item as { raw_material?: { satuan_besar_id?: string | null; satuan_kecil_id?: string | null } | null }).raw_material;
          return [rm?.satuan_besar_id, rm?.satuan_kecil_id].filter(Boolean) as string[];
        })
      )
    );
    if (itemUnitIds.length > 0) {
      const { data: unitRows } = await db
        .from("units")
        .select("id, nama, kode")
        .in("id", itemUnitIds);
      const unitMap = new Map((unitRows || []).map((u) => [u.id as string, u]));
      for (const item of items || []) {
        const rm = (item as { raw_material?: { satuan_besar_id?: string | null; satuan_kecil_id?: string | null; satuan_besar?: unknown; satuan_kecil?: unknown } | null }).raw_material;
        if (!rm) continue;
        rm.satuan_besar = rm.satuan_besar_id ? unitMap.get(rm.satuan_besar_id) ?? null : null;
        rm.satuan_kecil = rm.satuan_kecil_id ? unitMap.get(rm.satuan_kecil_id) ?? null : null;
      }
    }

    const { data: activeDelivery, error: deliveryError } = await db
      .from("deliveries")
      .select("id, nomor_resi, no_surat_jalan, status")
      .eq("purchase_order_id", id)
      .eq("is_active", true)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (deliveryError) throw deliveryError;

    return Response.json({
      success: true,
      data: {
        ...po,
        active_delivery_id: activeDelivery?.id || null,
        active_delivery_number: activeDelivery?.nomor_resi || activeDelivery?.no_surat_jalan || null,
        active_delivery_status: activeDelivery?.status || null,
        items: items || [],
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching PO:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mengambil data PO") },
      { status: 500 }
    );
  }
}

// PUT /api/purchasing/po/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createPgClient();
    const body = await request.json();

    // Validasi input
    const validated = poSchema.parse(body);

    // Cek PO ada dan status masih bisa diedit (hanya draft)
    const { data: po, error: findError } = await db
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !po) {
      return Response.json(
        { success: false, message: "PO tidak ditemukan" },
        { status: 404 }
      );
    }

    if (po.status !== "draft") {
      return Response.json(
        { success: false, message: "PO hanya bisa diedit saat status draft" },
        { status: 400 }
      );
    }

    // Update data
    const { data, error } = await db
      .from("purchase_orders")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({
      success: true,
      data,
      message: "PO berhasil diupdate",
    });
  } catch (error: unknown) {
    console.error("Error updating PO:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          message: "Validasi gagal",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mengupdate PO") },
      { status: 500 }
    );
  }
}

// DELETE /api/purchasing/po/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createPgClient();

    // Cek PO ada
    const { data: po, error: findError } = await db
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !po) {
      return Response.json(
        { success: false, message: "PO tidak ditemukan" },
        { status: 404 }
      );
    }

    const normalizedStatus = String(po.status || "").toLowerCase();

    // Hanya bisa hapus/cancel jika belum received
    if (normalizedStatus === "received") {
      return Response.json(
        { success: false, message: "PO yang sudah diterima tidak bisa dibatalkan" },
        { status: 400 }
      );
    }

    const shouldReleaseOnOrder = normalizedStatus === "sent" || normalizedStatus === "partial" || normalizedStatus === "partially_received";
    const { data: items, error: itemsError } = shouldReleaseOnOrder
      ? await db
          .from("purchase_order_items")
          .select("raw_material_id, qty_ordered, qty_received")
          .eq("purchase_order_id", id)
          .eq("is_active", true)
      : { data: [], error: null };

    if (itemsError) throw itemsError;

    // Soft delete / cancel
    const { error } = await db
      .from("purchase_orders")
      .update({
        status: "cancelled",
        is_active: false,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    if (shouldReleaseOnOrder) {
      for (const item of items || []) {
        const remainingQty = Math.max(0, Number(item.qty_ordered || 0) - Number(item.qty_received || 0));
        if (item.raw_material_id && remainingQty > 0) {
          await adjustInventoryOnOrder(db, item.raw_material_id, -remainingQty);
        }
      }
    }

    return Response.json({
      success: true,
      message: "PO berhasil dibatalkan",
    });
  } catch (error: unknown) {
    console.error("Error cancelling PO:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal membatalkan PO") },
      { status: 500 }
    );
  }
}
