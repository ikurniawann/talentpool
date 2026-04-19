import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiRole,
  ApiError,
  successResponse,
} from "@/lib/api/auth";
import { formatRupiah } from "@/lib/purchasing/utils";

// GET /api/purchasing/reports/po-summary

const querySchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  vendor_id: z.string().uuid().optional(),
  status: z.string().optional(),
  export: z.enum(["json", "csv"]).default("json"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(["purchasing_admin", "purchasing_manager", "purchasing_staff"]);
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));
    const { date_from, date_to, vendor_id, status, export: exportFormat } = params;

    let query = supabase
      .from("purchase_orders")
      .select(
        `
        id, po_number, status, tanggal_po, tanggal_diterima,
        total_amount, mata_uang,
        vendor:vendor_id(id, nama, code),
        created_by_user:created_by(full_name),
        items:purchase_order_items(count)
      `,
        { count: "exact" }
      )
      .order("tanggal_po", { ascending: false });

    if (date_from) query = query.gte("tanggal_po", date_from);
    if (date_to) query = query.lte("tanggal_po", date_to);
    if (vendor_id) query = query.eq("vendor_id", vendor_id);
    if (status) query = query.eq("status", status);

    const { data: pos, error } = await query;

    if (error) throw error;

    // Group by status
    const byStatus: Record<string, { count: number; total: number }> = {};
    let grandTotal = 0;

    const summary = (pos || []).map((po: any) => {
      grandTotal += po.total_amount || 0;
      const statusKey = po.status || "unknown";
      if (!byStatus[statusKey]) byStatus[statusKey] = { count: 0, total: 0 };
      byStatus[statusKey].count++;
      byStatus[statusKey].total += po.total_amount || 0;

      return {
        po_number: po.po_number,
        vendor: po.vendor?.nama,
        vendor_code: po.vendor?.code,
        status: po.status,
        tanggal_po: po.tanggal_po,
        tanggal_diterima: po.tanggal_diterima,
        total_amount: po.total_amount,
        total_amount_formatted: formatRupiah(po.total_amount || 0),
        mata_uang: po.mata_uang,
        item_count: po.items?.[0]?.count || 0,
        created_by: po.created_by_user?.full_name,
      };
    });

    if (exportFormat === "csv") {
      const header = "PO Number,Vendor,Vendor Code,Status,Tanggal PO,Tanggal Diterima,Total Amount,Mata Uang,Item Count,Created By\n";
      const rows = summary
        .map(
          (po: any) =>
            `${po.po_number},"${po.vendor || ""}",${po.vendor_code || ""},${po.status},${po.tanggal_po || ""},${po.tanggal_diterima || ""},${po.total_amount},${po.mata_uang},${po.item_count},"${po.created_by || ""}"`
        )
        .join("\n");

      return new NextResponse(header + rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="po-summary-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return successResponse({
      summary: {
        total_po: pos?.length || 0,
        grand_total: Math.round(grandTotal * 100) / 100,
        grand_total_formatted: formatRupiah(grandTotal),
        by_status: Object.fromEntries(
          Object.entries(byStatus).map(([k, v]) => [
            k,
            { count: v.count, total: Math.round(v.total * 100) / 100 },
          ])
        ),
        period: { from: date_from, to: date_to },
      },
      purchase_orders: summary,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Invalid query params", error.issues).toResponse();
    }
    console.error("Error generating PO summary:", error);
    return ApiError.server("Failed to generate report").toResponse();
  }
}
