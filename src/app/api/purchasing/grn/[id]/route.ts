import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";

// ============================================================
// GET /api/purchasing/grn/:id - Get GRN detail with QC inspections
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "warehouse_staff"]);
    const supabase = await createClient();
    const { id } = await params;

    const { data: grn, error } = await supabase
      .from("goods_receipts")
      .select(
        `
        *,
        purchase_order:purchase_order_id(
          id, po_number, status, supplier_id, delivery_date,
          items:po_items(
            id, bahan_baku_id, description, qty, qty_received,
            satuan:satuan_id(id, kode, nama),
            bahan_baku:bahan_baku_id(id, kode, nama)
          )
        ),
        delivery:delivery_id(
          id, nomor_resi, no_surat_jalan, kurir,
          tanggal_kirim, tanggal_estimasi_tiba, tanggal_aktual_tiba
        ),
        penerima:penerima_id(id, full_name)
      `
      )
      .eq("id", id)
      .single();

    if (error || !grn) {
      throw ApiError.notFound("GRN tidak ditemukan");
    }

    // Get QC inspections for this GRN
    const { data: qcInspections } = await supabase
      .from("qc_inspections")
      .select(
        `
        *,
        inspector:inspector_id(id, full_name),
        bahan_baku:bahan_baku_id(id, kode, nama)
      `
      )
      .eq("goods_receipt_id", id)
      .eq("is_active", true);

    return successResponse(
      { ...grn, qc_inspections: qcInspections || [] },
      "GRN detail retrieved"
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching GRN:", error);
    return ApiError.server("Failed to fetch GRN").toResponse();
  }
}
