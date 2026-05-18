import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const developmentPlanSchema = z.object({
  employee_id: z.string().uuid(),
  review_period: z.string().min(1),
  development_type: z.string().min(1),
  supported_kpi: z.string().optional(),
  involved_parties: z.string().optional(),
  execution_timeframe: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional().default("planned"),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get("employee_id");
    const review_period = searchParams.get("review_period");

    let query = supabase
      .from("development_plans")
      .select("*, employee:employees(id, full_name)")
      .order("created_at", { ascending: false });

    if (employee_id) {
      query = query.eq("employee_id", employee_id);
    }
    if (review_period) {
      query = query.eq("review_period", review_period);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = developmentPlanSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("development_plans")
      .insert(result.data)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
