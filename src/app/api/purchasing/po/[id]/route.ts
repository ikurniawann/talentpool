// ============================================
// API ROUTE: /api/purchasing/po/[id]
// ============================================

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service-client";
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

// GET /api/purchasing/po/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Get PO header
    const { data: po, error: poError } = await supabase
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

    // Get PO items
    const { data: items, error: itemsError } = await supabase
      .from("purchase_order_items")
      .select(`
        *,
        raw_material:raw_material_id (*),
        satuan:satuan_id (*)
      `)
      .eq("purchase_order_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;

    if (itemsError) throw itemsError;

    return Response.json({
      success: true,
      data: {
        ...po,
        items: items || [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching PO:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data PO" },
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
    const supabase = createServiceClient();
    const body = await request.json();

    // Validasi input
    const validated = poSchema.parse(body);

    // Cek PO ada dan status masih bisa diedit (hanya DRAFT)
    const { data: po, error: findError } = await supabase
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

    if (po.status !== "DRAFT") {
      return Response.json(
        { success: false, message: "PO hanya bisa diedit saat status DRAFT" },
        { status: 400 }
      );
    }

    // Update data
    const { data, error } = await supabase
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
  } catch (error: any) {
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
      { success: false, message: error.message || "Gagal mengupdate PO" },
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
    const supabase = createServiceClient();

    // Cek PO ada
    const { data: po, error: findError } = await supabase
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

    // Hanya bisa hapus/cancel jika belum received
    if (po.status === "RECEIVED") {
      return Response.json(
        { success: false, message: "PO yang sudah diterima tidak bisa dibatalkan" },
        { status: 400 }
      );
    }

    // Soft delete / cancel
    const { error } = await supabase
      .from("purchase_orders")
      .update({
        status: "CANCELLED",
        is_active: false,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return Response.json({
      success: true,
      message: "PO berhasil dibatalkan",
    });
  } catch (error: any) {
    console.error("Error cancelling PO:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal membatalkan PO" },
      { status: 500 }
    );
  }
}
