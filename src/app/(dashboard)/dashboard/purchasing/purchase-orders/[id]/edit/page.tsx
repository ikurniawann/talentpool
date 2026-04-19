"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { formatRupiah } from "@/modules/purchasing/utils";
import { ChevronLeft, Save, Plus, TrashIcon } from "lucide-react";

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const poId = params.id as string;
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // TODO: PUT /api/purchasing/po/:id
    setTimeout(() => { setLoading(false); router.push("/dashboard/purchasing/purchase-orders"); }, 1000);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Purchase Order", href: "/dashboard/purchasing/purchase-orders" },
          { label: `Edit PO ${poId}` },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Purchase Order</h1>
          <p className="text-sm text-gray-500">Form pengeditan PO</p>
        </div>
        <Link href="/dashboard/purchasing/purchase-orders"><Button variant="outline"><ChevronLeft className="w-4 h-4 mr-2" />Kembali</Button></Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader><CardTitle>Header PO</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>No. PO</Label>
                <Input value={poId || ""} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Tanggal PO *</Label>
                <Input name="po_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <select name="supplier_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">— Pilih Supplier —</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Est. Tanggal Terima</Label>
                <Input name="expected_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label>Term Pembayaran</Label>
                <Input name="payment_terms" placeholder="Net 30" />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi / Catatan</Label>
                <Input name="notes" placeholder="Catatan untuk supplier..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Item PO</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => {}}>
              <Plus className="w-4 h-4 mr-1" />Tambah Item
            </Button>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Bahan", "Qty", "Satuan", "Harga Satuan", "Subtotal", ""].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-sm font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400 text-sm">
                    Klik "Tambah Item" untuk menambahkan baris
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={4} className="py-2 px-3 text-right font-semibold text-sm">TOTAL</td>
                  <td className="py-2 px-3 font-bold text-sm">{formatRupiah(0)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/purchasing/purchase-orders"><Button variant="outline" type="button">Batal</Button></Link>
          <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Menyimpan..." : "Simpan Perubahan"}</Button>
        </div>
      </form>
    </div>
  );
}
