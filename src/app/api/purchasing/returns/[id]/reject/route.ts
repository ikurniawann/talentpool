import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: {
    id: string;
  };
}

// PATCH /api/purchasing/returns/[id]/reject
// Reject a purchase return
export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  try {
    const supabase = await createClient();
    const returnId = params.id;
    const body = await request.json();
    const { rejection_reason, rejected_by } = body;

    if (!rejection_reason) {
      return NextResponse.json(
        { success: false, message: "Alasan penolakan wajib diisi" },
        { status: 400 }
      );
    }

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

    // Update return status to rejected
    const { data: updatedReturn, error: updateError } = await supabase
      .from("purchase_returns")
      .update({
        status: "rejected",
        rejection_reason,
        approved_by: rejected_by,
        approved_at: new Date().toISOString(),
      })
      .eq("id", returnId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: updatedReturn,
      message: "Return ditolak",
    });
  } catch (error: any) {
    console.error("Error rejecting return:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menolak return" },
      { status: 500 }
    );
  }
}
