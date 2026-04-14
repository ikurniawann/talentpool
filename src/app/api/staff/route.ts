import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/staff - List staff
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("staff")
    .select("*, brands(name), positions(title), staff_sections(section_id, sections(name, color))", { count: "exact" })
    .order("created_at", { ascending: false });

  const brand_id = searchParams.get("brand_id");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  if (brand_id) query = query.eq("brand_id", brand_id);
  if (status) query = query.eq("status", status);
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,employee_code.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data, count });
}

// POST /api/staff - Create staff
export async function POST(request: Request) {
  const supabase = await createClient();

  const body = await request.json();

  const { data, error } = await supabase
    .from("staff")
    .insert({
      full_name: body.full_name,
      employee_code: body.employee_code,
      email: body.email || null,
      phone: body.phone || null,
      position_id: body.position_id || null,
      brand_id: body.brand_id,
      hire_date: body.hire_date,
      status: body.status || "active",
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
