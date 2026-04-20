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
import { Package, Search, AlertTriangle, History } from "lucide-react";
import { toast } from "sonner";
import { RawMaterialWithStock } from "@/types/purchasing";
import { listRawMaterials, getLowStockReport } from "@/lib/purchasing";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "AMAN", label: "Aman" },
  { value: "MENIPIS", label: "Menipis" },
  { value: "HABIS", label: "Habis" },
];

export default function InventoryPage() {
  const [materials, setMaterials] = useState<RawMaterialWithStock[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "AMAN" | "MENIPIS" | "HABIS">("");

  useEffect(() => {
    loadInventory();
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadInventory();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const [response, lowStock] = await Promise.all([
        listRawMaterials({
          search: searchQuery || undefined,
          status_stok: statusFilter || undefined,
          page: pagination.page,
          limit: pagination.limit,
        }),
        getLowStockReport(),
      ]);
      setMaterials(response.data);
      setLowStockCount(lowStock.length);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        total_pages: response.pagination.total_pages,
      }));
    } catch (error) {
      console.error("Error loading inventory:", error);
      toast.error("Gagal memuat data inventory");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      AMAN: "bg-green-100 text-green-800",
      MENIPIS: "bg-yellow-100 text-yellow-800",
      HABIS: "bg-red-100 text-red-800",
    };
    return <Badge className={styles[status] || styles.AMAN}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inventory / Stok Bahan</h1>
          <p className="text-muted-foreground">
            Monitoring stok bahan baku real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/purchasing/inventory/reports/low-stock">
            <Button variant="outline" className="text-yellow-600">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Stok Menipis ({lowStockCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari bahan baku..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as any)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter status" />
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
              <TableHead>Kode</TableHead>
              <TableHead>Nama Bahan</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Stok Tersedia</TableHead>
              <TableHead className="text-right">Stok Minimum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Tidak ada data inventory
                </TableCell>
              </TableRow>
            ) : (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.kode}</TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/purchasing/inventory/${material.id}`}
                      className="hover:underline text-blue-600"
                    >
                      {material.nama}
                    </Link>
                  </TableCell>
                  <TableCell>{material.satuan_besar_nama || "-"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {material.qty_available?.toFixed(4) || "0"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {material.stok_minimum}
                  </TableCell>
                  <TableCell>{getStatusBadge(material.status_stok)}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/purchasing/inventory/${material.id}`}>
                      <Button variant="ghost" size="sm">
                        <History className="w-4 h-4 mr-1" />
                        History
                      </Button>
                    </Link>
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
