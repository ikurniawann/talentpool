"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Package, ClipboardCheck, CheckCircle, AlertCircle, Printer, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { GoodsReceipt, GoodsReceiptItem, GRNStatus, QCInspection } from "@/types/purchasing";
import { getGoodsReceipt, getQCInspection } from "@/lib/purchasing";

export default function GRNDetailPage() {
  const params = useParams();
  const router = useRouter();
  const grnId = params.id as string;

  const [grn, setGrn] = useState<GoodsReceipt | null>(null);
  const [qc, setQc] = useState<QCInspection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (grnId) {
      loadData();
    }
  }, [grnId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [grnData, qcData] = await Promise.all([
        getGoodsReceipt(grnId),
        getQCInspection(grnId),
      ]);
      setGrn(grnData);
      setQc(qcData);
    } catch (error) {
      console.error("Error loading GRN:", error);
      toast.error("Gagal memuat data GRN");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: GRNStatus) => {
    const styles: Record<GRNStatus, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      QC_PENDING: "bg-yellow-100 text-yellow-800",
      QC_APPROVED: "bg-green-100 text-green-800",
      QC_REJECTED: "bg-red-100 text-red-800",
      COMPLETED: "bg-blue-100 text-blue-800",
    };
    const labels: Record<GRNStatus, string> = {
      DRAFT: "Draft",
      QC_PENDING: "Menunggu QC",
      QC_APPROVED: "QC Approved",
      QC_REJECTED: "QC Rejected",
      COMPLETED: "Selesai",
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Memuat data...</div>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-red-500">GRN tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/grn">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Detail GRN</h1>
            <p className="text-muted-foreground">{grn.nomor_grn}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          {(grn.status === "RECEIVED" || grn.status === "PARTIALLY_RECEIVED") && (
            <Link href={`/dashboard/purchasing/returns/new?grn_id=${grn.id}`}>
              <Button variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50">
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Return
              </Button>
            </Link>
          )}
          {(grn.status === "DRAFT" || grn.status === "QC_PENDING") && (
            <Link href={`/dashboard/purchasing/grn/${grn.id}/qc`}>
              <Button>
                <ClipboardCheck className="w-4 h-4 mr-2" />
                QC Inspection
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Informasi</TabsTrigger>
          <TabsTrigger value="items">Items ({grn.items?.length || 0})</TabsTrigger>
          <TabsTrigger value="qc">QC Inspection</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Informasi GRN
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span>{getStatusBadge(grn.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nomor PO</span>
                  <span>{grn.po?.nomor_po}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal Terima</span>
                  <span>{formatDate(grn.received_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gudang</span>
                  <span>{grn.gudang_tujuan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kondisi Packing</span>
                  <span>{grn.kondisi_packing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diterima Oleh</span>
                  <span>{grn.received_by_user?.email || "-"}</span>
                </div>
              </CardContent>
            </Card>

            {grn.delivery_id && (
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Pengiriman</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nomor Delivery</span>
                    <span>{grn.delivery?.nomor_delivery}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kurir</span>
                    <span>{grn.delivery?.kurir || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nomor Resi</span>
                    <span>{grn.delivery?.nomor_resi || "-"}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Item yang Diterima</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bahan Baku</TableHead>
                    <TableHead className="text-right">Diterima</TableHead>
                    <TableHead className="text-right">Baik</TableHead>
                    <TableHead className="text-right">Cacat</TableHead>
                    <TableHead>Lokasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grn.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.raw_material?.nama}</div>
                        <div className="text-sm text-muted-foreground">{item.raw_material?.kode}</div>
                      </TableCell>
                      <TableCell className="text-right">{item.qty_diterima}</TableCell>
                      <TableCell className="text-right text-green-600">{item.qty_diterima_baik}</TableCell>
                      <TableCell className="text-right text-red-600">{item.qty_cacat}</TableCell>
                      <TableCell>{item.lokasi_rak || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QC Tab */}
        <TabsContent value="qc">
          <Card>
            <CardHeader>
              <CardTitle>QC Inspection</CardTitle>
            </CardHeader>
            <CardContent>
              {!qc ? (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada QC inspection
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground">Status:</div>
                    <Badge
                      className={
                        qc.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : qc.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {qc.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-muted-foreground">Diinspeksi Oleh</div>
                      <div>{qc.inspected_by_user?.email || "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Tanggal Inspeksi</div>
                      <div>{formatDate(qc.inspected_at)}</div>
                    </div>
                  </div>

                  {qc.catatan_qc && (
                    <div>
                      <div className="text-muted-foreground">Catatan QC</div>
                      <div className="p-4 bg-muted rounded-lg">{qc.catatan_qc}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
