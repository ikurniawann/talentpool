"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { Combobox } from "@/components/ui/combobox";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  ChevronLeft,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  BOMItem,
  ProductWithCOGS,
  RawMaterialWithStock,
} from "@/types/purchasing";
import {
  createBOMItem,
  deleteBOMItem,
  getProduct,
  listBOMItems,
  listRawMaterials,
  updateBOMItem,
} from "@/lib/purchasing";

type BomDraft = {
  id: string;
  raw_material_id: string;
  qty_required: number;
  waste_factor: number;
  cost_per_unit: number;
  total_cost: number;
  persisted: boolean;
  isSaving?: boolean;
};

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function displayName(value?: string | null) {
  return (value || "-").replace(/\s+\d{8,}$/g, "").trim();
}

function getMaterialSmallUnitLabel(material?: RawMaterialWithStock) {
  return material?.satuan_kecil_nama || material?.satuan || "Unit";
}

function mapBomItem(item: BOMItem): BomDraft {
  const qtyRequired = toNumber(item.qty_required ?? item.qty_needed ?? item.qty);
  const wasteFactor = toNumber(item.waste_factor ?? ((item.waste_persen ?? 0) / 100));
  const costPerUnit = toNumber(item.cost_per_unit ?? item.cost);
  const totalCost = toNumber(item.total_cost ?? item.subtotal ?? costPerUnit * qtyRequired * (1 + wasteFactor));

  return {
    id: item.id,
    raw_material_id: item.raw_material_id,
    qty_required: qtyRequired,
    waste_factor: wasteFactor,
    cost_per_unit: costPerUnit,
    total_cost: totalCost,
    persisted: true,
  };
}

