import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { getRequiredApprovalLevel, getNextPRStatus } from "@/lib/purchasing/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await requireUser();

    // Fetch PR
    const { data: pr, error: prError } = await supabase
      .from("purchase_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (prError || !pr) {
      return NextResponse.json(
        { error: "PR tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check ownership
    if (pr.requester_id !== user.id) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses" },
        { status: 403 }
      );
    }

    // Only draft can be submitted
    if (pr.status !== "draft") {
      return NextResponse.json(
        { error: "Hanya PR dengan status draft yang bisa disubmit" },
        { status: 400 }
      );
    }

    // Calculate required approval level
    const approvalInfo = getRequiredApprovalLevel(pr.total_amount);
    const nextStatus = getNextPRStatus("draft", pr.total_amount);

    const updates: any = {
      status: nextStatus,
      current_approval_level: approvalInfo.level,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedPR, error: updateError } = await supabase
      .from("purchase_requests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ data: updatedPR });
  } catch (error) {
    console.error("Error submitting PR:", error);
    return NextResponse.json(
      { error: "Gagal submit PR" },
      { status: 500 }
    );
  }
}
