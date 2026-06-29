import { createServerPgClient } from "@/lib/pg/create-client";
import { NextResponse } from "next/server";

type TemplateItemInput = {
  title: string;
  description?: string | null;
  weight?: number;
  is_required?: boolean;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const db = await createServerPgClient();
  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource") || "entries";

  if (resource === "me") {
    const { data: userData } = await db.auth.getUser();
    if (!userData.user) return errorResponse("Unauthorized", 401);

    const { data: profile } = await db
      .from("users")
      .select("id, full_name, role, brand_id")
      .eq("id", userData.user.id)
      .single();

    const { data: employee } = await db
      .from("employees")
      .select("id, department_id, department:departments(id,name,code)")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    return NextResponse.json({ data: { ...profile, email: userData.user.email, employee } });
  }

  if (resource === "departments") {
    const { data, error } = await db
      .from("departments")
      .select("id, name, code, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) return errorResponse(error.message);
    return NextResponse.json({ data });
  }

  if (resource === "templates") {
    let query = db
      .from("hris_logbook_templates")
      .select("*, department:departments(id,name,code), items:hris_logbook_template_items(*)")
      .order("created_at", { ascending: false });

    const departmentId = searchParams.get("department_id");
    if (departmentId) query = query.eq("department_id", departmentId);

    const { data, error } = await query;
    if (error) return errorResponse(error.message);
    return NextResponse.json({ data });
  }

  if (resource === "summary") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = db
      .from("hris_logbook_entries")
      .select("id, department_id, entry_date, status, completion_percentage, kpi_score, department:departments(id,name,code)")
      .order("entry_date", { ascending: false });

    if (from) query = query.gte("entry_date", from);
    if (to) query = query.lte("entry_date", to);

    const { data, error } = await query;
    if (error) return errorResponse(error.message);

    const summary = (data || []).reduce<Record<string, any>>((acc, entry: any) => {
      const key = entry.department_id;
      if (!acc[key]) {
        acc[key] = {
          department: entry.department,
          total_entries: 0,
          submitted_entries: 0,
          reviewed_entries: 0,
          avg_completion: 0,
          avg_kpi_score: 0,
        };
      }
      acc[key].total_entries += 1;
      if (entry.status === "submitted") acc[key].submitted_entries += 1;
      if (entry.status === "reviewed") acc[key].reviewed_entries += 1;
      acc[key].avg_completion += Number(entry.completion_percentage || 0);
      acc[key].avg_kpi_score += Number(entry.kpi_score || 0);
      return acc;
    }, {});

    const rows = Object.values(summary).map((row: any) => ({
      ...row,
      avg_completion: row.total_entries ? Number((row.avg_completion / row.total_entries).toFixed(2)) : 0,
      avg_kpi_score: row.total_entries ? Number((row.avg_kpi_score / row.total_entries).toFixed(2)) : 0,
    }));

    return NextResponse.json({ data: rows });
  }

  let query = db
    .from("hris_logbook_entries")
    .select("*, department:departments(id,name,code), template:hris_logbook_templates(id,name,frequency), items:hris_logbook_entry_items(*)")
    .order("entry_date", { ascending: false })
    .order("sort_order", { referencedTable: "hris_logbook_entry_items", ascending: true });

  const departmentId = searchParams.get("department_id");
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (departmentId) query = query.eq("department_id", departmentId);
  if (status) query = query.eq("status", status);
  if (date) query = query.eq("entry_date", date);
  if (from) query = query.gte("entry_date", from);
  if (to) query = query.lte("entry_date", to);

  const { data, error } = await query;
  if (error) return errorResponse(error.message);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const db = await createServerPgClient();
  const body = await request.json();
  const action = body.action;

  if (action === "create-template") {
    if (!body.department_id || !body.name) return errorResponse("department_id and name are required");

    const { data: userData } = await db.auth.getUser();
    const { data: template, error } = await db
      .from("hris_logbook_templates")
      .insert({
        department_id: body.department_id,
        name: body.name,
        description: body.description || null,
        frequency: body.frequency || "daily",
        is_active: body.is_active ?? true,
        created_by: userData.user?.id || null,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message);

    const items = (body.items || []).filter((item: TemplateItemInput) => item.title?.trim());
    if (items.length) {
      const { error: itemError } = await db.from("hris_logbook_template_items").insert(
        items.map((item: TemplateItemInput, index: number) => ({
          template_id: template.id,
          title: item.title.trim(),
          description: item.description || null,
          weight: item.weight ?? 1,
          is_required: item.is_required ?? true,
          sort_order: index,
        }))
      );
      if (itemError) return errorResponse(itemError.message);
    }

    return NextResponse.json({ data: template }, { status: 201 });
  }

  if (action === "create-entry") {
    if (!body.template_id || !body.entry_date) return errorResponse("template_id and entry_date are required");

    const { data: template, error: templateError } = await db
      .from("hris_logbook_templates")
      .select("*, items:hris_logbook_template_items(*)")
      .eq("id", body.template_id)
      .single();

    if (templateError) return errorResponse(templateError.message);

    const { data: entry, error } = await db
      .from("hris_logbook_entries")
      .insert({
        template_id: template.id,
        department_id: template.department_id,
        entry_date: body.entry_date,
        title: body.title || `${template.name} - ${body.entry_date}`,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message);

    const items = (template.items || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
    if (items.length) {
      const { error: itemError } = await db.from("hris_logbook_entry_items").insert(
        items.map((item: any) => ({
          entry_id: entry.id,
          template_item_id: item.id,
          title: item.title,
          description: item.description,
          weight: item.weight,
          is_required: item.is_required,
          sort_order: item.sort_order,
        }))
      );
      if (itemError) return errorResponse(itemError.message);
    }

    return NextResponse.json({ data: entry }, { status: 201 });
  }

  return errorResponse("Unknown action", 422);
}

export async function PATCH(request: Request) {
  const db = await createServerPgClient();
  const body = await request.json();

  if (body.action === "update-item") {
    if (!body.item_id) return errorResponse("item_id is required");

    const { data: userData } = await db.auth.getUser();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.is_checked === "boolean") {
      patch.is_checked = body.is_checked;
      patch.checked_by = body.is_checked ? userData.user?.id || null : null;
      patch.checked_at = body.is_checked ? new Date().toISOString() : null;
    }

    if ("notes" in body) {
      patch.notes = body.notes || null;
    }

    const { data, error } = await db
      .from("hris_logbook_entry_items")
      .update(patch)
      .eq("id", body.item_id)
      .select()
      .single();

    if (error) return errorResponse(error.message);
    return NextResponse.json({ data });
  }

  if (body.action === "submit-entry") {
    if (!body.entry_id) return errorResponse("entry_id is required");
    const { data: userData } = await db.auth.getUser();
    const { data, error } = await db
      .from("hris_logbook_entries")
      .update({
        status: "submitted",
        notes: body.notes ?? undefined,
        submitted_by: userData.user?.id || null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.entry_id)
      .select()
      .single();

    if (error) return errorResponse(error.message);
    return NextResponse.json({ data });
  }

  if (body.action === "review-entry") {
    if (!body.entry_id) return errorResponse("entry_id is required");
    const { data: userData } = await db.auth.getUser();
    const status = body.status === "rejected" ? "rejected" : "reviewed";
    const { data, error } = await db
      .from("hris_logbook_entries")
      .update({
        status,
        review_notes: body.review_notes || null,
        reviewed_by: userData.user?.id || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.entry_id)
      .select()
      .single();

    if (error) return errorResponse(error.message);
    return NextResponse.json({ data });
  }

  return errorResponse("Unknown action", 422);
}
