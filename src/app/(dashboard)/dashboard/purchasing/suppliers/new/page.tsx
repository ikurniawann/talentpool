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

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // TODO: POST /api/purchasing/suppliers
    setTimeout(() => { setLoading(false); router.push("/dashboard/purchasing/suppliers"); }, 1000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Supplier", href: "/dashboard/purchasing/suppliers" },
          { label: "Tambah Supplier" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Supplier</h1>
          <p className="text-sm text-gray-500">Form penambahan supplier baru</p>
        </div>
        <Link href="/dashboard/purchasing/suppliers"><Button variant="outline"><ChevronLeft className="w-4 h-4 mr-2" />Kembali</Button></Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader><CardTitle>Informasi Supplier</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode Supplier *</Label>
                <Input name="code" placeholder="Auto-generate" disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Nama Supplier *</Label>
                <Input name="name" placeholder="Nama lengkap supplier" required />
              </div>
              <div className="space-y-2">
                <Label>Jenis Supplier</Label>
                <Select name="type">
                  <SelectTrigger><SelectValue placeholder="— Pilih Jenis —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="wholesaler">Wholesaler</SelectItem>
                    <SelectItem value="retailer">Retailer</SelectItem>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="importer">Importer</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue="active">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="probation">Masa Percobaan</SelectItem>
                    <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" placeholder="supplier@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input name="phone" placeholder="021-xxxx" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input name="address" placeholder="Alamat lengkap supplier" />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader><CardTitle>Informasi Kontak</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Kontak</Label>
                <Input name="contact_name" placeholder="Nama kontak person" />
              </div>
              <div className="space-y-2">
                <Label>Jabatan</Label>
                <Input name="contact_title" placeholder="Jabatan kontak person" />
              </div>
              <div className="space-y-2">
                <Label>Telepon Kontak</Label>
                <Input name="contact_phone" placeholder="Nomor telepon kontak" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/purchasing/suppliers"><Button variant="outline" type="button">Batal</Button></Link>
          <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </form>
    </div>
  );
}
