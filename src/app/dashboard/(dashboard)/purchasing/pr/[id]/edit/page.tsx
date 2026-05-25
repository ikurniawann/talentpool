import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PRForm } from "@/components/purchasing/pr-form";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { PRDetailToast } from "@/components/purchasing/pr-detail-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type PRFormItemInput = {
  raw_material_id: string;
  satuan_id?: string;
  description: string;
  qty: number;
  unit: string;
  estimated_price: number;
};

type PRFormInput = {
  department_id: string;
  priority: "low" | "medium" | "high" | "urgent";
  required_date?: string;
  notes?: string;
  items: PRFormItemInput[];
};

type PRItemRow = {
  raw_material_id?: string | null;
  satuan_id?: string | null;
  description?: string | null;
  qty?: number | null;
  unit?: string | null;
  estimated_price?: number | null;
};

type EditPRPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPRPage({ params }: EditPRPageProps) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: pr } = await supabase
    .from("purchase_requests")
    .select(`
      *,
      items:pr_items(*)
    `)
    .eq("id", id)
    .single();

  if (!pr) notFound();

  const canEdit =
    pr.requester_id === user.id ||
    ["purchasing_manager", "purchasing_admin", "super_admin", "admin"].includes(user.role);

  if (!canEdit || pr.status !== "draft") {
    redirect(`/dashboard/purchasing/pr/${id}`);
  }

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const { data: materials } = await supabase
    .from("v_raw_materials_stock")
    .select("id, kode, nama, satuan_besar_id, satuan_besar_nama, avg_cost")
    .eq("is_active", true)
    .order("nama");

  const { data: units } = await supabase
    .from("units")
    .select("id, nama")
    .eq("is_active", true)
    .order("nama");

  async function handleUpdatePR(formData: PRFormInput, action: "draft" | "submit") {
    "use server";

    const supabase = await createClient();
    const currentUser = await requireUser();

    const { data: existingPR, error: findError } = await supabase
      .from("purchase_requests")
      .select("id, requester_id, status")
      .eq("id", id)
      .single();

    if (findError || !existingPR) {
      throw new Error("PR tidak ditemukan");
    }

    const canUpdate =
      existingPR.requester_id === currentUser.id ||
      ["purchasing_manager", "purchasing_admin", "super_admin", "admin"].includes(currentUser.role);

    if (!canUpdate || existingPR.status !== "draft") {
      throw new Error("Hanya PR draft yang bisa diedit");
    }

    const totalAmount = formData.items.reduce(
      (sum, item) => sum + item.qty * item.estimated_price,
      0
    );
    const nextStatus = action === "submit" ? "pending_head" : "draft";

    const { error: deleteItemsError } = await supabase
      .from("pr_items")
      .delete()
      .eq("pr_id", id);

    if (deleteItemsError) throw deleteItemsError;

    const items = formData.items.map((item) => ({
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
        department_id: formData.department_id,
        priority: formData.priority,
        required_date: formData.required_date || null,
        notes: formData.notes || null,
        total_amount: totalAmount,
        status: nextStatus,
        current_approval_level: nextStatus === "pending_head" ? "head_dept" : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    const createdParam = action === "submit" ? "submit" : "draft";
    redirect(`/dashboard/purchasing/pr/${id}?updated=${createdParam}`);
  }

  const initialData: PRFormInput = {
    department_id: pr.department_id,
    priority: pr.priority,
    required_date: pr.required_date || "",
    notes: pr.notes || "",
    items: (pr.items || []).map((item: PRItemRow) => ({
      raw_material_id: item.raw_material_id || "",
      satuan_id: item.satuan_id || "",
      description: item.description || "",
      qty: item.qty || 1,
      unit: item.unit || "",
      estimated_price: item.estimated_price || 0,
    })),
  };

  return (
    <div className="space-y-6">
      <PRDetailToast />
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Procurement", href: "/dashboard/purchasing/procurement" },
          { label: "Purchase Request", href: "/dashboard/purchasing/pr" },
          { label: pr.pr_number, href: `/dashboard/purchasing/pr/${id}` },
          { label: "Edit" },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link href={`/dashboard/purchasing/pr/${id}`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Purchase Request</h1>
          <p className="text-sm text-gray-500">Perubahan hanya bisa dilakukan saat PR masih draft</p>
        </div>
      </div>

      <PRForm
        departments={departments || []}
        materials={materials || []}
        units={units || []}
        initialData={initialData}
        mode="edit"
        onSubmit={handleUpdatePR}
      />
    </div>
  );
}
