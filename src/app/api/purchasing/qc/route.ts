import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import { addStockFromQC, reduceStockOnReturn } from "@/lib/purchasing/inventory";
import { updateGRNStatusFromQC } from "@/lib/purchasing/delivery";
import { recordMovement } from "@/lib/purchasing/inventory";
import { getOrCreateInventory } from "@/lib/purchasing/inventory";

// ============================================================
// Schemas
// ============================================================

const qcItemSchema = z.object({
  grn_item_id: z.string().uuid("GRN Item ID tidak valid").optional(),
  bahan_baku_id: z.string().uuid("Bahan Baku ID tidak valid"),
  jumlah_diperiksa: z.number().positive("Jumlah diperiksa harus lebih dari 0"),
  jumlah_diterima: z.number().min(0, "Jumlah diterima tidak boleh negatif"),
  jumlah_ditolak: z.number().min(0, "Jumlah ditolak tidak boleh negatif"),
  hasil: z.enum(["passed", "rejected", "partial"]),
  parameter_inspeksi: z.record(z.string(), z.unknown()).optional(),
  alasan: z.string().optional(),
  tgl_kadaluarsa: z.string().optional(), // YYYY-MM-DD
});

const createQCSchema = z.object({
  grn_id: z.string().uuid("GRN ID tidak valid"),
  items: z.array(qcItemSchema).min(1, "Minimal 1 item QC"),
  catatan: z.string().optional(),
});

// ============================================================
// POST /api/purchasing/qc - Submit QC inspection
// - For each accepted item: add to inventory with weighted avg cost
// - For each rejected item: auto-create draft Return
// - Update GRN and PO status
// ============================================================

