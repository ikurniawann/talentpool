import { NextRequest, NextResponse } from "next/server";
import { createPgClient } from "@/lib/pg/create-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await createPgClient();

    const { data, error } = await db
      .from("performance_reviews")
      .select(
        `*,
        employee:employees(id, full_name, nip, department:departments(name)),
        reviewer:employees!reviewer_id(id, full_name),
        template:kpi_templates(id, template_name, department:departments(name), position:positions(title), applicable_period)`
      )
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Performance review not found" }, { status: 404 });
    }

    const { data: kpis } = await db
      .from("employee_kpis")
      .select("*")
      .eq("review_id", id)
      .order("created_at", { ascending: true });

    const { data: behavioral } = await db
      .from("behavioral_review_items")
      .select("*")
      .eq("review_id", id)
      .order("item_order", { ascending: true });

    const { data: developments } = await db
      .from("development_plans")
      .select("*")
      .eq("review_id", id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      data: {
        ...data,
        kpis: kpis || [],
        behavioral: behavioral || null,
        developments: developments || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await createPgClient();

    const { data, error } = await db
      .from("performance_reviews")
      .update(body)
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await createPgClient();

    const { error } = await db.from("performance_reviews").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Performance review deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
