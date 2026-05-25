import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, requireApiRole } from "@/lib/api/auth";

const convertSchema = z.object({
  supplier_id: z.string().uuid("Supplier wajib dipilih"),
  tanggal_po: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tanggal_kirim_estimasi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  catatan: z.string().optional().nullable(),
  alamat_pengiriman: z.string().optional().nullable(),
  diskon_persen: z.number().min(0).max(100).default(0),
  diskon_nominal: z.number().min(0).default(0),
  ppn_persen: z.number().min(0).max(100).default(11),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireApiRole([
      "purchasing_staff",
      "purchasing_manager",
      "purchasing_admin",
      "super_admin",
      "admin",
    ]);
    const body = await request.json();
    const payload = convertSchema.parse(body);
    const supabase = createAdminClient();

    const { data: poId, error: rpcError } = await supabase.rpc(
      "convert_purchase_request_to_po",
      {
        p_pr_id: id,
        p_supplier_id: payload.supplier_id,
        p_tanggal_po: payload.tanggal_po || new Date().toISOString().split("T")[0],
        p_tanggal_kirim_estimasi: payload.tanggal_kirim_estimasi || null,
        p_catatan: payload.catatan || null,
        p_alamat_pengiriman: payload.alamat_pengiriman || null,
        p_diskon_persen: payload.diskon_persen,
        p_diskon_nominal: payload.diskon_nominal,
        p_ppn_persen: payload.ppn_persen,
        p_created_by: user.id,
      }
    );

    if (rpcError) {
      throw ApiError.badRequest(rpcError.message);
    }

    const { data: po, error: poError } = await supabase
      .from("v_purchase_orders")
      .select("*")
      .eq("id", poId)
      .single();

    if (poError) throw poError;

    return NextResponse.json(
      {
        success: true,
        data: po,
        message: "PR berhasil dikonversi menjadi PO",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Validasi gagal", error.issues).toResponse();
    }
    console.error("Error converting PR to PO:", error);
    return ApiError.server("Gagal membuat PO dari PR").toResponse();
  }
}
