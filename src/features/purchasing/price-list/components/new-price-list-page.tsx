"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, DollarSign, Calendar, Package } from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/datepicker";
import { NumericInput } from "@/components/ui/numeric-input";
import { SupplierPriceListFormData } from "@/types/purchasing";
import { usePriceListFormData } from "../queries";
import { useCreatePriceList } from "../mutations";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function NewPriceListPage() {
  const router = useRouter();
  const formDataQuery = usePriceListFormData();
  const suppliers = formDataQuery.data?.suppliers ?? [];
  const materials = formDataQuery.data?.materials ?? [];
  const units = formDataQuery.data?.units ?? [];
  const loading = formDataQuery.isLoading;
  const createMutation = useCreatePriceList();
  const isSubmitting = createMutation.isPending;

  const [formData, setFormData] = useState<SupplierPriceListFormData>({
    supplier_id: "",
    bahan_baku_id: "",
    harga: 0,
    satuan_id: "",
    minimum_qty: 1,
    lead_time_days: 0,
    is_preferred: false,
    berlaku_dari: "",
    berlaku_sampai: "",
    catatan: "",
  });

  useEffect(() => {
    if (formDataQuery.isError) {
      console.error("Error loading data:", formDataQuery.error);
      toast.error("Gagal memuat data");
    }
  }, [formDataQuery.isError, formDataQuery.error]);

  const selectedUnitLabel = units.find((unit) => unit.id === formData.satuan_id)?.simbol ||
    units.find((unit) => unit.id === formData.satuan_id)?.nama ||
    "Unit";
  const selectedMaterial = materials.find((material) => material.id === formData.bahan_baku_id);
  const convertedUnits = selectedMaterial?.unit_conversions?.filter((conversion) => conversion.is_active !== false) || [];
  const unitOptions = convertedUnits.length > 0
    ? convertedUnits.map((conversion) => {
        const unit = conversion.satuan || units.find((item) => item.id === conversion.satuan_id);
        return {
          value: conversion.satuan_id,
          label: unit?.nama || "Satuan",
          description: conversion.is_base ? "Satuan dasar" : `1 ${unit?.simbol || unit?.kode || unit?.nama || "unit"} = ${conversion.qty_in_base_unit}`,
        };
      })
    : units.map((u) => ({ value: u.id, label: u.nama, description: u.simbol }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      toast.error("Supplier wajib dipilih");
      return;
    }
    if (!formData.bahan_baku_id) {
      toast.error("Bahan baku wajib dipilih");
      return;
    }
    if (!formData.satuan_id) {
      toast.error("Satuan wajib dipilih");
      return;
    }

    // Ensure numeric fields are numbers and omit empty optional fields
    const payload: SupplierPriceListFormData = {
      supplier_id: formData.supplier_id,
      bahan_baku_id: formData.bahan_baku_id,
      harga: Number(formData.harga),
      satuan_id: formData.satuan_id || undefined,
      minimum_qty: Number(formData.minimum_qty),
      lead_time_days: Number(formData.lead_time_days),
      is_preferred: formData.is_preferred,
    };

    // Add optional fields only if they have values
    if (formData.berlaku_dari) {
      // Ensure date format is YYYY-MM-DD
      const dateStr = formData.berlaku_dari;
      payload.berlaku_dari = dateStr.length === 10 ? dateStr : new Date(dateStr).toISOString().split('T')[0];
    }
    if (formData.berlaku_sampai) {
      const dateStr = formData.berlaku_sampai;
      payload.berlaku_sampai = dateStr.length === 10 ? dateStr : new Date(dateStr).toISOString().split('T')[0];
    }
    if (formData.catatan && formData.catatan.trim()) {
      payload.catatan = formData.catatan.trim();
    }

    try {
      await createMutation.mutateAsync(payload);
      toast.success("Price list berhasil ditambahkan");
      router.push("/dashboard/purchasing/price-list");
    } catch (error: unknown) {
      console.error("Error creating price list:", error);
      toast.error(getErrorMessage(error, "Gagal menambahkan price list"));
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
        <Link href="/dashboard/purchasing/price-list">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Price List Baru</h1>
          <p className="text-sm text-gray-500">Isi detail harga supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Full Column Layout */}
        <div className="space-y-6">
          
          {/* Card 1: Supplier & Bahan Baku */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Supplier & Bahan Baku
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="supplier" className="text-xs">Supplier <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={suppliers.map((s) => ({ value: s.id, label: s.nama_supplier, description: s.kota || undefined }))}
                    value={formData.supplier_id}
                    onChange={(v) => setFormData((prev) => ({ ...prev, supplier_id: v }))}
                    placeholder="Pilih supplier..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Supplier tidak ditemukan"
                    allowClear
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bahan_baku" className="text-xs">Bahan Baku <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={materials.map((m) => ({ value: m.id, label: m.nama, description: m.kode }))}
                    value={formData.bahan_baku_id}
                    onChange={(v) => {
                      const material = materials.find((item) => item.id === v);
                      const defaultUnitId =
                        material?.unit_conversions?.find((conversion) => conversion.is_base)?.satuan_id ||
                        material?.unit_conversions?.[0]?.satuan_id ||
                        "";
                      setFormData((prev) => ({ ...prev, bahan_baku_id: v, satuan_id: defaultUnitId }));
                    }}
                    placeholder="Pilih bahan baku..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Bahan baku tidak ditemukan"
                    allowClear
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="satuan" className="text-xs">Satuan <span className="text-red-500">*</span></Label>
                <Combobox
                  options={unitOptions}
                  value={formData.satuan_id}
                  onChange={(v) => setFormData((prev) => ({ ...prev, satuan_id: v }))}
                  placeholder={formData.bahan_baku_id ? "Pilih satuan..." : "Pilih bahan baku dulu"}
                  searchPlaceholder="Cari..."
                  emptyMessage="Satuan belum dikonfigurasi di bahan baku"
                  disabled={!formData.bahan_baku_id}
                  allowClear
                  className="h-9 text-sm"
                />
                <p className="text-xs text-gray-500">
                  Pilihan satuan diambil dari konversi pada master bahan baku.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Pricing & Terms */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Harga & Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="harga" className="text-xs">Harga per Satuan <span className="text-red-500">*</span></Label>
                  <div className="flex rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                    <div className="flex min-w-12 items-center justify-center rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                      Rp
                    </div>
                    <NumericInput
                      id="harga"
                      min="0"
                      step="0.01"
                      value={formData.harga}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, harga: value }))}
                      decimalScale={0}
                      className="h-9 rounded-l-none border-0 text-sm font-mono shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minimum_qty" className="text-xs">Minimum Qty</Label>
                  <div className="flex rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                    <NumericInput
                      id="minimum_qty"
                      min="1"
                      value={formData.minimum_qty}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, minimum_qty: value || 1 }))}
                      decimalScale={4}
                      className="h-9 rounded-r-none border-0 text-sm shadow-none focus-visible:ring-0"
                    />
                    <div className="flex min-w-14 items-center justify-center rounded-r-lg border-l border-gray-200 bg-gray-50 px-3 text-xs font-semibold uppercase text-gray-500">
                      {selectedUnitLabel}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead_time" className="text-xs">Lead Time (hari)</Label>
                  <div className="flex rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                    <NumericInput
                      id="lead_time"
                      min="0"
                      value={formData.lead_time_days}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, lead_time_days: value }))}
                      decimalScale={0}
                      className="h-9 rounded-r-none border-0 text-sm shadow-none focus-visible:ring-0"
                    />
                    <div className="flex min-w-14 items-center justify-center rounded-r-lg border-l border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                      Hari
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Contract Price */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Contract Price
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="berlaku_dari" className="text-xs">Berlaku Dari</Label>
                  <DatePicker
                    value={formData.berlaku_dari}
                    onChange={(v) => setFormData((prev) => ({ ...prev, berlaku_dari: v }))}
                    placeholder="Dari..."
                    variant="neutral"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="berlaku_sampai" className="text-xs">Berlaku Sampai</Label>
                  <DatePicker
                    value={formData.berlaku_sampai}
                    onChange={(v) => setFormData((prev) => ({ ...prev, berlaku_sampai: v }))}
                    placeholder="Sampai..."
                    variant="neutral"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="catatan" className="text-xs">Catatan</Label>
                <Textarea
                  id="catatan"
                  value={formData.catatan}
                  onChange={(e) => setFormData((prev) => ({ ...prev, catatan: e.target.value }))}
                  placeholder="Catatan tambahan..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200/70 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="purchasing-secondary-button px-6">
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="purchasing-main-button px-6">
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan Price List"}
          </Button>
        </div>
      </form>
    </div>
  );
}
