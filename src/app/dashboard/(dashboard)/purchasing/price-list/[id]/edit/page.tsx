"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Supplier, RawMaterialWithStock, Unit, SupplierPriceListFormData } from "@/types/purchasing";
import { listSuppliers, listRawMaterials, listUnits, getPriceList, updatePriceList } from "@/lib/purchasing";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function EditPriceListPage() {
  const router = useRouter();
  const params = useParams();
  const priceListId = params.id as string;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterialWithStock[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const loadData = useCallback(async () => {
    try {
      const [suppliersData, materialsData, unitsData, priceList] = await Promise.all([
        listSuppliers({ is_active: true }),
        listRawMaterials({ limit: 100, is_active: true }),
        listUnits(),
        getPriceList(priceListId),
      ]);

      setSuppliers(suppliersData);
      setMaterials(materialsData.data);
      setUnits(unitsData.data || []);
      setFormData({
        supplier_id: priceList.supplier_id || "",
        bahan_baku_id: priceList.bahan_baku_id || "",
        harga: priceList.harga || 0,
        satuan_id: priceList.satuan_id || "",
        minimum_qty: priceList.minimum_qty || 1,
        lead_time_days: priceList.lead_time_days || 0,
        is_preferred: priceList.is_preferred || false,
        berlaku_dari: priceList.berlaku_dari ? priceList.berlaku_dari.split("T")[0] : "",
        berlaku_sampai: priceList.berlaku_sampai ? priceList.berlaku_sampai.split("T")[0] : "",
        catatan: priceList.catatan || "",
      });
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data price list");
    } finally {
      setLoading(false);
    }
  }, [priceListId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

    setIsSubmitting(true);
    try {
      await updatePriceList(priceListId, formData);
      toast.success("Price list berhasil diupdate");
      router.push("/dashboard/purchasing/price-list");
    } catch (error: unknown) {
      console.error("Error updating price list:", error);
      toast.error(getErrorMessage(error, "Gagal mengupdate price list"));
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
        <Link href="/dashboard/purchasing/price-list">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Price List</h1>
          <p className="text-sm text-gray-500">Update harga supplier</p>
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
                    options={suppliers.map((s) => ({ value: s.id, label: s.nama_supplier, description: s.kota }))}
                    value={formData.supplier_id}
                    onChange={(v) => setFormData({ ...formData, supplier_id: v })}
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
                      setFormData({ ...formData, bahan_baku_id: v, satuan_id: defaultUnitId });
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
                  onChange={(v) => setFormData({ ...formData, satuan_id: v })}
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

          {/* Card 3: Validity & Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Validity & Catatan
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
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
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
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
