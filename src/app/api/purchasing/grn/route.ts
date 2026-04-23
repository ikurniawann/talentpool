import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@/lib/api/auth";
import {
  generateGrnNumber,
  validateDeliveryCanReceive,
  calculateGrnTotals,
  updatePOItemReceivedQty,
  updateDeliveryStatusAfterGrn,
  updatePOStatusAfterGrn,
  GrnStatus,
} from "@/lib/purchasing/grn";
import { addInventoryFromGrn } from "@/lib/inventory";

// ============================================================
// Schemas
// ============================================================

const grnItemSchema = z.object({
  delivery_id: z.string().uuid().optional(),
  purchase_order_item_id: z.string().uuid().optional(),
  raw_material_id: z.string().uuid("Bahan baku wajib dipilih"),
  qty_diterima: z.number().min(0, "Qty diterima minimal 0"),
  qty_ditolak: z.number().min(0, "Qty ditolak minimal 0"),
  satuan_id: z.string().uuid().optional(),
  kondisi: z.enum(["baik", "rusak", "cacat"]).default("baik"),
  catatan: z.string().optional().nullable(),
});

const createGrnSchema = z.object({
  delivery_id: z.string().uuid("Delivery wajib dipilih"),
  tanggal_penerimaan: z.string().optional(),
  catatan: z.string().optional(),
  items: z.array(grnItemSchema).min(1, "Minimal 1 item wajib diisi"),
});

const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["pending", "partially_received", "received", "rejected"]).optional(),
  delivery_id: z.string().uuid().optional(),
  po_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

const updateGrnSchema = z.object({
  status: z.enum(["pending", "partially_received", "received", "rejected"]).optional(),
  catatan: z.string().optional(),
  items: z.array(grnItemSchema).optional(),
});