export default function BOMEditorPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const productId = id as string;
  const fromProduction = searchParams.get("from") === "production";

  const [product, setProduct] = useState<ProductWithCOGS | null>(null);
  const [materials, setMaterials] = useState<RawMaterialWithStock[]>([]);
  const [bomItems, setBomItems] = useState<BomDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);

  const materialMap = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials]
  );

  const totalHpp = bomItems.reduce((sum, item) => sum + item.total_cost, 0);
  const wipCount = bomItems.filter((item) => materialMap.get(item.raw_material_id)?.material_type === "WIP").length;
  const rawCount = bomItems.length - wipCount;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [productData, bomData, materialsData] = await Promise.all([
        getProduct(productId),
        listBOMItems(productId),
        listRawMaterials({ is_active: true, limit: 200 }),
      ]);

      setProduct(productData);
      setBomItems(bomData.map(mapBomItem));
      setMaterials(
        materialsData.data.filter((material) => material.source_product_id !== productId)
      );
    } catch (error: unknown) {
      console.error("Error loading BOM:", error);
      toast.error(getErrorMessage(error, "Gagal memuat BOM"));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function recalculate(item: BomDraft, materialId = item.raw_material_id) {
    const material = materialMap.get(materialId);
    const costPerUnit = toNumber(material?.avg_cost ?? material?.harga_avg ?? material?.harga_terakhir);
    const totalCost = costPerUnit * item.qty_required * (1 + item.waste_factor);

    return {
      ...item,
      raw_material_id: materialId,
      cost_per_unit: costPerUnit,
      total_cost: totalCost,
    };
  }

  function addItem() {
    setBomItems((items) => [
      ...items,
      recalculate({
        id: crypto.randomUUID(),
        raw_material_id: "",
        qty_required: 1,
        waste_factor: 0,
        cost_per_unit: 0,
        total_cost: 0,
        persisted: false,
      }),
    ]);
  }

  function updateItem(id: string, changes: Partial<BomDraft>) {
    setBomItems((items) =>
      items.map((item) =>
        item.id === id ? recalculate({ ...item, ...changes }, changes.raw_material_id) : item
      )
    );
  }

  async function saveItem(item: BomDraft) {
    if (!item.raw_material_id) {
      toast.error("Bahan baku wajib dipilih");
      return;
    }
    if (item.qty_required <= 0) {
      toast.error("Qty harus lebih dari 0");
      return;
    }

    setBomItems((items) =>
      items.map((current) => current.id === item.id ? { ...current, isSaving: true } : current)
    );

    try {
      const payload = {
        raw_material_id: item.raw_material_id,
        qty_required: item.qty_required,
        waste_factor: item.waste_factor,
      };

      if (item.persisted) {
        await updateBOMItem(item.id, payload);
      } else {
        const created = await createBOMItem(productId, payload);
        setBomItems((items) =>
          items.map((current) => current.id === item.id ? mapBomItem(created) : current)
        );
      }

      toast.success("BOM berhasil disimpan");
      await loadData();
    } catch (error: unknown) {
      console.error("Error saving BOM item:", error);
      toast.error(getErrorMessage(error, "Gagal menyimpan BOM"));
      setBomItems((items) =>
        items.map((current) => current.id === item.id ? { ...current, isSaving: false } : current)
      );
    }
  }

  async function removeItem(item: BomDraft) {
    if (!item.persisted) {
      setBomItems((items) => items.filter((current) => current.id !== item.id));
      return;
    }

    try {
      await deleteBOMItem(item.id);
      setBomItems((items) => items.filter((current) => current.id !== item.id));
      toast.success("Bahan dihapus dari BOM");
    } catch (error: unknown) {
      console.error("Error deleting BOM item:", error);
      toast.error(getErrorMessage(error, "Gagal menghapus BOM"));
    }
  }

  async function saveAll() {
    setSavingAll(true);
    try {
      for (const item of bomItems) {
        await saveItem(item);
      }
      toast.success("Semua BOM tersimpan");
    } finally {
      setSavingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-sm text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Memuat BOM...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Produk", href: "/dashboard/purchasing/products" },
        { label: displayName(product?.nama) || productId, href: `/dashboard/purchasing/products/${productId}` },
        { label: "Recipe / BOM" },
      ]} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipe / BOM</h1>
          <p className="text-sm text-gray-500">
            {displayName(product?.nama)} · Total HPP {formatRupiah(totalHpp)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href={fromProduction ? "/dashboard/purchasing/production/recipes" : `/dashboard/purchasing/products/${productId}`}>
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Komponen Recipe</CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              Raw material dan WIP bisa dipakai sebagai komponen. WIP dari produk yang sama otomatis disembunyikan.
            </p>
          </div>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="border-pink-200 text-pink-700 hover:bg-pink-50"
            >
              <Plus className="mr-1 h-4 w-4" />
              Tambah Bahan
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-gray-500">Total Komponen</p>
                <p className="mt-1 text-lg font-semibold text-gray-950">{bomItems.length}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-medium text-emerald-700">Raw Material</p>
                <p className="mt-1 text-lg font-semibold text-emerald-800">{rawCount}</p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3">
                <p className="text-xs font-medium text-sky-700">WIP</p>
                <p className="mt-1 text-lg font-semibold text-sky-800">{wipCount}</p>
              </div>
            </div>
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-gray-200/70 bg-gray-50">
                <tr>
                  {["Bahan Baku", "Qty", "Waste (%)", "Harga Satuan", "Subtotal", "Aksi"].map((heading) => (
                    <th key={heading} className="px-3 py-2 text-left text-sm font-medium text-gray-600">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bomItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Belum ada komponen BOM. Klik &quot;Tambah Bahan&quot; untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  bomItems.map((item) => {
                    const material = materialMap.get(item.raw_material_id);
                    return (
                      <tr key={item.id} className="border-b border-gray-200/70 align-top">
                        <td className="px-3 py-3">
                          <Combobox
                            options={materials.map((materialOption) => ({
                              value: materialOption.id,
                              label: displayName(materialOption.nama),
                              description: `${materialOption.material_type === "WIP" ? "WIP" : "Raw"} · ${materialOption.kode}`,
                            }))}
                            value={item.raw_material_id}
                            onChange={(value) => updateItem(item.id, { raw_material_id: value })}
                            placeholder="Pilih bahan..."
                            searchPlaceholder="Cari bahan..."
                            emptyMessage="Bahan tidak ditemukan"
                            allowClear
                            className="min-w-[260px]"
                          />
                          {material && (
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                              <span>{material.kode}</span>
                              {material.material_type === "WIP" && (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                                  WIP
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Label className="sr-only">Qty</Label>
                          <div className="flex w-40 rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                            <NumericInput
                              min="0"
                              step="0.0001"
                              value={item.qty_required}
                              onValueChange={(value) => updateItem(item.id, { qty_required: value })}
                              decimalScale={4}
                              className="h-9 rounded-r-none border-0 text-sm shadow-none focus-visible:ring-0"
                            />
                            <div className="flex min-w-14 items-center justify-center rounded-r-lg border-l border-gray-200 bg-gray-50 px-3 text-xs font-semibold uppercase text-gray-500">
                              {getMaterialSmallUnitLabel(material)}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Label className="sr-only">Waste</Label>
                          <div className="flex w-32 rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                            <NumericInput
                              min="0"
                              max="100"
                              step="0.1"
                              value={Math.round(item.waste_factor * 10000) / 100}
                              onValueChange={(value) => updateItem(item.id, { waste_factor: value / 100 })}
                              decimalScale={2}
                              className="h-9 rounded-r-none border-0 text-sm shadow-none focus-visible:ring-0"
                            />
                            <div className="flex min-w-10 items-center justify-center rounded-r-lg border-l border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                              %
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex w-36 rounded-lg border border-gray-300 bg-gray-50">
                            <div className="flex min-w-12 items-center justify-center rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                              Rp
                            </div>
                            <NumericInput
                              value={item.cost_per_unit}
                              onValueChange={() => undefined}
                              decimalScale={0}
                              disabled
                              className="h-9 rounded-l-none border-0 bg-gray-50 text-sm font-mono shadow-none focus-visible:ring-0"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex w-36 rounded-lg border border-gray-300 bg-gray-50">
                            <div className="flex min-w-12 items-center justify-center rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                              Rp
                            </div>
                            <NumericInput
                              value={item.total_cost}
                              onValueChange={() => undefined}
                              decimalScale={0}
                              disabled
                              className="h-9 rounded-l-none border-0 bg-gray-50 text-sm font-mono shadow-none focus-visible:ring-0"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => saveItem(item)}
                              disabled={item.isSaving}
                            >
                              {item.isSaving ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="mr-1 h-4 w-4" />
                              )}
                              Simpan
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t border-gray-200/70 bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-right text-sm font-semibold">
                    TOTAL HPP
                  </td>
                  <td className="px-3 py-3 text-sm font-bold">{formatRupiah(totalHpp)}</td>
                  <td className="px-3 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={fromProduction ? "/dashboard/purchasing/production/recipes" : `/dashboard/purchasing/products/${productId}`}>
          <Button variant="outline" type="button">Batal</Button>
        </Link>
        <Button onClick={saveAll} disabled={savingAll || bomItems.length === 0}>
          {savingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Simpan Semua
        </Button>
      </div>
    </div>
  );
}
