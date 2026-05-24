"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type ProductionMaterial = {
  id: string;
  raw_material_id: string;
  qty_planned: number | string;
  qty_actual: number | string;
  waste_qty: number | string;
  unit_cost: number | string;
  total_cost: number | string;
  inventory_movement_id?: string | null;
  raw_material?: {
    kode?: string | null;
    nama?: string | null;
  } | null;
  satuan?: {
    nama?: string | null;
  } | null;
  stock?: {
    qty_onhand: number;
    required_qty: number;
    shortage_qty: number;
    stock_status: "ENOUGH" | "INSUFFICIENT";
  } | null;
};

type ProductionBatch = {
  id: string;
  batch_number: string;
  qty_produced: number | string;
  hpp_per_unit: number | string;
  total_cost: number | string;
  output_type?: "FINISHED_GOOD" | "WIP";
  created_at: string;
};

type ProductionDetail = {
  id: string;
  nomor_produksi: string;
  product_nama?: string | null;
  product_kode?: string | null;
  output_type?: "FINISHED_GOOD" | "WIP";
  planned_qty: number | string;
  actual_qty: number | string;
  status: string;
  planned_material_cost: number | string;
  actual_material_cost: number | string;
  overhead_cost: number | string;
  labor_cost: number | string;
  packaging_cost: number | string;
  waste_cost: number | string;
  hpp_per_unit: number | string;
  catatan?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  materials: ProductionMaterial[];
  batches: ProductionBatch[];
  stock_summary?: {
    total_materials: number;
    insufficient_materials: number;
    can_release: boolean;
  };
};

type CompleteForm = {
  actualQty: string;
  overheadCost: string;
  laborCost: string;
  packagingCost: string;
  wasteCost: string;
  materials: Array<{
    id: string;
    name: string;
    unitName: string;
    plannedQty: number;
    qtyActual: string;
    wasteQty: string;
    unitCost: number;
  }>;
};

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(toNumber(value));
}

function displayName(value?: string | null) {
  return (value || "-").replace(/\s+\d{8,}$/g, "").trim();
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    RELEASED: "Released",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return labels[status] || status;
}

function statusClass(status: string) {
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "IN_PROGRESS") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "RELEASED") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "CANCELLED") return "border-gray-200 bg-gray-100 text-gray-500";
  return "border-pink-200 bg-pink-50 text-pink-700";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildProcurementItems(materials: ProductionMaterial[]) {
  return encodeURIComponent(
    JSON.stringify(
      materials.map((material) => ({
        id: material.raw_material_id,
        kode: material.raw_material?.kode || "",
        nama: displayName(material.raw_material?.nama),
        qty: Math.ceil(toNumber(material.stock?.shortage_qty)),
        unit: material.satuan?.nama || "unit",
        price: toNumber(material.unit_cost),
      }))
    )
  );
}