// ============================================================
// GET /api/purchasing/grn - List GRN
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole([
      "warehouse_staff",
      "warehouse_admin",
      "purchasing_admin",
      "purchasing_staff",
      "qc_staff",
      "admin",
    ]);
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const params = queryParamsSchema.parse(Object.fromEntries(searchParams));
    const { page, limit, search, status, delivery_id, po_id, date_from, date_to } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("grn")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (delivery_id) query = query.eq("delivery_id", delivery_id);
    if (po_id) query = query.eq("purchase_order_id", po_id);
    if (date_from) query = query.gte("tanggal_penerimaan", date_from);
    if (date_to) query = query.lte("tanggal_penerimaan", date_to);
    if (search) {
      query = query.or(`nomor_grn.ilike.%${search}%,no_surat_jalan.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Fetch related data for display
    const deliveryIds = [...new Set((data || []).map((d: any) => d.delivery_id).filter(Boolean))];
    const poIds = [...new Set((data || []).map((d: any) => d.purchase_order_id).filter(Boolean))];
    
    let deliveryMap = new Map();
    let poMap = new Map();
    
    if (deliveryIds.length > 0) {
      const { data: deliveryData } = await supabase
        .from("deliveries")
        .select("id, nomor_resi, no_resi")
        .in("id", deliveryIds);
      if (deliveryData) {
        deliveryMap = new Map(deliveryData.map((d: any) => [d.id, d.no_resi || d.nomor_resi]));
      }
    }
    
    if (poIds.length > 0) {
      const { data: poData } = await supabase
        .from("purchase_orders")
        .select("id, nomor_po")
        .in("id", poIds);
      if (poData) {
        poMap = new Map(poData.map((po: any) => [po.id, po.nomor_po]));
      }
    }

    // Fetch supplier names
    const supplierIds = [...new Set((data || []).map((d: any) => d.supplier_id).filter(Boolean))];
    let supplierMap = new Map();
    if (supplierIds.length > 0) {
      const { data: supplierData } = await supabase
        .from("suppliers")
        .select("id, nama_supplier")
        .in("id", supplierIds);
      if (supplierData) {
        supplierMap = new Map(supplierData.map((s: any) => [s.id, s.nama_supplier]));
      }
    }

    // Transform data
    const transformedData = (data || []).map((d: any) => ({
      id: d.id,
      nomor_grn: d.nomor_grn,
      delivery_id: d.delivery_id,
      delivery_number: deliveryMap.get(d.delivery_id) || d.delivery_id,
      po_id: d.purchase_order_id,
      po_number: poMap.get(d.purchase_order_id) || d.purchase_order_id,
      supplier_id: d.supplier_id,
      supplier_name: supplierMap.get(d.supplier_id) || "—",
      tanggal_penerimaan: d.tanggal_penerimaan,
      no_surat_jalan: d.no_surat_jalan,
      status: d.status,
      total_item_diterima: d.total_item_diterima,
      total_item_ditolak: d.total_item_ditolak,
      catatan: d.catatan,
      created_at: d.created_at,
    }));

    return paginatedResponse(
      transformedData,
      {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      "GRN list retrieved"
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error fetching GRN:", error);
    return ApiError.server("Failed to fetch GRN").toResponse();
  }
}

// ============================================================
// POST /api/purchasing/grn - Create GRN
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole([
      "warehouse_staff",
      "warehouse_admin",
      "purchasing_admin",
      "purchasing_staff",
      "admin",
    ]);
    const supabase = await createClient();
    // Use admin client to bypass RLS for all internal PO/delivery reads
    const adminSupabase = createAdminClient();

    const body = await request.json();
    const validated = createGrnSchema.parse(body);

    // Validate delivery can be received — use adminSupabase to bypass RLS
    const { valid, errors, delivery, items: poItems } = await validateDeliveryCanReceive(
      adminSupabase,
      validated.delivery_id
    );
    // Re-fetch PO items directly with adminSupabase to ensure we get data (bypass RLS)
    const { data: freshPoItems } = await adminSupabase
      .from("purchase_order_items")
      .select("id, raw_material_id, qty_ordered, qty_received")
      .eq("purchase_order_id", delivery.purchase_order_id)
      .eq("is_active", true);

    // Use freshPoItems as source of truth
    const effectivePoItems = freshPoItems || poItems || [];

    if (!valid && !errors.some(e => e.includes('status'))) {
      throw ApiError.badRequest(errors.join("; "));
    }

    // Generate GRN number
    const grnNumber = await generateGrnNumber(supabase);

    // Calculate totals
    const totals = calculateGrnTotals(validated.items);

    // Determine GRN status based on qty_diterima vs total qty_ordered
    // FIX Issue #1: Status based on received vs ordered, not on reject count
    const totalOrdered = effectivePoItems.reduce((s: number, i: any) => s + (i.qty_ordered || 0), 0);
    const totalReceived = effectivePoItems.reduce((s: number, i: any) => s + (i.qty_received || 0), 0);
    const newTotalReceived = totalReceived + totals.total_diterima;

    let grnStatus: GrnStatus = "pending";
    
    // Check if all items rejected (no good items at all)
    if (totals.total_diterima === 0 && totals.total_ditolak > 0) {
      grnStatus = "rejected"; // Semua ditolak, tidak ada yang bagus
    } 
    // Check if we've received enough (regardless of rejects)
    else if (totalOrdered > 0 && newTotalReceived >= totalOrdered) {
      grnStatus = "received"; // Sudah cukup yang diterima (bisa ada reject)
    } 
    // Check if we received some good items but not enough
    else if (totals.total_diterima > 0) {
      grnStatus = "partially_received"; // Ada yang diterima tapi belum cukup
    }
    // Otherwise stays pending (no good items received yet)

    // Create GRN record
    const insertData: any = {
      nomor_grn: grnNumber,
      delivery_id: validated.delivery_id,
      purchase_order_id: delivery.purchase_order_id,
      supplier_id: delivery.supplier_id,
      tanggal_penerimaan: validated.tanggal_penerimaan || new Date().toISOString().split("T")[0],
      no_surat_jalan: delivery.no_surat_jalan,
      catatan: validated.catatan || null,
      status: grnStatus,
      total_item_diterima: totals.total_diterima,
      total_item_ditolak: totals.total_ditolak,
      penerima_id: user.id,
      created_by: user.id,
    };

    const { data: grn, error: grnError } = await supabase
      .from("grn")
      .insert(insertData)
      .select()
      .single();

    if (grnError) {
      console.error("GRN insert error:", grnError);
      throw grnError;
    }

    // Create GRN items
    const grnItems = validated.items.map((item) => ({
      grn_id: grn.id,
      delivery_id: validated.delivery_id,
      purchase_order_item_id: item.purchase_order_item_id,
      raw_material_id: item.raw_material_id,
      qty_diterima: item.qty_diterima,
      qty_ditolak: item.qty_ditolak,
      satuan_id: item.satuan_id,
      kondisi: item.kondisi,
      catatan: item.catatan || null,
    }));

    const { error: itemsError } = await adminSupabase.from("grn_items").insert(grnItems);

    if (itemsError) {
      console.error("GRN items insert error:", itemsError);
      throw itemsError;
    }

    // Update PO item received quantities (adminSupabase bypasses RLS)
    for (const item of validated.items) {
      if (item.purchase_order_item_id) {
        const poItem = effectivePoItems.find((p: any) => p.id === item.purchase_order_item_id);
        if (poItem) {
          const newQty = (poItem.qty_received || 0) + item.qty_diterima;
          await updatePOItemReceivedQty(adminSupabase, item.purchase_order_item_id, newQty);
        } else {
          // Fallback: query item langsung
          const { data: directItem } = await adminSupabase
            .from("purchase_order_items")
            .select("id, qty_received")
            .eq("id", item.purchase_order_item_id)
            .single();
          if (directItem) {
            const newQty = (directItem.qty_received || 0) + item.qty_diterima;
              await updatePOItemReceivedQty(adminSupabase, item.purchase_order_item_id, newQty);
          } else {
            console.warn(`[GRN] PO item ${item.purchase_order_item_id} not found even with direct query`);
          }
        }
      } else {
        console.warn(`[GRN] item missing purchase_order_item_id for raw_material ${item.raw_material_id}`);
      }
    }

    // Update delivery status
    await updateDeliveryStatusAfterGrn(adminSupabase, validated.delivery_id, grnStatus);

    // Update PO status based on received quantities
    if (delivery?.purchase_order_id) {
      await updatePOStatusAfterGrn(adminSupabase, delivery.purchase_order_id);
    }

    // Update inventory untuk setiap item yang diterima
    for (const item of validated.items) {
      if (item.qty_diterima > 0) {
        const poItem = effectivePoItems.find((p: any) => p.id === item.purchase_order_item_id);
        const unitCost = poItem?.harga_satuan || 0;
        try {
          await addInventoryFromGrn(
            adminSupabase,
            item.raw_material_id,
            item.qty_diterima,
            unitCost,
            grn.id,
            grnNumber,
            user.id
          );
        } catch (invErr) {
          console.error("Inventory update error (non-fatal):", invErr);
        }
      }
    }

    return createdResponse(grn, `GRN ${grnNumber} berhasil dibuat`);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validation failed", error.issues).toResponse();
    }
    console.error("Error creating GRN:", error);
    return ApiError.server("Failed to create GRN").toResponse();
  }
}

// ============================================================
// PATCH /api/purchasing/grn - Update GRN (bulk update not supported)
// Use /api/purchasing/grn/[id] for single updates
// ============================================================

export async function PATCH() {
  return ApiError.badRequest("Use /api/purchasing/grn/[id] for updates").toResponse();
}
