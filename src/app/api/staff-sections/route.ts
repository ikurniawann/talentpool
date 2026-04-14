import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/staff-sections
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const staff_id = searchParams.get("staff_id");
  const section_id = searchParams.get("section_id");

  let query = supabase
    .from("staff_sections")
    .select("*, staff(full_name, employee_code), sections(name, code, color)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (staff_id) query = query.eq("staff_id", staff_id);
  if (section_id) query = query.eq("section_id", section_id);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data, count });
}

// POST /api/staff-sections - Assign staff to section
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  // Bulk assign
  if (Array.isArray(body.assignments)) {
    const { data, error } = await supabase
      .from("staff_sections")
      .upsert(body.assignments, { onConflict: "staff_id,section_id" })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data }, { status: 201 });
  }

  // Single assign
  const { data, error } = await supabase
    .from("staff_sections")
    .upsert({
      staff_id: body.staff_id,
      section_id: body.section_id,
      is_primary: body.is_primary || false,
    }, { onConflict: "staff_id,section_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// DELETE /api/staff-sections?staff_id=xxx&section_id=yyy
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const staff_id = searchParams.get("staff_id");
  const section_id = searchParams.get("section_id");

  if (!staff_id || !section_id) {
    return NextResponse.json({ error: "staff_id and section_id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("staff_sections")
    .delete()
    .eq("staff_id", staff_id)
    .eq("section_id", section_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
