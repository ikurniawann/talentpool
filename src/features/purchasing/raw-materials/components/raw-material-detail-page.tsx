"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ITEMS_RAW_MATERIALS_PATH } from "@/modules/purchasing/constants/items-nav";
import { ArrowLeft, Package, AlertCircle, Edit, Trash2, Boxes, Banknote, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { RawMaterialWithStock } from "@/types/purchasing";
import {
  useRawMaterial,
  useRawMaterialCategoryOptions,
  useStorageConditionOptions,
} from "../queries";
import { useDeleteRawMaterial } from "../mutations";
import {
  buildLookupLabelMap,
  resolveCategoryLabel,
  resolveStorageLabel,
} from "../master-lookups";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function RawMaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id as string;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const materialQuery = useRawMaterial(materialId);
  const categoriesQuery = useRawMaterialCategoryOptions();
  const storageQuery = useStorageConditionOptions();
  const categoryMap = buildLookupLabelMap(categoriesQuery.data);
  const storageMap = buildLookupLabelMap(storageQuery.data);
  const material = materialQuery.data ?? null;
  const loading = materialQuery.isLoading;
  const deleteMutation = useDeleteRawMaterial();

  const handleDelete = async () => {
    if (!material) return;
    try {
      await deleteMutation.mutateAsync(material.id);
      toast.success("Bahan baku berhasil dinonaktifkan");
      setIsDeleteDialogOpen(false);
      router.push(ITEMS_RAW_MATERIALS_PATH);
    } catch (error: unknown) {
      console.error("Error deleting material:", error);
      toast.error(getErrorMessage(error, "Gagal menghapus bahan baku"));
    }
  };

  const formatCurrency = (num: number | undefined | null) => {
    if (num === undefined || num === null) return "Rp 0";
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString("id-ID", { maximumFractionDigits: 4 });
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "AMAN":
        return <Badge className="bg-green-100 text-green-800">Aman</Badge>;
      case "MENIPIS":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1 inline" />
            Menipis
          </Badge>
        );
      case "HABIS":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1 inline" />
            Habis
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCategoryLabel = (category?: string) =>
    resolveCategoryLabel(category, categoryMap);

  const satuanBesarName = material?.satuan_besar_nama || material?.satuan_besar?.nama || "-";
  const satuanKecilName = material?.satuan_kecil_nama || "-";
  const storageLabel = resolveStorageLabel(material?.storage_condition, storageMap);
  const unitConversions = material?.unit_conversions?.filter((conversion) => conversion.is_active !== false) || [];
  const baseConversion = unitConversions.find((conversion) => conversion.is_base) || unitConversions[0];
  const baseUnitLabel =
    baseConversion?.satuan?.simbol ||
    baseConversion?.satuan?.kode ||
    baseConversion?.satuan?.nama ||
    (material?.satuan_kecil_id ? satuanKecilName : satuanBesarName);
  const alternativeConversions = unitConversions.filter((conversion) => !conversion.is_base);

  const getConversionUnitLabel = (conversion: NonNullable<RawMaterialWithStock["unit_conversions"]>[number]) => (
    conversion.satuan?.simbol || conversion.satuan?.kode || conversion.satuan?.nama || "-"
  );

  const getConversionUnitName = (conversion: NonNullable<RawMaterialWithStock["unit_conversions"]>[number]) => (
    conversion.satuan?.nama || getConversionUnitLabel(conversion)
  );

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Memuat data...</div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-red-500">Bahan baku tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{material.nama}</h1>
            {getStockStatusBadge(material.status_stok || "")}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">{material.kode}</span>
            <span className="text-gray-300">•</span>
            <span>{getCategoryLabel(material.kategori)}</span>
            <span className="text-gray-300">•</span>
            <span>{satuanBesarName}</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href={ITEMS_RAW_MATERIALS_PATH}>
            <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <Link href={`${ITEMS_RAW_MATERIALS_PATH}/edit/${material.id}`}>
            <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(true)} className="h-10 w-full rounded-lg border-red-200 bg-white px-3 text-sm font-medium text-red-600 shadow-sm hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700 sm:w-auto">
            <Trash2 className="w-4 h-4 mr-2" />
            Hapus
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                <Boxes className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Qty Onhand</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(material.qty_onhand)} {satuanBesarName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Stok Minimum</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(material.stok_minimum)} {satuanBesarName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Settings2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Stok Maksimum</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(material.stok_maximum)} {satuanBesarName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Banknote className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Average Cost</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(material.avg_cost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info" className="flex-col space-y-4">
        <TabsList
          variant="line"
          className="flex h-auto w-full justify-start gap-6 rounded-none border-b border-gray-200 bg-transparent p-0"
        >
          <TabsTrigger
            value="info"
            className="h-11 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-sm font-semibold text-gray-500 shadow-none data-active:border-pink-600 data-active:!bg-transparent data-active:text-pink-700 data-active:shadow-none"
          >
            Informasi
          </TabsTrigger>
          <TabsTrigger
            value="stock"
            className="h-11 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-sm font-semibold text-gray-500 shadow-none data-active:border-pink-600 data-active:!bg-transparent data-active:text-pink-700 data-active:shadow-none"
          >
            Stok & Harga
          </TabsTrigger>
          <TabsTrigger
            value="conversions"
            className="h-11 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-sm font-semibold text-gray-500 shadow-none data-active:border-pink-600 data-active:!bg-transparent data-active:text-pink-700 data-active:shadow-none"
          >
            Konversi Satuan
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Material Info */}
            <Card className="border-gray-200/70 shadow-sm lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-5 h-5" />
                  Informasi Bahan Baku
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Kode</p>
                    <p className="font-medium">{material.kode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kategori</p>
                    <p className="font-medium">{getCategoryLabel(material.kategori)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deskripsi</p>
                  <p>{material.deskripsi || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Satuan Besar</p>
                    <p className="font-medium">{satuanBesarName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Satuan Kecil</p>
                    <p className="font-medium">{satuanKecilName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Konversi</p>
                    <p className="font-medium">
                      {material.satuan_kecil_id
                        ? `1 ${satuanBesarName} = ${formatNumber(material.konversi_factor || 1)} ${satuanKecilName}`
                        : "Tidak ada konversi"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Penyimpanan</p>
                    <p className="font-medium">{storageLabel}</p>
                  </div>
                </div>
                {material.shelf_life_days && (
                  <div>
                    <p className="text-sm text-muted-foreground">Shelf Life</p>
                    <p className="font-medium">{material.shelf_life_days} hari</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Settings */}
            <Card className="border-gray-200/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pengaturan Stok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum</span>
                  <span className="font-medium">{formatNumber(material.stok_minimum)} {satuanBesarName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum</span>
                  <span className="font-medium">{formatNumber(material.stok_maximum)} {satuanBesarName}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock & Price Tab */}
        <TabsContent value="stock">
          <Card className="border-gray-200/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stok Real-time & Harga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Qty Onhand</p>
                  <p className="text-2xl font-bold">{formatNumber(material.qty_onhand)} {satuanBesarName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qty Reserved</p>
                  <p className="text-2xl font-bold">{formatNumber(material.qty_reserved)} {satuanBesarName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qty On Order</p>
                  <p className="text-2xl font-bold">{formatNumber(material.qty_on_order)} {satuanBesarName}</p>
                </div>
              </div>
              <div className="border-t border-gray-200/70 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Cost</span>
                  <span className="text-xl font-semibold">{formatCurrency(material.avg_cost)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unit Conversions Tab */}
        <TabsContent value="conversions" className="space-y-4">
          <Card className="border-gray-200/70 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Konversi Satuan</CardTitle>
                  <p className="mt-1 text-sm text-gray-500">
                    Daftar satuan yang bisa dipakai untuk pembelian, price list, dan referensi stok.
                  </p>
                </div>
                <Link href={`${ITEMS_RAW_MATERIALS_PATH}/edit/${material.id}`}>
                  <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Konversi
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Satuan dasar stok</p>
                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {baseConversion ? getConversionUnitName(baseConversion) : baseUnitLabel}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Nilai konversi dasar selalu dihitung sebagai 1 {baseUnitLabel}.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Konversi utama</p>
                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {material.satuan_kecil_id
                      ? `1 ${satuanBesarName} = ${formatNumber(material.konversi_factor || 1)} ${baseUnitLabel}`
                      : `1 ${satuanBesarName} = 1 ${baseUnitLabel}`}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">Diambil dari satuan besar dan faktor konversi utama bahan baku.</p>
                </div>
              </div>

              {alternativeConversions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center">
                  <p className="text-sm font-medium text-gray-700">Belum ada satuan alternatif</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Tambahkan satuan alternatif di halaman edit jika supplier menjual bahan ini dengan satuan berbeda.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200/70">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr className="border-b border-gray-200/70">
                        <th className="px-4 py-3">Satuan</th>
                        <th className="px-4 py-3">Isi Dalam Satuan Dasar</th>
                        <th className="px-4 py-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {alternativeConversions.map((conversion) => (
                        <tr key={conversion.id || conversion.satuan_id} className="hover:bg-gray-50/70">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{getConversionUnitName(conversion)}</div>
                            <div className="text-xs text-gray-500">{getConversionUnitLabel(conversion)}</div>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                            {formatNumber(conversion.qty_in_base_unit)} {baseUnitLabel}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            1 {getConversionUnitLabel(conversion)} = {formatNumber(conversion.qty_in_base_unit)} {baseUnitLabel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Nonaktifkan Bahan Baku?"
        description={`Apakah Anda yakin ingin menonaktifkan bahan baku "${material.nama}"?`}
        confirmLabel="Nonaktifkan"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
