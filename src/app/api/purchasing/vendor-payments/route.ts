import { NextRequest, NextResponse } from "next/server";
import { createPgClient } from "@/lib/pg/create-client";
import {
  getApiUserScope,
  companyScopeOr,
  branchScopeOr,
} from "@/lib/api/scope";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const db = createPgClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = db
      .from("v_purchase_order_payments")
      .select("*")
      .order("next_due_date", { ascending: true, nullsFirst: false });

    const scope = await getApiUserScope();
    const companyOr = companyScopeOr(scope);
    if (companyOr) query = query.or(companyOr);
    const branchOr = branchScopeOr(scope);
    if (branchOr) query = query.or(branchOr);

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
