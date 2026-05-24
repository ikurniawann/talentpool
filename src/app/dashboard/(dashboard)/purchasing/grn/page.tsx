"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

type ReceivingStatus =
  | "waiting_delivery"
  | "in_delivery"
  | "partially_received"
  | "received"
  | "rejected"
  | "cancelled";

type POStatus = "draft" | "approved" | "sent" | "partially_received" | "received" | "cancelled" | string;

type PurchaseOrderRow = {
  id: string;
  nomor_po: string;
  nama_supplier?: string | null;
  supplier_id?: string | null;
  status: POStatus;
  tanggal_po?: string | null;
  total_qty_ordered?: number;
  total_qty_received?: number;
};

type DeliveryRow = {
  id: string;
  po_id?: string | null;
  po_number?: string | null;
  no_surat_jalan?: string | null;
  ekspedisi?: string | null;
  no_resi?: string | null;
  tanggal_kirim?: string | null;
  tanggal_estimasi_tiba?: string | null;
  status: "pending" | "shipped" | "in_transit" | "delivered" | "cancelled";
};

type GrnRow = {
  id: string;
  nomor_grn: string;
  delivery_id?: string | null;
  delivery_number?: string | null;
  po_id?: string | null;
  po_number?: string | null;
  supplier_name?: string | null;
  no_surat_jalan?: string | null;
  tanggal_penerimaan?: string | null;
  status: "pending" | "partially_received" | "received" | "rejected";
  total_item_diterima?: number;
  total_item_ditolak?: number;
  receive_count?: number;
};

type ReceivingRow = {
  key: string;
  status: ReceivingStatus;
  poId?: string | null;
  poNumber: string;
  supplierName: string;
  deliveryId?: string | null;
  deliveryNumber?: string | null;
  suratJalan?: string | null;
  grnId?: string | null;
  grnNumber?: string | null;
  date?: string | null;
  orderedQty?: number;
  receivedQty?: number;
  rejectedQty?: number;
};

