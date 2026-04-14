import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/dashboard/stats - Get dashboard summary stats
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const brand_id = searchParams.get("brand_id");

  // Start of current month for date comparisons
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Build base query with optional brand_id filter
  let candidatesQuery = supabase.from("candidates").select("id, status, created_at, updated_at", { count: "exact" });
  let positionsQuery = supabase.from("positions").select("id", { count: "exact" });

  if (brand_id) {
    candidatesQuery = candidatesQuery.eq("brand_id", brand_id);
    positionsQuery = positionsQuery.eq("brand_id", brand_id);
  }

  // Candidates this month
  const { count: candidatesThisMonth } = await candidatesQuery
    .gte("created_at", startOfMonth.toISOString());

  // Active pipeline (not hired, rejected, or archived)
  const { count: activePipeline } = await candidatesQuery
    .not("status", "in", "('hired','rejected','archived')");

  // Talent pool count
  const { count: talentPool } = await candidatesQuery
    .eq("status", "talent_pool");

  // Open positions
  const { count: openPositions } = await positionsQuery
    .eq("is_active", true);

  // Hired this month
  const { count: hiredThisMonth } = await candidatesQuery
    .eq("status", "hired")
    .gte("updated_at", startOfMonth.toISOString());

  return NextResponse.json({
    candidates_this_month: candidatesThisMonth ?? 0,
    active_pipeline: activePipeline ?? 0,
    talent_pool: talentPool ?? 0,
    open_positions: openPositions ?? 0,
    hired_this_month: hiredThisMonth ?? 0,
  });
}
