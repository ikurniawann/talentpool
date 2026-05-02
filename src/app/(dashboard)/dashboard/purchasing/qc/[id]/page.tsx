"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { ArrowLeft, ClipboardCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type QCInspection = {
  id: string;
  qc_number: string;
  goods_receipt_id: string;
  grn_number?: string;
  bahan_baku_id: string;
  bahan_baku?: {
    id: string;
    kode: string;
    nama: string;
  };
  jumlah_diperiksa: number;
  jumlah_diterima: number;
  jumlah_ditolak: number;
  hasil: "passed" | "rejected" | "partial";
  parameter_inspeksi: Record<string, string> | null;
  catatan: string | null;
  inspector_id: string;
  inspector?: {
    id: string;
    name: string;
    email: string;
  };
  tanggal_inspeksi: string;
  created_at: string;
  status: "APPROVED" | "REJECTED" | "PARTIAL";
  rekomendasi: "ACCEPT" | "REJECT" | "REWORK";
};

const STATUS_COLORS: Record<string, string> = {
  passed: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const STATUS_LABELS: Record<string, string> = {
  passed: "Lulus QC",
  rejected: "Ditolak",
  partial: "Sebagian",
};

const STATUS_ICONS: Record<string, any> = {
  passed: CheckCircleSolid,
  rejected: XCircleIcon,
  partial: AlertTriangle,
};

const REKOMENDASI_COLORS: Record<string, string> = {
  ACCEPT: "text-green-700 bg-green-50",
  REJECT: "text-red-700 bg-red-50",
  REWORK: "text-yellow-700 bg-yellow-50",
};

export default function QCDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qcId = params.id as string;

  const [qc, setQc] = useState<QCInspection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (qcId) {
      fetchQC();
    }
  }, [qcId]);

  async function fetchQC() {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchasing/qc/${qcId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Data QC tidak ditemukan");
          router.push("/dashboard/purchasing/qc");
          return;
        }
        throw new Error("Gagal memuat data QC");
      }
      const data = await res.json();
      setQc(data.data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-500">Memuat data QC...</div>
      </div>
    );
  }

  if (!qc) {
    return null;
  }

  const StatusIcon = STATUS_ICONS[qc.hasil] || BeakerIcon;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Quality Control", href: "/dashboard/purchasing/qc" },
          { label: qc.qc_number || `QC ${qc.id.slice(0, 8)}` },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/qc">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BeakerIcon className="w-6 h-6" />
              Detail QC Inspection
            </h1>
            <p className="text-sm text-gray-500">
              {qc.qc_number || `QC ${qc.id.slice(0, 8)}`}
            </p>
          </div>
        </div>
        <Badge className={`${STATUS_COLORS[qc.hasil]} border px-3 py-1.5 text-sm font-medium`}>
          <StatusIcon className="w-4 h-4 mr-1.5" />
          {STATUS_LABELS[qc.hasil]}
        </Badge>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - QC Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Informasi Inspeksi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bahan Baku Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Bahan Baku</label>
                <div className="font-medium text-gray-900">
                  {qc.bahan_baku?.nama || qc.bahan_baku_id}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Kode</label>
                <div className="font-medium text-gray-900">
                  {qc.bahan_baku?.kode || "—"}
                </div>
              </div>
            </div>

            {/* GRN Link */}
            <div>
              <label className="text-sm text-gray-500">Goods Receipt</label>
              <div>
                <Link
                  href={`/dashboard/purchasing/grn/${qc.goods_receipt_id}`}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  {qc.grn_number || qc.goods_receipt_id.slice(0, 8)}
                </Link>
              </div>
            </div>

            {/* Inspection Results */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Hasil Inspeksi</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Diperiksa</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {qc.jumlah_diperiksa}
                  </div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600">Diterima</div>
                  <div className="text-2xl font-bold text-green-700">
                    {qc.jumlah_diterima}
                  </div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-sm text-red-600">Ditolak</div>
                  <div className="text-2xl font-bold text-red-700">
                    {qc.jumlah_ditolak}
                  </div>
                </div>
              </div>
            </div>

            {/* Parameter Inspeksi */}
            {qc.parameter_inspeksi && Object.keys(qc.parameter_inspeksi).length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Parameter Inspeksi</h3>
                <div className="space-y-2">
                  {Object.entries(qc.parameter_inspeksi).map(([param, value]) => (
                    <div
                      key={param}
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-700">{param}</span>
                      <Badge
                        variant={value === "OK" ? "default" : "destructive"}
                        className={
                          value === "OK"
                            ? "bg-green-100 text-green-800"
                            : value === "NG"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {value === "OK" && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                        {value === "NG" && <XCircleIcon className="w-3 h-3 mr-1" />}
                        {value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Catatan QC */}
            {qc.catatan && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4" />
                  Catatan QC
                </h3>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                  {qc.catatan}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Summary & Metadata */}
        <div className="space-y-6">
          {/* Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status Hasil</span>
                <Badge className={`${STATUS_COLORS[qc.hasil]} border`}>
                  {STATUS_LABELS[qc.hasil]}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Rekomendasi</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${REKOMENDASI_COLORS[qc.rekomendasi]}`}>
                  {qc.rekomendasi}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="text-xs text-gray-500 mb-2">Persentase Diterima</div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all"
                    style={{
                      width: `${qc.jumlah_diperiksa > 0 ? (qc.jumlah_diterima / qc.jumlah_diperiksa) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="text-right text-xs text-gray-600 mt-1">
                  {qc.jumlah_diperiksa > 0
                    ? Math.round((qc.jumlah_diterima / qc.jumlah_diperiksa) * 100)
                    : 0}%
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Tanggal Inspeksi</div>
                  <div className="text-sm font-medium">
                    {new Date(qc.tanggal_inspeksi).toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Inspektur</div>
                  <div className="text-sm font-medium">
                    {qc.inspector?.name || qc.inspector_id.slice(0, 8)}
                  </div>
                  {qc.inspector?.email && (
                    <div className="text-xs text-gray-500">{qc.inspector.email}</div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Dibuat</div>
                  <div className="text-sm font-medium">
                    {new Date(qc.created_at).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Link href={`/dashboard/purchasing/grn/${qc.goods_receipt_id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Lihat GRN
                </Button>
              </Link>
              <Link href="/dashboard/purchasing/qc" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  Kembali ke Daftar QC
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
