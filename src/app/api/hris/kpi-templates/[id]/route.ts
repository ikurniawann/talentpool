import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/hris/kpi-templates/[id] - Get template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("kpi_templates")
      .select(`
        *,
        department:departments(id, name),
        position:positions(id, title),
        template_items:kpi_template_items(*),
        behavioral_items:kpi_template_behavioral(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// PUT /api/hris/kpi-templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createAdminClient();

    const { items, behavioral_items, ...templateData } = body;
    const sanitizedTemplateData = {
      ...templateData,
      department_id: templateData.department_id || null,
      position_id: templateData.position_id || null,
      expiry_date: templateData.expiry_date || null,
    };

    // Update template header
    const { error: updateError } = await supabase
      .from("kpi_templates")
      .update(sanitizedTemplateData)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Handle items update if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await supabase.from("kpi_template_items").delete().eq("template_id", id);

      // Insert new items
      if (items.length > 0) {
        const itemsWithTemplateId = items.map((item: any, index: number) => ({
          template_id: id,
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

        const { error: itemsError } = await supabase
          .from("kpi_template_items")
          .insert(itemsWithTemplateId);

        if (itemsError) {
          return NextResponse.json({ error: itemsError.message }, { status: 500 });
        }
      }
    }

    // Handle behavioral items update if provided
    if (behavioral_items && Array.isArray(behavioral_items)) {
      // Delete existing behavioral items
      await supabase.from("kpi_template_behavioral").delete().eq("template_id", id);

      // Insert new behavioral items
      if (behavioral_items.length > 0) {
        const behavioralItemsWithTemplateId = behavioral_items.map((item: any) => ({
          template_id: id,
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

        const { error: behError } = await supabase
          .from("kpi_template_behavioral")
          .insert(behavioralItemsWithTemplateId);

        if (behError) {
          console.error("Error updating behavioral items:", behError);
        }
      }
    }

    // Fetch updated template
    const { data: updatedTemplate, error: fetchError } = await supabase
      .from("kpi_templates")
      .select(`
        *,
        department:departments(id, name),
        position:positions(id, title),
        template_items:kpi_template_items(*),
        behavioral_items:kpi_template_behavioral(*)
      `)
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching updated template:", fetchError);
    }

    return NextResponse.json({ data: updatedTemplate });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/hris/kpi-templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    const { error } = await supabase.from("kpi_templates").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