const STATUS_STYLES: Record<ReceivingStatus, string> = {
  waiting_delivery: "bg-slate-100 text-slate-700 border-slate-200",
  in_delivery: "bg-pink-50 text-pink-700 border-pink-200",
  partially_received: "bg-amber-50 text-amber-700 border-amber-200",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<ReceivingStatus, string> = {
  waiting_delivery: "Menunggu Delivery",
  in_delivery: "Dalam Delivery",
  partially_received: "Diterima Sebagian",
  received: "Diterima Penuh",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

const ACTION_BUTTON_CLASS =
  "inline-flex h-7 min-w-[112px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border px-2.5 text-[0.8rem] font-medium text-white shadow-xs transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeStatus(value?: string | null) {
  return (value || "").toLowerCase();
}

function statusPriority(status: ReceivingStatus) {
  const order: Record<ReceivingStatus, number> = {
    in_delivery: 1,
    partially_received: 2,
    waiting_delivery: 3,
    rejected: 4,
    received: 5,
    cancelled: 6,
  };
  return order[status];
}

export default function ReceivingWorkspacePage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [grns, setGrns] = useState<GrnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReceivingStatus | "all">("all");

  useEffect(() => {
    fetchReceivingData();
  }, []);

  async function fetchReceivingData() {
    setLoading(true);
    try {
      const response = await fetch("/api/purchasing/receiving-workspace", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Gagal memuat workspace penerimaan");
      }

      setPurchaseOrders(Array.isArray(json.data?.purchase_orders) ? json.data.purchase_orders : []);
      setDeliveries(Array.isArray(json.data?.deliveries) ? json.data.deliveries : []);
      setGrns(Array.isArray(json.data?.grns) ? json.data.grns : []);
    } catch (error) {
      console.error("Failed to load receiving workspace:", error);
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo<ReceivingRow[]>(() => {
    const deliveriesByPo = new Map<string, DeliveryRow[]>();
    const deliveryByPoNumber = new Map<string, DeliveryRow>();
    const deliveryById = new Map<string, DeliveryRow>();
    const grnByDelivery = new Map<string, GrnRow>();
    const grnByPo = new Map<string, GrnRow>();
    const poById = new Map<string, PurchaseOrderRow>();

    for (const po of purchaseOrders) poById.set(po.id, po);
    for (const delivery of deliveries) {
      deliveryById.set(delivery.id, delivery);
      if (delivery.po_id) {
        const current = deliveriesByPo.get(delivery.po_id) || [];
        deliveriesByPo.set(delivery.po_id, [...current, delivery]);
      }
      if (delivery.po_number) deliveryByPoNumber.set(delivery.po_number, delivery);
    }
    for (const grn of grns) {
      if (grn.delivery_id) grnByDelivery.set(grn.delivery_id, grn);
      if (grn.po_id) grnByPo.set(grn.po_id, grn);
    }

    const nextRows: ReceivingRow[] = [];
    const handledPoIds = new Set<string>();

    for (const po of purchaseOrders) {
      const poStatus = normalizeStatus(po.status);
      if (!["approved", "sent", "partially_received", "received", "cancelled"].includes(poStatus)) continue;

      const grn = grnByPo.get(po.id);
      const poDeliveries = deliveriesByPo.get(po.id) || [];
      const delivery =
        (grn?.delivery_id ? deliveryById.get(grn.delivery_id) : null) ||
        poDeliveries.find((item) => grnByDelivery.has(item.id)) ||
        poDeliveries.find((item) => item.status !== "cancelled") ||
        deliveryByPoNumber.get(po.nomor_po);
      handledPoIds.add(po.id);

      let status: ReceivingStatus = "waiting_delivery";
      if (poStatus === "cancelled") status = "cancelled";
      else if (grn?.status === "rejected") status = "rejected";
      else if (grn?.status === "partially_received" || poStatus === "partially_received") status = "partially_received";
      else if (grn?.status === "received" || poStatus === "received") status = "received";
      else if (delivery) status = "in_delivery";

      nextRows.push({
        key: `po-${po.id}`,
        status,
        poId: po.id,
        poNumber: po.nomor_po,
        supplierName: po.nama_supplier || "-",
        deliveryId: delivery?.id || null,
        deliveryNumber: delivery?.no_resi || delivery?.po_number || null,
        suratJalan: delivery?.no_surat_jalan || grn?.no_surat_jalan || null,
        grnId: grn?.id || null,
        grnNumber: grn?.nomor_grn || null,
        date: grn?.tanggal_penerimaan || delivery?.tanggal_kirim || po.tanggal_po || null,
        orderedQty: Number(po.total_qty_ordered || 0),
        receivedQty: Number(po.total_qty_received || grn?.total_item_diterima || 0),
        rejectedQty: Number(grn?.total_item_ditolak || 0),
      });
    }

    for (const delivery of deliveries) {
      if (delivery.po_id && handledPoIds.has(delivery.po_id)) continue;
      const grn = grnByDelivery.get(delivery.id);
      let status: ReceivingStatus = delivery.status === "cancelled" ? "cancelled" : "in_delivery";
      if (grn?.status === "received") status = "received";
      if (grn?.status === "partially_received") status = "partially_received";
      if (grn?.status === "rejected") status = "rejected";

      nextRows.push({
        key: `delivery-${delivery.id}`,
        status,
        poId: delivery.po_id || null,
        poNumber: delivery.po_number || "-",
        supplierName: "-",
        deliveryId: delivery.id,
        deliveryNumber: delivery.no_resi || delivery.po_number || null,
        suratJalan: delivery.no_surat_jalan || null,
        grnId: grn?.id || null,
        grnNumber: grn?.nomor_grn || null,
        date: grn?.tanggal_penerimaan || delivery.tanggal_kirim || null,
        receivedQty: Number(grn?.total_item_diterima || 0),
        rejectedQty: Number(grn?.total_item_ditolak || 0),
      });
    }

    return nextRows.sort((a, b) => statusPriority(a.status) - statusPriority(b.status));
  }, [deliveries, grns, purchaseOrders]);

  const filteredRows = rows.filter((row) => {
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    const haystack = [
      row.poNumber,
      row.supplierName,
      row.deliveryNumber,
      row.suratJalan,
      row.grnNumber,
    ]
      .join(" ")
      .toLowerCase();
    return matchesStatus && haystack.includes(search.toLowerCase());
  });

  const counts = rows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    {} as Record<ReceivingStatus, number>
  );

  function renderAction(row: ReceivingRow) {
    if (row.status === "waiting_delivery" && row.poId) {
      return (
        <Link
          href={`/dashboard/purchasing/delivery/new?po_id=${row.poId}`}
          className={`${ACTION_BUTTON_CLASS} border-blue-600`}
          style={{ backgroundColor: "#2563eb" }}
        >
          Buat Delivery
        </Link>
      );
    }
    if (row.status === "in_delivery" && row.deliveryId) {
      return (
        <Link
          href={`/dashboard/purchasing/grn/new?delivery_id=${row.deliveryId}`}
          className={`${ACTION_BUTTON_CLASS} border-pink-600`}
          style={{ backgroundColor: "#db2777" }}
        >
          Terima Barang
        </Link>
      );
    }
    if (row.status === "partially_received" && row.grnId) {
      return (
        <Link href={`/dashboard/purchasing/grn/continue/${row.grnId}`}>
          <Button size="sm" variant="outline" className="text-amber-700 border-amber-200 hover:bg-amber-50">
            Lanjutkan
          </Button>
        </Link>
      );
    }
    if (row.grnId) {
      return (
        <Link
          href={`/dashboard/purchasing/grn/${row.grnId}`}
          className={`${ACTION_BUTTON_CLASS} border-emerald-600`}
          style={{ backgroundColor: "#059669" }}
        >
          Detail Penerimaan
        </Link>
      );
    }
    if (row.deliveryId) {
      return (
        <Link href={`/dashboard/purchasing/delivery/${row.deliveryId}`}>
          <Button size="sm" variant="ghost">Detail</Button>
        </Link>
      );
    }
    return row.poId ? (
      <Link href={`/dashboard/purchasing/po/${row.poId}`}>
        <Button size="sm" variant="ghost">Detail PO</Button>
      </Link>
    ) : null;
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Barang Masuk" },
        ]}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Barang Masuk</h1>
          <p className="text-sm text-gray-500">Satu tempat untuk delivery, penerimaan, dan status barang masuk stok</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReceivingData} disabled={loading}>
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/dashboard/purchasing/grn/new">
            <Button className="bg-pink-600 hover:bg-pink-700">
              <PlusIcon className="w-4 h-4 mr-2" />
              Input Penerimaan
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {(["waiting_delivery", "in_delivery", "partially_received", "received"] as ReceivingStatus[]).map((status) => (
          <Card key={status} className="border-gray-100">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500">{STATUS_LABELS[status]}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{counts[status] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari PO, supplier, surat jalan, resi, atau dokumen penerimaan..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ReceivingStatus | "all")}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="waiting_delivery">Menunggu Delivery</SelectItem>
              <SelectItem value="in_delivery">Dalam Delivery</SelectItem>
              <SelectItem value="partially_received">Diterima Sebagian</SelectItem>
              <SelectItem value="received">Diterima Penuh</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardDocumentCheckIcon className="w-5 h-5 text-pink-600" />
            Workspace Penerimaan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  {["Status", "PO", "Supplier", "Delivery / Surat Jalan", "Penerimaan", "Qty", "Tanggal", "Aksi"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-sm font-medium text-gray-700">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400">Memuat data penerimaan...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <TruckIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
                      Belum ada data sesuai filter
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.key} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={STATUS_STYLES[row.status]}>
                          {STATUS_LABELS[row.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {row.poId ? (
                          <Link href={`/dashboard/purchasing/po/${row.poId}`} className="font-medium text-pink-700 hover:underline">
                            {row.poNumber}
                          </Link>
                        ) : (
                          <span className="font-medium">{row.poNumber}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{row.supplierName}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{row.deliveryNumber || "-"}</div>
                        <div className="text-xs text-gray-500">{row.suratJalan || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.grnId ? (
                          <Link href={`/dashboard/purchasing/grn/${row.grnId}`} className="font-medium text-pink-700 hover:underline">
                            {row.grnNumber}
                          </Link>
                        ) : (
                          <span className="text-gray-400">Belum Diterima</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{row.receivedQty || 0} / {row.orderedQty || 0}</div>
                        {(row.rejectedQty || 0) > 0 && <div className="text-xs text-red-600">{row.rejectedQty} ditolak</div>}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(row.date)}</td>
                      <td className="px-4 py-3">{renderAction(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
