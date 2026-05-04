"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { ArrowLeft, Save, Building2, User, FileText, Phone } from "lucide-react";
import {
  SupplierFormData,
  PaymentTerms,
  Currency,
  PAYMENT_TERMS_OPTIONS,
  CURRENCY_OPTIONS,
  KOTA_OPTIONS,
  formatNPWP,
  getPaymentTermsLabel,
} from "@/types/supplier";
import { getSupplier, updateSupplier } from "@/lib/purchasing/supplier";
import { toast } from "sonner";

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    loadSupplier();
  }, [supplierId]);

  const loadSupplier = async () => {
    try {
      const data = await getSupplier(supplierId);
      setFormData({
        nama_supplier: data.nama_supplier || "",
        kode_supplier: data.kode_supplier || "",
        kota: data.kota || "",
        alamat: data.alamat || "",
        telepon: data.telepon || "",
        email: data.email || "",
        pic_name: data.pic_name || "",
        pic_phone: data.pic_phone || "",
        pic_email: data.pic_email || "",
        payment_terms: (data.payment_terms as PaymentTerms) || "TOP30",
        currency: (data.currency as Currency) || "IDR",
        npwp: data.npwp || "",
        catatan: data.catatan || "",
      });
    } catch (error) {
      console.error("Error loading supplier:", error);
      toast.error("Gagal memuat data supplier");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama_supplier || !formData.kota) {
      toast.error("Nama supplier dan kota wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSupplier(supplierId, formData);
      toast.success("Supplier berhasil diupdate");
      router.push("/dashboard/purchasing/suppliers");
    } catch (error: any) {
      console.error("Error updating supplier:", error);
      toast.error(error.message || "Gagal mengupdate supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center text-gray-500">Memuat data...</div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Edit Supplier</h1>
          <p className="text-sm text-gray-500">Update detail supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Full Column Layout */}
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
                    disabled
                    className="h-9 text-sm bg-gray-50"
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
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pic_phone" className="text-xs">Telepon PIC</Label>
                  <Input
                    id="pic_phone"
                    value={formData.pic_phone}
                    onChange={(e) => setFormData({ ...formData, pic_phone: e.target.value })}
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
          <Button type="submit" disabled={isSubmitting} className="px-6">
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
