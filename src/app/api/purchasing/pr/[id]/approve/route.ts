import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { getRequiredApprovalLevel, getNextPRStatus } from "@/lib/purchasing/utils";
import { z } from "zod";

const approvalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await requireUser();

    const body = await request.json();
    const validated = approvalSchema.parse(body);

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

    // Check if PR is still pending
    if (
      pr.status === "approved" ||
      pr.status === "rejected" ||
      pr.status === "converted"
    ) {
      return NextResponse.json(
        { error: "PR sudah final" },
        { status: 400 }
      );
    }

    // Authorization check
    const canApprove = () => {
      if (pr.status === "pending_head") {
        return (
          user.role === "hrd" ||
          user.role === "purchasing_manager" ||
          user.role === "direksi"
        );
      }
      if (pr.status === "pending_finance") {
        return user.role === "finance_staff" || user.role === "direksi";
      }
      if (pr.status === "pending_direksi") {
        return user.role === "direksi";
      }
      return false;
    };

    if (!canApprove()) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk melakukan approval" },
        { status: 403 }
      );
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (validated.action === "approve") {
      // Set approval based on current status
      if (pr.status === "pending_head") {
        updates.approved_by_head = user.id;
        updates.approved_at_head = new Date().toISOString();
      } else if (pr.status === "pending_finance") {
        updates.approved_by_finance = user.id;
        updates.approved_at_finance = new Date().toISOString();
      } else if (pr.status === "pending_direksi") {
        updates.approved_by_direksi = user.id;
        updates.approved_at_direksi = new Date().toISOString();
      }

      // Determine next status based on amount
      const approvalInfo = getRequiredApprovalLevel(pr.total_amount);
      const nextStatus = getNextPRStatus(pr.status, pr.total_amount);
      updates.status = nextStatus;
      updates.current_approval_level =
        nextStatus === "approved" ? null : approvalInfo.level;
    } else {
      // Reject
      updates.status = "rejected";
      updates.rejected_by = user.id;
      updates.rejected_at = new Date().toISOString();
      updates.rejection_reason = validated.reason || null;
    }

    const { data: updatedPR, error: updateError } = await supabase
      .from("purchase_requests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ data: updatedPR });
  } catch (error) {
    console.error("Error in PR approval:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Gagal memproses approval" },
      { status: 500 }
    );
  }
}
