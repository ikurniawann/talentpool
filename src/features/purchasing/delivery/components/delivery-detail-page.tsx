"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDelivery } from "../queries";
import type { DeliveryStatus } from "../types";
import {
  TruckIcon,
  ArrowLeftIcon,
  PackageCheckIcon,
  ClipboardListIcon,
  Building2Icon,
  Loader2Icon,
  ArrowRightIcon,
} from "lucide-react";

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  shipped: "bg-blue-100 text-blue-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Menunggu",
  shipped: "Dikirim",
  in_transit: "Dalam Perjalanan",
  delivered: "Tiba",
  cancelled: "Dibatalkan",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DeliveryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const deliveryId = params.id as string;

  const detailQuery = useDelivery(deliveryId);
  const delivery = detailQuery.data ?? null;
  const loading = detailQuery.isLoading;

  useEffect(() => {
    if (!detailQuery.isError) return;
    console.error("Failed to fetch delivery:", detailQuery.error);
    toast({
      title: "Error",
      description: "Delivery tidak ditemukan",
      variant: "destructive",
    });
    router.push("/dashboard/purchasing/delivery");
  }, [detailQuery.isError, detailQuery.error, router, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!delivery) return null;

  const canReceive = delivery.status !== "cancelled";
  const isDelivered = delivery.status === "delivered";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{delivery.nomor_resi || "Detail Pengiriman"}</h1>
            <Badge className={STATUS_COLORS[delivery.status]}>{STATUS_LABELS[delivery.status]}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{delivery.no_surat_jalan || "-"}</span>
            <span className="text-gray-300">•</span>
            <span>{delivery.supplier?.nama || "-"}</span>
            <span className="text-gray-300">•</span>
            <span>{delivery.kurir || "-"}</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            className="purchasing-secondary-button w-full sm:w-auto"
            onClick={() => router.push("/dashboard/purchasing/delivery")}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          {canReceive && (
            <Button className="purchasing-main-button w-full sm:w-auto" onClick={() => router.push(`/dashboard/purchasing/grn/insert?delivery_id=${delivery.id}`)}>
              <PackageCheckIcon className="w-4 h-4 mr-2" />
              Input Penerimaan
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-gray-200/70 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Status Pengiriman</p>
            <div className="mt-2">
              <Badge className={STATUS_COLORS[delivery.status]}>{STATUS_LABELS[delivery.status]}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Purchase Order</p>
            <p className="mt-1 truncate font-semibold text-gray-900">{delivery.purchase_order?.po_number || "-"}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Tanggal Kirim</p>
            <p className="mt-1 font-semibold text-gray-900">{formatDate(delivery.tanggal_kirim)}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Estimasi Tiba</p>
            <p className="mt-1 font-semibold text-gray-900">{formatDate(delivery.tanggal_estimasi_tiba)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200/70 bg-gray-50/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Alur pengiriman</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1">1. Delivery dibuat</span>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1">2. Input GRN</span>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1">3. Stok bertambah</span>
              </div>
            </div>
            {isDelivered && (
              <Badge variant="outline" className="w-fit border-emerald-200 text-emerald-700">
                Sudah ada penerimaan
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Info Pengiriman */}
        <Card className="border-gray-200/70 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <TruckIcon className="w-5 h-5" />
              Info Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
                <p className="text-xs font-medium text-gray-500">No. Surat Jalan</p>
                <p className="mt-1 font-semibold text-gray-900">{delivery.no_surat_jalan || "-"}</p>
              </div>
              <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
                <p className="text-xs font-medium text-gray-500">No. Resi</p>
                <p className="mt-1 font-semibold text-gray-900">{delivery.nomor_resi || "-"}</p>
              </div>
              <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
                <p className="text-xs font-medium text-gray-500">Ekspedisi</p>
                <p className="mt-1 font-semibold text-gray-900">{delivery.kurir || "-"}</p>
              </div>
              <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
                <p className="text-xs font-medium text-gray-500">Tanggal Kirim</p>
                <p className="mt-1 font-semibold text-gray-900">{formatDate(delivery.tanggal_kirim)}</p>
              </div>
              <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
                <p className="text-xs font-medium text-gray-500">Estimasi Tiba</p>
                <p className="mt-1 font-semibold text-gray-900">{formatDate(delivery.tanggal_estimasi_tiba)}</p>
              </div>
              <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
                <p className="text-xs font-medium text-gray-500">Aktual Tiba</p>
                <p className="mt-1 font-semibold text-gray-900">{formatDate(delivery.tanggal_aktual_tiba)}</p>
              </div>
            </div>
            {delivery.catatan && (
              <div className="border-t border-gray-200/70 pt-4">
                <p className="text-xs font-medium text-gray-500">Catatan</p>
                <p className="mt-1 text-sm text-gray-700">{delivery.catatan}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info PO & Supplier */}
        <Card className="border-gray-200/70 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardListIcon className="w-5 h-5" />
              Info Purchase Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
              <p className="text-xs font-medium text-gray-500">Nomor PO</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {delivery.purchase_order?.po_number || "-"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Building2Icon className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">Supplier</p>
              </div>
              <p className="font-semibold text-gray-900">{delivery.supplier?.nama || "-"}</p>
              <p className="text-sm text-gray-500">{delivery.supplier?.kode || ""}</p>
            </div>
            <div className="border-t border-gray-200/70 pt-4">
              <Button
                variant="outline"
                className="purchasing-secondary-button w-full"
                onClick={() =>
                  router.push(
                    `/dashboard/purchasing/po/${delivery.purchase_order_id}`
                  )
                }
              >
                Lihat Detail PO
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
