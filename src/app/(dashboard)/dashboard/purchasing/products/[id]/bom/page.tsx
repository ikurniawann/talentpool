"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { ChevronLeft, Plus, Save } from "lucide-react";

export default function BOMEditorPage() {
  const { id } = useParams();
  const productId = id as string;
  // TODO: fetch product & BOM items

  return (
    <div className="space-y-6 max-w-5xl">
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Produk", href: "/dashboard/purchasing/products" },
        { label: productId, href: `/dashboard/purchasing/products/${productId}` },
        { label: "BOM Editor" },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bill of Materials</h1>
        <Link href={`/dashboard/purchasing/products/${productId}`}><Button variant="outline"><ChevronLeft className="w-4 h-4 mr-2" />Kembali</Button></Link>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Komponen BOM</CardTitle>
          <Button type="button" variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Tambah Komponen</Button>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Bahan Baku", "Qty", "Satuan", "Harga Satuan", "Subtotal"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-sm font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400 text-sm">
                  Belum ada komponen BOM. Klik &quot;Tambah Komponen&quot; untuk menambahkan.
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={4} className="py-2 px-3 text-right font-semibold text-sm">TOTAL HPP</td>
                <td className="py-2 px-3 font-bold text-sm">Rp 0</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={`/dashboard/purchasing/products/${productId}`}><Button variant="outline" type="button">Batal</Button></Link>
        <Button><Save className="w-4 h-4 mr-2" />Simpan BOM</Button>
      </div>
    </div>
  );
}
