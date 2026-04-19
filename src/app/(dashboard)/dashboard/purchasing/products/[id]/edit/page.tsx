"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { ChevronLeft, Save } from "lucide-react";

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // TODO: PUT /api/purchasing/products/[id]
    setTimeout(() => { setLoading(false); router.push("/dashboard/purchasing/products"); }, 1000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Produk", href: "/dashboard/purchasing/products" },
        { label: id as string, href: `/dashboard/purchasing/products/${id}` },
        { label: "Edit" },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Produk</h1>
        <Link href={`/dashboard/purchasing/products/${id}`}><Button variant="outline"><ChevronLeft className="w-4 h-4 mr-2" />Kembali</Button></Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader><CardTitle>Informasi Produk</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode</Label>
                <Input name="code" disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Nama Produk *</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Input name="category" />
              </div>
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input name="unit" />
              </div>
              <div className="space-y-2">
                <Label>Harga Jual</Label>
                <Input name="selling_price" type="number" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/dashboard/purchasing/products/${id}`}><Button variant="outline" type="button">Batal</Button></Link>
          <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </form>
    </div>
  );
}
