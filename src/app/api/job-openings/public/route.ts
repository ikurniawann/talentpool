import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("job_openings")
    .select("id, position_id, brand_id, department_id, title, slug, department, location, employment_type, work_mode, headcount, description, requirements, benefits, closing_date, brand:brands(id, name), position:positions(id, title, department, level), department_ref:departments(id, name, code)")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ data: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
