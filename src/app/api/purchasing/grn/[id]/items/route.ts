import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("goods_receipt_items")
      .select(`
        *,
        raw_material:raw_material_id(*),
        satuan:satuan_id(*),
        po_item:po_item_id(*)
      `)
      .eq("grn_id", params.id)
      .order("created_at");

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error("Error fetching GRN items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch GRN items" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate GRN status
    const { data: grn } = await supabase
      .from("goods_receipts")
      .select("status")
      .eq("id", params.id)
      .single();

    if (!grn || grn.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot add items to non-draft GRN" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("goods_receipt_items")
      .insert({
        ...body,
        grn_id: params.id,
      })
      .select(`
        *,
        raw_material:raw_material_id(*),
        satuan:satuan_id(*)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error creating GRN item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create GRN item" },
      { status: 500 }
    );
  }
}
