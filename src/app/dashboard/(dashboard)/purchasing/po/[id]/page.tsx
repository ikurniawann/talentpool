"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  CreditCard,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  PurchaseOrderWithStats,
  PurchaseOrderItem,
  POStatus,
  PurchaseOrderPaymentTerm,
  VendorPayment,
} from "@/types/purchasing";
import {
  getPurchaseOrder,
  approvePurchaseOrder,
  sendPurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderPaymentTerms,
  createPurchaseOrderPaymentTerm,
  createVendorPayment,
} from "@/lib/purchasing";

export default function PODetailPage() {
  const params = useParams();
  const poId = params.id as string;

  const [po, setPo] = useState<PurchaseOrderWithStats | null>(null);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PurchaseOrderPaymentTerm[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isTermDialogOpen, setIsTermDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [sendVia, setSendVia] = useState<"EMAIL" | "WHATSAPP" | "PRINT" | "OTHER">("EMAIL");
  const [cancelReason, setCancelReason] = useState("");
  const [termForm, setTermForm] = useState({
    description: "Termin",
    due_date: new Date().toISOString().slice(0, 10),
    amount: "",
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    payment_term_id: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount: "",
    method: "bank_transfer" as VendorPayment["method"],
    reference_number: "",
    notes: "",
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const normalizedStatus = po?.status?.toLowerCase() as POStatus | undefined;
  const receivingProgress = Number(po?.received_percentage ?? po?.receive_percentage ?? po?.progress_pct ?? 0);
  const paymentProgress = Number(po?.payment_progress_pct ?? 0);
  const overallProgress = Number(po?.overall_progress_pct ?? ((receivingProgress + paymentProgress) / 2));
  const payableAmount = Number(po?.payable_amount ?? po?.grand_total ?? 0);
  const scheduledAmount = paymentTerms.reduce((sum, term) => sum + Number(term.amount || 0), 0);
  const remainingScheduledAmount = Math.max(0, payableAmount - scheduledAmount);
  const selectedPaymentTerm = useMemo(
    () => paymentTerms.find((term) => term.id === paymentForm.payment_term_id) || null,
    [paymentForm.payment_term_id, paymentTerms]
  );
  const paymentTermById = useMemo(
    () => new Map(paymentTerms.map((term) => [term.id, term])),
    [paymentTerms]
  );

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
      const payments = await getPurchaseOrderPaymentTerms(poId).catch((error) => {
        console.error("Error loading PO payment terms:", error);
        return { terms: [], payments: [] };
      });
      setPo(data);
      setItems(data.items || []);
      setPaymentTerms(payments.terms || []);
      setVendorPayments(payments.payments || []);
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

  const openTermDialog = () => {
    setTermForm({
      description: paymentTerms.length === 0 ? "DP" : `Termin ${paymentTerms.length + 1}`,
      due_date: new Date().toISOString().slice(0, 10),
      amount: remainingScheduledAmount > 0 ? String(remainingScheduledAmount) : "",
      notes: "",
    });
    setIsTermDialogOpen(true);
  };

  const openPaymentDialog = (term?: PurchaseOrderPaymentTerm) => {
    const targetTerm = term || paymentTerms.find((item) => item.status !== "paid") || paymentTerms[0];
    const remaining = targetTerm ? Math.max(0, Number(targetTerm.amount || 0) - Number(targetTerm.paid_amount || 0)) : 0;
    setPaymentForm({
      payment_term_id: targetTerm?.id || "",
      payment_date: new Date().toISOString().slice(0, 10),
      amount: remaining ? String(remaining) : "",
      method: "bank_transfer",
      reference_number: "",
      notes: "",
    });
    setIsPaymentDialogOpen(true);
  };

  const handleCreateTerm = async () => {
    const amount = Number(termForm.amount || 0);
    if (!termForm.description.trim() || !termForm.due_date || amount < 0) {
      toast.error("Lengkapi deskripsi, tanggal jatuh tempo, dan nominal termin");
      return;
    }

    try {
      setIsSavingPayment(true);
      await createPurchaseOrderPaymentTerm(poId, {
        description: termForm.description.trim(),
        due_date: termForm.due_date,
        amount,
        notes: termForm.notes.trim() || null,
      });
      toast.success("Termin pembayaran berhasil ditambahkan");
      setIsTermDialogOpen(false);
      setTermForm({
        description: "Termin",
        due_date: new Date().toISOString().slice(0, 10),
        amount: "",
        notes: "",
      });
      loadPO();
    } catch (error: unknown) {
      console.error("Error creating term:", error);
      toast.error(getErrorMessage(error, "Gagal menambahkan termin"));
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleCreatePayment = async () => {
    const amount = Number(paymentForm.amount || 0);
    if (!paymentForm.payment_term_id || !paymentForm.payment_date || amount <= 0) {
      toast.error("Pilih termin, tanggal pembayaran, dan nominal pembayaran");
      return;
    }

    try {
      setIsSavingPayment(true);
      await createVendorPayment(poId, {
        payment_term_id: paymentForm.payment_term_id,
        payment_date: paymentForm.payment_date,
        amount,
        method: paymentForm.method,
        reference_number: paymentForm.reference_number.trim() || null,
        notes: paymentForm.notes.trim() || null,
      });
      toast.success("Pembayaran vendor berhasil dicatat");
      setIsPaymentDialogOpen(false);
      loadPO();
    } catch (error: unknown) {
      console.error("Error creating payment:", error);
      toast.error(getErrorMessage(error, "Gagal mencatat pembayaran vendor"));
    } finally {
      setIsSavingPayment(false);
    }
  };

  const getStatusBadge = (status: POStatus | string) => {
    const normalized = status.toLowerCase() as POStatus;
    const styles: Record<POStatus, string> = {
      draft: "bg-gray-100 text-gray-800",
      pending_approval: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      sent: "bg-purple-100 text-purple-800",
      partial: "bg-yellow-100 text-yellow-800",
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
      partial: "Diterima Sebagian",
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

  const getPaymentStatusBadge = (status?: string) => {
    const styles: Record<string, string> = {
      unpaid: "bg-gray-100 text-gray-700",
      partial: "bg-amber-100 text-amber-700",
      paid: "bg-emerald-100 text-emerald-700",
      overdue: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      unpaid: "Belum Dibayar",
      partial: "Dibayar Sebagian",
      paid: "Lunas",
      overdue: "Jatuh Tempo",
    };
    return <Badge className={styles[status || "unpaid"] || "bg-gray-100 text-gray-700"}>{labels[status || "unpaid"] || status}</Badge>;
  };

  const getLifecycleBadge = () => {
    const lifecycle = po?.lifecycle_status || "in_progress";
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      waiting_payment: "bg-amber-100 text-amber-700",
      waiting_receipt: "bg-purple-100 text-purple-700",
      completed: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      in_progress: "Berjalan",
      waiting_payment: "Menunggu Pembayaran",
      waiting_receipt: "Menunggu Barang",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };
    return <Badge className={styles[lifecycle] || "bg-blue-100 text-blue-700"}>{labels[lifecycle] || lifecycle}</Badge>;
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
          {normalizedStatus !== "draft" && normalizedStatus !== "cancelled" && (
            <Button variant="outline" onClick={() => openPaymentDialog()}>
              <CreditCard className="w-4 h-4 mr-2" />
              Catat Pembayaran
            </Button>
          )}
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
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(po.status)}
                  {getLifecycleBadge()}
                </div>
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
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Progress Total PO</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      overallProgress >= 100
                        ? "bg-green-500"
                        : overallProgress > 0
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
                  />
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Penerimaan</div>
                      <div className="mt-1 break-words text-right font-semibold text-gray-900">
                        {po.total_qty_received || 0} / {po.total_qty_ordered || 0} item
                      </div>
                      <div className="mt-1 text-right text-xs text-muted-foreground">{receivingProgress}%</div>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                      <div className="text-xs text-emerald-700">Pembayaran</div>
                      <div className="mt-1 break-words text-right font-semibold text-emerald-700">
                        {formatCurrency(po.paid_amount || 0)}
                      </div>
                      <div className="mt-1 text-right text-xs text-emerald-700/80">
                        dari {formatCurrency(payableAmount)} · {paymentProgress}%
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-pink-100 bg-pink-50 px-3 py-2">
                    <div className="text-xs text-pink-700">Sisa tagihan</div>
                    <div className="mt-1 break-words text-right text-base font-semibold text-pink-700">
                      {formatCurrency(po.outstanding_amount || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Terms */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <WalletCards className="w-5 h-5" />
            Termin & Pembayaran Supplier
          </CardTitle>
          <div className="flex gap-2 no-print">
            <Button variant="outline" onClick={openTermDialog}>
              Tambah Termin
            </Button>
            <Button onClick={() => openPaymentDialog()} className="purchasing-main-button">
              Catat Pembayaran
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Status Pembayaran</p>
              <div className="mt-2">{getPaymentStatusBadge(po.payment_status)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Tagihan</p>
              <p className="mt-1 font-semibold">{formatCurrency(payableAmount)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Sudah Dibayar</p>
              <p className="mt-1 font-semibold text-emerald-600">{formatCurrency(po.paid_amount || 0)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Jatuh Tempo Berikutnya</p>
              <p className="mt-1 font-semibold">{formatDate(po.next_due_date)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Termin</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead className="text-right">Tagihan</TableHead>
                  <TableHead className="text-right">Dibayar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right no-print">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentTerms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Belum ada termin pembayaran.
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentTerms.map((term) => {
                    const remaining = Math.max(0, Number(term.amount || 0) - Number(term.paid_amount || 0));
                    return (
                      <TableRow key={term.id}>
                        <TableCell>
                          <div className="font-medium">{term.description || `Termin ${term.term_no}`}</div>
                          <div className="text-xs text-muted-foreground">Termin {term.term_no}</div>
                        </TableCell>
                        <TableCell>{formatDate(term.due_date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(term.amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(term.paid_amount)}</TableCell>
                        <TableCell>{getPaymentStatusBadge(term.status)}</TableCell>
                        <TableCell className="text-right no-print">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentDialog(term)}
                            disabled={remaining <= 0}
                          >
                            Bayar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {vendorPayments.length > 0 && (
            <div className="rounded-lg border bg-gray-50 p-4">
              <h4 className="mb-3 font-semibold">Riwayat Pembayaran</h4>
              <div className="space-y-2">
                {vendorPayments.map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">
                        {paymentTermById.get(payment.payment_term_id || "")?.description || "Pembayaran Supplier"}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {payment.payment_number} · {formatDate(payment.payment_date)}
                      </div>
                    </div>
                    <div className="font-semibold text-emerald-700">{formatCurrency(payment.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <TableCell>
                    {item.satuan?.nama || item.raw_material?.satuan_besar?.nama || item.raw_material?.satuan || "-"}
                  </TableCell>
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

      {/* Payment Term Dialog */}
      <Dialog open={isTermDialogOpen} onOpenChange={setIsTermDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Termin Pembayaran</DialogTitle>
            <DialogDescription>
              Buat jadwal pembayaran seperti DP, termin lanjutan, atau pelunasan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-lg border border-pink-100 bg-pink-50 p-3">
              <div className="text-xs font-medium text-pink-700">Sisa pembayaran yang belum dibuat termin</div>
              <div className="mt-1 text-lg font-semibold text-pink-700">{formatCurrency(remainingScheduledAmount)}</div>
              <div className="mt-1 text-xs text-pink-700/80">
                Total PO {formatCurrency(payableAmount)} · Sudah dijadwalkan {formatCurrency(scheduledAmount)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nama Termin</Label>
              <Input
                value={termForm.description}
                onChange={(event) => setTermForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Contoh: DP 30%, Termin 2, Pelunasan"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Jatuh Tempo</Label>
                <Input
                  type="date"
                  value={termForm.due_date}
                  onChange={(event) => setTermForm((prev) => ({ ...prev, due_date: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Nominal</Label>
                  {remainingScheduledAmount > 0 && (
                    <button
                      type="button"
                      className="text-xs font-medium text-pink-600 hover:underline"
                      onClick={() => setTermForm((prev) => ({ ...prev, amount: String(remainingScheduledAmount) }))}
                    >
                      Pakai sisa
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  min="0"
                  value={termForm.amount}
                  onChange={(event) => setTermForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input
                value={termForm.notes}
                onChange={(event) => setTermForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTermDialogOpen(false)} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button onClick={handleCreateTerm} disabled={isSavingPayment} className="purchasing-main-button">
              Simpan Termin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Supplier</DialogTitle>
            <DialogDescription>
              Pembayaran akan mengurangi outstanding termin dan memengaruhi status final PO.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Termin</Label>
              <Select
                value={paymentForm.payment_term_id}
                onValueChange={(value) => {
                  const term = paymentTerms.find((item) => item.id === value);
                  const remaining = term ? Math.max(0, Number(term.amount || 0) - Number(term.paid_amount || 0)) : 0;
                  setPaymentForm((prev) => ({
                    ...prev,
                    payment_term_id: value,
                    amount: remaining ? String(remaining) : prev.amount,
                  }));
                }}
              >
                <SelectTrigger>
                  {selectedPaymentTerm ? (
                    <span className="truncate text-left">
                      {selectedPaymentTerm.description || `Termin ${selectedPaymentTerm.term_no}`}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Pilih termin</span>
                  )}
                </SelectTrigger>
                <SelectContent className="min-w-72">
                  {paymentTerms.map((term) => {
                    const remaining = Math.max(0, Number(term.amount || 0) - Number(term.paid_amount || 0));
                    return (
                      <SelectItem key={term.id} value={term.id} disabled={remaining <= 0}>
                        {term.description || `Termin ${term.term_no}`} - Sisa {formatCurrency(remaining)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tanggal Bayar</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, payment_date: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nominal Bayar</Label>
                <Input
                  type="number"
                  min="1"
                  value={paymentForm.amount}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Metode</Label>
                <Select
                  value={paymentForm.method}
                  onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, method: value as VendorPayment["method"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="giro">Giro</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nomor Referensi</Label>
                <Input
                  value={paymentForm.reference_number}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, reference_number: event.target.value }))}
                  placeholder="Nomor transfer / bukti bayar"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input
                value={paymentForm.notes}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button onClick={handleCreatePayment} disabled={isSavingPayment || paymentTerms.length === 0} className="purchasing-main-button">
              Simpan Pembayaran
            </Button>
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
