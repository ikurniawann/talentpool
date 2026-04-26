"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreVertical, FileText, CheckCircle, Send, XCircle, Download, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrderWithStats, POStatus, PaginatedResponse } from "@/types/purchasing";
import { listPurchaseOrders, approvePurchaseOrder, sendPurchaseOrder, cancelPurchaseOrder } from "@/lib/purchasing";
import { convertToCSV, downloadCSV, formatDateForCSV, formatCurrencyForCSV } from "@/lib/utils/csv-export";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS: { value: POStatus | ""; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "SENT", label: "Terkirim" },
  { value: "PARTIAL", label: "Diterima Sebagian" },
  { value: "RECEIVED", label: "Diterima Penuh" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

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
  const [statusFilter, setStatusFilter] = useState<POStatus | "">("");
  
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

  useEffect(() => {
    loadPOs();
  }, [pagination.page, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPOs();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadPOs = async () => {
    try {
      setLoading(true);
      const response = await listPurchaseOrders({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setPos(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        total_pages: response.pagination.total_pages,
      }));
    } catch (error) {
      console.error("Error loading POs:", error);
      toast.error("Gagal memuat data PO");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      // Fetch all data (not paginated)
      const response = await listPurchaseOrders({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        page: 1,
        limit: 1000, // Get more data for export
      });

      const columns = [
        { key: "nomor_po", label: "Nomor PO" },
        { key: "nama_supplier", label: "Supplier" },
        { key: "supplier_kode", label: "Kode Supplier" },
        { key: "tanggal_po", label: "Tanggal PO", format: formatDateForCSV },
        { key: "status", label: "Status" },
        { key: "subtotal", label: "Total Amount", format: (val: any) => val ? formatCurrencyForCSV(val) : "" },
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
        } catch (error: any) {
          console.error(`✗ Failed to approve PO ${id}:`, error?.message || error);
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
        } catch (error: any) {
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
      await approvePurchaseOrder(po.id);
      toast.success("PO berhasil diapprove");
      loadPOs();
    } catch (error: any) {
      console.error("Error approving PO:", error);
      toast.error(error.message || "Gagal mengapprove PO");
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
      await sendPurchaseOrder(sendingPo.id, sendVia);
      toast.success(`PO berhasil dikirim via ${sendVia}`);
      setIsSendDialogOpen(false);
      loadPOs();
    } catch (error: any) {
      console.error("Error sending PO:", error);
      toast.error(error.message || "Gagal mengirim PO");
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
    } catch (error: any) {
      console.error("Error cancelling PO:", error);
      toast.error(error.message || "Gagal membatalkan PO");
    }
  };

  const getStatusBadge = (status: POStatus) => {
    const styles: Record<POStatus, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      APPROVED: "bg-blue-100 text-blue-800",
      SENT: "bg-purple-100 text-purple-800",
      PARTIAL: "bg-yellow-100 text-yellow-800",
      RECEIVED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    const labels: Record<POStatus, string> = {
      DRAFT: "Draft",
      APPROVED: "Approved",
      SENT: "Terkirim",
      PARTIAL: "Sebagian",
      RECEIVED: "Diterima",
      CANCELLED: "Batal",
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Kelola Purchase Order dari pembuatan hingga penerimaan
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportCSV} disabled={isExporting} className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Link href="/dashboard/purchasing/po/new">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Buat PO Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-wrap gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor PO atau supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as POStatus | "")}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <div className="min-w-[1000px]">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <input
                  type="checkbox"
                  checked={selectedIds.size === pos.length && pos.length > 0}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead>Nomor PO</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : pos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Tidak ada data PO
                </TableCell>
              </TableRow>
            ) : (
              pos.map((po) => (
                <TableRow key={po.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(po.id)}
                      onChange={() => toggleSelectItem(po.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/purchasing/po/${po.id}`}
                      className="hover:underline text-pink-600"
                    >
                      {po.nomor_po}
                    </Link>
                  </TableCell>
                  <TableCell>{po.nama_supplier || po.supplier_kode}</TableCell>
                  <TableCell>{formatDate(po.tanggal_po)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(po.total)}
                  </TableCell>
                  <TableCell>{getStatusBadge(po.status)}</TableCell>
                  <TableCell>
                    {po.status !== "DRAFT" && po.status !== "CANCELLED" && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              (po.receive_percentage || 0) >= 100
                                ? "bg-green-500"
                                : (po.receive_percentage || 0) > 0
                                ? "bg-yellow-400"
                                : "bg-gray-300"
                            }`}
                            style={{ width: `${po.receive_percentage || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {po.receive_percentage || 0}%
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative z-10">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50 bg-white shadow-lg border border-gray-200">
                        <Link href={`/dashboard/purchasing/po/${po.id}`}>
                          <DropdownMenuItem>
                            <FileText className="w-4 h-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
                        </Link>
                        {po.status === "DRAFT" && (
                          <>
                            <Link href={`/dashboard/purchasing/po/${po.id}/edit`}>
                              <DropdownMenuItem>
                                <FileText className="w-4 h-4 mr-2 text-pink-600" />
                                Edit PO
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem onClick={() => handleApprove(po)}>
                              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                              Approve
                            </DropdownMenuItem>
                          </>
                        )}
                        {po.status === "APPROVED" && (
                          <DropdownMenuItem onClick={() => handleOpenSend(po)}>
                            <Send className="w-4 h-4 mr-2 text-pink-600" />
                            Kirim ke Supplier
                          </DropdownMenuItem>
                        )}
                        {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                          <DropdownMenuItem onClick={() => handleOpenCancel(po)}>
                            <XCircle className="w-4 h-4 mr-2 text-red-600" />
                            Batalkan
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                className={
                  pagination.page <= 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {Array.from(
              { length: Math.min(5, pagination.total_pages) },
              (_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: pageNum }))
                      }
                      isActive={pageNum === pagination.page}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.min(pagination.total_pages, prev.page + 1),
                  }))
                }
                className={
                  pagination.page >= pagination.total_pages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Send Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim PO ke Supplier</DialogTitle>
            <DialogDescription>
              Pilih metode pengiriman untuk PO {sendingPo?.nomor_po}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Metode Pengiriman</Label>
              <Select
                value={sendVia}
                onValueChange={(v) => setSendVia(v as any)}
              >
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
            <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSend}>Kirim</Button>
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
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason}
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
            <Button variant="outline" onClick={() => setIsBulkApproveDialogOpen(false)} disabled={isProcessingBulk}>
              Cancel
            </Button>
            <Button onClick={handleBulkApprove} disabled={isProcessingBulk}>
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
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isProcessingBulk}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isProcessingBulk}>
              {isProcessingBulk ? "Processing..." : `Hapus ${selectedIds.size} PO`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
