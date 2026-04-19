import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import { formatRupiah } from "@/lib/purchasing/utils";

// GET /api/purchasing/reports/supplier-performance

const querySchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  vendor_id: z.string().uuid().optional(),
  export: z.enum(["json", "csv"]).default("json"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_manager", "purchasing_staff"]);
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));
    const { date_from, date_to, vendor_id, export: exportFormat } = params;

    // Fetch vendors with their PO stats
    let vendorQuery = supabase
      .from("vendors")
      .select(
        `
        id, nama, code, contact_person, telepon, email,
        is_active
      `
      )
      .eq("is_active", true);

    if (vendor_id) vendorQuery = vendorQuery.eq("id", vendor_id);

    const { data: vendors, error: vendorError } = await vendorQuery;

    if (vendorError) throw vendorError;

    // For each vendor, fetch PO stats
    const vendorStats = await Promise.all(
      (vendors || []).map(async (vendor: any) => {
        // PO stats
        let poQuery = supabase
          .from("purchase_orders")
          .select("id, status, total_amount, tanggal_po")
          .eq("vendor_id", vendor.id);

        if (date_from) poQuery = poQuery.gte("tanggal_po", date_from);
        if (date_to) poQuery = poQuery.lte("tanggal_po", date_to);

        const { data: pos } = await poQuery;

        const totalPO = pos?.length || 0;
        const approvedPO = pos?.filter((p) => p.status === "received" || p.status === "closed").length || 0;
        const totalSpent = (pos || []).reduce((sum, p) => sum + (p.total_amount || 0), 0);
        const avgPOValue = totalPO > 0 ? totalSpent / totalPO : 0;

        // On-time delivery rate (from GRN)
        const { data: grns } = await supabase
          .from("goods_receipts")
          .select("id, tanggal_terima, po_id")
          .not("po_id", "is", null)
          .contains("vendor_id", [vendor.id]);

        // Count GRN items with QC
        const { data: qcData } = await supabase
          .from("qc_inspections")
          .select("id, status, jumlah_qc, jumlah_reject, goods_receipt_id")
          .in(
            "goods_receipt_id",
            (grns || []).map((g) => g.id)
          );

        const totalQC = qcData?.length || 0;
        const totalReject = (qcData || []).reduce((sum, q) => sum + (q.jumlah_reject || 0), 0);
        const rejectRate = totalQC > 0 ? (totalReject / totalQC) * 100 : 0;

        // On-time: GRN arrived <= PO expected date
        const { data: deliveryData } = await supabase
          .from("delivery_items")
          .select("id, po_id, received_date, po_item:po_item_id(purchase_order:tanggal_diterima)")
          .in("po_id", (pos || []).map((p) => p.id));

        const onTimeCount = (deliveryData || []).filter(
          (d: any) =>
            d.received_date &&
            new Date(d.received_date) <= new Date(d.po_item?.purchase_order || 0)
        ).length;

        const onTimeRate =
          (pos || []).filter((p) => p.status === "received" || p.status === "closed").length > 0
            ? (onTimeCount /
                ((pos || []).filter((p) => p.status === "received" || p.status === "closed").length)) *
              100
            : null;

        return {
          vendor_id: vendor.id,
          vendor_name: vendor.nama,
          vendor_code: vendor.code,
          contact_person: vendor.contact_person,
          telepon: vendor.telepon,
          email: vendor.email,
          total_po: totalPO,
          approved_po: approvedPO,
          total_spent: Math.round(totalSpent * 100) / 100,
          total_spent_formatted: formatRupiah(totalSpent),
          avg_po_value: Math.round(avgPOValue * 100) / 100,
          on_time_delivery_rate: onTimeRate !== null ? Math.round(onTimeRate * 10) / 10 : null,
          reject_rate: Math.round(rejectRate * 100) / 100,
          quality_score:
            rejectRate === 0
              ? 100
              : rejectRate < 5
              ? 80
              : rejectRate < 10
              ? 60
              : 40,
        };
      })
    );

    // Sort by total_spent desc
    vendorStats.sort((a, b) => b.total_spent - a.total_spent);

    // Add rank
    const ranked = vendorStats.map((v, i) => ({ ...v, rank: i + 1 }));

    if (exportFormat === "csv") {
      const header =
        "Rank,Vendor Code,Vendor Name,Contact,Phone,Email,Total PO,Approved PO,Total Spent,Avg PO Value,On-Time Rate %,Reject Rate %,Quality Score\n";
      const rows = ranked
        .map(
          (v: any) =>
            `${v.rank},${v.vendor_code || ""},"${v.vendor_name || ""}","${v.contact_person || ""}","${v.telepon || ""}","${v.email || ""}",${v.total_po},${v.approved_po},${v.total_spent},${v.avg_po_value},${v.on_time_delivery_rate || ""},${v.reject_rate},${v.quality_score}`
        )
        .join("\n");

      return new NextResponse(header + rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="supplier-performance-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return successResponse({
      summary: {
        total_vendors: ranked.length,
        period: { from: date_from, to: date_to },
        top_vendor: ranked[0]?.vendor_name || null,
        total_spend_all_vendors: ranked.reduce((sum, v) => sum + v.total_spent, 0),
      },
      vendors: ranked,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Invalid query params", error.issues).toResponse();
    }
    console.error("Error generating supplier performance:", error);
    return ApiError.server("Failed to generate report").toResponse();
  }
}
