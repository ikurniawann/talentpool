"use client";

import { useState, useEffect, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  Send,
  XCircle,
  FileText,
  Package,
  User,
  Calendar,
  MapPin,
  Factory,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrderWithStats, PurchaseOrderItem, POStatus } from "@/types/purchasing";
import {
  getPurchaseOrder,
  approvePurchaseOrder,
  sendPurchaseOrder,
  cancelPurchaseOrder,
} from "@/lib/purchasing";

export default function PODetailPage() {
  const params = useParams();
  const poId = params.id as string;

  const [po, setPo] = useState<PurchaseOrderWithStats | null>(null);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [sendVia, setSendVia] = useState<"EMAIL" | "WHATSAPP" | "PRINT" | "OTHER">("EMAIL");
  const [cancelReason, setCancelReason] = useState("");

  const normalizedStatus = po?.status?.toLowerCase() as POStatus | undefined;

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  // Add print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-area, .print-area * {
          visibility: visible;
        }
        .print-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none !important;
        }
        /* Hide sidebar and navigation */
        aside, nav, header { display: none !important; }
        /* Make content full width */
        main { margin: 0 !important; padding: 0 !important; }
        /* Ensure table borders print correctly */
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        /* Page breaks */
        .page-break { page-break-before: always; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const loadPO = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrder(poId);
      setPo(data);
      setItems(data.items || []);
    } catch (error) {
      console.error("Error loading PO:", error);
      toast.error("Gagal memuat data PO");
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    if (poId) {
      loadPO();
    }
  }, [loadPO, poId]);

  const handleApprove = async () => {
    try {
      await approvePurchaseOrder(poId);
      toast.success("PO berhasil diapprove");
      setIsApproveDialogOpen(false);
      loadPO();
    } catch (error: unknown) {
      console.error("Error approving PO:", error);
      toast.error(getErrorMessage(error, "Gagal mengapprove PO"));
    }
  };

  const handlePrint = () => {
    // Open print dialog
    window.print();
  };

  const handleSend = async () => {
    try {
      await sendPurchaseOrder(poId, sendVia);
      toast.success(`PO berhasil dikirim via ${sendVia}`);
      setIsSendDialogOpen(false);
      loadPO();
    } catch (error: unknown) {
      console.error("Error sending PO:", error);
      toast.error(getErrorMessage(error, "Gagal mengirim PO"));
    }
  };

  const handleCancel = async () => {
    if (!cancelReason) return;
    try {
      await cancelPurchaseOrder(poId, cancelReason);
      toast.success("PO berhasil dibatalkan");
      setIsCancelDialogOpen(false);
      loadPO();
    } catch (error: unknown) {
      console.error("Error cancelling PO:", error);
      toast.error(getErrorMessage(error, "Gagal membatalkan PO"));
    }
  };

  const getStatusBadge = (status: POStatus | string) => {
    const normalized = status.toLowerCase() as POStatus;
    const styles: Record<POStatus, string> = {
      draft: "bg-gray-100 text-gray-800",
      pending_approval: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      sent: "bg-purple-100 text-purple-800",
      partially_received: "bg-yellow-100 text-yellow-800",
      received: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-red-100 text-red-800",
    };
    const labels: Record<POStatus, string> = {
      draft: "Draft",
      pending_approval: "Menunggu Persetujuan",
      approved: "Disetujui",
      sent: "Terkirim",
      partially_received: "Diterima Sebagian",
      received: "Diterima Penuh",
      rejected: "Ditolak",
      cancelled: "Dibatalkan",
    };
    return <Badge className={styles[normalized] || "bg-gray-100 text-gray-800"}>{labels[normalized] || status}</Badge>;
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Memuat data PO...</div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-red-500">PO tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 print-area">
      {/* Header - Hide from print */}
      <div className="flex justify-between items-start no-print">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/po">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Purchase Order Detail</h1>
            <p className="text-muted-foreground">{po.nomor_po}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          
          {normalizedStatus === "draft" && (
            <>
              <Link href={`/dashboard/purchasing/po/${po.id}/edit`}>
                <Button variant="outline">Edit</Button>
              </Link>
              <Button onClick={() => setIsApproveDialogOpen(true)} className="purchasing-main-button">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
          
          {normalizedStatus === "approved" && (
            <Button onClick={() => setIsSendDialogOpen(true)} className="purchasing-main-button">
              <Send className="w-4 h-4 mr-2" />
              Kirim ke Supplier
            </Button>
          )}

          {["approved", "sent", "partial", "partially_received"].includes(normalizedStatus || "") && (
            <Link href={`/dashboard/purchasing/delivery/new?po_id=${po.id}`}>
              <Button variant="outline">
                <Truck className="w-4 h-4 mr-2" />
                Buat Delivery
              </Button>
            </Link>
          )}
          
          {normalizedStatus !== "received" && normalizedStatus !== "cancelled" && (
            <Button variant="destructive" onClick={() => setIsCancelDialogOpen(true)} className="purchasing-main-button">
              <XCircle className="w-4 h-4 mr-2" />
              Batal
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info PO */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informasi PO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">Status</Label>
                <div>{getStatusBadge(po.status)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">Tanggal PO</Label>
                <div className="font-medium">{formatDate(po.tanggal_po)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Supplier
                </Label>
                <div className="font-medium">{po.nama_supplier}</div>
                <div className="text-sm text-muted-foreground">
                  {po.supplier_kode}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Estimasi Pengiriman
                </Label>
                <div className="font-medium">
                  {formatDate(po.tanggal_kirim_estimasi)}
                </div>
              </div>
            </div>

            {po.catatan && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">Catatan</Label>
                <div>{po.catatan}</div>
              </div>
            )}

            {po.source_type === "production_order" && (
              <div className="rounded-lg border border-pink-100 bg-pink-50 p-3">
                <Label className="text-muted-foreground text-sm flex items-center gap-1">
                  <Factory className="w-4 h-4" />
                  Sumber PO
                </Label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge className="bg-pink-600 text-white hover:bg-pink-600">Production Order</Badge>
                  {po.production_order_id ? (
                    <Link
                      href={`/dashboard/purchasing/production/orders/${po.production_order_id}`}
                      className="font-medium text-pink-700 hover:underline"
                    >
                      {po.production_order_number || po.source_reference || po.production_order_id}
                    </Link>
                  ) : (
                    <span className="font-medium">{po.source_reference || "-"}</span>
                  )}
                </div>
              </div>
            )}

            {po.alamat_pengiriman && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Alamat Pengiriman
                </Label>
                <div>{po.alamat_pengiriman}</div>
              </div>
            )}

            {/* Tracking Info */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3">Tracking</h4>
              <div className="space-y-2 text-sm">
                {po.approved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved</span>
                    <span>{formatDateTime(po.approved_at)}</span>
                  </div>
                )}
                {po.sent_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent via {po.sent_via}</span>
                    <span>{formatDateTime(po.sent_at)}</span>
                  </div>
                )}
                {po.cancelled_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cancelled</span>
                    <span>{formatDateTime(po.cancelled_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              // Hitung dari items kalau po.subtotal = 0
              const subtotalFromItems = po.items?.reduce((s: number, i: PurchaseOrderItem & { diskon_item?: number }) =>
                s + (i.subtotal || (i.qty_ordered * i.harga_satuan) - (i.diskon_item || 0)), 0) || 0;
              const subtotal = (po.subtotal && po.subtotal > 0) ? po.subtotal : subtotalFromItems;
              const diskon = po.diskon_nominal || 0;
              const ppnPersen = po.ppn_persen || 0;
              const ppnNominal = po.ppn_nominal && po.ppn_nominal > 0
                ? po.ppn_nominal
                : Math.round((subtotal - diskon) * ppnPersen / 100);
              const total = po.grand_total && po.grand_total > 0
                ? po.grand_total
                : (subtotal - diskon + ppnNominal);
              return (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {diskon > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Diskon{po.diskon_persen ? ` (${po.diskon_persen}%)` : ""}</span>
                      <span className="text-red-500">- {formatCurrency(diskon)}</span>
                    </div>
                  )}
                  {ppnPersen > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">PPN ({ppnPersen}%)</span>
                      <span>{formatCurrency(ppnNominal)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </>
              );
            })()}

            {normalizedStatus !== "draft" && normalizedStatus !== "cancelled" && (
              <div className="pt-4 border-t mt-4">
                <div className="text-sm text-muted-foreground mb-2">Progress Penerimaan</div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (po.received_percentage || 0) >= 100
                        ? "bg-green-500"
                        : (po.received_percentage || 0) > 0
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                    }`}
                    style={{ width: `${po.received_percentage || 0}%` }}
                  />
                </div>
                <div className="text-right text-sm mt-1">
                  {po.total_qty_received || 0} / {po.total_qty_ordered || 0} item
                  ({po.received_percentage || 0}%)
                  {(po.received_percentage || 0) > 0 && (po.received_percentage || 0) < 100 && (
                    <span className="ml-2 text-yellow-600 font-medium">(Sebagian)</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Item Purchase Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bahan Baku</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                {normalizedStatus !== "draft" && normalizedStatus !== "cancelled" && (
                  <TableHead className="text-right">Diterima</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.raw_material?.nama}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.raw_material?.kode}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.qty_ordered}</TableCell>
                  <TableCell>{item.satuan?.nama || "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.harga_satuan)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.subtotal)}
                  </TableCell>
                  {normalizedStatus !== "draft" && normalizedStatus !== "cancelled" && (
                    <TableCell className="text-right">
                      <div
                        className={
                          item.qty_received >= item.qty_ordered
                            ? "text-green-600"
                            : item.qty_received > 0
                            ? "text-yellow-600"
                            : "text-gray-400"
                        }
                      >
                        {item.qty_received} / {item.qty_ordered}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve PO</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengapprove PO {po.nomor_po}?
              Setelah diapprove, PO tidak bisa diedit lagi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button onClick={handleApprove} className="purchasing-main-button">Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim PO</DialogTitle>
            <DialogDescription>
              Pilih metode pengiriman untuk PO {po.nomor_po}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Metode Pengiriman</Label>
              <Select value={sendVia} onValueChange={(v) => setSendVia(v as "EMAIL" | "WHATSAPP" | "PRINT" | "OTHER")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="PRINT">Print / Manual</SelectItem>
                  <SelectItem value="OTHER">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendDialogOpen(false)} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button onClick={handleSend} className="purchasing-main-button">Kirim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan PO</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin membatalkan PO {po.nomor_po}?
              Masukkan alasan pembatalan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Alasan Pembatalan *</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Masukkan alasan..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason}
              className="purchasing-main-button"
            >
              Batalkan PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
