"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { ChevronLeft, Save } from "lucide-react";

export default function NewRawMaterialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // TODO: POST /api/purchasing/raw-materials
    setTimeout(() => { setLoading(false); router.push("/dashboard/purchasing/raw-materials"); }, 1000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Bahan Baku", href: "/dashboard/purchasing/raw-materials" },
          { label: "Tambah Bahan" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tambah Bahan Baku</h1>
        <Link href="/dashboard/purchasing/raw-materials"><Button variant="outline"><ChevronLeft className="w-4 h-4 mr-2" />Kembali</Button></Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader><CardTitle>Informasi Bahan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode Bahan *</Label>
                <Input name="code" placeholder="Auto-generate" disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Nama Bahan *</Label>
                <Input name="name" placeholder="Nama bahan baku" required />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Input name="category" placeholder="Kategori bahan" />
              </div>
              <div className="space-y-2">
                <Label>Satuan *</Label>
                <Select name="unit" required>
                  <SelectTrigger><SelectValue placeholder="— Pilih Satuan —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">gram</SelectItem>
                    <SelectItem value="L">Liter</SelectItem>
                    <SelectItem value="mL">mL</SelectItem>
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="roll">roll</SelectItem>
                    <SelectItem value="lembar">lembar</SelectItem>
                    <SelectItem value="m">meter</SelectItem>
                    <SelectItem value="pack">pack</SelectItem>
                    <SelectItem value="drum">drum</SelectItem>
                    <SelectItem value="zak">zak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Minimum Stok</Label>
                <Input name="min_stock" type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Maksimum Stok</Label>
                <Input name="max_stock" type="number" placeholder="0" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/purchasing/raw-materials"><Button variant="outline" type="button">Batal</Button></Link>
          <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </form>
    </div>
  );
}
