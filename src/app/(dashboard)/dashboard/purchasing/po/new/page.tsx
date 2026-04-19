import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { POForm } from "@/components/purchasing/po-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { generatePONumber, getRequiredApprovalLevel } from "@/lib/purchasing/utils";

interface NewPOPageProps {
  searchParams: Promise<{ pr_id?: string }>;
}

export default async function NewPOPage({ searchParams }: NewPOPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const params = await searchParams;

  // Check access
  const allowedRoles = ["purchasing_staff", "purchasing_manager", "hrd"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard/purchasing");
  }

  // Fetch vendors
  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  // Fetch PR data if pr_id provided
  let prData = null;
  if (params.pr_id) {
    const { data: pr } = await supabase
      .from("purchase_requests")
      .select(`
        id,
        pr_number,
        items:pr_items(description, qty, unit, estimated_price)
      `)
      .eq("id", params.pr_id)
      .eq("status", "approved")
      .single();

    if (pr) {
      prData = {
        id: pr.id,
        pr_number: pr.pr_number,
        items: pr.items || [],
      };
    }
  }

  async function handleCreatePO(formData: any) {
    "use server";
    
    const supabase = await createClient();
    const user = await requireUser();
    
    try {
      // Calculate totals
      const subtotal = formData.items.reduce(
        (sum: number, item: any) => sum + (item.qty * item.unit_price) - (item.discount || 0),
        0
      );
      
      const discountAmount = (subtotal * (formData.discount_percent || 0)) / 100;
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = (afterDiscount * (formData.tax_percent || 11)) / 100;
      const total = afterDiscount + taxAmount + (formData.shipping_cost || 0);
      
      // Generate PO number
      const poNumber = await generatePONumber(supabase);
      
      // Insert PO
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: poNumber,
          pr_id: formData.pr_id || null,
          vendor_id: formData.vendor_id,
          status: "draft",
          subtotal,
          discount_percent: formData.discount_percent || 0,
          discount_amount: discountAmount,
          tax_percent: formData.tax_percent || 11,
          tax_amount: taxAmount,
          shipping_cost: formData.shipping_cost || 0,
          total,
          order_date: formData.order_date,
          delivery_date: formData.delivery_date || null,
          payment_terms: formData.payment_terms || null,
          delivery_address: formData.delivery_address,
          notes: formData.notes || null,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (poError) throw poError;
      
      // Insert items
      const items = formData.items.map((item: any) => ({
        po_id: po.id,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        total: (item.qty * item.unit_price) - (item.discount || 0),
        notes: item.notes || null,
      }));
      
      const { error: itemsError } = await supabase
        .from("po_items")
        .insert(items);
      
      if (itemsError) throw itemsError;
      
      // If created from PR, update PR status
      if (formData.pr_id) {
        await supabase
          .from("purchase_requests")
          .update({ 
            status: "converted",
            converted_po_id: po.id,
          })
          .eq("id", formData.pr_id);
      }
      
      redirect(`/dashboard/purchasing/po/${po.id}`);
    } catch (error) {
      console.error("Error creating PO:", error);
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/po">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Buat Purchase Order Baru</h1>
      </div>

      {prData && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Membuat PO dari PR: <span className="font-semibold">{prData.pr_number}</span>
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Form Purchase Order</CardTitle>
        </CardHeader>
        <CardContent>
          <POForm 
            vendors={vendors || []}
            prData={prData}
            onSubmit={handleCreatePO}
          />
        </CardContent>
      </Card>
    </div>
  );
}
