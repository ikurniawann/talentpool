import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const poId = searchParams.get("po_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("deliveries")
      .select(`
        *,
        po:nomor_po,status,
        supplier:supplier_id(id,kode,nama_supplier)
      `, { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (poId) query = query.eq("po_id", poId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error("Error fetching deliveries:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch deliveries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get PO details for supplier_id
    const { data: po } = await supabase
      .from("purchase_orders")
      .select("supplier_id")
      .eq("id", body.po_id)
      .single();

    if (!po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("deliveries")
      .insert({
        ...body,
        supplier_id: po.supplier_id,
        status: "IN_TRANSIT",
      })
      .select(`
        *,
        po:nomor_po,status,
        supplier:supplier_id(id,kode,nama_supplier)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error creating delivery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create delivery" },
      { status: 500 }
    );
  }
}
