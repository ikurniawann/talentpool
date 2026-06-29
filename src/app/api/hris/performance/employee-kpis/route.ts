import { NextRequest, NextResponse } from "next/server";
import { createPgClient } from "@/lib/pg/create-client";

export async function GET(request: NextRequest) {
  try {
    const db = await createPgClient();
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get("employee_id");
    const period_label = searchParams.get("period_label");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = db
      .from("employee_kpis")
      .select("*, employee:employees(id, full_name, job_title)", { count: "exact" })
      .order("created_at", { ascending: true });

    if (employee_id) {
      query = query.eq("employee_id", employee_id);
    }
    if (period_label) {
      query = query.eq("period_label", period_label);
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
    const db = await createPgClient();

    const { data, error } = await db
      .from("employee_kpis")
      .insert(body)
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const db = await createPgClient();

    const { data, error } = await db
      .from("employee_kpis")
      .update(updateData)
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

    const db = await createPgClient();
    const { error } = await db.from("employee_kpis").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Employee KPI deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
