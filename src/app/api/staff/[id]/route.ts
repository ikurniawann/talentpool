import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/staff/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("staff")
    .select("*, brands(name), positions(title), staff_sections(section_id, sections(name, color))")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// PATCH /api/staff/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("staff")
    .update({
      full_name: body.full_name,
      employee_code: body.employee_code,
      email: body.email,
      phone: body.phone,
      position_id: body.position_id,
      brand_id: body.brand_id,
      hire_date: body.hire_date,
      status: body.status,
      notes: body.notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/staff/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase.from("staff").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
