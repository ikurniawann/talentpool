"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { useToast } from "@/hooks/use-toast";
import {
  TruckIcon,
  ArrowLeftIcon,
  PackageCheckIcon,
  ClipboardListIcon,
  Building2Icon,
  Loader2Icon,
  ArrowRightIcon,
} from "lucide-react";

type DeliveryStatus = "pending" | "shipped" | "in_transit" | "delivered" | "cancelled";

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

interface Delivery {
  id: string;
  nomor_resi: string;
  no_surat_jalan: string;
  purchase_order_id: string;
  supplier_id: string;
  tanggal_kirim: string;
  tanggal_estimasi_tiba: string;
  tanggal_aktual_tiba: string;
  kurir: string;
  status: DeliveryStatus;
  catatan: string;
  created_at: string;
  supplier?: { id: string; nama: string; kode: string };
  purchase_order?: { id: string; po_number: string; status: string };
}

export default function DeliveryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  const deliveryId = params.id as string;

  useEffect(() => {
    fetchDelivery();
  }, [deliveryId]);

  async function fetchDelivery() {
    try {
      const res = await fetch(`/api/purchasing/delivery/${deliveryId}`);
      const data = await res.json();
      if (data.data) {
        setDelivery(data.data);
      } else {
        toast({
          title: "Error",
          description: "Delivery tidak ditemukan",
          variant: "destructive",
        });
        router.push("/dashboard/purchasing/delivery");
      }
    } catch (e) {
      console.error("Failed to fetch delivery:", e);
    } finally {
      setLoading(false);
    }
  }

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
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Pengiriman", href: "/dashboard/purchasing/delivery" },
          { label: delivery.nomor_resi || "Detail" },
        ]}
      />

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
            <Button className="purchasing-main-button w-full sm:w-auto" onClick={() => router.push(`/dashboard/purchasing/grn/new?delivery_id=${delivery.id}`)}>
              <PackageCheckIcon className="w-4 h-4 mr-2" />
              Input Penerimaan
            </Button>
          )}
        </div>
      </div>

      <Card className="border-pink-100 bg-pink-50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-pink-900">Flow pengiriman ini</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-pink-800">
                <span className="rounded-full bg-white px-3 py-1 border border-pink-100">1. Delivery dibuat</span>
                <ArrowRightIcon className="h-4 w-4" />
                <span className="rounded-full bg-white px-3 py-1 border border-pink-100">2. Input GRN</span>
                <ArrowRightIcon className="h-4 w-4" />
                <span className="rounded-full bg-white px-3 py-1 border border-pink-100">3. Stok bertambah</span>
              </div>
            </div>
            {canReceive && (
              <Button onClick={() => router.push(`/dashboard/purchasing/grn/new?delivery_id=${delivery.id}`)}>
                <PackageCheckIcon className="w-4 h-4 mr-2" />
                Lanjut Input GRN
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isDelivered && <Badge variant="outline" className="w-fit text-green-700 border-green-200">Sudah ada penerimaan</Badge>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info Pengiriman */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TruckIcon className="w-5 h-5" />
              Info Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">No. Surat Jalan</p>
                <p className="font-medium">{delivery.no_surat_jalan || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">No. Resi</p>
                <p className="font-medium">{delivery.nomor_resi || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ekspedisi</p>
                <p className="font-medium">{delivery.kurir || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tanggal Kirim</p>
                <p className="font-medium">
                  {delivery.tanggal_kirim
                    ? new Date(delivery.tanggal_kirim).toLocaleDateString("id-ID")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estimasi Tiba</p>
                <p className="font-medium">
                  {delivery.tanggal_estimasi_tiba
                    ? new Date(delivery.tanggal_estimasi_tiba).toLocaleDateString("id-ID")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Aktual Tiba</p>
                <p className="font-medium">
                  {delivery.tanggal_aktual_tiba
                    ? new Date(delivery.tanggal_aktual_tiba).toLocaleDateString("id-ID")
                    : "-"}
                </p>
              </div>
            </div>
            {delivery.catatan && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Catatan</p>
                <p className="text-sm mt-1">{delivery.catatan}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info PO & Supplier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardListIcon className="w-5 h-5" />
              Info Purchase Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">PO Number</p>
              <p className="font-medium text-lg">
                {delivery.purchase_order?.po_number || "-"}
              </p>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Building2Icon className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-500">Supplier</p>
              </div>
              <p className="font-medium">{delivery.supplier?.nama || "-"}</p>
              <p className="text-sm text-gray-500">{delivery.supplier?.kode || ""}</p>
            </div>
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
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
