"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { NumericInput } from "@/components/ui/numeric-input";
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
  Banknote,
  Boxes,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  PurchaseOrderItem,
  POStatus,
  PurchaseOrderPaymentTerm,
  VendorPayment,
} from "@/types/purchasing";
import { usePurchaseOrder, usePurchaseOrderPayments } from "../queries";
import {
  useApprovePurchaseOrder,
  useSendPurchaseOrder,
  useCancelPurchaseOrder,
  useCreatePOPaymentTerm,
  useDeletePOPaymentTerm,
  useCreateVendorPayment,
} from "../mutations";
export function PODetailPage() {
  const params = useParams();
  const poId = params.id as string;

  const detailQuery = usePurchaseOrder(poId);
  const paymentsQuery = usePurchaseOrderPayments(poId);
  const po = detailQuery.data ?? null;
  const items: PurchaseOrderItem[] = po?.items ?? [];
  const paymentTerms: PurchaseOrderPaymentTerm[] = paymentsQuery.data?.terms ?? [];
  const vendorPayments: VendorPayment[] = paymentsQuery.data?.payments ?? [];
  const loading = detailQuery.isLoading;

  const approveMutation = useApprovePurchaseOrder();
  const sendMutation = useSendPurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const createTermMutation = useCreatePOPaymentTerm();
  const deleteTermMutation = useDeletePOPaymentTerm();
  const createPaymentMutation = useCreateVendorPayment();
  const isApproving = approveMutation.isPending;
  const isSending = sendMutation.isPending;
  const isDeletingTerm = deleteTermMutation.isPending;

  // Dialog states
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isTermDialogOpen, setIsTermDialogOpen] = useState(false);
  const [isDeleteTermDialogOpen, setIsDeleteTermDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [sendVia, setSendVia] = useState<"EMAIL" | "WHATSAPP" | "PRINT" | "OTHER">("EMAIL");
  const [cancelReason, setCancelReason] = useState("");
  const [deletingTerm, setDeletingTerm] = useState<PurchaseOrderPaymentTerm | null>(null);
  const [termForm, setTermForm] = useState({
    description: "Termin",
    due_date: new Date().toISOString().slice(0, 10),
    amount: undefined as number | undefined,
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    payment_term_id: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount: undefined as number | undefined,
    method: "bank_transfer" as VendorPayment["method"],
    reference_number: "",
    notes: "",
  });

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

  useEffect(() => {
    if (detailQuery.isError) {
      console.error("Error loading PO:", detailQuery.error);
      toast.error("Gagal memuat data PO");
    }
  }, [detailQuery.isError, detailQuery.error]);

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(poId);
      toast.success("PO berhasil diapprove");
      setIsApproveDialogOpen(false);
    } catch (error: unknown) {
      console.error("Error approving PO:", error);
      toast.error(getErrorMessage(error, "Gagal mengapprove PO"));
    }
  };

  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync({ id: poId, sentVia: sendVia });
      toast.success(`PO berhasil dikirim via ${sendVia}`);
      setIsSendDialogOpen(false);
    } catch (error: unknown) {
      console.error("Error sending PO:", error);
      toast.error(getErrorMessage(error, "Gagal mengirim PO"));
    }
  };

  const handleCancel = async () => {
    if (!cancelReason) return;
    try {
      await cancelMutation.mutateAsync({ id: poId, reason: cancelReason });
      toast.success("PO berhasil dibatalkan");
      setIsCancelDialogOpen(false);
    } catch (error: unknown) {
      console.error("Error cancelling PO:", error);
      toast.error(getErrorMessage(error, "Gagal membatalkan PO"));
    }
  };

  const openTermDialog = () => {
    if (remainingScheduledAmount <= 0) {
      toast.info("Semua nominal PO sudah dijadwalkan ke termin pembayaran");
      return;
    }

    setTermForm({
      description: paymentTerms.length === 0 ? "DP" : `Termin ${paymentTerms.length + 1}`,
      due_date: new Date().toISOString().slice(0, 10),
      amount: remainingScheduledAmount > 0 ? remainingScheduledAmount : undefined,
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
      amount: remaining || undefined,
      method: "bank_transfer",
      reference_number: "",
      notes: "",
    });
    setIsPaymentDialogOpen(true);
  };

  const openDeleteTermDialog = (term: PurchaseOrderPaymentTerm) => {
    if (Number(term.paid_amount || 0) > 0 || ["partial", "paid"].includes(term.status)) {
      toast.error("Termin yang sudah memiliki pembayaran tidak bisa dihapus");
      return;
    }

    setDeletingTerm(term);
    setIsDeleteTermDialogOpen(true);
  };

  const handleCreateTerm = async () => {
    const amount = Number(termForm.amount || 0);
    if (!termForm.description.trim() || !termForm.due_date || amount <= 0) {
      toast.error("Lengkapi deskripsi, tanggal jatuh tempo, dan nominal termin");
      return;
    }

    if (amount > remainingScheduledAmount) {
      toast.error(`Nominal termin tidak boleh melebihi sisa ${formatCurrency(remainingScheduledAmount)}`);
      return;
    }

    try {
      await createTermMutation.mutateAsync({
        poId,
        payload: {
          description: termForm.description.trim(),
          due_date: termForm.due_date,
          amount,
          notes: termForm.notes.trim() || null,
        },
      });
      toast.success("Termin pembayaran berhasil ditambahkan");
      setIsTermDialogOpen(false);
      setTermForm({
        description: "Termin",
        due_date: new Date().toISOString().slice(0, 10),
        amount: undefined,
        notes: "",
      });
    } catch (error: unknown) {
      console.error("Error creating term:", error);
      toast.error(getErrorMessage(error, "Gagal menambahkan termin"));
    }
  };

  const handleDeleteTerm = async () => {
    if (!deletingTerm) return;

    try {
      await deleteTermMutation.mutateAsync({ poId, termId: deletingTerm.id });
      toast.success("Termin pembayaran berhasil dihapus");
      setIsDeleteTermDialogOpen(false);
      setDeletingTerm(null);
    } catch (error: unknown) {
      console.error("Error deleting term:", error);
      toast.error(getErrorMessage(error, "Gagal menghapus termin pembayaran"));
    }
  };

  const handleCreatePayment = async () => {
    const amount = Number(paymentForm.amount || 0);
    if (!paymentForm.payment_term_id || !paymentForm.payment_date || amount <= 0) {
      toast.error("Pilih termin, tanggal pembayaran, dan nominal pembayaran");
      return;
    }

    try {
      await createPaymentMutation.mutateAsync({
        poId,
        payload: {
          payment_term_id: paymentForm.payment_term_id,
          payment_date: paymentForm.payment_date,
          amount,
          method: paymentForm.method,
          reference_number: paymentForm.reference_number.trim() || null,
          notes: paymentForm.notes.trim() || null,
        },
      });
      toast.success("Pembayaran vendor berhasil dicatat");
      setIsPaymentDialogOpen(false);
    } catch (error: unknown) {
      console.error("Error creating payment:", error);
      toast.error(getErrorMessage(error, "Gagal mencatat pembayaran vendor"));
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

  const formatQuantity = (value?: number | null) => {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 4,
    }).format(value ?? 0);
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
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{po.nomor_po}</h1>
            {getStatusBadge(po.status)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{po.nama_supplier || "-"}</span>
            <span className="text-gray-300">•</span>
            <span>{formatDate(po.tanggal_po)}</span>
            <span className="text-gray-300">•</span>
            <span>{formatCurrency(po.grand_total || 0)}</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link href="/dashboard/purchasing/po">
            <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          {normalizedStatus !== "draft" && normalizedStatus !== "cancelled" && (
            <Button variant="outline" onClick={() => openPaymentDialog()} className="purchasing-secondary-button w-full sm:w-auto">
              <CreditCard className="w-4 h-4 mr-2" />
              Catat Pembayaran
            </Button>
          )}
          <Link href={`/dashboard/purchasing/print/po/${po.id}`} target="_blank">
            <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
              <Printer className="w-4 h-4 mr-2" />
              Cetak PO
            </Button>
          </Link>
          
          {normalizedStatus === "draft" && (
            <>
              <Link href={`/dashboard/purchasing/po/edit/${po.id}`}>
                <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">Edit</Button>
              </Link>
              <Button onClick={() => setIsApproveDialogOpen(true)} className="purchasing-main-button w-full sm:w-auto">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
          
          {normalizedStatus === "approved" && (
            <Button onClick={() => setIsSendDialogOpen(true)} className="purchasing-main-button w-full sm:w-auto">
              <Send className="w-4 h-4 mr-2" />
              Kirim ke Supplier
            </Button>
          )}

          {["approved", "sent", "partial", "partially_received"].includes(normalizedStatus || "") && (
            <Link href={po.active_delivery_id ? `/dashboard/purchasing/delivery/${po.active_delivery_id}` : `/dashboard/purchasing/delivery/insert?po_id=${po.id}`}>
              <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
                <Truck className="w-4 h-4 mr-2" />
                {po.active_delivery_id ? `Lihat Delivery${po.active_delivery_number ? ` ${po.active_delivery_number}` : ""}` : "Buat Delivery"}
              </Button>
            </Link>
          )}
          
          {normalizedStatus !== "received" && normalizedStatus !== "cancelled" && (
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(true)} className="h-10 w-full rounded-lg border-red-200 bg-white px-3 text-sm font-medium text-red-600 shadow-sm hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700 sm:w-auto">
              <XCircle className="w-4 h-4 mr-2" />
              Batal
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Status PO</p>
                <div className="mt-1 flex flex-wrap gap-1">{getStatusBadge(po.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Banknote className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Total PO</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(po.grand_total || payableAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Sudah Dibayar</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(po.paid_amount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Boxes className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Progress Total</p>
                <p className="text-lg font-bold text-gray-900">{overallProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info PO */}
        <Card className="border-gray-200/70 shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5" />
              Informasi PO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">Status</Label>
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(po.status)}
                  {getLifecycleBadge()}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">Tanggal PO</Label>
                <div className="font-semibold text-gray-900">{formatDate(po.tanggal_po)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-sm text-gray-500">
                  <User className="w-4 h-4" />
                  Supplier
                </Label>
                <div className="font-semibold text-gray-900">{po.nama_supplier}</div>
                <div className="text-sm text-gray-500">
                  {po.supplier_kode}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Estimasi Pengiriman
                </Label>
                <div className="font-semibold text-gray-900">
                  {formatDate(po.tanggal_kirim_estimasi)}
                </div>
              </div>
            </div>

            {po.catatan && (
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">Catatan</Label>
                <div className="text-gray-700">{po.catatan}</div>
              </div>
            )}

            {po.source_type === "production_order" && (
              <div className="rounded-lg border border-pink-100 bg-pink-50 p-3">
                <Label className="flex items-center gap-1 text-sm text-pink-700">
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
                <Label className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  Alamat Pengiriman
                </Label>
                <div className="text-gray-700">{po.alamat_pengiriman}</div>
              </div>
            )}

            {/* Tracking Info */}
            <div className="mt-4 border-t border-gray-200/70 pt-4">
              <h4 className="mb-3 font-semibold text-gray-900">Tracking</h4>
              <div className="space-y-2 text-sm">
                {po.approved_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Approved</span>
                    <span>{formatDateTime(po.approved_at)}</span>
                  </div>
                )}
                {po.sent_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sent via {po.sent_via}</span>
                    <span>{formatDateTime(po.sent_at)}</span>
                  </div>
                )}
                {po.cancelled_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cancelled</span>
                    <span>{formatDateTime(po.cancelled_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="border-gray-200/70 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-base">Ringkasan</CardTitle>
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
                  <div className="flex justify-between border-t border-gray-200/70 pt-2 text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </>
              );
            })()}

            {normalizedStatus !== "draft" && normalizedStatus !== "cancelled" && (
              <div className="mt-4 border-t border-gray-200/70 pt-4">
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
                        {formatQuantity(po.total_qty_received)} / {formatQuantity(po.total_qty_ordered)} item
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
      <Card className="border-gray-200/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="w-5 h-5" />
            Termin & Pembayaran Supplier
          </CardTitle>
          <div className="flex flex-wrap gap-2 no-print">
            <Button
              variant="outline"
              onClick={openTermDialog}
              disabled={remainingScheduledAmount <= 0}
              title={remainingScheduledAmount <= 0 ? "Semua nominal PO sudah dijadwalkan" : "Tambah termin pembayaran"}
              className="purchasing-secondary-button"
            >
              Tambah Termin
            </Button>
            <Button onClick={() => openPaymentDialog()} className="purchasing-main-button">
              Catat Pembayaran
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
              <p className="text-xs font-medium text-gray-500">Status Pembayaran</p>
              <div className="mt-2">{getPaymentStatusBadge(po.payment_status)}</div>
            </div>
            <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
              <p className="text-xs font-medium text-gray-500">Total Tagihan</p>
              <p className="mt-1 font-semibold text-gray-900">{formatCurrency(payableAmount)}</p>
            </div>
            <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
              <p className="text-xs font-medium text-gray-500">Sudah Dibayar</p>
              <p className="mt-1 font-semibold text-emerald-600">{formatCurrency(po.paid_amount || 0)}</p>
            </div>
            <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3">
              <p className="text-xs font-medium text-gray-500">Jatuh Tempo Berikutnya</p>
              <p className="mt-1 font-semibold text-gray-900">{formatDate(po.next_due_date)}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200/70">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Termin</th>
                  <th className="px-4 py-3 text-left font-semibold">Jatuh Tempo</th>
                  <th className="px-4 py-3 text-right font-semibold">Tagihan</th>
                  <th className="px-4 py-3 text-right font-semibold">Dibayar</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paymentTerms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Belum ada termin pembayaran.
                    </td>
                  </tr>
                ) : (
                  paymentTerms.map((term) => {
                    const remaining = Math.max(0, Number(term.amount || 0) - Number(term.paid_amount || 0));
                    return (
                      <tr key={term.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{term.description || `Termin ${term.term_no}`}</div>
                          <div className="text-xs text-gray-500">Termin {term.term_no}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatDate(term.due_date)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(term.amount)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(term.paid_amount)}</td>
                        <td className="px-4 py-3 text-center">{getPaymentStatusBadge(term.status)}</td>
                        <td className="px-4 py-3 text-right no-print">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPaymentDialog(term)}
                              disabled={remaining <= 0}
                              className="h-8 rounded-lg border-gray-200 px-3 text-xs"
                            >
                              Bayar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteTermDialog(term)}
                              disabled={Number(term.paid_amount || 0) > 0 || ["partial", "paid"].includes(term.status)}
                              className="h-8 w-8 rounded-lg p-0 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:text-gray-300"
                              title={
                                Number(term.paid_amount || 0) > 0 || ["partial", "paid"].includes(term.status)
                                  ? "Termin yang sudah dibayar tidak bisa dihapus"
                                  : "Hapus termin"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {vendorPayments.length > 0 && (
            <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 p-4">
              <h4 className="mb-3 font-semibold text-gray-900">Riwayat Pembayaran</h4>
              <div className="space-y-2">
                {vendorPayments.map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm">
                    <div>
                      <span className="font-semibold text-gray-900">
                        {paymentTermById.get(payment.payment_term_id || "")?.description || "Pembayaran Supplier"}
                      </span>
                      <div className="text-xs text-gray-500">
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
      <Card className="border-gray-200/70 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-5 h-5" />
            Item Purchase Order
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Bahan Baku</th>
                  <th className="px-4 py-3 text-right font-semibold">Jumlah</th>
                  <th className="px-4 py-3 text-left font-semibold">Satuan</th>
                  <th className="px-4 py-3 text-right font-semibold">Harga Satuan</th>
                  <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                {normalizedStatus !== "draft" && normalizedStatus !== "cancelled" && (
                    <th className="px-4 py-3 text-right font-semibold">Diterima</th>
                )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{item.raw_material?.nama}</div>
                      <div className="text-xs text-gray-500">
                      {item.raw_material?.kode}
                    </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatQuantity(item.qty_ordered)}</td>
                    <td className="px-4 py-3 text-gray-700">
                    {item.satuan?.nama || item.raw_material?.satuan_besar?.nama || item.raw_material?.satuan || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                    {formatCurrency(item.harga_satuan)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(item.subtotal)}
                    </td>
                  {normalizedStatus !== "draft" && normalizedStatus !== "cancelled" && (
                      <td className="px-4 py-3 text-right">
                      <div
                        className={
                          item.qty_received >= item.qty_ordered
                            ? "text-green-600"
                            : item.qty_received > 0
                            ? "text-yellow-600"
                            : "text-gray-400"
                        }
                      >
                        {formatQuantity(item.qty_received)} / {formatQuantity(item.qty_ordered)}
                      </div>
                      </td>
                  )}
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">Approve PO</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin mengapprove PO {po.nomor_po}?
              Setelah diapprove, PO tidak bisa diedit lagi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isApproving} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button onClick={handleApprove} disabled={isApproving} className="purchasing-main-button">
              {isApproving ? "Memproses..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[460px]">
          <DialogHeader className="border-b border-gray-200/70 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">Kirim PO</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Pilih metode pengiriman untuk PO {po.nomor_po}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Metode Pengiriman</Label>
              <Combobox
                options={[
                  { value: "EMAIL", label: "Email" },
                  { value: "WHATSAPP", label: "WhatsApp" },
                  { value: "PRINT", label: "Print / Manual" },
                  { value: "OTHER", label: "Lainnya" },
                ]}
                value={sendVia}
                onChange={(value) => setSendVia(value as "EMAIL" | "WHATSAPP" | "PRINT" | "OTHER")}
                placeholder="Pilih metode..."
                searchPlaceholder="Cari metode..."
                emptyMessage="Metode tidak ditemukan"
                className="!w-full h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button variant="outline" onClick={() => setIsSendDialogOpen(false)} disabled={isSending} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button onClick={handleSend} disabled={isSending} className="purchasing-main-button">
              {isSending ? "Mengirim..." : "Kirim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Term Dialog */}
      <Dialog open={isTermDialogOpen} onOpenChange={setIsTermDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[560px]">
          <DialogHeader className="border-b border-gray-200/70 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">Tambah Termin Pembayaran</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Buat jadwal pembayaran seperti DP, termin lanjutan, atau pelunasan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-5 py-4">
            <div className="rounded-xl border border-pink-100 bg-pink-50 p-3">
              <div className="text-xs font-semibold text-pink-700">Sisa pembayaran yang belum dibuat termin</div>
              <div className="mt-1 text-lg font-bold text-pink-700">{formatCurrency(remainingScheduledAmount)}</div>
              <div className="mt-1 text-xs text-pink-700/80">
                Total PO {formatCurrency(payableAmount)} · Sudah dijadwalkan {formatCurrency(scheduledAmount)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Termin</Label>
              <Input
                value={termForm.description}
                onChange={(event) => setTermForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Contoh: DP 30%, Termin 2, Pelunasan"
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Jatuh Tempo</Label>
                <Input
                  type="date"
                  value={termForm.due_date}
                  onChange={(event) => setTermForm((prev) => ({ ...prev, due_date: event.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Nominal</Label>
                  {remainingScheduledAmount > 0 && (
                    <button
                      type="button"
                      className="text-xs font-medium text-pink-600 hover:underline"
                      onClick={() => setTermForm((prev) => ({ ...prev, amount: remainingScheduledAmount }))}
                    >
                      Pakai sisa
                    </button>
                  )}
                </div>
                <div className="flex rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                  <div className="flex min-w-12 items-center justify-center rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                    Rp
                  </div>
                  <NumericInput
                    value={termForm.amount}
                    max={remainingScheduledAmount}
                    onValueChange={(value) => setTermForm((prev) => ({ ...prev, amount: value || undefined }))}
                    decimalScale={0}
                    className="h-9 rounded-l-none border-0 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Catatan</Label>
              <Input
                value={termForm.notes}
                onChange={(event) => setTermForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Opsional"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button variant="outline" onClick={() => setIsTermDialogOpen(false)} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button onClick={handleCreateTerm} disabled={createTermMutation.isPending} className="purchasing-main-button">
              Simpan Termin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Term Dialog */}
      <Dialog open={isDeleteTermDialogOpen} onOpenChange={setIsDeleteTermDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[440px]">
          <DialogHeader className="border-b border-gray-200/70 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">Hapus Termin Pembayaran</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Termin ini akan dihapus dari jadwal pembayaran dan nominalnya kembali tersedia untuk termin baru.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4">
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-700">
                {deletingTerm?.description || `Termin ${deletingTerm?.term_no || ""}`}
              </p>
              <p className="mt-1 text-xs text-red-700/80">
                Nominal {formatCurrency(Number(deletingTerm?.amount || 0))}. Hanya termin tanpa pembayaran yang bisa dihapus.
              </p>
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteTermDialogOpen(false)}
              disabled={isDeletingTerm}
              className="purchasing-secondary-button"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTerm}
              disabled={isDeletingTerm}
              className="purchasing-main-button"
            >
              {isDeletingTerm ? "Menghapus..." : "Hapus Termin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[620px]">
          <DialogHeader className="border-b border-gray-200/70 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">Catat Pembayaran Supplier</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Pembayaran akan mengurangi outstanding termin dan memengaruhi status final PO.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Termin</Label>
              <Combobox
                options={paymentTerms.map((term) => {
                  const remaining = Math.max(0, Number(term.amount || 0) - Number(term.paid_amount || 0));
                  return {
                    value: term.id,
                    label: term.description || `Termin ${term.term_no}`,
                    description: `Sisa ${formatCurrency(remaining)}`,
                  };
                })}
                value={paymentForm.payment_term_id}
                onChange={(value) => {
                  const term = paymentTerms.find((item) => item.id === value);
                  const remaining = term ? Math.max(0, Number(term.amount || 0) - Number(term.paid_amount || 0)) : 0;
                  setPaymentForm((prev) => ({
                    ...prev,
                    payment_term_id: value,
                    amount: remaining || prev.amount,
                  }));
                }}
                placeholder="Pilih termin..."
                searchPlaceholder="Cari termin..."
                emptyMessage="Termin tidak ditemukan"
                className="h-9 text-sm"
              />
              {selectedPaymentTerm && (
                <p className="text-xs text-gray-500">
                  Sisa termin: {formatCurrency(Math.max(0, Number(selectedPaymentTerm.amount || 0) - Number(selectedPaymentTerm.paid_amount || 0)))}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tanggal Bayar</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, payment_date: event.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nominal Bayar</Label>
                <div className="flex rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                  <div className="flex min-w-12 items-center justify-center rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                    Rp
                  </div>
                  <NumericInput
                  value={paymentForm.amount}
                    onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, amount: value || undefined }))}
                    decimalScale={0}
                    className="h-9 rounded-l-none border-0 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Metode</Label>
                <Combobox
                  options={[
                    { value: "bank_transfer", label: "Bank Transfer" },
                    { value: "cash", label: "Cash" },
                    { value: "giro", label: "Giro" },
                    { value: "qris", label: "QRIS" },
                    { value: "other", label: "Lainnya" },
                  ]}
                  value={paymentForm.method}
                  onChange={(value) => setPaymentForm((prev) => ({ ...prev, method: value as VendorPayment["method"] }))}
                  placeholder="Pilih metode..."
                  searchPlaceholder="Cari metode..."
                  emptyMessage="Metode tidak ditemukan"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nomor Referensi</Label>
                <Input
                  value={paymentForm.reference_number}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, reference_number: event.target.value }))}
                  placeholder="Nomor transfer / bukti bayar"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Catatan</Label>
              <Input
                value={paymentForm.notes}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Opsional"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button onClick={handleCreatePayment} disabled={createPaymentMutation.isPending || paymentTerms.length === 0} className="purchasing-main-button">
              Simpan Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[460px]">
          <DialogHeader className="border-b border-gray-200/70 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">Batalkan PO</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin membatalkan PO {po.nomor_po}?
              Masukkan alasan pembatalan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Alasan Pembatalan *</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Masukkan alasan..."
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
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
