import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: {
    id: string;
  };
}

// PATCH /api/purchasing/returns/[id]/approve
// Approve a purchase return
export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  try {
    const supabase = await createClient();
    const returnId = params.id;
    const body = await request.json();
    const { approved_by } = body; // Staff ID who approves

    // Get current return data
    const { data: currentReturn, error: fetchError } = await supabase
      .from("purchase_returns")
      .select("*")
      .eq("id", returnId)
      .single();

    if (fetchError || !currentReturn) {
      return NextResponse.json(
        { success: false, message: "Return tidak ditemukan" },
        { status: 404 }
      );
    }

    if (currentReturn.status !== "pending_approval") {
      return NextResponse.json(
        { success: false, message: "Return tidak dalam status pending approval" },
        { status: 400 }
      );
    }

    // Update return status to approved
    const { data: updatedReturn, error: updateError } = await supabase
      .from("purchase_returns")
      .update({
        status: "approved",
        approved_by,
        approved_at: new Date().toISOString(),
      })
      .eq("id", returnId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Note: Inventory movement and GRN update are handled by database trigger
    // (trg_process_return_approval)

    return NextResponse.json({
      success: true,
      data: updatedReturn,
      message: "Return berhasil disetujui. Stock inventory telah disesuaikan.",
    });
  } catch (error: any) {
    console.error("Error approving return:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menyetujui return" },
      { status: 500 }
    );
  }
}
