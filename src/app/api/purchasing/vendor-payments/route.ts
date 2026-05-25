import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service-client";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("v_purchase_order_payments")
      .select("*")
      .order("next_due_date", { ascending: true, nullsFirst: false });

    if (status && status !== "all") query = query.eq("payment_status", status);
    if (search) query = query.or(`nomor_po.ilike.%${search}%,nama_supplier.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: unknown) {
    console.error("Error fetching vendor payments:", error);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, "Gagal mengambil pembayaran vendor") },
      { status: 500 }
    );
  }
}
