import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/staff-schedules
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const staff_id = searchParams.get("staff_id");

  let query = supabase
    .from("staff_schedules")
    .select("*", { count: "exact" })
    .order("day_of_week", { ascending: true });

  if (staff_id) query = query.eq("staff_id", staff_id);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data, count });
}

// POST /api/staff-schedules - Create schedule
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  // If posting multiple schedules at once (bulk)
  if (Array.isArray(body.schedules)) {
    const { data, error } = await supabase
      .from("staff_schedules")
      .insert(body.schedules)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data }, { status: 201 });
  }

  // Single schedule
  const { data, error } = await supabase
    .from("staff_schedules")
    .insert({
      staff_id: body.staff_id,
      day_of_week: body.day_of_week,
      start_time: body.start_time,
      end_time: body.end_time,
      is_off: body.is_off || false,
      effective_from: body.effective_from || new Date().toISOString().split("T")[0],
      effective_to: body.effective_to || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// DELETE /api/staff-schedules?staff_id=xxx
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const staff_id = searchParams.get("staff_id");

  if (!staff_id) {
    return NextResponse.json({ error: "staff_id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("staff_schedules")
    .delete()
    .eq("staff_id", staff_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
