import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/positions
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("positions")
    .select("*, brands(name)", { count: "exact" })
    .order("title");

  const brand_id = searchParams.get("brand_id");
  if (brand_id) query = query.eq("brand_id", brand_id);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data, count });
}

// POST /api/positions
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("positions")
    .insert({
      brand_id: body.brand_id,
      title: body.title,
      department: body.department || "Operations",
      level: body.level || "Staff",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
