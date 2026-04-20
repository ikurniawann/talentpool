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
import { Plus, Search, MoreVertical, Package, ClipboardCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { GoodsReceipt, GRNStatus, PaginatedResponse } from "@/types/purchasing";
import { listGoodsReceipts } from "@/lib/purchasing";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const STATUS_OPTIONS: { value: GRNStatus | ""; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "QC_PENDING", label: "Menunggu QC" },
  { value: "QC_APPROVED", label: "QC Approved" },
  { value: "QC_REJECTED", label: "QC Rejected" },
  { value: "COMPLETED", label: "Selesai" },
];

export default function GRNPage() {
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<GRNStatus | "">("");

  useEffect(() => {
    loadGRNs();
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadGRNs();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadGRNs = async () => {
    try {
      setLoading(true);
      const response = await listGoodsReceipts({
        status: statusFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setGrns(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        total_pages: response.pagination.total_pages,
      }));
    } catch (error) {
      console.error("Error loading GRNs:", error);
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
    return new Date(dateStr).toLocaleDateString("id-ID");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Penerimaan Barang (GRN)</h1>
          <p className="text-muted-foreground">
            Goods Receipt Note - Penerimaan barang dari supplier
          </p>
        </div>
        <Link href="/dashboard/purchasing/grn/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Buat GRN Baru
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor GRN atau PO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as GRNStatus | "")}>
          <SelectTrigger className="w-[200px]">
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

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor GRN</TableHead>
              <TableHead>Nomor PO</TableHead>
              <TableHead>Tanggal Terima</TableHead>
              <TableHead>Gudang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : grns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Tidak ada data GRN
                </TableCell>
              </TableRow>
            ) : (
              grns.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/purchasing/grn/${grn.id}`}
                      className="hover:underline text-blue-600"
                    >
                      {grn.nomor_grn}
                    </Link>
                  </TableCell>
                  <TableCell>{grn.po?.nomor_po || "-"}</TableCell>
                  <TableCell>{formatDate(grn.received_at)}</TableCell>
                  <TableCell>{grn.gudang_tujuan}</TableCell>
                  <TableCell>{getStatusBadge(grn.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/dashboard/purchasing/grn/${grn.id}`}>
                          <DropdownMenuItem>
                            <Package className="w-4 h-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
                        </Link>
                        {grn.status === "DRAFT" && (
                          <Link href={`/dashboard/purchasing/grn/${grn.id}/edit`}>
                            <DropdownMenuItem>Edit GRN</DropdownMenuItem>
                          </Link>
                        )}
                        {(grn.status === "DRAFT" || grn.status === "QC_PENDING") && (
                          <Link href={`/dashboard/purchasing/grn/${grn.id}/qc`}>
                            <DropdownMenuItem>
                              <ClipboardCheck className="w-4 h-4 mr-2" />
                              QC Inspection
                            </DropdownMenuItem>
                          </Link>
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
    </div>
  );
}
