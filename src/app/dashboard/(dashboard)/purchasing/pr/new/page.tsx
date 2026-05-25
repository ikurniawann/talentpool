import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PRForm } from "@/components/purchasing/pr-form";
import { generatePRNumber } from "@/lib/purchasing/utils";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
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

export default async function NewPRPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Check access
  const allowedRoles = [
    "purchasing_staff",
    "purchasing_manager",
    "purchasing_admin",
    "super_admin",
    "admin",
    "pos_supervisor",
    "hrd",
  ];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard/purchasing");
  }

  // Fetch departments for dropdown
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

  async function handleCreatePR(formData: PRFormInput, action: "draft" | "submit") {
    "use server";
    
    const supabase = await createClient();
    const user = await requireUser();
    let redirectPath = "/dashboard/purchasing/pr?created=submit";
    
    try {
      // Calculate total
      const totalAmount = formData.items.reduce(
        (sum, item) => sum + (item.qty * item.estimated_price),
        0
      );

      // Generate PR number
      const prNumber = await generatePRNumber(supabase);
      
      // Insert PR
      const { data: pr, error: prError } = await supabase
        .from("purchase_requests")
        .insert({
          pr_number: prNumber,
          requester_id: user.id,
          department_id: formData.department_id,
          status: action === "draft" ? "draft" : "pending_head",
          total_amount: totalAmount,
          priority: formData.priority,
          notes: formData.notes || null,
          required_date: formData.required_date || null,
          current_approval_level: action === "draft" ? null : "head_dept",
        })
        .select()
        .single();
      
      if (prError) throw prError;
      
      // Insert items
      const items = formData.items.map((item) => ({
        pr_id: pr.id,
        raw_material_id: item.raw_material_id,
        satuan_id: item.satuan_id || null,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        estimated_price: item.estimated_price,
        total: item.qty * item.estimated_price,
      }));
      
      const { error: itemsError } = await supabase
        .from("pr_items")
        .insert(items);
      
      if (itemsError) throw itemsError;

      redirectPath = action === "draft" ? `/dashboard/purchasing/pr/${pr.id}?created=draft` : "/dashboard/purchasing/pr?created=submit";
    } catch (error) {
      console.error("Error creating PR:", error);
      throw error;
    }

    redirect(redirectPath);
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Procurement", href: "/dashboard/purchasing/procurement" },
          { label: "Purchase Request", href: "/dashboard/purchasing/pr" },
          { label: "Buat PR" },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/pr">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buat Purchase Request</h1>
            <p className="text-sm text-gray-500">Isi kebutuhan pembelian sebelum dibuatkan PO</p>
          </div>
        </div>
        <Link href="/dashboard/purchasing/pr">
          <Button variant="outline" className="purchasing-secondary-button">Kembali ke PR</Button>
        </Link>
      </div>

      <PRForm
        departments={departments || []}
        materials={materials || []}
        units={units || []}
        onSubmit={handleCreatePR}
      />
    </div>
  );
}
