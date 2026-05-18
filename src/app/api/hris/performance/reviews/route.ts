import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const performanceReviewSchema = z.object({
  employee_id: z.string().uuid(),
  period_label: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["draft", "submitted", "reviewed", "finalized"]).optional().default("finalized"),
  reviewer_name: z.string().optional(),
  reviewer_position: z.string().optional(),
  kpi_template_id: z.string().uuid().optional().nullable(),
  total_work_result_score: z.number().optional().default(0),
  total_behavioral_score: z.number().optional().default(0),
  total_project_score: z.number().optional().default(0),
  grand_total_score: z.number().optional().default(0),
  category: z.string().optional(),
  reviewee_sign_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  reviewer_sign_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  employee_sign_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const employeeKpiSchema = z.object({
  template_item_id: z.string().uuid().optional().nullable(),
  perspective: z.string(),
  kpi_name: z.string(),
  kpi_definition: z.string().optional(),
  target_text: z.string().optional(),
  target_value: z.number(),
  actual_value: z.number().optional().default(0),
  weight: z.number(),
  measurement_unit: z.string(),
  frequency: z.string(),
  score: z.number().optional().default(0),
  score_label: z.string().optional().default("Meet Expectation"),
  achievement_percentage: z.number().optional().default(0),
  weighted_score: z.number().optional().default(0),
  actual_quality: z.number().optional().default(100),
  actual_quantity: z.number().optional().default(100),
  actual_timeliness: z.number().optional().default(100),
  reviewer_notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get("employee_id");
    const period_label = searchParams.get("period_label");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("performance_reviews")
      .select(
        `*,
        employee:employees!employee_id(id, full_name, department:departments(name)),
        reviewer:employees!reviewer_id(id, full_name),
        manager:employees!manager_id(id, full_name)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (employee_id) {
      query = query.eq("employee_id", employee_id);
    }
    if (period_label) {
      query = query.eq("period_label", period_label);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      meta: {
        total: count || 0,
        limit,
        offset,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, behavioral_items, development_data, ...reviewData } = body;
    const workResultScore = Array.isArray(items)
      ? items.reduce((sum: number, item: any) => sum + ((Number(item.score) || 0) * (Number(item.weight) || 0)), 0)
      : 0;
    const behavioralScore = Array.isArray(behavioral_items)
      ? behavioral_items.reduce((sum: number, item: any) => sum + ((Number(item.score) || 0) * (Number(item.weight) || 0)), 0)
      : 0;
    const projectScore = Number(reviewData.total_project_score || 0);
    const calculatedReviewData = {
      ...reviewData,
      total_work_result_score: workResultScore,
      total_behavioral_score: behavioralScore,
      total_project_score: projectScore,
      grand_total_score: workResultScore + behavioralScore + projectScore,
    };
    
    const result = performanceReviewSchema.safeParse(calculatedReviewData);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();
    const rollbackReview = async (reviewId: string) => {
      await supabase.from("performance_reviews").delete().eq("id", reviewId);
    };

    const { data: review, error: reviewError } = await supabase
      .from("performance_reviews")
      .insert(result.data)
      .select()
      .single();

    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }

    if (items && Array.isArray(items) && items.length > 0) {
      const itemResults = items.map((item: any) =>
        employeeKpiSchema.safeParse({
          ...item,
          template_item_id: item.template_item_id || item.id || null,
          target_value: Number(item.target_value || 0),
          actual_value: Number(item.actual_value || 0),
          weight: Number(item.weight || 0),
          score: Number(item.score || 0),
          achievement_percentage: Number(item.achievement_percentage || 0),
          weighted_score: (Number(item.score) || 0) * (Number(item.weight) || 0),
          actual_quality: Number(item.actual_quality || 100),
          actual_quantity: Number(item.actual_quantity || 100),
          actual_timeliness: Number(item.actual_timeliness || 100),
        })
      );
      const invalidItem = itemResults.find((itemResult) => !itemResult.success);
      if (invalidItem && !invalidItem.success) {
        await rollbackReview(review.id);
        return NextResponse.json(
          { error: "KPI item validation failed", issues: invalidItem.error.issues },
          { status: 400 }
        );
      }

      const kpisToInsert = items.map((item: any) => ({
        review_id: review.id,
        employee_id: result.data.employee_id,
        template_item_id: item.template_item_id || item.id || null,
        perspective: item.perspective,
        kpi_name: item.kpi_name,
        kpi_definition: item.kpi_definition || "",
        target_text: item.target_text || item.target || "",
        target_value: Number(item.target_value || 0),
        actual_value: item.actual_value || 0,
        weight: Number(item.weight || 0),
        measurement_unit: item.measurement_unit || "%",
        frequency: item.frequency || "Monthly",
        achievement_percentage: Number(item.achievement_percentage || 0),
        score: Number(item.score || 0),
        score_label: item.score_label || "Meet Expectation",
        weighted_score: (Number(item.score) || 0) * (Number(item.weight) || 0),
        quality_actual: Number(item.actual_quality || item.quality_actual || 100),
        quantity_actual: Number(item.actual_quantity || item.quantity_actual || 100),
        timeliness_actual: Number(item.actual_timeliness || item.timeliness_actual || 100),
        reviewer_notes: item.reviewer_notes || "",
      }));

      const { error: kpiError } = await supabase
        .from("employee_kpis")
        .insert(kpisToInsert);

      if (kpiError) {
        console.error("Error inserting KPIs:", kpiError);
        await rollbackReview(review.id);
        return NextResponse.json({ error: kpiError.message }, { status: 500 });
      }
    }

    if (behavioral_items && Array.isArray(behavioral_items) && behavioral_items.length > 0) {
      const behavioralRows = behavioral_items.map((item: any, index: number) => ({
        review_id: review.id,
        template_behavioral_id: item.template_behavioral_id || null,
        employee_id: result.data.employee_id,
        value_name: item.value_name,
        competency: item.competency || "",
        behavioral_standard: item.behavioral_standard || "",
        score_5_description: item.score_5_description || "",
        score_4_description: item.score_4_description || "",
        score_3_description: item.score_3_description || "",
        score_2_description: item.score_2_description || "",
        score_1_description: item.score_1_description || "",
        weight: Number(item.weight || 0),
        score: item.score || null,
        weighted_score: item.score ? (Number(item.score) * Number(item.weight || 0)) : 0,
        notes: item.notes || "",
        item_order: index + 1,
      }));

      const { error: behError } = await supabase
        .from("behavioral_review_items")
        .insert(behavioralRows);

      if (behError) {
        console.error("Error inserting behavioral items:", behError);
        await rollbackReview(review.id);
        return NextResponse.json({ error: behError.message }, { status: 500 });
      }
    }

    if (development_data && Array.isArray(development_data) && development_data.length > 0) {
      const devToInsert = development_data.map((dev: any) => ({
        review_id: review.id,
        employee_id: result.data.employee_id,
        competency_area: dev.supported_kpi || dev.type || "Development",
        development_action: dev.notes || dev.type || "Development plan",
        target_completion_date: /^\d{4}-\d{2}-\d{2}$/.test(dev.timeframe || "") ? dev.timeframe : null,
        resources_required: [dev.parties, dev.timeframe && !/^\d{4}-\d{2}-\d{2}$/.test(dev.timeframe) ? dev.timeframe : ""]
          .filter(Boolean)
          .join(" · "),
        progress_percentage: 0,
        status: "planned",
        notes: dev.notes,
      }));

      const { error: devError } = await supabase
        .from("development_plans")
        .insert(devToInsert);

      if (devError) {
        console.error("Error inserting development plans:", devError);
        await rollbackReview(review.id);
        return NextResponse.json({ error: devError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ data: review }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = performanceReviewSchema.partial().safeParse(updateData);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("performance_reviews")
      .update(result.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { error } = await supabase.from("performance_reviews").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Performance review deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
