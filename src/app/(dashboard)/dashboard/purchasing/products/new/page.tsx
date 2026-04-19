"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { ChevronLeft, Save } from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // TODO: POST /api/purchasing/products
    setTimeout(() => { setLoading(false); router.push("/dashboard/purchasing/products"); }, 1000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Produk", href: "/dashboard/purchasing/products" },
          { label: "Tambah Produk" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tambah Produk</h1>
        <Link href="/dashboard/purchasing/products"><Button variant="outline"><ChevronLeft className="w-4 h-4 mr-2" />Kembali</Button></Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader><CardTitle>Informasi Produk</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode Produk *</Label>
                <Input name="code" placeholder="Auto-generate" disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Nama Produk *</Label>
                <Input name="name" placeholder="Nama produk jadi" required />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Input name="category" placeholder="Kategori produk" />
              </div>
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input name="unit" placeholder="pcs, kg, dll" />
              </div>
              <div className="space-y-2">
                <Label>Harga Jual</Label>
                <Input name="selling_price" type="number" placeholder="0" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/purchasing/products"><Button variant="outline" type="button">Batal</Button></Link>
          <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </form>
    </div>
  );
}