// ============================================================
// GET /api/purchasing/qc - List QC inspections
// GET /api/purchasing/qc/:id - Get single QC inspection
// ============================================================

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "warehouse_staff"]);
    const supabase = await createClient();

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Check if this is a detail request (/api/purchasing/qc/:id)
    const pathParts = pathname.split("/").filter(Boolean);
    const qcId = pathParts[pathParts.length - 1];

    if (qcId && qcId !== "qc") {
      // Detail request
      const { data, error } = await supabase
        .from("qc_inspections")
        .select(
          `
          *,
          bahan_baku:bahan_baku_id(id, kode, nama),
          inspector:inspector_id(id, name, email),
          goods_receipt:goods_receipt_id(nomor_grn)
        `
        )
        .eq("id", qcId)
        .single();

      if (error || !data) {
        throw ApiError.notFound("QC inspection tidak ditemukan");
      }

      // Calculate status and rekomendasi
      let status: "APPROVED" | "REJECTED" | "PARTIAL" = "PARTIAL";
      let rekomendasi: "ACCEPT" | "REJECT" | "REWORK" = "REWORK";

      if (data.jumlah_ditolak === 0 && data.jumlah_diterima > 0) {
        status = "APPROVED";
        rekomendasi = "ACCEPT";
      } else if (data.jumlah_diterima === 0 && data.jumlah_ditolak > 0) {
        status = "REJECTED";
        rekomendasi = "REJECT";
      } else if (data.jumlah_diterima > 0 && data.jumlah_ditolak > 0) {
        status = "PARTIAL";
        rekomendasi = "REWORK";
      }

      return successResponse({
        ...data,
        status,
        rekomendasi,
        grn_number: (data.goods_receipt as any)?.nomor_grn,
      });
    }

    // List request with pagination
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "15");
    const search = url.searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("qc_inspections")
      .select(
        `
        *,
        bahan_baku:bahan_baku_id(id, kode, nama),
        goods_receipt:goods_receipt_id(nomor_grn)
      `,
        { count: "exact" }
      )
      .order("tanggal_inspeksi", { ascending: false });

    if (search) {
      query = query.or(
        `qc_number.ilike.%${search}%,bahan_baku.nama.ilike.%${search}%,goods_receipt.nomor_grn.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return successResponse(
      data || [],
      undefined,
      { page, limit, total: count || 0 }
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching QC:", error);
    return ApiError.server("Failed to fetch QC inspections").toResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff", "warehouse_staff"]);
    const supabase = await createClient();

    const body = await request.json();
    const validated = createQCSchema.parse(body);

    // Get GRN with PO items to get unit prices
    const { data: grn, error: grnError } = await supabase
      .from("goods_receipts")
      .select(
        `
        *,
        purchase_order:purchase_order_id(
          id, po_number, status,
          items:po_items(id, bahan_baku_id, qty, qty_received, unit_price)
        ),
        delivery:delivery_id(id)
      `
      )
      .eq("id", validated.grn_id)
      .single();

    if (grnError || !grn) {
      throw ApiError.notFound("GRN tidak ditemukan");
    }

    if (grn.status === "completed" || grn.status === "rejected") {
      throw ApiError.badRequest(`GRN sudah berstatus "${grn.status}" — tidak dapat diproses ulang`);
    }

    // Build a map of PO items by bahan_baku_id for unit price lookup
    const poItemsRaw = (grn.purchase_order as any)?.items || [];
    const poItemByBahanBaku = new Map<string, { unit_price: number; satuan_id?: string }>(
      poItemsRaw.map((item: any) => [item.bahan_baku_id, item])
    );

    const createdReturns: any[] = [];
    const createdQC: any[] = [];

    // Process each QC item
    for (const item of validated.items) {
      // Validate inspected = accepted + rejected
      if (item.jumlah_diperiksa !== item.jumlah_diterima + item.jumlah_ditolak) {
        throw ApiError.badRequest(
          `Item ${item.bahan_baku_id}: jumlah_diperiksa harus sama dengan jumlah_diterima + jumlah_ditolak`
        );
      }

      // Insert QC inspection record
      const { data: qcRecord, error: qcError } = await supabase
        .from("qc_inspections")
        .insert({
          goods_receipt_id: validated.grn_id,
          bahan_baku_id: item.bahan_baku_id,
          jumlah_diperiksa: item.jumlah_diperiksa,
          jumlah_diterima: item.jumlah_diterima,
          jumlah_ditolak: item.jumlah_ditolak,
          hasil: item.hasil,
          parameter_inspeksi: item.parameter_inspeksi || null,
          catatan: item.alasan || null,
          inspector_id: user.id,
          tanggal_inspeksi: new Date().toISOString(),
          created_by: user.id,
        })
        .select(
          `
          *,
          bahan_baku:bahan_baku_id(id, kode, nama)
        `
        )
        .single();

      if (qcError) throw new Error(`Failed to insert QC record: ${qcError.message}`);
      createdQC.push(qcRecord);

      // Get unit price from PO item
      const poItem = poItemByBahanBaku.get(item.bahan_baku_id);
      const unitPrice = poItem?.unit_price || 0;

      // ── ACCEPTED: Add to inventory with weighted average cost ──
      if (item.jumlah_diterima > 0) {
        await addStockFromQC(supabase, {
          grnId: validated.grn_id,
          grnItemId: item.grn_item_id || "",
          bahanBakuId: item.bahan_baku_id,
          qtyAccepted: item.jumlah_diterima,
          unitPrice,
          userId: user.id,
        });
      }

      // ── REJECTED: Auto-create draft Return ──
      if (item.jumlah_ditolak > 0) {
        const { data: returnRecord, error: returnError } = await supabase
          .from("returns")
          .insert({
            goods_receipt_id: validated.grn_id,
            supplier_id: (grn.purchase_order as any)?.supplier_id || grn.purchase_order?.supplier_id,
            bahan_baku_id: item.bahan_baku_id,
            jumlah: item.jumlah_ditolak,
            satuan_id: poItem?.satuan_id || "", // might be missing
            alasan: item.alasan || "QC Ditolak",
            status: "pending",
            tanggal_pengembalian: null,
            catatan: `Auto-return dari QC GRN ${(grn as any).nomor_gr} — alasan: ${item.alasan || "tidak memenuhi standar"}`,
            created_by: user.id,
          })
          .select(`*, bahan_baku:bahan_baku_id(id, kode, nama)`)
          .single();

        if (returnError) {
          console.warn(`Failed to create return for bahan_baku ${item.bahan_baku_id}:`, returnError);
        } else {
          createdReturns.push(returnRecord);
        }
      }
    }

    // Update GRN totals and status
    const totalDiperiksa = validated.items.reduce((sum, i) => sum + i.jumlah_diperiksa, 0);
    const totalDiterima = validated.items.reduce((sum, i) => sum + i.jumlah_diterima, 0);
    const totalDitolak = validated.items.reduce((sum, i) => sum + i.jumlah_ditolak, 0);

    await supabase
      .from("goods_receipts")
      .update({
        total_item: totalDiperiksa,
        total_diterima: totalDiterima,
        total_ditolak: totalDitolak,
      })
      .eq("id", validated.grn_id);

    // Auto-update GRN status based on QC completion
    const { newStatus, isComplete } = await updateGRNStatusFromQC(supabase, validated.grn_id);

    // Update PO status based on what was received vs ordered
    await updatePOStatusFromReceipt(supabase, (grn.purchase_order as any).id, validated.grn_id);

    return successResponse(
      {
        grn_id: validated.grn_id,
        qc_inspections: createdQC,
        returns_created: createdReturns,
        grn_new_status: newStatus,
        totals: { diperiksa: totalDiperiksa, diterima: totalDiterima, ditolak: totalDitolak },
      },
      `QC submitted — ${createdReturns.length} return otomatis dibuat`
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error submitting QC:", error);
    return ApiError.server("Failed to submit QC").toResponse();
  }
}

// ============================================================
// Helper: Update PO status based on GRN receipts
// If all PO items fully received → RECEIVED
// If some received → PARTIAL
// ============================================================

async function updatePOStatusFromReceipt(
  supabase: SupabaseClient,
  poId: string,
  grnId: string
) {
  // Get all GRNs for this PO
  const { data: grns } = await supabase
    .from("goods_receipts")
    .select("id, status, total_diterima")
    .eq("purchase_order_id", poId)
    .eq("is_active", true);

  // Get PO items
  const { data: poItems } = await supabase
    .from("po_items")
    .select("id, bahan_baku_id, qty, qty_received")
    .eq("purchase_order_id", poId);

  if (!grns || !poItems) return;

  // Sum total received across all GRNs
  const totalReceived = grns.reduce((sum, grn) => sum + (grn.total_diterima || 0), 0);
  const totalOrdered = poItems.reduce((sum, item) => sum + (item.qty || 0), 0);

  let newStatus: "partial" | "received" = "partial";
  if (totalReceived >= totalOrdered) {
    newStatus = "received";
  }

  await supabase
    .from("purchase_orders")
    .update({ status: newStatus })
    .eq("id", poId);
}
