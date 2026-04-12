import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/brands
export async function GET() {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("brands")
    .select("*", { count: "exact" })
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data, count });
}

// POST /api/brands
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("brands")
    .insert({
      name: body.name,
      industry: body.industry || "F&B",
      logo_url: body.logo_url || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
