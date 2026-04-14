import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/dashboard/attention - Get candidates that need attention (stuck in same status too long)
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const brand_id = searchParams.get("brand_id");

  // Find candidates where status hasn't changed in 7+ days and status is not terminal
  let query = supabase
    .from("candidates")
    .select("*, positions(title, brand_id), brands(name)")
    .not("status", "in", "('hired','rejected','archived')")
    .lt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("updated_at", { ascending: true });

  if (brand_id) {
    query = query.eq("brand_id", brand_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Transform data to include computed fields
  const now = new Date();
  const candidates = (data || []).map((candidate: any) => {
    const updatedAt = new Date(candidate.updated_at);
    const daysInCurrentStatus = Math.floor(
      (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    let urgency: "red" | "amber" = "amber";
    if (daysInCurrentStatus > 14) {
      urgency = "red";
    }

    return {
      id: candidate.id,
      full_name: candidate.full_name,
      status: candidate.status,
      position_title: candidate.positions?.title || null,
      brand_name: candidate.brands?.name || null,
      days_in_current_status: daysInCurrentStatus,
      urgency,
    };
  });

  // Sort by days_in_current_status descending and take top 10
  const sortedCandidates = candidates
    .sort((a: any, b: any) => b.days_in_current_status - a.days_in_current_status)
    .slice(0, 10);

  return NextResponse.json({ data: sortedCandidates });
}
