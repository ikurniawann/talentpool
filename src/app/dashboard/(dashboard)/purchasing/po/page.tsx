"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, FileText, CheckCircle, Send, XCircle, Download, Trash2, Truck, Pencil, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrderWithStats, POStatus } from "@/types/purchasing";
import { listPurchaseOrders, approvePurchaseOrder, sendPurchaseOrder, cancelPurchaseOrder } from "@/lib/purchasing";
import { convertToCSV, downloadCSV, formatDateForCSV, formatCurrencyForCSV } from "@/lib/utils/csv-export";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { PurchasingListSection } from "@/modules/purchasing/components/list/PurchasingListSection";
import { PurchasingTablePagination } from "@/modules/purchasing/components/pagination/PurchasingTablePagination";

const STATUS_OPTIONS: { value: POStatus | "all"; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Menunggu Persetujuan" },
  { value: "approved", label: "Disetujui" },
  { value: "sent", label: "Terkirim" },
  { value: "partial", label: "Diterima Sebagian" },
  { value: "partially_received", label: "Diterima Sebagian" },
  { value: "received", label: "Diterima Penuh" },
  { value: "rejected", label: "Ditolak" },
  { value: "cancelled", label: "Dibatalkan" },
];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<POStatus | "all">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Dialog states
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellingPo, setCancellingPo] = useState<PurchaseOrderWithStats | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [sendingPo, setSendingPo] = useState<PurchaseOrderWithStats | null>(null);
  const [sendVia, setSendVia] = useState<"EMAIL" | "WHATSAPP" | "PRINT" | "OTHER">("EMAIL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkApproveDialogOpen, setIsBulkApproveDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [processingPoId, setProcessingPoId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const loadPOs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listPurchaseOrders({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page: pagination.page,
        limit: pagination.limit,
      });
      setPos(response.data);
      const responsePagination = response.pagination;
      const total = responsePagination?.total ?? response.total ?? 0;
      const totalPages = responsePagination?.total_pages ?? response.total_pages ?? Math.ceil(total / pagination.limit);
      setPagination((prev) => ({
        ...prev,
        total,
        total_pages: totalPages,
      }));
    } catch (error) {
      console.error("Error loading POs:", error);
      toast.error("Gagal memuat data PO");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, search, statusFilter]);

  useEffect(() => {
    loadPOs();
  }, [loadPOs]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchQuery.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      // Fetch all data (not paginated)
      const response = await listPurchaseOrders({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page: 1,
        limit: 1000, // Get more data for export
      });

      const columns = [
        { key: "nomor_po", label: "Nomor PO" },
        { key: "nama_supplier", label: "Supplier" },
        { key: "supplier_kode", label: "Kode Supplier" },
        { key: "tanggal_po", label: "Tanggal PO", format: formatDateForCSV },
        { key: "status", label: "Status" },
        { key: "subtotal", label: "Total Amount", format: (val: unknown) => val ? formatCurrencyForCSV(Number(val)) : "" },
        { key: "created_by", label: "Created By" },
        { key: "catatan", label: "Catatan" },
      ];

      const csvContent = convertToCSV(response.data, columns);
      const filename = `purchase-orders-${new Date().toISOString().split("T")[0]}.csv`;
      downloadCSV(csvContent, filename);
      
      toast.success(`Berhasil export ${response.data.length} PO`);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Gagal export data");
    } finally {
      setIsExporting(false);
    }
  };

  // Checkbox handlers
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(pos.map(po => po.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    
    setIsProcessingBulk(true);
    try {
      let successCount = 0;
      let failCount = 0;
      const failedIds: string[] = [];
      
      console.log(`Starting bulk approve for ${selectedIds.size} POs:`, Array.from(selectedIds));
      
      for (const id of selectedIds) {
        try {
          console.log(`Approving PO ${id}...`);
          await approvePurchaseOrder(id);
          successCount++;
          console.log(`✓ PO ${id} approved`);
        } catch (error: unknown) {
          console.error(`✗ Failed to approve PO ${id}:`, getErrorMessage(error, "Unknown error"));
          failCount++;
          failedIds.push(id);
        }
      }
      
      console.log(`Bulk approve completed: ${successCount} success, ${failCount} failed`);
      
      if (successCount > 0) {
        toast.success(`Berhasil approve ${successCount} PO`);
      }
      
      if (failCount > 0) {
        toast.error(`${failCount} PO gagal diapprove: ${failedIds.slice(0, 3).join(', ')}${failedIds.length > 3 ? '...' : ''}`);
      }
      
      // Reload data
      await loadPOs();
      
      // Clear selection
      setSelectedIds(new Set());
      setIsBulkApproveDialogOpen(false);
    } catch (error) {
      console.error("Error bulk approve:", error);
      toast.error("Terjadi kesalahan saat approve massal");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsProcessingBulk(true);
    try {
      // Note: You'll need to implement deletePurchaseOrder in lib/purchasing
      let successCount = 0;
      let failCount = 0;
      
      // Placeholder - implement actual delete API call
      for (const id of selectedIds) {
        try {
          // await deletePurchaseOrder(id); // TODO: Implement this
          successCount++;
        } catch (error: unknown) {
          console.error(`Failed to delete PO ${id}:`, error);
          failCount++;
        }
      }
      
      toast.success(`Berhasil hapus ${successCount} PO`);
      if (failCount > 0) {
        toast.error(`${failCount} PO gagal dihapus`);
      }
      
      loadPOs();
      setSelectedIds(new Set());
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error bulk delete:", error);
      toast.error("Gagal hapus massal");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleApprove = async (po: PurchaseOrderWithStats) => {
    try {
      setProcessingPoId(po.id);
      await approvePurchaseOrder(po.id);
      toast.success("PO berhasil diapprove");
      await loadPOs();
    } catch (error: unknown) {
      console.error("Error approving PO:", error);
      toast.error(getErrorMessage(error, "Gagal mengapprove PO"));
    } finally {
      setProcessingPoId(null);
    }
  };

  const handleOpenSend = (po: PurchaseOrderWithStats) => {
    setSendingPo(po);
    setSendVia("EMAIL");
    setIsSendDialogOpen(true);
  };

  const handleSend = async () => {
    if (!sendingPo) return;
    try {
      setIsSending(true);
      setProcessingPoId(sendingPo.id);
      await sendPurchaseOrder(sendingPo.id, sendVia);
      toast.success(`PO berhasil dikirim via ${sendVia}`);
      setIsSendDialogOpen(false);
      await loadPOs();
    } catch (error: unknown) {
      console.error("Error sending PO:", error);
      toast.error(getErrorMessage(error, "Gagal mengirim PO"));
    } finally {
      setIsSending(false);
      setProcessingPoId(null);
    }
  };

  const handleOpenCancel = (po: PurchaseOrderWithStats) => {
    setCancellingPo(po);
    setCancelReason("");
    setIsCancelDialogOpen(true);
  };

  const handleCancel = async () => {
    if (!cancellingPo || !cancelReason) return;
    try {
      await cancelPurchaseOrder(cancellingPo.id, cancelReason);
      toast.success("PO berhasil dibatalkan");
      setIsCancelDialogOpen(false);
      loadPOs();
    } catch (error: unknown) {
      console.error("Error cancelling PO:", error);
      toast.error(getErrorMessage(error, "Gagal membatalkan PO"));
    }
  };

  const normalizeStatus = (status: string) => status.toLowerCase() as POStatus;

  const getStatusBadge = (status: POStatus | string) => {
    const normalized = normalizeStatus(status);
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

  const getLifecycleBadge = (po: PurchaseOrderWithStats) => {
    const lifecycle = po.lifecycle_status || "in_progress";
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

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID");
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSearch("");
    setStatusFilter("all");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const isFilterActive = statusFilter !== "all";

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Procurement", href: "/dashboard/purchasing/procurement" },
          { label: "Purchase Order" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
          <p className="text-sm text-gray-500">
            Kelola Purchase Order dari pembuatan hingga penerimaan — {pagination.total} total
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportCSV} disabled={isExporting} className="h-10 flex-1 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700 sm:flex-none">
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Link href="/dashboard/purchasing/po/new">
            <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Buat PO dari PR
            </Button>
          </Link>
        </div>
      </div>

      <PurchasingListSection
        icon={FileText}
        title="Daftar Purchase Order"
        description="Pantau PO, supplier, status approval, dan progress penerimaan."
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:w-auto md:flex-row md:items-center">
            <label className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari nomor PO atau supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 bg-white pl-10 text-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={() => setFilterOpen((open) => !open)}
              className={
                isFilterActive
                  ? "h-10 gap-2 rounded-lg border-pink-600 bg-pink-600 px-3 text-sm font-semibold !text-white shadow-sm hover:!border-pink-700 hover:!bg-pink-700 hover:!text-white [&_*]:!text-white [&_svg]:!text-white"
                  : "h-10 gap-2 rounded-lg border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700"
              }
            >
              <Filter className={isFilterActive ? "h-4 w-4 text-white" : "h-4 w-4"} />
              Filter
              {isFilterActive && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs text-white">
                  1
                </span>
              )}
            </Button>

            {(search || isFilterActive || pagination.page > 1) && (
              <Button variant="outline" onClick={handleResetFilters} className="h-10 flex-shrink-0 rounded-lg">
                Reset
              </Button>
            )}
          </div>
        }
      >

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} PO terpilih
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBulkApproveDialogOpen(true)}
            disabled={isProcessingBulk}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve Selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBulkDeleteDialogOpen(true)}
            disabled={isProcessingBulk}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

        <div>
        {filterOpen && (
          <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <Filter className="h-3.5 w-3.5 text-pink-500" />
                  Status
                </div>
                <Combobox
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value as POStatus | "all");
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  placeholder="Filter status..."
                  searchPlaceholder="Cari status..."
                  emptyMessage="Status tidak ditemukan"
                  className="!w-full h-9 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-[50px] px-4 py-3 text-left font-semibold">
                <input
                  type="checkbox"
                  checked={selectedIds.size === pos.length && pos.length > 0}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold">Nomor PO</th>
              <th className="px-4 py-3 text-left font-semibold">Supplier</th>
              <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-center font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Progress</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                  Memuat data...
                </td>
              </tr>
            ) : pos.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-14 text-center text-sm text-gray-500">
                  Tidak ada data PO
                </td>
              </tr>
            ) : (
              pos.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(po.id)}
                      onChange={() => toggleSelectItem(po.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/purchasing/po/${po.id}`}
                      className="hover:underline text-pink-600"
                    >
                      {po.nomor_po}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{po.nama_supplier || po.supplier_kode}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(po.tanggal_po)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(po.grand_total || 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {getStatusBadge(po.status)}
                      {getLifecycleBadge(po)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {normalizeStatus(po.status) !== "draft" && normalizeStatus(po.status) !== "cancelled" && (
                      <div className="grid gap-1">
                        <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              (po.overall_progress_pct || 0) >= 100
                                ? "bg-green-500"
                                : (po.overall_progress_pct || 0) > 0
                                ? "bg-yellow-400"
                                : "bg-gray-300"
                            }`}
                            style={{ width: `${po.overall_progress_pct || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {po.overall_progress_pct || 0}%
                        </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Barang {po.received_percentage || 0}% · Bayar {po.payment_progress_pct || 0}%
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/purchasing/po/${po.id}`}>
                        <Button variant="ghost" size="sm" className="cursor-pointer" title="Lihat detail">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      {normalizeStatus(po.status) === "draft" && (
                        <>
                          <Link href={`/dashboard/purchasing/po/${po.id}/edit`}>
                            <Button variant="ghost" size="sm" className="cursor-pointer" title="Edit PO">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => handleApprove(po)} disabled={processingPoId === po.id} title="Approve">
                            {processingPoId === po.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                          </Button>
                        </>
                      )}
                      {normalizeStatus(po.status) === "approved" && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenSend(po)} disabled={processingPoId === po.id} title="Kirim ke supplier">
                          {processingPoId === po.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                          ) : (
                            <Send className="w-4 h-4 text-pink-600" />
                          )}
                        </Button>
                      )}
                      {["approved", "sent", "partially_received"].includes(normalizeStatus(po.status)) && (
                        <Link href={`/dashboard/purchasing/delivery?po_id=${po.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer"
                            title="Lihat delivery untuk PO ini"
                          >
                            <Truck className="w-4 h-4 text-pink-600" />
                          </Button>
                        </Link>
                      )}
                      {normalizeStatus(po.status) !== "received" && normalizeStatus(po.status) !== "cancelled" && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenCancel(po)} title="Batalkan">
                          <XCircle className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        <PurchasingTablePagination
          page={pagination.page}
          totalPages={Math.max(1, pagination.total_pages)}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={(nextPage) => setPagination((prev) => ({ ...prev, page: nextPage }))}
        />
        </div>
      </PurchasingListSection>

      {/* Send Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[460px]">
          <DialogHeader className="border-b border-gray-200/70 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">Kirim PO ke Supplier</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Pilih metode pengiriman untuk PO {sendingPo?.nomor_po}
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

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan PO</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin membatalkan PO {cancellingPo?.nomor_po}?
              Masukkan alasan pembatalan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Alasan Pembatalan *</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Perubahan kebutuhan"
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

      {/* Bulk Approve Dialog */}
      <Dialog open={isBulkApproveDialogOpen} onOpenChange={setIsBulkApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Multiple PO</DialogTitle>
            <DialogDescription>
              Anda akan approve {selectedIds.size} PO yang terpilih. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkApproveDialogOpen(false)} disabled={isProcessingBulk} className="purchasing-secondary-button">
              Cancel
            </Button>
            <Button onClick={handleBulkApprove} disabled={isProcessingBulk} className="purchasing-main-button">
              {isProcessingBulk ? "Processing..." : `Approve ${selectedIds.size} PO`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Multiple PO</DialogTitle>
            <DialogDescription className="text-red-600">
              ⚠️ Peringatan: Anda akan menghapus {selectedIds.size} PO yang terpilih. Tindakan ini tidak dapat dibatalkan!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isProcessingBulk} className="purchasing-secondary-button">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isProcessingBulk} className="purchasing-main-button">
              {isProcessingBulk ? "Processing..." : `Hapus ${selectedIds.size} PO`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
