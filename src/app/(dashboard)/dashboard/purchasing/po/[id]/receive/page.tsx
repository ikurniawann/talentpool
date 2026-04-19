import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Package, CheckCircle } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/purchasing/utils";

interface ReceivePOPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceivePOPage({ params }: ReceivePOPageProps) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // Check access - only warehouse staff
  if (user.role !== "warehouse_staff" && user.role !== "purchasing_manager") {
    redirect(`/dashboard/purchasing/po/${id}`);
  }

  // Fetch PO
  const { data: po } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      items:po_items(*),
      vendor:vendors(name)
    `)
    .eq("id", id)
    .in("status", ["sent", "partial"])
    .single();

  if (!po) {
    notFound();
  }

  async function handleReceive(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const user = await requireUser();

    try {
      // Generate GR number
      const year = new Date().getFullYear();
      const { data: lastGR } = await supabase
        .from("goods_receipts")
        .select("gr_number")
        .ilike("gr_number", `GR-${year}-%`)
        .order("gr_number", { ascending: false })
        .limit(1);

      let sequence = 1;
      if (lastGR && lastGR.length > 0) {
        const lastNum = parseInt(lastGR[0].gr_number.split("-")[2]);
        sequence = lastNum + 1;
      }

      const grNumber = `GR-${year}-${String(sequence).padStart(5, "0")}`;

      // Create GR
      const { data: gr, error: grError } = await supabase
        .from("goods_receipts")
        .insert({
          gr_number: grNumber,
          po_id: id,
          received_date: new Date().toISOString().split("T")[0],
          received_by: user.id,
          notes: formData.get("notes") as string,
        })
        .select()
        .single();

      if (grError) throw grError;

      // Process received items
      const receivedItems = [];
      const updates = [];

      for (const item of po.items) {
        const receivedQty = parseInt(formData.get(`qty_${item.id}`) as string) || 0;
        const condition = formData.get(`condition_${item.id}`) as string;
        const notes = formData.get(`notes_${item.id}`) as string;

        if (receivedQty > 0) {
          receivedItems.push({
            gr_id: gr.id,
            po_item_id: item.id,
            received_qty: receivedQty,
            condition,
            notes,
          });

          // Update PO item received qty
          const newReceivedQty = (item.received_qty || 0) + receivedQty;
          updates.push(
            supabase
              .from("po_items")
              .update({ received_qty: newReceivedQty })
              .eq("id", item.id)
          );
        }
      }

      // Insert GR items
      if (receivedItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("gr_items")
          .insert(receivedItems);

        if (itemsError) throw itemsError;

        // Update PO items
        await Promise.all(updates);

        // Check if all items fully received
        const { data: updatedItems } = await supabase
          .from("po_items")
          .select("qty, received_qty")
          .eq("po_id", id);

        const allReceived = updatedItems?.every(
          (item) => (item.received_qty || 0) >= item.qty
        );

        const someReceived = updatedItems?.some(
          (item) => (item.received_qty || 0) > 0
        );

        let newStatus = po.status;
        if (allReceived) {
          newStatus = "received";
        } else if (someReceived) {
          newStatus = "partial";
        }

        await supabase
          .from("purchase_orders")
          .update({
            status: newStatus,
            actual_delivery: new Date().toISOString().split("T")[0],
          })
          .eq("id", id);
      }

      redirect(`/dashboard/purchasing/po/${id}`);
    } catch (error) {
      console.error("Error receiving PO:", error);
      throw error;
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/purchasing/po/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Penerimaan Barang</h1>
      </div>

      {/* PO Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">No. PO</p>
              <p className="font-medium">{po.po_number}</p>
            </div>
            <div>
              <p className="text-gray-500">Vendor</p>
              <p className="font-medium">{po.vendor?.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Total PO</p>
              <p className="font-medium">{formatRupiah(po.total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receive Form */}
      <form action={handleReceive}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detail Penerimaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Items */}
            <div className="space-y-4">
              {po.items?.map((item: any) => {
                const remaining = item.qty - (item.received_qty || 0);

                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-gray-500">
                          Order: {item.qty} {item.unit} ×{" "}
                          {formatRupiah(item.unit_price)}
                        </p>
                        <p className="text-sm text-blue-600">
                          Sudah diterima: {item.received_qty || 0} / {item.qy}{" "}
                          {item.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatRupiah(item.total)}
                        </p>
                        <p className="text-sm text-orange-600">
                          Sisa: {remaining} {item.unit}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                      <div>
                        <Label
                          htmlFor={`qty_${item.id}`}
                          className="text-xs"
                        >
                          Qty Diterima *
                        </Label>
                        <Input
                          id={`qty_${item.id}`}
                          name={`qty_${item.id}`}
                          type="number"
                          min="0"
                          max={remaining}
                          defaultValue={remaining > 0 ? remaining : 0}
                          required
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor={`condition_${item.id}`}
                          className="text-xs"
                        >
                          Kondisi *
                        </Label>
                        <Select
                          defaultValue="good"
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Baik</SelectItem>
                            <SelectItem value="damaged">Rusak</SelectItem>
                            <SelectItem value="incomplete">
                              Tidak Lengkap
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor={`notes_${item.id}`}
                          className="text-xs"
                        >
                          Catatan
                        </Label>
                        <Input
                          id={`notes_${item.id}`}
                          name={`notes_${item.id}`}
                          placeholder="Opsional"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* GR Notes */}
            <div className="pt-4 border-t">
              <Label htmlFor="notes">Catatan Penerimaan</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full p-2 border rounded-md"
                placeholder="Catatan umum untuk penerimaan ini..."
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href={`/dashboard/purchasing/po/${id}`}>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </Link>
              <Button type="submit">
                <CheckCircle className="w-4 h-4 mr-2" />
                Konfirmasi Penerimaan
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
