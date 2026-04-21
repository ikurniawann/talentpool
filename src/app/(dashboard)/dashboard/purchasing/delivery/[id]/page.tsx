"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { useToast } from "@/components/ui/use-toast";
import {
  TruckIcon,
  ArrowLeftIcon,
  PackageCheckIcon,
  EditIcon,
  CalendarIcon,
  MapPinIcon,
  ClipboardListIcon,
  Building2Icon,
  Loader2Icon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  const [arriveDialogOpen, setArriveDialogOpen] = useState(false);
  const [arriveNotes, setArriveNotes] = useState("");
  const [arriving, setArriving] = useState(false);
  const [grnData, setGrnData] = useState<any>(null);

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

  async function handleArrive() {
    setArriving(true);
    try {
      const res = await fetch(`/api/purchasing/delivery/${deliveryId}/arrive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: arriveNotes }),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Berhasil",
          description: "Barang telah ditandai tiba dan GRN dibuat",
        });
        setDelivery(data.data.delivery);
        setGrnData(data.data.grn);
        setArriveDialogOpen(false);
      } else {
        throw new Error(data.error?.message || "Gagal menandai tiba");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setArriving(false);
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

  const canArrive = delivery.status === "in_transit" || delivery.status === "shipped";
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TruckIcon className="w-6 h-6" />
            Detail Pengiriman
          </h1>
          <p className="text-sm text-gray-500 mt-1">{delivery.nomor_resi}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/purchasing/delivery")}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          {!isDelivered && (
            <Button variant="outline">
              <EditIcon className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {canArrive && (
            <Button onClick={() => setArriveDialogOpen(true)}>
              <PackageCheckIcon className="w-4 h-4 mr-2" />
              Tandai Tiba
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[delivery.status]}`}>
          {STATUS_LABELS[delivery.status]}
        </span>
        {grnData && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            GRN: {grnData.nomor_gr}
          </Badge>
        )}
      </div>

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

      {/* GRN Info if available */}
      {grnData && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-800">
              <PackageCheckIcon className="w-5 h-5" />
              Goods Receipt Note (GRN) Dibuat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              GRN <strong>{grnData.nomor_gr}</strong> telah dibuat otomatis saat
              barang tiba.{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-green-800 font-medium"
                onClick={() => router.push(`/dashboard/purchasing/grn/${grnData.id}`)}
              >
                Lihat GRN →
              </Button>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Arrive Dialog */}
      <Dialog open={arriveDialogOpen} onOpenChange={setArriveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai Barang Tiba</DialogTitle>
            <DialogDescription>
              Konfirmasi bahwa barang dari pengiriman ini sudah diterima.
              Sistem akan membuat GRN (Goods Receipt Note) secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan Penerimaan</label>
              <Textarea
                placeholder="Contoh: Diterima dalam kondisi baik..."
                value={arriveNotes}
                onChange={(e) => setArriveNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArriveDialogOpen(false)}
              disabled={arriving}
            >
              Batal
            </Button>
            <Button onClick={handleArrive} disabled={arriving}>
              {arriving ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <PackageCheckIcon className="w-4 h-4 mr-2" />
                  Konfirmasi Tiba
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
