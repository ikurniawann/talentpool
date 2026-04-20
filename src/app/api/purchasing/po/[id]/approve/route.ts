// ============================================
// API ROUTE: /api/purchasing/po/[id]/approve
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/purchasing/po/:id/approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

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

    // Validasi status
    if (po.status !== "DRAFT") {
      return Response.json(
        { success: false, message: "PO hanya bisa diapprove saat status DRAFT" },
        { status: 400 }
      );
    }

    // Cek apakah PO punya items
    const { data: items } = await supabase
      .from("purchase_order_items")
      .select("id")
      .eq("purchase_order_id", id)
      .eq("is_active", true);

    if (!items || items.length === 0) {
      return Response.json(
        { success: false, message: "PO tidak memiliki item. Tambahkan item terlebih dahulu." },
        { status: 400 }
      );
    }

    // Update status ke APPROVED
    const { data, error } = await supabase
      .from("purchase_orders")
      .update({
        status: "APPROVED",
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({
      success: true,
      data,
      message: "PO berhasil diapprove",
    });
  } catch (error: any) {
    console.error("Error approving PO:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengapprove PO" },
      { status: 500 }
    );
  }
}
