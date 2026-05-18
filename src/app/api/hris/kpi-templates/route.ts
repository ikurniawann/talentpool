import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/hris/kpi-templates - List all templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);
    
    const department_id = searchParams.get("department_id");
    const position_id = searchParams.get("position_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("kpi_templates")
      .select(`
        *,
        department:departments(id, name),
        position:positions(id, title),
        template_items:kpi_template_items(id, count),
        behavioral_items:kpi_template_behavioral(id, count)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (department_id) {
      query = query.eq("department_id", department_id);
    }
    if (position_id) {
      query = query.eq("position_id", position_id);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching templates:", error);
      // If join fails, try without joins
      const { data: simpleData, error: simpleError, count: simpleCount } = await supabase
        .from("kpi_templates")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (simpleError) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        data: simpleData || [],
        meta: {
          total: simpleCount || 0,
        },
      });
    }

    return NextResponse.json({
      data: data || [],
      meta: {
        total: count || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/hris/kpi-templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("POST /api/hris/kpi-templates body:", body);
    
    const supabase = await createAdminClient();

    const { template_name, department_id, position_id, applicable_period, effective_date, expiry_date, status, items, total_weight, behavioral_weight, project_weight } = body;

    // Insert template header
    const { data: template, error: templateError } = await supabase
      .from("kpi_templates")
      .insert({
        template_name,
        department_id: department_id || null,
        position_id: position_id || null,
        applicable_period,
        effective_date,
        expiry_date: expiry_date || null,
        status: status || "draft",
        total_weight: total_weight || 100,
        behavioral_weight: behavioral_weight || 20,
        project_weight: project_weight || 10,
      })
      .select()
      .single();

    console.log("Template insert result:", { template, error: templateError });

    if (templateError) {
      console.error("Template insert error:", templateError);
      return NextResponse.json({ error: templateError.message }, { status: 500 });
    }

    // Insert template items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const itemsWithTemplateId = items.map((item: any, index: number) => ({
        template_id: template.id,
        perspective: item.perspective,
        category: item.category,
        kpi_name: item.kpi_name,
        kpi_definition: item.kpi_definition,
        formula: item.formula,
        control_method: item.control_method,
        target_text: item.target_text || "",
        target_value: item.target_value,
        measurement_unit: item.measurement_unit,
        weight: item.weight,
        frequency: item.frequency,
        score_5_description: item.score_5_description,
        score_4_description: item.score_4_description,
        score_3_description: item.score_3_description,
        score_2_description: item.score_2_description,
        score_1_description: item.score_1_description,
        item_order: item.item_order || index,
      }));

      console.log("Inserting items:", itemsWithTemplateId.length);

      const { error: itemsError } = await supabase
        .from("kpi_template_items")
        .insert(itemsWithTemplateId);

      console.log("Items insert result:", { error: itemsError });

      if (itemsError) {
        console.error("Items insert error:", itemsError);
        // Rollback template if items insert fails
        await supabase.from("kpi_templates").delete().eq("id", template.id);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }
    }

    // Insert behavioral items if provided
    if (body.behavioral_items && Array.isArray(body.behavioral_items) && body.behavioral_items.length > 0) {
      const behavioralItemsWithTemplateId = body.behavioral_items.map((item: any) => ({
        template_id: template.id,
        value_name: item.value_name || item.value || "",
        competency: item.competency || "",
        behavioral_standard: item.behavioral_standard || "",
        weight: item.weight || 0,
        score_5_description: item.score_5_description || "",
        score_4_description: item.score_4_description || "",
        score_3_description: item.score_3_description || "",
        score_2_description: item.score_2_description || "",
        score_1_description: item.score_1_description || "",
      }));

      console.log("Inserting behavioral items:", behavioralItemsWithTemplateId.length);

      const { error: behError } = await supabase
        .from("kpi_template_behavioral")
        .insert(behavioralItemsWithTemplateId);

      console.log("Behavioral insert result:", { error: behError });

      if (behError) {
        console.error("Behavioral insert error:", behError);
        // Don't rollback, just log the error
      }
    }

    // Fetch complete template with items
    const { data: completeTemplate, error: fetchError } = await supabase
      .from("kpi_templates")
      .select(`
        *,
        department:departments(id, name),
        position:positions(id, title),
        template_items:kpi_template_items(*),
        behavioral_items:kpi_template_behavioral(*)
      `)
      .eq("id", template.id)
      .single();

    if (fetchError) {
      console.error("Error fetching complete template:", fetchError);
    }

    return NextResponse.json({ data: completeTemplate || template }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
