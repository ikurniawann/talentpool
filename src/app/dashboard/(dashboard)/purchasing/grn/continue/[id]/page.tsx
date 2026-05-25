"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import { Combobox } from "@/components/ui/combobox";
import { NumericInput } from "@/components/ui/numeric-input";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  ClipboardDocumentCheckIcon,
  ArrowLeftIcon,
  TruckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface GrnItem {
  id: string;
  grn_id?: string;
  purchase_order_item_id?: string;
  raw_material_id: string;
  nama_bahan: string;
  qty_diterima: number;
  qty_ditolak: number;
  previous_qty_diterima: number;
  previous_qty_ditolak: number;
  kondisi: "baik" | "rusak" | "cacat";
  catatan: string;
  satuan?: string;
}

interface POItem {
  id: string;
  raw_material_id: string;
  nama_bahan: string;
  qty_ordered: number;
  qty_received: number;
  satuan?: string;
}

interface GRNData {
  id: string;
  nomor_grn: string;
  delivery_id: string;
  po_id?: string;
  purchase_order_id?: string;
  po_number: string;
  supplier_name: string;
  no_surat_jalan: string;
  delivery_number?: string;
  tanggal_penerimaan: string;
  status: string;
  catatan: string;
  items: GrnItem[];
  receive_count?: number;
  total_item_diterima?: number;
  total_item_ditolak?: number;
}

type ApiUnit = string | {
  nama?: string;
  nama_satuan?: string;
  kode?: string;
} | null;

type ApiRawMaterial = {
  nama?: string;
  nama_bahan?: string;
  kode?: string;
  satuan_besar?: ApiUnit;
} | null;

type ApiLineItem = {
  id: string;
  grn_id?: string;
  purchase_order_item_id?: string;
  raw_material_id?: string;
  nama_bahan?: string;
  qty_ordered?: number;
  qty_received?: number;
  qty_diterima?: number;
  qty_ditolak?: number;
  kondisi?: "baik" | "rusak" | "cacat";
  catatan?: string | null;
  raw_material?: {
    nama?: string;
    nama_bahan?: string;
    kode?: string;
    satuan_besar?: ApiUnit;
  } | null;
  satuan?: ApiUnit;
  purchase_order_item?: {
    id: string;
    raw_material_id?: string;
    qty_ordered?: number;
    qty_received?: number;
    raw_material?: ApiRawMaterial;
    satuan?: ApiUnit;
  } | null;
};

type ApiResponsePayload = {
  success?: boolean;
  message?: string;
  error?: string | { message?: string };
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQty(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 4,
  }).format(value);
}

function getUnitName(unit?: ApiUnit, fallback = "pcs") {
  if (!unit) return fallback;
  if (typeof unit === "string") return unit || fallback;
  return unit.nama || unit.nama_satuan || unit.kode || fallback;
}

function getMaterialName(rawMaterial?: ApiRawMaterial, fallback = "Bahan tidak ditemukan") {
  if (!rawMaterial) return fallback;
  return rawMaterial.nama || rawMaterial.nama_bahan || fallback;
}

function getStatusBadge(status: string) {
  const normalized = status || "pending";
  const labels: Record<string, string> = {
    pending: "Menunggu",
    partially_received: "Diterima Sebagian",
    received: "Diterima",
    rejected: "Ditolak",
  };

  const classes: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    partially_received: "border-orange-200 bg-orange-50 text-orange-700",
    received: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <Badge variant="outline" className={classes[normalized] || classes.pending}>
      {labels[normalized] || normalized}
    </Badge>
  );
}

