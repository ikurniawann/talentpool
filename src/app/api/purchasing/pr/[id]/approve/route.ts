import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const approvalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

type PRApprovalUpdate = {
  updated_at: string;
  status?: "approved" | "rejected";
  current_approval_level?: string | null;
  approved_by_head?: string;
  approved_at_head?: string;
  approved_by_finance?: string;
  approved_at_finance?: string;
  approved_by_direksi?: string;
  approved_at_direksi?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string | null;
};

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
          user.role === "purchasing_admin" ||
          user.role === "super_admin" ||
          user.role === "admin" ||
          user.role === "pos_supervisor" ||
          user.role === "direksi"
        );
      }
      return false;
    };

    if (!canApprove()) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk melakukan approval" },
        { status: 403 }
      );
    }

    const updates: PRApprovalUpdate = {
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

      updates.status = "approved";
      updates.current_approval_level = null;
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
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Gagal memproses approval" },
      { status: 500 }
    );
  }
}
