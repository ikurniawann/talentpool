import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const prItemSchema = z.object({
  raw_material_id: z.string().uuid("Bahan baku wajib dipilih"),
  satuan_id: z.string().uuid().optional(),
  description: z.string().min(1, "Deskripsi barang wajib diisi"),
  qty: z.number().min(1, "Jumlah minimal 1"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  estimated_price: z.number().min(0, "Harga estimasi tidak boleh negatif"),
});

const updatePRSchema = z.object({
  department_id: z.string().uuid("Department tidak valid"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  required_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(prItemSchema).min(1, "Minimal 1 item"),
  action: z.enum(["draft", "submit"]).default("draft"),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await requireUser();
    const validated = updatePRSchema.parse(await request.json());

    const { data: existingPR, error: findError } = await supabase
      .from("purchase_requests")
      .select("id, requester_id, status")
      .eq("id", id)
      .single();

    if (findError || !existingPR) {
      return NextResponse.json({ error: "PR tidak ditemukan" }, { status: 404 });
    }

    const canEdit =
      existingPR.requester_id === user.id ||
      ["purchasing_manager", "purchasing_admin", "super_admin", "admin"].includes(user.role);

    if (!canEdit) {
      return NextResponse.json({ error: "Anda tidak memiliki akses mengubah PR ini" }, { status: 403 });
    }

    if (existingPR.status !== "draft") {
      return NextResponse.json({ error: "Hanya PR draft yang bisa diedit" }, { status: 400 });
    }

    const totalAmount = validated.items.reduce(
      (sum, item) => sum + item.qty * item.estimated_price,
      0
    );

    const nextStatus = validated.action === "submit" ? "pending_head" : "draft";

    const { error: deleteItemsError } = await supabase
      .from("pr_items")
      .delete()
      .eq("pr_id", id);

    if (deleteItemsError) throw deleteItemsError;

    const items = validated.items.map((item) => ({
      pr_id: id,
      raw_material_id: item.raw_material_id,
      satuan_id: item.satuan_id || null,
      description: item.description,
      qty: item.qty,
      unit: item.unit,
      estimated_price: item.estimated_price,
      total: item.qty * item.estimated_price,
    }));

    const { error: insertItemsError } = await supabase.from("pr_items").insert(items);
    if (insertItemsError) throw insertItemsError;

    const { error: updateError } = await supabase
      .from("purchase_requests")
      .update({
        department_id: validated.department_id,
        priority: validated.priority,
        required_date: validated.required_date || null,
        notes: validated.notes || null,
        total_amount: totalAmount,
        status: nextStatus,
        current_approval_level: nextStatus === "pending_head" ? "head_dept" : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ data: { id, status: nextStatus } });
  } catch (error) {
    console.error("Error updating PR:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Gagal mengubah PR" }, { status: 500 });
  }
}
