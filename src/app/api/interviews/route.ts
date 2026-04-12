import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/interviews
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("interviews")
    .select("*, candidates(full_name, status), users(full_name)", { count: "exact" })
    .order("interview_date", { ascending: false });

  const candidate_id = searchParams.get("candidate_id");
  if (candidate_id) query = query.eq("candidate_id", candidate_id);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data, count });
}

// POST /api/interviews
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("interviews")
    .insert({
      candidate_id: body.candidate_id,
      interviewer_id: body.interviewer_id || userData.user?.id,
      interview_date: body.interview_date,
      type: body.type,
      scorecard: body.scorecard || null,
      recommendation: body.recommendation || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Update candidate status based on recommendation
  if (body.recommendation) {
    let newStatus: string | null = null;
    if (body.recommendation === "proceed") {
      newStatus = body.type === "hrd" ? "interview_manager" : "hired";
    } else if (body.recommendation === "pool") {
      newStatus = "talent_pool";
    } else if (body.recommendation === "reject") {
      newStatus = "rejected";
    }

    if (newStatus) {
      await supabase
        .from("candidates")
        .update({ status: newStatus })
        .eq("id", body.candidate_id);
    }
  }

  return NextResponse.json({ data }, { status: 201 });
}
