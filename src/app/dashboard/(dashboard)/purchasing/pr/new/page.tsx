import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PRForm } from "@/components/purchasing/pr-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { generatePRNumber, getRequiredApprovalLevel } from "@/lib/purchasing/utils";

export default async function NewPRPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Check access
  const allowedRoles = ["purchasing_staff", "purchasing_manager", "hrd"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard/purchasing");
  }

  // Fetch departments for dropdown
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  async function handleCreatePR(formData: any, action: "draft" | "submit") {
    "use server";
    
    const supabase = await createClient();
    const user = await requireUser();
    
    try {
      // Calculate total
      const totalAmount = formData.items.reduce(
        (sum: number, item: any) => sum + (item.qty * item.estimated_price),
        0
      );

      // Get required approval level
      const approvalInfo = getRequiredApprovalLevel(totalAmount);
      
      // Generate PR number
      const prNumber = await generatePRNumber(supabase);
      
      // Insert PR
      const { data: pr, error: prError } = await supabase
        .from("purchase_requests")
        .insert({
          pr_number: prNumber,
          requester_id: user.id,
          department_id: formData.department_id,
          status: action === "draft" ? "draft" : 
                  approvalInfo.level ? "pending_head" : "approved",
          total_amount: totalAmount,
          priority: formData.priority,
          notes: formData.notes || null,
          required_date: formData.required_date || null,
          current_approval_level: action === "draft" ? null : approvalInfo.level,
        })
        .select()
        .single();
      
      if (prError) throw prError;
      
      // Insert items
      const items = formData.items.map((item: any) => ({
        pr_id: pr.id,
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
      
      redirect(action === "draft" ? `/dashboard/purchasing/pr/${pr.id}` : "/dashboard/purchasing");
    } catch (error) {
      console.error("Error creating PR:", error);
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Buat Purchase Request Baru</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Purchase Request</CardTitle>
        </CardHeader>
        <CardContent>
          <PRForm 
            departments={departments || []} 
            onSubmit={handleCreatePR}
          />
        </CardContent>
      </Card>
    </div>
  );
}
