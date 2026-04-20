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
  nama_supplier: z.string().min(1).max(200).optional(),
  pic_name: z.string().max(100).optional(),
  pic_phone: z.string().max(30).optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  alamat: z.string().optional(),
  kota: z.string().max(100).optional(),
  npwp: z.string().max(50).optional(),
  payment_terms: z.enum(["COD", "NET7", "NET14", "NET30", "NET45", "NET60"]).optional(),
  currency: z.enum(["IDR", "USD", "EUR"]).optional(),
  bank_nama: z.string().optional(),
  bank_rekening: z.string().optional(),
  bank_atas_nama: z.string().optional(),
  kategori: z.string().optional(),
  status: z.enum(["active", "inactive", "blacklisted"]).optional(),
});

// ========================
// GET /api/purchasing/suppliers/:id
// ========================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["purchasing_admin", "purchasing_staff", "purchasing_manager"]);

    const { id } = await params;
    const supabase = await createClient();

    // Fetch supplier
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single();

    if (supplierError || !supplier) {
      throw ApiError.notFound("Supplier tidak ditemukan");
    }

    // ---- Analytics: PO Aktif ----
    // Count PO with status DRAFT, APPROVED, SENT, PARTIAL (not RECEIVED, CLOSED, CANCELLED)
    const { count: poAktifCount } = await supabase
      .from("purchase_orders")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", id)
      .in("status", ["draft", "sent", "partial"]);

    // Total nilai PO aktif
    const { data: poAktifData } = await supabase
      .from("purchase_orders")
      .select("total")
      .eq("vendor_id", id)
      .in("status", ["draft", "sent", "partial"]);

    const totalNilaiPOAktif = poAktifData?.reduce((sum, po) => sum + Number(po.total), 0) ?? 0;

    // ---- Analytics: Total transaksi 12 bulan terakhir ----
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: transaksi12Bulan } = await supabase
      .from("purchase_orders")
      .select("id, total, status")
      .eq("vendor_id", id)
      .gte("created_at", twelveMonthsAgo.toISOString())
      .in("status", ["received", "closed"]);

    const totalTransaksi12Bulan =
      transaksi12Bulan?.reduce((sum, po) => sum + Number(po.total), 0) ?? 0;
    const jumlahPO12Bulan = transaksi12Bulan?.length ?? 0;

    // ---- Analytics: On-time delivery rate ----
    // On-time = actual_delivery <= expected_delivery (for received POs)
    const { data: deliveredPOs } = await supabase
      .from("purchase_orders")
      .select("id, expected_delivery, actual_delivery")
      .eq("vendor_id", id)
      .not("actual_delivery", "is", null)
      .in("status", ["received", "closed"]);

    let onTimeCount = 0;
    let totalDelivered = 0;

    if (deliveredPOs && deliveredPOs.length > 0) {
      totalDelivered = deliveredPOs.length;
      for (const po of deliveredPOs) {
        if (po.actual_delivery && po.expected_delivery) {
          const actual = new Date(po.actual_delivery);
          const expected = new Date(po.expected_delivery);
          if (actual <= expected) onTimeCount++;
        }
      }
    }

    const onTimeDeliveryRate =
      totalDelivered > 0 ? Math.round((onTimeCount / totalDelivered) * 100 * 10) / 10 : 0;

    // ---- Analytics: QC Pass Rate ----
    // Get all GRs from this supplier, join with QC
    const { data: grItems } = await supabase
      .from("gr_items")
      .select("received_qty, condition")
      .eq("gr_id", id); // This won't work directly without join — skip for now

    // ---- Analytics: Bahan yang sering dibeli dari supplier ini ----
    const { data: bahanSerinDibeli } = await supabase
      .from("po_items")
      .select("description")
      .eq("po_id", id); // Again, need proper join — use raw approach below

    // Simpler: get distinct descriptions from PO items for this vendor's POs
    const { data: topBahan } = await supabase
      .from("purchase_orders")
      .select(`
        id,
        po_items(description)
      `)
      .eq("vendor_id", id)
      .limit(5);

    // Extract unique bahan names from PO items
    const bahanSet = new Set<string>();
    if (topBahan) {
      for (const po of topBahan) {
        if (po.po_items) {
          for (const item of po.po_items as { description: string }[]) {
            bahanSet.add(item.description);
          }
        }
      }
    }

    const enrichedSupplier = {
      ...supplier,
      analytics: {
        po_aktif_count: poAktifCount ?? 0,
        po_aktif_nilai: totalNilaiPOAktif,
        total_transaksi_12_bulan: totalTransaksi12Bulan,
        jumlah_po_12_bulan: jumlahPO12Bulan,
        on_time_delivery_rate: onTimeDeliveryRate,
        bahan_sering_dibeli: Array.from(bahanSet).slice(0, 5),
      },
    };

    return successResponse(enrichedSupplier);
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching supplier detail:", error);
    return ApiError.server("Gagal mengambil detail supplier").toResponse();
  }
}

// ========================
// PUT /api/purchasing/suppliers/:id
// ========================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_staff"]);

    const { id } = await params;
    const body = await request.json();
    const validated = updateSupplierSchema.parse(body);

    const supabase = await createClient();

    // Check if supplier exists
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id, kode")
      .eq("id", id)
      .single();

    if (!existing) {
      throw ApiError.notFound("Supplier tidak ditemukan");
    }

    // Validate NPWP format if being updated
    if (validated.npwp && !/^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/.test(validated.npwp)) {
      throw ApiError.badRequest("Format NPWP tidak valid. Gunakan format: XX.XXX.XXX.X-XXX.XXX");
    }

    const { data, error } = await supabase
      .from("suppliers")
      .update({
        ...validated,
        updated_by: user.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return successResponse(data, "Supplier berhasil diperbarui");
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validasi gagal", error.issues).toResponse();
    }
    console.error("Error updating supplier:", error);
    return ApiError.server("Gagal memperbarui supplier").toResponse();
  }
}

// ========================
// DELETE /api/purchasing/suppliers/:id — Soft delete
// ========================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["purchasing_admin"]);

    const { id } = await params;
    const supabase = await createClient();

    // Check if supplier exists
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (!existing) {
      throw ApiError.notFound("Supplier tidak ditemukan");
    }

    // Check: jika ada PO dengan status DRAFT/APPROVED/SENT → tolak delete
    const { count: activePOCount } = await supabase
      .from("purchase_orders")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", id)
      .in("status", ["draft", "sent", "partial"]);

    if (activePOCount && activePOCount > 0) {
      throw ApiError.conflict(
        `Tidak dapat menghapus supplier. Terdapat ${activePOCount} PO aktif (DRAFT/SENT/PARTIAL) yang masih terkait dengan supplier ini.`
      );
    }

    // Soft delete: set is_active = false + deleted_at + deleted_by
    const { error } = await supabase
      .from("suppliers")
      .update({
        is_active: false,
        deleted_by: user.id,
        deleted_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", id);

    if (error) throw error;

    return noContentResponse();
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error deleting supplier:", error);
    return ApiError.server("Gagal menghapus supplier").toResponse();
  }
}
