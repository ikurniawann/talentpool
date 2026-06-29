"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useGrn, useGrnQC } from "../queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  Package,
  Printer,
  RotateCcw,
  Truck,
  User,
} from "lucide-react";

type GrnDetailItem = {
  id: string;
  raw_material?: {
    nama?: string | null;
    kode?: string | null;
    satuan_besar?: { nama?: string | null; kode?: string | null } | null;
  } | null;
  satuan?: { nama?: string | null; kode?: string | null } | null;
  purchase_order_item?: {
    qty_ordered?: number | null;
    harga_satuan?: number | null;
    satuan?: { nama?: string | null; kode?: string | null } | null;
  } | null;
  qty_diterima?: number | null;
  qty_ditolak?: number | null;
  kondisi?: string | null;
  catatan?: string | null;
};

type GrnDetail = {
  id: string;
  nomor_grn?: string | null;
  status?: string | null;
  po_number?: string | null;
  purchase_order_id?: string | null;
  po_status?: string | null;
  tanggal_penerimaan?: string | null;
  supplier_name?: string | null;
  no_surat_jalan?: string | null;
  total_item_diterima?: number | null;
  total_item_ditolak?: number | null;
  delivery_id?: string | null;
  delivery_number?: string | null;
  catatan?: string | null;
  supplier?: {
    nama_supplier?: string | null;
    kode?: string | null;
    email?: string | null;
    telepon?: string | null;
  } | null;
  purchase_order?: {
    id?: string | null;
    nomor_po?: string | null;
    status?: string | null;
    tanggal_po?: string | null;
    total?: number | null;
  } | null;
  delivery?: {
    nomor_resi?: string | null;
    no_surat_jalan?: string | null;
    kurir?: string | null;
    status?: string | null;
    tanggal_kirim?: string | null;
    tanggal_estimasi_tiba?: string | null;
    tanggal_aktual_tiba?: string | null;
  } | null;
  items?: GrnDetailItem[];
};

type QcInspection = {
  status?: string | null;
  hasil?: string | null;
  inspected_at?: string | null;
  tanggal_inspeksi?: string | null;
  catatan_qc?: string | null;
  catatan?: string | null;
  inspected_by_user?: { email?: string | null } | null;
  inspector?: { email?: string | null; name?: string | null } | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  partially_received: "bg-amber-50 text-amber-700 border-amber-200",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  partially_received: "Diterima Sebagian",
  received: "Diterima Penuh",
  rejected: "Ditolak",
};

const CONDITION_LABELS: Record<string, string> = {
  baik: "Baik",
  rusak: "Rusak",
  cacat: "Cacat",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value?: number | null) {
  return Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 4 });
}

function formatCurrency(value?: number | null) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function statusBadge(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  return (
    <Badge variant="outline" className={STATUS_STYLES[normalized] || "bg-gray-100 text-gray-800 border-gray-200"}>
      {STATUS_LABELS[normalized] || status || "-"}
    </Badge>
  );
}

