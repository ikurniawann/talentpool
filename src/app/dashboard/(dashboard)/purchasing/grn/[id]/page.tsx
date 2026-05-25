"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";

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
  pending: "bg-gray-100 text-gray-800",
  partially_received: "bg-amber-100 text-amber-800",
  received: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
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
  return Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function formatCurrency(value?: number | null) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function statusBadge(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  return (
    <Badge className={STATUS_STYLES[normalized] || "bg-gray-100 text-gray-800"}>
      {STATUS_LABELS[normalized] || status || "-"}
    </Badge>
  );
}

export default function GRNDetailPage() {
  const params = useParams();
  const grnId = params.id as string;

  const [grn, setGrn] = useState<GrnDetail | null>(null);
  const [qc, setQc] = useState<QcInspection | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const grnResponse = await fetch(`/api/purchasing/grn/${grnId}`);
      const grnData = await grnResponse.json().catch(() => null);

      if (!grnResponse.ok || grnData?.success === false) {
        throw new Error(grnData?.error || grnData?.message || "Data penerimaan tidak ditemukan");
      }

      setGrn(grnData?.data || null);

      const qcResponse = await fetch(`/api/purchasing/grn/${grnId}/qc`);
      if (qcResponse.ok) {
        const qcData = await qcResponse.json().catch(() => null);
        setQc(qcData?.data || null);
      } else {
        setQc(null);
      }
    } catch (error) {
      console.error("Error loading receiving detail:", error);
      setGrn(null);
      toast.error(error instanceof Error ? error.message : "Gagal memuat detail penerimaan");
    } finally {
      setLoading(false);
    }
  }, [grnId]);

  useEffect(() => {
    if (grnId) loadData();
  }, [grnId, loadData]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-xl border bg-white p-10 text-center text-gray-500">Memuat detail penerimaan...</div>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center text-red-600">
          Data penerimaan tidak ditemukan
        </div>
      </div>
    );
  }

  const totalAccepted = Number(grn.total_item_diterima || 0);
  const totalRejected = Number(grn.total_item_ditolak || 0);
  const totalChecked = totalAccepted + totalRejected;
  const acceptedPct = totalChecked > 0 ? Math.round((totalAccepted / totalChecked) * 100) : 0;
  const qcStatus = String(qc?.status || qc?.hasil || "").toLowerCase();

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Procurement", href: "/dashboard/purchasing/procurement" },
          { label: "Barang Masuk", href: "/dashboard/purchasing/grn" },
          { label: grn.nomor_grn || "Detail Barang Masuk" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Detail Barang Masuk</h1>
            {statusBadge(grn.status)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">{grn.nomor_grn}</span>
            <span className="text-gray-300">•</span>
            <span>PO {grn.po_number || grn.purchase_order?.nomor_po || "-"}</span>
            <span className="text-gray-300">•</span>
            <span>{formatDate(grn.tanggal_penerimaan)}</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href="/dashboard/purchasing/grn">
            <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <Button variant="outline" onClick={handlePrint} className="purchasing-secondary-button w-full sm:w-auto">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          {["received", "partially_received"].includes(String(grn.status || "")) && (
            <Link href={`/dashboard/purchasing/returns/new?grn_id=${grn.id}`}>
              <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                Buat Retur
              </Button>
            </Link>
          )}
          {grn.status !== "rejected" && (
            <Link href={`/dashboard/purchasing/grn/${grn.id}/qc`}>
              <Button className="purchasing-main-button w-full sm:w-auto">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Proses QC
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-pink-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Diterima</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{formatNumber(totalAccepted)}</p>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Ditolak</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatNumber(totalRejected)}</p>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Acceptance Rate</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{acceptedPct}%</p>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Status QC</p>
            <p className="mt-2">
              {qc ? (
                <Badge className={qcStatus.includes("reject") ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}>
                  {qc.status || qc.hasil || "Selesai"}
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-700">Belum QC</Badge>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-pink-600" />
              Informasi Penerimaan
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <InfoBox label="Nomor Penerimaan" value={grn.nomor_grn || "-"} />
            <InfoBox label="Tanggal Terima" value={formatDate(grn.tanggal_penerimaan)} />
            <InfoBox label="Purchase Order" value={grn.po_number || "-"} href={grn.po_number ? `/dashboard/purchasing/po/${grn.purchase_order?.id || ""}` : undefined} />
            <InfoBox label="Surat Jalan" value={grn.no_surat_jalan || grn.delivery?.no_surat_jalan || "-"} />
            <InfoBox label="Catatan" value={grn.catatan || "-"} wide />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-pink-600" />
              Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoLine label="Nama" value={grn.supplier_name || "-"} />
            <InfoLine label="Kode" value={grn.supplier?.kode || "-"} />
            <InfoLine label="Email" value={grn.supplier?.email || "-"} />
            <InfoLine label="Telepon" value={grn.supplier?.telepon || "-"} />
          </CardContent>
        </Card>
      </div>

      {grn.delivery_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-5 w-5 text-pink-600" />
              Informasi Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <InfoBox label="Nomor Delivery" value={grn.delivery_number || "-"} />
            <InfoBox label="Kurir" value={grn.delivery?.kurir || "-"} />
            <InfoBox label="Tanggal Kirim" value={formatDate(grn.delivery?.tanggal_kirim)} />
            <InfoBox label="Tiba Aktual" value={formatDate(grn.delivery?.tanggal_aktual_tiba)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-pink-600" />
            Item Diterima
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto px-4 pb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bahan Baku</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Qty PO</TableHead>
                  <TableHead className="text-right">Diterima</TableHead>
                  <TableHead className="text-right">Ditolak</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(grn.items || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-gray-500">
                      Belum ada item penerimaan.
                    </TableCell>
                  </TableRow>
                ) : (
                  grn.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{item.raw_material?.nama || "-"}</div>
                        <div className="text-xs text-gray-500">{item.raw_material?.kode || "-"}</div>
                      </TableCell>
                      <TableCell>
                        {item.satuan?.nama ||
                          item.purchase_order_item?.satuan?.nama ||
                          item.raw_material?.satuan_besar?.nama ||
                          "-"}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(item.purchase_order_item?.qty_ordered)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{formatNumber(item.qty_diterima)}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{formatNumber(item.qty_ditolak)}</TableCell>
                      <TableCell>{CONDITION_LABELS[item.kondisi || ""] || item.kondisi || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.purchase_order_item?.harga_satuan)}</TableCell>
                      <TableCell className="max-w-[220px] text-sm text-gray-600">{item.catatan || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5 text-pink-600" />
            Quality Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!qc ? (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
              <p className="font-medium text-gray-900">Belum ada inspeksi QC</p>
              <p className="text-sm text-gray-500">Jalankan proses QC jika barang perlu diperiksa sebelum return atau audit kualitas.</p>
              <div>
                <Link href={`/dashboard/purchasing/grn/${grn.id}/qc`}>
                  <Button className="cursor-pointer bg-pink-600 text-white hover:bg-pink-700">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Proses QC
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <InfoBox label="Status" value={qc.status || qc.hasil || "-"} />
              <InfoBox label="Inspector" value={qc.inspected_by_user?.email || qc.inspector?.email || qc.inspector?.name || "-"} />
              <InfoBox label="Tanggal QC" value={formatDate(qc.inspected_at || qc.tanggal_inspeksi)} />
              <InfoBox label="Catatan QC" value={qc.catatan_qc || qc.catatan || "-"} wide />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-2 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="max-w-[65%] break-words text-right text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function InfoBox({
  label,
  value,
  href,
  wide,
}: {
  label: string;
  value: string;
  href?: string;
  wide?: boolean;
}) {
  const content = (
    <div className={`rounded-lg border border-gray-200 bg-gray-50 p-3 ${wide ? "md:col-span-2" : ""}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );

  if (!href || href.endsWith("/")) return content;
  return (
    <Link href={href} className={wide ? "md:col-span-2" : ""}>
      {content}
    </Link>
  );
}
