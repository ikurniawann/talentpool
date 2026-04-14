import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/dashboard/funnel - Get pipeline funnel data
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const brand_id = searchParams.get("brand_id");
  const period = searchParams.get("period") || "month";

  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "3month":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "6month":
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  let query = supabase
    .from("candidates")
    .select("status")
    .gte("created_at", startDate.toISOString());

  if (brand_id) {
    query = query.eq("brand_id", brand_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Count by status
  const statusCounts: Record<string, number> = {
    new: 0,
    screening: 0,
    interview_hrd: 0,
    interview_manager: 0,
    talent_pool: 0,
    hired: 0,
  };

  data?.forEach((candidate) => {
    if (candidate.status && statusCounts.hasOwnProperty(candidate.status)) {
      statusCounts[candidate.status]++;
    }
  });

  // Map to funnel stages
  const funnelStages = [
    { stage: "Applied", count: statusCounts.new },
    { stage: "Screening", count: statusCounts.screening },
    { stage: "Interview HRD", count: statusCounts.interview_hrd },
    { stage: "Interview Manager", count: statusCounts.interview_manager },
    { stage: "Talent Pool", count: statusCounts.talent_pool },
    { stage: "Hired", count: statusCounts.hired },
  ];

  return NextResponse.json(funnelStages);
}
