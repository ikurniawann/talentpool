import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const poId = searchParams.get("po_id");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("goods_receipts")
      .select(`
        *,
        po:po_id(nomor_po,status),
        delivery:delivery_id(nomor_delivery),
        received_by_user:received_by(id,email)
      `, { count: "exact" })
      .order("received_at", { ascending: false });

    if (poId) query = query.eq("po_id", poId);
    if (status) query = query.eq("status", status);

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
      },
    });
  } catch (error: any) {
    console.error("Error fetching GRN:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch GRN" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("goods_receipts")
      .insert({
        ...body,
        status: "DRAFT",
        received_at: new Date().toISOString(),
      })
      .select(`
        *,
        po:po_id(nomor_po,status,supplier_id)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error creating GRN:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create GRN" },
      { status: 500 }
    );
  }
}