export default function ProductionOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<ProductionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [completeForm, setCompleteForm] = useState<CompleteForm | null>(null);

  const insufficientMaterials = useMemo(
    () => (order?.materials || []).filter((material) => toNumber(material.stock?.shortage_qty) > 0),
    [order]
  );

  const loadOrder = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/purchasing/production/orders/${orderId}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || json.error || "Gagal memuat detail produksi");
      setOrder(json.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat detail produksi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const runAction = async (action: "recheck_stock" | "release" | "start" | "cancel") => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/purchasing/production/orders/${orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await response.json();
      const nextMessage = json.message || json.error || "Status produksi diupdate";
      if (response.ok || action === "recheck_stock") await loadOrder();
      setMessage(nextMessage);
    } finally {
      setLoading(false);
    }
  };

  const openComplete = () => {
    if (!order) return;
    setCompleteForm({
      actualQty: String(toNumber(order.actual_qty) || toNumber(order.planned_qty)),
      overheadCost: String(toNumber(order.overhead_cost)),
      laborCost: String(toNumber(order.labor_cost)),
      packagingCost: String(toNumber(order.packaging_cost)),
      wasteCost: String(toNumber(order.waste_cost)),
      materials: order.materials.map((material) => ({
        id: material.id,
        name: displayName(material.raw_material?.nama) || material.raw_material_id,
        unitName: material.satuan?.nama || "",
        plannedQty: toNumber(material.qty_planned),
        qtyActual: String(toNumber(material.qty_actual || material.qty_planned)),
        wasteQty: String(toNumber(material.waste_qty)),
        unitCost: toNumber(material.unit_cost),
      })),
    });
  };

  const submitComplete = async () => {
    if (!completeForm) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/purchasing/production/orders/${orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          actual_qty: toNumber(completeForm.actualQty),
          overhead_cost: toNumber(completeForm.overheadCost),
          labor_cost: toNumber(completeForm.laborCost),
          packaging_cost: toNumber(completeForm.packagingCost),
          waste_cost: toNumber(completeForm.wasteCost),
          materials: completeForm.materials.map((material) => ({
            id: material.id,
            qty_actual: toNumber(material.qtyActual),
            waste_qty: toNumber(material.wasteQty),
          })),
        }),
      });
      const json = await response.json();
      setMessage(json.message || json.error || "Produksi selesai");
      if (response.ok) {
        setCompleteForm(null);
        await loadOrder();
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-sm text-gray-500">
        Memuat detail produksi...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <Link href="/dashboard/purchasing/production" className="inline-flex items-center gap-2 text-sm font-medium text-pink-700">
          <ArrowLeftIcon className="h-4 w-4" />
          Kembali ke Produksi
        </Link>
        <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {message || "Production order tidak ditemukan"}
        </div>
      </div>
    );
  }

  const canRelease = order.status === "DRAFT";
  const canStart = order.status === "RELEASED";
  const canComplete = ["RELEASED", "IN_PROGRESS"].includes(order.status);
  const canCancel = !["COMPLETED", "CANCELLED"].includes(order.status);
  const actualMaterialCost = toNumber(order.actual_material_cost) || toNumber(order.planned_material_cost);
  const shortageQuery = buildProcurementItems(insufficientMaterials);
  const productionOrderParam = encodeURIComponent(order.nomor_produksi);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Link href="/dashboard/purchasing/production" className="inline-flex items-center gap-2 text-sm font-medium text-pink-700">
            <ArrowLeftIcon className="h-4 w-4" />
            Kembali ke Produksi
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-950">{order.nomor_produksi}</h1>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                {statusLabel(order.status)}
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                {order.output_type === "WIP" ? "Output WIP" : "Produk Jadi"}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{displayName(order.product_nama)} · {formatDate(order.created_at)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadOrder} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
          {["DRAFT", "RELEASED", "IN_PROGRESS"].includes(order.status) && (
            <button type="button" onClick={() => runAction("recheck_stock")} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
              <ArrowPathIcon className="h-4 w-4" />
              Cek Ulang Stok
            </button>
          )}
          {canRelease && (
            <button type="button" onClick={() => runAction("release")} disabled={loading || insufficientMaterials.length > 0} className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 px-3 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50">
              Release
            </button>
          )}
          {canStart && (
            <button type="button" onClick={() => runAction("start")} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-sky-200 px-3 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50">
              <PlayIcon className="h-4 w-4" />
              Start
            </button>
          )}
          {canComplete && (
            <button type="button" onClick={openComplete} disabled={loading || insufficientMaterials.length > 0} className="inline-flex h-10 items-center gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircleIcon className="h-4 w-4" />
              Complete
            </button>
          )}
          {canCancel && (
            <button type="button" onClick={() => runAction("cancel")} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-pink-100 bg-pink-50 px-5 py-4 text-sm font-medium text-pink-700">
          {message}
        </div>
      )}

      {insufficientMaterials.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-red-600" />
              <div>
                <h2 className="text-sm font-semibold text-red-800">Stok belum cukup</h2>
                <p className="mt-1 text-sm text-red-700">
                  Release atau complete akan ditahan sampai kekurangan bahan di bawah ini dipenuhi.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runAction("recheck_stock")}
                disabled={loading}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Cek Ulang Stok
              </button>
              <Link
                href={`/dashboard/purchasing/po/new?source=production&production_order_id=${order.id}&production_order=${productionOrderParam}&items=${shortageQuery}`}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
              >
                Buatkan PO
              </Link>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Planned Qty</p>
          <p className="mt-2 text-xl font-semibold text-gray-950">{formatNumber(order.planned_qty)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Actual Qty</p>
          <p className="mt-2 text-xl font-semibold text-gray-950">{formatNumber(order.actual_qty)}</p>
        </div>
        <div className="rounded-xl border border-pink-100 bg-pink-50/60 p-4 shadow-sm">
          <p className="text-xs font-medium text-pink-700">Material Cost</p>
          <p className="mt-2 text-xl font-semibold text-pink-800">{formatCurrency(actualMaterialCost)}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-700">HPP / Unit</p>
          <p className="mt-2 text-xl font-semibold text-emerald-800">{formatCurrency(order.hpp_per_unit)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-950">Material Requirement</h2>
            <p className="text-xs text-gray-500">Kebutuhan bahan, stok tersedia, dan nilai konsumsi produksi.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${insufficientMaterials.length > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {insufficientMaterials.length > 0 ? `${insufficientMaterials.length} bahan kurang` : "Stok cukup"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Bahan</th>
                <th className="px-4 py-3 text-right font-semibold">Plan</th>
                <th className="px-4 py-3 text-right font-semibold">Actual</th>
                <th className="px-4 py-3 text-right font-semibold">Stok</th>
                <th className="px-4 py-3 text-right font-semibold">Shortage</th>
                <th className="px-4 py-3 text-right font-semibold">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.materials.map((material) => {
                const shortage = toNumber(material.stock?.shortage_qty);
                const itemQuery = buildProcurementItems([material]);
                return (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-950">{displayName(material.raw_material?.nama)}</p>
                      <p className="text-xs text-gray-500">{material.raw_material?.kode || material.raw_material_id}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{formatNumber(material.qty_planned)} {material.satuan?.nama || ""}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(material.qty_actual)} {material.satuan?.nama || ""}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(material.stock?.qty_onhand)}</td>
                    <td className="px-4 py-3 text-right">
                      {shortage > 0 ? (
                        <div className="space-y-2">
                          <p className="font-semibold text-red-600">{formatNumber(shortage)}</p>
                          <div className="flex justify-end gap-1.5">
                            <Link
                              href={`/dashboard/purchasing/po/new?source=production&production_order_id=${order.id}&production_order=${productionOrderParam}&items=${itemQuery}`}
                              className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                            >
                              PO
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <span className="font-semibold text-emerald-600">Cukup</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-pink-700">{formatCurrency(material.total_cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-950">Cost Breakdown</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Material</span><span className="font-medium">{formatCurrency(actualMaterialCost)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Overhead</span><span className="font-medium">{formatCurrency(order.overhead_cost)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Labor</span><span className="font-medium">{formatCurrency(order.labor_cost)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Packaging</span><span className="font-medium">{formatCurrency(order.packaging_cost)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Waste</span><span className="font-medium">{formatCurrency(order.waste_cost)}</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-950">Batch Output</h2>
          <div className="mt-4 space-y-3">
            {order.batches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                Batch akan muncul setelah produksi completed.
              </div>
            ) : (
              order.batches.map((batch) => (
                <div key={batch.id} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-950">{batch.batch_number}</p>
                    <CubeIcon className="h-4 w-4 text-pink-600" />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-gray-500">
                    <span>Qty {formatNumber(batch.qty_produced)}</span>
                    <span>{formatCurrency(batch.hpp_per_unit)}/unit</span>
                    <span>{formatDate(batch.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {completeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">Complete Produksi</h2>
                <p className="text-sm text-gray-500">{order.nomor_produksi}</p>
              </div>
              <button type="button" onClick={() => setCompleteForm(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-140px)] space-y-5 overflow-y-auto p-5">
              <div className="grid gap-3 md:grid-cols-5">
                {[
                  ["Actual Output", "actualQty"],
                  ["Overhead", "overheadCost"],
                  ["Labor", "laborCost"],
                  ["Packaging", "packagingCost"],
                  ["Waste Cost", "wasteCost"],
                ].map(([label, key]) => (
                  <label key={key} className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-500">{label}</span>
                    <input
                      value={completeForm[key as keyof Omit<CompleteForm, "materials">]}
                      onChange={(event) => setCompleteForm({ ...completeForm, [key]: event.target.value })}
                      type="number"
                      min="0"
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                    />
                  </label>
                ))}
              </div>

              <div className="rounded-lg border border-gray-200">
                <div className="grid grid-cols-[1fr_120px_120px_120px] gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Bahan</span>
                  <span className="text-right">Plan</span>
                  <span className="text-right">Actual</span>
                  <span className="text-right">Waste</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {completeForm.materials.map((material, index) => (
                    <div key={material.id} className="grid grid-cols-[1fr_120px_120px_120px] items-center gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{material.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(material.unitCost)} / unit</p>
                      </div>
                      <div className="text-right text-gray-700">{formatNumber(material.plannedQty)} {material.unitName}</div>
                      <input
                        value={material.qtyActual}
                        onChange={(event) => {
                          const materials = [...completeForm.materials];
                          materials[index] = { ...material, qtyActual: event.target.value };
                          setCompleteForm({ ...completeForm, materials });
                        }}
                        type="number"
                        min="0"
                        className="h-9 rounded-lg border border-gray-200 px-2 text-right text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                      />
                      <input
                        value={material.wasteQty}
                        onChange={(event) => {
                          const materials = [...completeForm.materials];
                          materials[index] = { ...material, wasteQty: event.target.value };
                          setCompleteForm({ ...completeForm, materials });
                        }}
                        type="number"
                        min="0"
                        className="h-9 rounded-lg border border-gray-200 px-2 text-right text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button type="button" onClick={() => setCompleteForm(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Batal
              </button>
              <button type="button" onClick={submitComplete} disabled={loading} className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50">
                Simpan Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