export default function ContinueGrnPage() {
  const params = useParams();
  const router = useRouter();
  const grnId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grnData, setGrnData] = useState<GRNData | null>(null);
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [grnItems, setGrnItems] = useState<GrnItem[]>([]);
  const [formData, setFormData] = useState({
    tanggal_penerimaan: "",
    catatan: "",
  });

  const mapPOItem = useCallback((item: ApiLineItem): POItem => ({
    id: item.id,
    raw_material_id: item.raw_material_id || "",
    nama_bahan: item.nama_bahan || getMaterialName(item.raw_material),
    qty_ordered: toNumber(item.qty_ordered),
    qty_received: toNumber(item.qty_received),
    satuan: getUnitName(item.satuan || item.raw_material?.satuan_besar),
  }), []);

  const fetchPOItems = useCallback(async (poId: string) => {
    try {
      const res = await fetch(`/api/purchasing/po/${poId}/items`);
      const data = await res.json();

      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const items = (data.data as ApiLineItem[]).map(mapPOItem);
        setPoItems(items);
        return;
      }

      const fallbackRes = await fetch(`/api/purchasing/po/${poId}`);
      const fallbackData = await fallbackRes.json();
      if (fallbackData.data?.items && Array.isArray(fallbackData.data.items)) {
        setPoItems((fallbackData.data.items as ApiLineItem[]).map(mapPOItem));
      }
    } catch (e) {
      console.error("Failed to fetch PO items:", e);
    }
  }, [mapPOItem]);

  const fetchGrnData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch GRN detail
      const res = await fetch(`/api/purchasing/grn/${grnId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal memuat data GRN");
      }

      const grn = data.data as GRNData;
      const poId = grn.purchase_order_id || grn.po_id || "";
      setGrnData({ ...grn, po_id: poId });
      setFormData({
        tanggal_penerimaan: grn.tanggal_penerimaan || new Date().toISOString().split("T")[0],
        catatan: grn.catatan || "",
      });

      // Initialize GRN items with existing data
      if (grn.items && grn.items.length > 0) {
        const apiItems = grn.items as unknown as ApiLineItem[];
        const embeddedPoItems = apiItems
          .filter((item) => item.purchase_order_item)
          .map((item) => {
            const poItem = item.purchase_order_item!;
            return {
              id: poItem.id,
              raw_material_id: poItem.raw_material_id || item.raw_material_id || "",
              nama_bahan: getMaterialName(item.raw_material || poItem.raw_material),
              qty_ordered: toNumber(poItem.qty_ordered),
              qty_received: toNumber(poItem.qty_received),
              satuan: getUnitName(poItem.satuan || item.satuan || item.raw_material?.satuan_besar),
            };
          });

        if (embeddedPoItems.length > 0) {
          setPoItems(embeddedPoItems);
        }

        const mappedItems = apiItems.map((item) => {
          const poItem = item.purchase_order_item;
          const rawMaterial = item.raw_material || poItem?.raw_material;
          return {
          id: item.id,
          grn_id: item.grn_id,
          purchase_order_item_id: item.purchase_order_item_id,
          raw_material_id: item.raw_material_id || poItem?.raw_material_id || "",
          nama_bahan: item.nama_bahan || getMaterialName(rawMaterial),
          qty_diterima: 0,
          qty_ditolak: 0,
          previous_qty_diterima: toNumber(item.qty_diterima),
          previous_qty_ditolak: toNumber(item.qty_ditolak),
          kondisi: item.kondisi || "baik" as const,
          catatan: "",
          satuan: getUnitName(item.satuan || poItem?.satuan || rawMaterial?.satuan_besar),
          };
        });

        setGrnItems(mappedItems);

        if (poId) {
          await fetchPOItems(poId);
        } else {
          console.error("No PO ID found in GRN data", grn);
        }
      }
    } catch (error: unknown) {
      console.error("Fetch error:", error);
      toast.error(error instanceof Error ? error.message : "Gagal memuat data GRN");
    } finally {
      setLoading(false);
    }
  }, [fetchPOItems, grnId]);

  useEffect(() => {
    if (grnId) {
      fetchGrnData();
    }
  }, [fetchGrnData, grnId]);

  function updateGrnItem(index: number, field: keyof GrnItem, value: GrnItem[keyof GrnItem]) {
    setGrnItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  const itemRows = useMemo(() => grnItems.map((item) => {
    const poItem =
      poItems.find((p) => p.id === item.purchase_order_item_id) ||
      poItems.find((p) => p.raw_material_id === item.raw_material_id);
    const qtyOrdered = poItem?.qty_ordered || 0;
    const qtyReceived = poItem?.qty_received || 0;
    const remaining = Math.max(0, qtyOrdered - qtyReceived);
    const satuan = poItem?.satuan || item.satuan || "pcs";

    return {
      item,
      poItem,
      qtyOrdered,
      qtyReceived,
      remaining,
      satuan,
    };
  }), [grnItems, poItems]);

  const totals = useMemo(() => {
    return itemRows.reduce(
      (acc, row) => {
        acc.ordered += row.qtyOrdered;
        acc.received += row.qtyReceived;
        acc.remaining += row.remaining;
        acc.newReceived += row.item.qty_diterima;
        acc.rejected += row.item.qty_ditolak;
        return acc;
      },
      { ordered: 0, received: 0, remaining: 0, newReceived: 0, rejected: 0 }
    );
  }, [itemRows]);

  function fillAllRemaining() {
    setGrnItems((items) =>
      items.map((item) => {
        const poItem =
          poItems.find((p) => p.id === item.purchase_order_item_id) ||
          poItems.find((p) => p.raw_material_id === item.raw_material_id);
        const remaining = poItem ? Math.max(0, poItem.qty_ordered - poItem.qty_received) : 0;
        return { ...item, qty_diterima: remaining, qty_ditolak: 0, kondisi: "baik" };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate
      const validItems = grnItems.filter(
        (item) =>
          item.previous_qty_diterima + item.qty_diterima > 0 ||
          item.previous_qty_ditolak + item.qty_ditolak > 0
      );
      if (validItems.length === 0) {
        toast.error("Minimal 1 item harus diisi");
        setSaving(false);
        return;
      }

      // Calculate totals
      const totalDiterima = validItems.reduce((sum, item) => sum + item.qty_diterima, 0);
      const totalDitolak = validItems.reduce((sum, item) => sum + item.qty_ditolak, 0);

      // Determine new status
      let newStatus = "pending";
      const totalOrdered = poItems.reduce((sum, item) => sum + item.qty_ordered, 0);
      const totalAlreadyReceived = poItems.reduce((sum, item) => sum + item.qty_received, 0);
      const newTotalReceived = totalAlreadyReceived + totalDiterima;

      if (totalDiterima === 0 && totalDitolak > 0) {
        newStatus = "rejected";
      } else if (newTotalReceived >= totalOrdered && totalDitolak === 0) {
        newStatus = "received";
      } else if (totalDiterima > 0) {
        newStatus = "partially_received";
      }

      const payload = {
        status: newStatus,
        catatan: formData.catatan,
        tanggal_penerimaan: formData.tanggal_penerimaan,
        items: validItems.map((item) => ({
          id: item.id,
          grn_id: grnId,
          purchase_order_item_id: item.purchase_order_item_id,
          raw_material_id: item.raw_material_id,
          qty_diterima: item.previous_qty_diterima + item.qty_diterima,
          qty_ditolak: item.previous_qty_ditolak + item.qty_ditolak,
          kondisi: item.kondisi,
          catatan: item.catatan || null,
        })),
      };

      console.log("=== UPDATE GRN ===");
      console.log("Payload:", payload);

      const res = await fetch(`/api/purchasing/grn/${grnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Handle empty or non-JSON response
      const text = await res.text();
      console.log("API Response (raw):", res.status, text);
      
      let data: ApiResponsePayload;
      try {
        data = text ? JSON.parse(text) : { error: { message: "Empty response from server" } };
      } catch (e) {
        console.error("Failed to parse response:", e);
        data = { error: { message: "Invalid response from server" } };
      }
      
      console.log("API Response:", res.status, data);

      if (res.ok) {
        toast.success(`GRN ${grnData?.nomor_grn || ""} berhasil diupdate`);
        router.push("/dashboard/purchasing/grn");
        router.refresh();
      } else {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : data.error?.message || data.message || "Gagal mengupdate GRN";
        toast.error(errorMessage);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal mengupdate GRN");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-500">Memuat data GRN...</div>
      </div>
    );
  }

  if (!grnData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-red-500">GRN tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Barang Masuk", href: "/dashboard/purchasing/grn" },
          { label: "Lanjutkan GRN", href: "/dashboard/purchasing/grn/continue" },
          { label: grnData.nomor_grn },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Lanjutkan Penerimaan Barang</h1>
          <p className="text-sm text-gray-500">
            Cek sisa PO dari GRN sebelumnya, lalu input penerimaan lanjutan
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="purchasing-secondary-button w-full sm:w-auto"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-gray-200/70 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardDocumentCheckIcon className="h-5 w-5" />
              Informasi GRN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-4">
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Nomor GRN</span>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900">{grnData.nomor_grn}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</span>
                    <div className="mt-1">{getStatusBadge(grnData.status)}</div>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">No. PO</span>
                    <p className="mt-0.5 text-sm font-medium text-gray-900">{grnData.po_number || "-"}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Surat Jalan</span>
                    <p className="mt-0.5 text-sm font-medium text-gray-900">{grnData.no_surat_jalan || "-"}</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-200/70 pt-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Supplier</span>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{grnData.supplier_name || "-"}</p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-200/70 pt-4">
                  <div className="rounded-lg border border-gray-200/70 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Total PO</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{formatQty(totals.ordered)}</p>
                  </div>
                  <div className="rounded-lg border border-pink-100 bg-pink-50 px-3 py-2">
                    <p className="text-xs text-pink-600">Sudah Terima</p>
                    <p className="mt-1 text-sm font-semibold text-pink-700">{formatQty(totals.received)}</p>
                  </div>
                  <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                    <p className="text-xs text-orange-600">Sisa</p>
                    <p className="mt-1 text-sm font-semibold text-orange-700">{formatQty(totals.remaining)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-200/70 pt-4 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div className="space-y-1.5">
                  <Label htmlFor="tanggal_penerimaan">Tanggal Penerimaan</Label>
                  <DatePicker
                    id="tanggal_penerimaan"
                    value={formData.tanggal_penerimaan}
                    onChange={(date) =>
                      setFormData((prev) => ({ ...prev, tanggal_penerimaan: date }))
                    }
                    variant="neutral"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="catatan">Catatan</Label>
                  <Textarea
                    id="catatan"
                    value={formData.catatan}
                    onChange={(e) => setFormData((prev) => ({ ...prev, catatan: e.target.value }))}
                    placeholder="Catatan penerimaan..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200/70 shadow-sm">
              <CardHeader className="border-b border-gray-100 px-4 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <TruckIcon className="h-5 w-5" />
                      Update Detail Item Diterima
                    </CardTitle>
                    <p className="mt-1 text-sm text-gray-500">
                      Qty baru akan ditambahkan ke penerimaan sebelumnya. Sisa yang belum diterima tetap terbuka.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fillAllRemaining}
                    disabled={grnItems.length === 0 || totals.remaining <= 0}
                    className="purchasing-secondary-button"
                  >
                    Isi Semua Sisa
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {itemRows.length === 0 ? (
                  <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-center text-sm text-gray-500">
                    <ExclamationTriangleIcon className="h-8 w-8 text-amber-500" />
                    Item GRN tidak ditemukan.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-gray-100 bg-gray-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Bahan Baku</th>
                          <th className="w-24 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Order</th>
                          <th className="w-24 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Terima</th>
                          <th className="w-24 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Sisa</th>
                          <th className="w-28 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Qty Baru</th>
                          <th className="w-28 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Ditolak</th>
                          <th className="w-32 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Kondisi</th>
                          <th className="min-w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itemRows.map(({ item, poItem, qtyOrdered, qtyReceived, remaining, satuan }, index) => (
                          <tr key={item.id} className="transition-colors hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{item.nama_bahan}</p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Satuan: {satuan}
                                {!poItem && <span className="ml-2 text-amber-600">Data PO tidak lengkap</span>}
                              </p>
                              {(item.previous_qty_diterima > 0 || item.previous_qty_ditolak > 0) && (
                                <p className="mt-1 text-xs text-gray-500">
                                  GRN ini sebelumnya: {formatQty(item.previous_qty_diterima)} diterima
                                  {item.previous_qty_ditolak > 0 ? `, ${formatQty(item.previous_qty_ditolak)} ditolak` : ""}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center text-sm text-gray-700">{formatQty(qtyOrdered)}</td>
                            <td className="px-3 py-3 text-center text-sm font-medium text-pink-700">{formatQty(qtyReceived)}</td>
                            <td className="px-3 py-3 text-center text-sm font-semibold text-orange-700">{formatQty(remaining)}</td>
                            <td className="px-3 py-3">
                              <NumericInput
                                min="0"
                                max={remaining || undefined}
                                value={item.qty_diterima}
                                onValueChange={(value) => updateGrnItem(index, "qty_diterima", value || 0)}
                                decimalScale={4}
                                disabled={remaining <= 0}
                                className="mx-auto h-9 w-24 text-center text-sm"
                              />
                              {remaining <= 0 && (
                                <p className="mt-1 text-center text-xs text-orange-600">Sudah lengkap</p>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <NumericInput
                                min="0"
                                value={item.qty_ditolak}
                                onValueChange={(value) => updateGrnItem(index, "qty_ditolak", value || 0)}
                                decimalScale={4}
                                className="mx-auto h-9 w-24 text-center text-sm"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Combobox
                                options={[
                                  { value: "baik", label: "Baik" },
                                  { value: "rusak", label: "Rusak" },
                                  { value: "cacat", label: "Cacat" },
                                ]}
                                value={item.kondisi}
                                onChange={(value) =>
                                  updateGrnItem(index, "kondisi", value as "baik" | "rusak" | "cacat")
                                }
                                placeholder="Kondisi..."
                                searchPlaceholder="Cari kondisi..."
                                emptyMessage="Kondisi tidak ditemukan"
                                className="!w-full h-9 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Textarea
                                value={item.catatan}
                                onChange={(e) => updateGrnItem(index, "catatan", e.target.value)}
                                placeholder="Catatan..."
                                rows={1}
                                className="min-h-9 resize-none text-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              <div className="flex flex-col gap-3 border-t border-gray-200/70 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500">
                  Akan ditambahkan: <span className="font-semibold text-gray-900">{formatQty(totals.newReceived)}</span> diterima
                  {totals.rejected > 0 && (
                    <span>, <span className="font-semibold text-gray-900">{formatQty(totals.rejected)}</span> ditolak</span>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <Link href="/dashboard/purchasing/grn/continue">
                    <Button type="button" variant="outline" className="purchasing-secondary-button px-6">
                      Batal
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={saving || grnItems.length === 0}
                    className="purchasing-main-button px-6"
                  >
                    <ClipboardDocumentCheckIcon className="mr-2 h-4 w-4" />
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>
              </div>
        </Card>
      </form>

    </div>
  );
}
