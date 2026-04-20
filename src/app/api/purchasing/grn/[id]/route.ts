import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("goods_receipts")
      .select(`
        *,
        po:po_id(*,supplier:supplier_id(*)),
        delivery:delivery_id(*),
        received_by_user:received_by(id,email),
        items:goods_receipt_items(*,raw_material:raw_material_id(*),satuan:satuan_id(*))
      `)
      .eq("id", params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "GRN not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error fetching GRN:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch GRN" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("goods_receipts")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error updating GRN:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update GRN" },
      { status: 500 }
    );
  }
}

// Complete GRN - Finalize and update inventory
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { action } = await request.json();

    if (action === "complete") {
      // Update GRN status to COMPLETED
      const { data, error } = await supabase
        .from("goods_receipts")
        .update({
          status: "COMPLETED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)
        .eq("status", "QC_APPROVED")
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error completing GRN:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete GRN" },
      { status: 500 }
    );
  }
}
