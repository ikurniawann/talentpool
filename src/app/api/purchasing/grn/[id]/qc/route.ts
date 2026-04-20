import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("qc_inspections")
      .select(`
        *,
        inspected_by_user:inspected_by(id,email)
      `)
      .eq("grn_id", params.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error fetching QC inspection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch QC inspection" },
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

    // Check GRN status
    const { data: grn } = await supabase
      .from("goods_receipts")
      .select("status")
      .eq("id", params.id)
      .single();

    if (!grn) {
      return NextResponse.json(
        { error: "GRN not found" },
        { status: 404 }
      );
    }

    if (grn.status !== "DRAFT" && grn.status !== "QC_PENDING") {
      return NextResponse.json(
        { error: "GRN is not available for QC inspection" },
        { status: 400 }
      );
    }

    // Create QC inspection
    const { data: qc, error: qcError } = await supabase
      .from("qc_inspections")
      .insert({
        grn_id: params.id,
        ...body,
        inspected_at: new Date().toISOString(),
      })
      .select(`
        *,
        inspected_by_user:inspected_by(id,email)
      `)
      .single();

    if (qcError) throw qcError;

    // Update GRN status based on QC result
    let newStatus = "QC_PENDING";
    if (body.status === "APPROVED") newStatus = "QC_APPROVED";
    if (body.status === "REJECTED") newStatus = "QC_REJECTED";
    if (body.status === "PARTIAL") newStatus = "QC_APPROVED";

    await supabase
      .from("goods_receipts")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    return NextResponse.json({ data: qc });
  } catch (error: any) {
    console.error("Error creating QC inspection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create QC inspection" },
      { status: 500 }
    );
  }
}
