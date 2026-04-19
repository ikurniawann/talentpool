"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { formatRupiah, getPOStatusLabel } from "@/modules/purchasing/utils";
import { Eye, Pencil, ShoppingCartIcon, Send, CheckCircleIcon } from "lucide-react";

interface PODetail {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  order_date: string;
  expected_date: string;
  status: string;
  total_amount: number;
  notes: string;
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const poId = id as string;

  // TODO: fetch PO by ID from API
  const po: PODetail | null = null;

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Purchase Order", href: "/dashboard/purchasing/purchase-orders" },
        { label: po?.po_number ?? poId },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{po?.po_number ?? "—"}</h1>
          <p className="text-sm text-gray-500">Detail Purchase Order</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/purchasing/purchase-orders/${poId}/edit`}><Button variant="outline"><Pencil className="w-4 h-4 mr-2" />Edit</Button></Link>
          <Button variant="outline"><Send className="w-4 h-4 mr-2" />Kirim PO</Button>
          <Button><CheckCircleIcon className="w-4 h-4 mr-2" />Terima Barang</Button>
        </div>
      </div>

      {po ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Informasi PO</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">No. PO</span><span className="font-medium">{po.po_number}</span>
                  <span className="text-gray-500">Supplier</span><span className="font-medium">{po.supplier_name}</span>
                  <span className="text-gray-500">Tanggal PO</span><span className="font-medium">{po.order_date}</span>
                  <span className="text-gray-500">Tgl Diperlukan</span><span className="font-medium">{po.expected_date}</span>
                  <span className="text-gray-500">Status</span><Badge>{getPOStatusLabel(po.status)}</Badge>
                  <span className="text-gray-500">Total</span><span className="font-bold">{formatRupiah(po.total_amount)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Catatan</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{po.notes || "—"}</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Item PO</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["No", "Nama Item", "Qty", "Satuan", "Harga Satuan", "Subtotal"].map((h) => (
                      <th key={h} className="text-left py-2 px-3 font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      TODO: fetch PO items from API
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <ShoppingCartIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Purchase Order tidak ditemukan</p>
          <Link href="/dashboard/purchasing/purchase-orders">
            <Button variant="outline" className="mt-4">Kembali ke Daftar</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
