"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { ArrowLeft, Save, Building2, User, FileText, MapPin, Phone, Mail } from "lucide-react";
import {
  SupplierFormData,
  PaymentTerms,
  Currency,
  PAYMENT_TERMS_OPTIONS,
  CURRENCY_OPTIONS,
  KOTA_OPTIONS,
  formatNPWP,
  validateNPWP,
} from "@/types/supplier";
import { createSupplier } from "@/lib/purchasing/supplier";
import { toast } from "sonner";

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nama_supplier: "",
    kode_supplier: "",
    kota: "",
    alamat: "",
    telepon: "",
    email: "",
    pic_name: "",
    pic_phone: "",
    pic_email: "",
    payment_terms: "TOP30" as PaymentTerms,
    currency: "IDR" as Currency,
    npwp: "",
    catatan: "",
  });

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    
    // Validasi field wajib (skip untuk draft)
    if (!saveAsDraft && (!formData.nama_supplier || !formData.kota)) {
      toast.error("Nama supplier dan kota wajib diisi");
      return;
    }

    // Validasi NPWP jika diisi
    if (formData.npwp && !validateNPWP(formData.npwp)) {
      toast.error("Format NPWP tidak valid. Gunakan format: XX.XXX.XXX.X-XXX.XXX");
      return;
    }

    // Mapping field dari form ke API schema
    const payload: any = {
      nama_supplier: formData.nama_supplier,
      kota: formData.kota,
      payment_terms: formData.payment_terms as PaymentTerms,
      currency: formData.currency as Currency,
      status: saveAsDraft ? "draft" : "active", // Add status field
    };

    // Add optional fields only if they have values
    if (formData.kode_supplier && formData.kode_supplier.trim()) {
      payload.kode_supplier = formData.kode_supplier.trim();
    }
    if (formData.pic_name && formData.pic_name.trim()) {
      payload.pic_name = formData.pic_name.trim();
    }
    if (formData.pic_phone && formData.pic_phone.trim()) {
      payload.pic_phone = formData.pic_phone.trim();
    }
    if (formData.email && formData.email.trim()) {
      payload.email = formData.email.trim();
    }
    if (formData.alamat && formData.alamat.trim()) {
      payload.alamat = formData.alamat.trim();
    }
    if (formData.npwp && formData.npwp.trim()) {
      payload.npwp = formData.npwp.trim();
    }

    setLoading(true);
    try {
      console.log("Submitting supplier payload:", payload);
      await createSupplier(payload);
      toast.success(saveAsDraft ? "Draft supplier berhasil disimpan" : "Supplier berhasil ditambahkan");
      router.push("/dashboard/purchasing/suppliers");
    } catch (error: any) {
      console.error("Error creating supplier:", error);
      // Log detailed error if available
      if (error.response) {
        const errorData = await error.response.json();
        console.error("API Error details:", errorData);
        toast.error(errorData.message || errorData.error || "Gagal menambahkan supplier");
      } else {
        toast.error(error.message || "Gagal menambahkan supplier");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/suppliers">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Supplier Baru</h1>
          <p className="text-sm text-gray-500">Isi detail supplier baru</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Full Column Layout - All Cards Stacked */}
        <div className="space-y-6">
          
          {/* Card 1: Informasi Supplier */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Informasi Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="kode" className="text-xs">Kode Supplier</Label>
                  <Input
                    id="kode"
                    value={formData.kode_supplier}
                    onChange={(e) => setFormData({ ...formData, kode_supplier: e.target.value })}
                    placeholder="Auto-generate"
                    className="h-9 text-sm bg-gray-50"
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kota" className="text-xs">Kota <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={KOTA_OPTIONS.map((k) => ({ value: k, label: k }))}
                    value={formData.kota}
                    onChange={(v) => setFormData({ ...formData, kota: v })}
                    placeholder="Pilih kota..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Kota tidak ditemukan"
                    allowClear
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nama" className="text-xs">Nama Supplier <span className="text-red-500">*</span></Label>
                <Input
                  id="nama"
                  value={formData.nama_supplier}
                  onChange={(e) => setFormData({ ...formData, nama_supplier: e.target.value })}
                  placeholder="Contoh: PT Sari Laut"
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="alamat" className="text-xs">Alamat Lengkap</Label>
                <Textarea
                  id="alamat"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Jl. Contoh No. 123, Kota"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Kontak Supplier */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Kontak Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="telepon" className="text-xs">Telepon</Label>
                  <Input
                    id="telepon"
                    value={formData.telepon}
                    onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                    placeholder="021-xxxxxxx"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@supplier.com"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Kontak PIC */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Kontak PIC (Person In Charge)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pic_name" className="text-xs">Nama PIC</Label>
                  <Input
                    id="pic_name"
                    value={formData.pic_name}
                    onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                    placeholder="Nama lengkap"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pic_phone" className="text-xs">Telepon PIC</Label>
                  <Input
                    id="pic_phone"
                    value={formData.pic_phone}
                    onChange={(e) => setFormData({ ...formData, pic_phone: e.target.value })}
                    placeholder="08xx-xxxx-xxxx"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pic_email" className="text-xs">Email PIC</Label>
                  <Input
                    id="pic_email"
                    type="email"
                    value={formData.pic_email}
                    onChange={(e) => setFormData({ ...formData, pic_email: e.target.value })}
                    placeholder="pic@supplier.com"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Terms & Administrasi */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Payment Terms & Administrasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="payment_terms" className="text-xs">Payment Terms <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={PAYMENT_TERMS_OPTIONS.map((pt) => ({ value: pt, label: pt }))}
                    value={formData.payment_terms}
                    onChange={(v) => setFormData({ ...formData, payment_terms: v as PaymentTerms })}
                    placeholder="Pilih terms..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ditemukan"
                    allowClear
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs">Mata Uang <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={CURRENCY_OPTIONS.map((c) => ({ value: c, label: c }))}
                    value={formData.currency}
                    onChange={(v) => setFormData({ ...formData, currency: v as Currency })}
                    placeholder="Pilih currency..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ditemukan"
                    allowClear
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="npwp" className="text-xs">NPWP</Label>
                <Input
                  id="npwp"
                  value={formData.npwp}
                  onChange={(e) => setFormData({ ...formData, npwp: formatNPWP(e.target.value) })}
                  placeholder="XX.XXX.XXX.X-XXX.XXX"
                  maxLength={20}
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="catatan" className="text-xs">Catatan Tambahan</Label>
                <Textarea
                  id="catatan"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Informasi tambahan tentang supplier..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()} className="px-6">
            Batal
          </Button>
          <Button type="button" variant="outline" onClick={(e) => handleSubmit(e, true)} className="px-6" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            Simpan Draft
          </Button>
          <Button type="submit" disabled={loading} className="px-6 bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Menyimpan..." : "Simpan Supplier"}
          </Button>
        </div>
      </form>
    </div>
  );
}
