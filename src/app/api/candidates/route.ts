import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/candidates - List candidates
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("candidates")
    .select("*, brands(name), positions(title)", { count: "exact" })
    .order("created_at", { ascending: false });

  const status = searchParams.get("status");
  const brand_id = searchParams.get("brand_id");
  const search = searchParams.get("search");

  if (status) query = query.eq("status", status);
  if (brand_id) query = query.eq("brand_id", brand_id);
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data, count });
}

// POST /api/candidates - Create candidate
export async function POST(request: Request) {
  const supabase = await createClient();

  const body = await request.json();
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase.from("candidates").insert({
    full_name: body.full_name,
    email: body.email,
    phone: body.phone,
    domicile: body.domicile,
    source: body.source,
    position_id: body.position_id || null,
    brand_id: body.brand_id || null,
    notes: body.notes || null,
    cv_url: body.cv_url || null,
    photo_url: body.photo_url || null,
    status: "new",
    created_by: userData.user?.id || null,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
