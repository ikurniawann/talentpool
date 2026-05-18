import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const behavioralSchema = z.object({
  employee_id: z.string().uuid(),
  review_period: z.string().min(1),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  caring_score: z.number().int().min(1).max(5).optional(),
  caring_notes: z.string().optional(),
  credible_score: z.number().int().min(1).max(5).optional(),
  credible_notes: z.string().optional(),
  competent_score: z.number().int().min(1).max(5).optional(),
  competent_notes: z.string().optional(),
  competitive_score: z.number().int().min(1).max(5).optional(),
  competitive_notes: z.string().optional(),
  customer_delight_score: z.number().int().min(1).max(5).optional(),
  customer_delight_notes: z.string().optional(),
  weight: z.number().min(0).max(100).optional().default(20),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get("employee_id");
    const review_period = searchParams.get("review_period");

    let query = supabase
      .from("behavioral_assessments")
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
    const result = behavioralSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("behavioral_assessments")
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