export function GRNDetailPage() {
  const params = useParams();
  const grnId = params.id as string;

  const grnQuery = useGrn<GrnDetail>(grnId);
  const qcQuery = useGrnQC<QcInspection>(grnId);
  const grn = grnQuery.data;
  const qc = qcQuery.data ?? null;
  const loading = grnQuery.isLoading;

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-500">
        Memuat detail penerimaan...
      </div>
    );
  }

  if (grnQuery.isError) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/purchasing/grn">
          <Button variant="outline" className="purchasing-secondary-button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <Card className="border-red-100">
          <CardContent className="py-12 text-center">
            <p className="font-medium text-red-700">Gagal memuat detail penerimaan</p>
            <p className="mt-2 text-sm text-red-600">
              {grnQuery.error instanceof Error ? grnQuery.error.message : "Terjadi kesalahan"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/purchasing/grn">
          <Button variant="outline" className="purchasing-secondary-button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <Card className="border-gray-200/70">
          <CardContent className="py-12 text-center text-gray-500">
            Data penerimaan tidak ditemukan
          </CardContent>
        </Card>
      </div>
    );
  }

  const poId = grn.purchase_order?.id || grn.purchase_order_id;
  const poNumber = grn.po_number || grn.purchase_order?.nomor_po || "-";
  const totalAccepted = Number(grn.total_item_diterima || 0);
  const totalRejected = Number(grn.total_item_ditolak || 0);
  const totalChecked = totalAccepted + totalRejected;
  const acceptedPct = totalChecked > 0 ? Math.round((totalAccepted / totalChecked) * 100) : 0;
  const qcStatus = String(qc?.status || qc?.hasil || "").toLowerCase();
  const canContinueReceive =
    grn.status === "pending" || grn.status === "partially_received";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{grn.nomor_grn}</h1>
            {statusBadge(grn.status)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>PO {poNumber}</span>
            <span className="text-gray-300">•</span>
            <span>{formatDate(grn.tanggal_penerimaan)}</span>
            {grn.supplier_name && (
              <>
                <span className="text-gray-300">•</span>
                <span>{grn.supplier_name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link href="/dashboard/purchasing/grn">
            <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <Button variant="outline" onClick={handlePrint} className="purchasing-secondary-button w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>
          {canContinueReceive && (
            <Link href={`/dashboard/purchasing/grn/continue/${grn.id}`}>
              <Button className="purchasing-main-button w-full sm:w-auto">
                <Package className="mr-2 h-4 w-4" />
                Lanjutkan Penerimaan
              </Button>
            </Link>
          )}
          {["received", "partially_received"].includes(String(grn.status || "")) && (
            <Link href={`/dashboard/purchasing/returns/insert?grn_id=${grn.id}`}>
              <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                Buat Retur
              </Button>
            </Link>
          )}
          {grn.status !== "rejected" && (
            <Link href={`/dashboard/purchasing/grn/${grn.id}/qc`}>
              <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Proses QC
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Diterima", value: formatNumber(totalAccepted), className: "text-emerald-600" },
          { label: "Ditolak", value: formatNumber(totalRejected), className: "text-red-600" },
          { label: "Acceptance Rate", value: `${acceptedPct}%`, className: "text-gray-900" },
          {
            label: "Status QC",
            value: qc ? qc.status || qc.hasil || "Selesai" : "Belum QC",
            className: qc ? (qcStatus.includes("reject") ? "text-red-600" : "text-emerald-600") : "text-gray-500",
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-gray-200/70 shadow-xs">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500">{stat.label}</p>
              <p className={`mt-1 text-xl font-bold ${stat.className}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-gray-200/70 lg:col-span-2">
          <CardHeader className="border-b border-gray-200/70 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-4 w-4 text-pink-600" />
              Informasi Penerimaan
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 md:grid-cols-2">
            <DetailField label="Nomor Penerimaan" value={grn.nomor_grn || "-"} />
            <DetailField label="Tanggal Terima" value={formatDate(grn.tanggal_penerimaan)} />
            <DetailField
              label="Purchase Order"
              value={poNumber}
              href={poId ? `/dashboard/purchasing/po/${poId}` : undefined}
            />
            <DetailField
              label="Surat Jalan"
              value={grn.no_surat_jalan || grn.delivery?.no_surat_jalan || "-"}
            />
            <DetailField label="Catatan" value={grn.catatan || "-"} className="md:col-span-2" />
          </CardContent>
        </Card>

        <Card className="border-gray-200/70">
          <CardHeader className="border-b border-gray-200/70 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <User className="h-4 w-4 text-pink-600" />
              Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <DetailField label="Nama" value={grn.supplier_name || grn.supplier?.nama_supplier || "-"} compact />
            <DetailField label="Kode" value={grn.supplier?.kode || "-"} compact />
            <DetailField label="Email" value={grn.supplier?.email || "-"} compact />
            <DetailField label="Telepon" value={grn.supplier?.telepon || "-"} compact />
          </CardContent>
        </Card>
      </div>

      {grn.delivery_id && (
        <Card className="border-gray-200/70">
          <CardHeader className="border-b border-gray-200/70 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Truck className="h-4 w-4 text-pink-600" />
              Informasi Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 md:grid-cols-4">
            <DetailField
              label="Nomor Delivery"
              value={grn.delivery_number || grn.delivery?.nomor_resi || "-"}
              href={`/dashboard/purchasing/delivery/${grn.delivery_id}`}
            />
            <DetailField label="Kurir" value={grn.delivery?.kurir || "-"} />
            <DetailField label="Tanggal Kirim" value={formatDate(grn.delivery?.tanggal_kirim)} />
            <DetailField label="Tiba Aktual" value={formatDate(grn.delivery?.tanggal_aktual_tiba)} />
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-200/70">
        <CardHeader className="border-b border-gray-200/70 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Package className="h-4 w-4 text-pink-600" />
            Item Diterima
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto px-4 pb-4">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200/70 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  {["Bahan Baku", "Satuan", "Qty PO", "Diterima", "Ditolak", "Kondisi", "Harga", "Catatan"].map(
                    (heading) => (
                      <th
                        key={heading}
                        className={`px-3 py-3 text-left font-semibold ${
                          ["Qty PO", "Diterima", "Ditolak", "Harga"].includes(heading) ? "text-right" : ""
                        }`}
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(grn.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                      Belum ada item penerimaan.
                    </td>
                  </tr>
                ) : (
                  grn.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">{item.raw_material?.nama || "-"}</div>
                        <div className="text-xs text-gray-500">{item.raw_material?.kode || "-"}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        {item.satuan?.nama ||
                          item.purchase_order_item?.satuan?.nama ||
                          item.raw_material?.satuan_besar?.nama ||
                          "-"}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700">
                        {formatNumber(item.purchase_order_item?.qty_ordered)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                        {formatNumber(item.qty_diterima)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-red-600">
                        {formatNumber(item.qty_ditolak)}
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        {CONDITION_LABELS[item.kondisi || ""] || item.kondisi || "-"}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700">
                        {formatCurrency(item.purchase_order_item?.harga_satuan)}
                      </td>
                      <td className="max-w-[220px] px-3 py-3 text-gray-600">{item.catatan || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200/70">
        <CardHeader className="border-b border-gray-200/70 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ClipboardCheck className="h-4 w-4 text-pink-600" />
            Quality Control
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {!qc ? (
            <div className="rounded-lg border border-dashed border-gray-200/80 bg-gray-50/70 p-6 text-center">
              <p className="font-medium text-gray-900">Belum ada inspeksi QC</p>
              <p className="mt-1 text-sm text-gray-500">
                Jalankan proses QC jika barang perlu diperiksa sebelum retur atau audit kualitas.
              </p>
              {grn.status !== "rejected" && (
                <div className="mt-4">
                  <Link href={`/dashboard/purchasing/grn/${grn.id}/qc`}>
                    <Button variant="outline" className="purchasing-secondary-button">
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Proses QC
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <DetailField label="Status" value={qc.status || qc.hasil || "-"} />
              <DetailField
                label="Inspector"
                value={qc.inspected_by_user?.email || qc.inspector?.email || qc.inspector?.name || "-"}
              />
              <DetailField label="Tanggal QC" value={formatDate(qc.inspected_at || qc.tanggal_inspeksi)} />
              <DetailField label="Catatan QC" value={qc.catatan_qc || qc.catatan || "-"} className="md:col-span-2" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailField({
  label,
  value,
  href,
  compact,
  className,
}: {
  label: string;
  value: string;
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  const content = (
    <div className={compact ? "flex items-start justify-between gap-4 border-b border-gray-100 pb-2 last:border-0" : ""}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={`break-words text-sm font-medium text-gray-900 ${
          compact ? "max-w-[65%] text-right" : "mt-1"
        } ${href ? "text-pink-700 hover:underline" : ""}`}
      >
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <div className={className}>
        <Link href={href}>{content}</Link>
      </div>
    );
  }

  return <div className={className}>{content}</div>;
}
