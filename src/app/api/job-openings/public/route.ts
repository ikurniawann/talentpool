import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    // Use service role key for server-side access (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabase
      .from("job_openings")
      .select(`
        id,
        position_id,
        brand_id,
        department_id,
        title,
        slug,
        department,
        location,
        employment_type,
        work_mode,
        headcount,
        description,
        requirements,
        benefits,
        closing_date,
        published_at,
        created_at,
        updated_at,
        brand:brands (
          id,
          name
        ),
        position:positions (
          id,
          title,
          department,
          level
        )
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Job openings query error:", error);
      return NextResponse.json(
        { data: [], error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    console.error("Job openings API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { data: [], error: `Failed to fetch job openings: ${message}` },
      { status: 500 }
    );
  }
}
