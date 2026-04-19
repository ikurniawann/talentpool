import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Printer,
  Send,
  Package,
  CheckCircle,
  XCircle,
  FileText,
  Truck,
  Clock,
} from "lucide-react";
import {
  formatRupiah,
  formatDate,
  getPOStatusLabel,
} from "@/lib/purchasing/utils";

interface PODetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PODetailPage({ params }: PODetailPageProps) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch PO with all relations
  const { data: po } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      items:po_items(*),
      vendor:vendors(*),
      pr:purchase_requests(pr_number),
      creator:users!purchase_orders_created_by_fkey(full_name),
      sent_by_user:users!purchase_orders_sent_by_fkey(full_name)
    `)
    .eq("id", id)
    .single();

  if (!po) {
    notFound();
  }

  const statusBadge = getPOStatusLabel(po.status);

  // Determine available actions
  const canSend = po.status === "draft" && (user.role === "purchasing_staff" || user.role === "purchasing_manager");
  const canReceive = (po.status === "sent" || po.status === "partial") && user.role === "warehouse_staff";
  const canClose = po.status === "received" && (user.role === "purchasing_manager" || user.role === "direksi");
  const canCancel = po.status !== "closed" && po.status !== "cancelled" && (user.role === "purchasing_manager" || user.role === "direksi");

  // Calculate received progress
  const totalItems = po.items?.length || 0;
  const receivedItems = po.items?.filter((item: any) => item.received_qty >= item.qty).length || 0;
  const progressPercent = totalItems > 0 ? (receivedItems / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/po">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{po.po_number}</h1>
            <p className="text-sm text-gray-500">
              Dibuat {formatDate(po.created_at)} oleh {po.creator?.full_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/dashboard/purchasing/print/po/${id}`} target="_blank">
            <Button variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </Link>

          {canSend && (
            <form action={async () => {
              "use server";
              const supabase = await createClient();
              const user = await requireUser();
              
              await supabase
                .from("purchase_orders")
                .update({
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  sent_by: user.id,
                })
                .eq("id", id);
              
              redirect(`/dashboard/purchasing/po/${id}`);
            }}>
              <Button type="submit">
                <Send className="w-4 h-4 mr-2" />
                Kirim ke Vendor
              </Button>
            </form>
          )}

          {canReceive && (
            <Link href={`/dashboard/purchasing/po/${id}/receive`}>
              <Button>
                <Package className="w-4 h-4 mr-2" />
                Terima Barang
              </Button>
            </Link>
          )}

          {canClose && (
            <form action={async () => {
              "use server";
              const supabase = await createClient();
              
              await supabase
                .from("purchase_orders")
                .update({ status: "closed" })
                .eq("id", id);
              
              redirect(`/dashboard/purchasing/po/${id}`);
            }}>
              <Button variant="outline" type="submit">
                <CheckCircle className="w-4 h-4 mr-2" />
                Tutup PO
              </Button>
            </form>
          )}

          {canCancel && (
            <form action={async () => {
              "use server";
              const supabase = await createClient();
              
              await supabase
                .from("purchase_orders")
                .update({ status: "cancelled" })
                .eq("id", id);
              
              redirect(`/dashboard/purchasing/po/${id}`);
            }}>
              <Button variant="destructive" type="submit">
                <XCircle className="w-4 h-4 mr-2" />
                Batal
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - PO Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Badge className={statusBadge.color} size="lg">
                    {statusBadge.label}
                  </Badge>
                  {po.pr?.pr_number && (
                    <span className="text-sm text-gray-500">
                      Ref PR: <span className="font-medium">{po.pr.pr_number}</span>
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total PO</p>
                  <p className="text-2xl font-bold">{formatRupiah(po.total)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              {(po.status === "sent" || po.status === "partial" || po.status === "received") && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress Penerimaan</span>
                    <span className="text-sm text-gray-500">
                      {receivedItems} / {totalItems} item
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Items Table */}
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium">No</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Deskripsi</th>
                    <th className="text-center py-3 px-4 text-sm font-medium">Qty</th>
                    <th className="text-center py-3 px-4 text-sm font-medium">Satuan</th>
                    <th className="text-right py-3 px-4 text-sm font-medium">Harga</th>
                    <th className="text-right py-3 px-4 text-sm font-medium">Total</th>
                    {(po.status === "partial" || po.status === "received") && (
                      <th className="text-center py-3 px-4 text-sm font-medium">Diterima</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {po.items?.map((item: any, index: number) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-4 text-sm">{index + 1}</td>
                      <td className="py-3 px-4 text-sm">
                        {item.description}
                        {item.notes && (
                          <p className="text-xs text-gray-500">{item.notes}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-center">{item.qty}</td>
                      <td className="py-3 px-4 text-sm text-center">{item.unit}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        {formatRupiah(item.unit_price)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {formatRupiah(item.total)}
                      </td>
                      {(po.status === "partial" || po.status === "received") && (
                        <td className="py-3 px-4 text-sm text-center">
                          <span className={item.received_qty >= item.qty ? "text-green-600" : "text-yellow-600"}>
                            {item.received_qty || 0} / {item.qty}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculations */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatRupiah(po.subtotal)}</span>
                </div>
                {po.discount_amount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">
                      Diskon ({po.discount_percent}%)
                    </span>
                    <span className="text-red-600">-{formatRupiah(po.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">PPN ({po.tax_percent}%)</span>
                  <span>{formatRupiah(po.tax_amount)}</span>
                </div>
                {po.shipping_cost > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Biaya Pengiriman</span>
                    <span>{formatRupiah(po.shipping_cost)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t mt-2">
                  <span className="font-bold text-lg">TOTAL</span>
                  <span className="font-bold text-2xl">{formatRupiah(po.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vendor Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Informasi Vendor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nama Vendor</p>
                  <p className="font-medium">{po.vendor?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kontak</p>
                  <p className="font-medium">{po.vendor?.contact_person}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telepon</p>
                  <p className="font-medium">{po.vendor?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{po.vendor?.email}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Alamat</p>
                <p className="font-medium">{po.vendor?.address}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Info & Actions */}
        <div className="space-y-6">
          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Tanggal Order</p>
                <p className="font-medium">{formatDate(po.order_date)}</p>
              </div>
              <div>
                <p className="text-gray-500">Estimasi Pengiriman</p>
                <p className="font-medium">
                  {po.delivery_date ? formatDate(po.delivery_date) : "-"}
                </p>
              </div>
              {po.actual_delivery && (
                <div>
                  <p className="text-gray-500">Tanggal Diterima</p>
                  <p className="font-medium">{formatDate(po.actual_delivery)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Alamat Pengiriman</p>
                <p className="font-medium">{po.delivery_address}</p>
              </div>
              {po.payment_terms && (
                <div>
                  <p className="text-gray-500">Ketentuan Pembayaran</p>
                  <p className="font-medium capitalize">{po.payment_terms.replace("_", " ")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">PO Dibuat</p>
                    <p className="text-sm text-gray-500">{formatDate(po.created_at)}</p>
                    <p className="text-sm text-gray-600">oleh {po.creator?.full_name}</p>
                  </div>
                </div>

                {po.sent_at && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Send className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Terkirim ke Vendor</p>
                      <p className="text-sm text-gray-500">{formatDate(po.sent_at)}</p>
                      <p className="text-sm text-gray-600">oleh {po.sent_by_user?.full_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {po.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Catatan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{po.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
