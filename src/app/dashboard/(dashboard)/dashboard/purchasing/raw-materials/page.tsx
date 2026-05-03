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
import { Plus, Search, MoreVertical, ArrowUpDown, AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { RawMaterialWithStock, MaterialCategory, PaginatedResponse } from "@/types/purchasing";
import { listRawMaterials } from "@/lib/purchasing";
import { CsvImporter } from "@/components/ui/csv-importer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const CATEGORY_OPTIONS: { value: MaterialCategory | ""; label: string }[] = [
  { value: "", label: "Semua Kategori" },
  { value: "BAHAN_PANGAN", label: "Bahan Pangan" },
  { value: "BAHAN_NON_PANGAN", label: "Bahan Non-Pangan" },
  { value: "KEMASAN", label: "Kemasan" },
  { value: "BAHAN_BAKAR", label: "Bahan Bakar" },
  { value: "LAINNYA", label: "Lainnya" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status Stok" },
  { value: "below_minimum", label: "Stok Menipis/Habis" },
];

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<RawMaterialWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MaterialCategory | "">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, [pagination.page, categoryFilter, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadMaterials();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      console.log("Loading materials...", { page: pagination.page, search: searchQuery, category: categoryFilter });
      const response = await listRawMaterials({
        search: searchQuery || undefined,
        kategori: categoryFilter || undefined,
        below_minimum: statusFilter === "below_minimum",
        page: pagination.page,
        limit: pagination.limit,
        sort_by: "nama",
        sort_dir: "ASC",
      });
      console.log("Materials response:", response);
      setMaterials(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        total_pages: response.pagination.total_pages,
      }));
    } catch (error: any) {
      console.error("Error loading materials:", error);
      console.error("Error details:", error.message, error.stack);
      toast.error("Gagal memuat data bahan baku: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: MaterialCategory) => {
    const labels: Record<MaterialCategory, string> = {
      BAHAN_PANGAN: "Bahan Pangan",
      BAHAN_NON_PANGAN: "Bahan Non-Pangan",
      KEMASAN: "Kemasan",
      BAHAN_BAKAR: "Bahan Bakar",
      LAINNYA: "Lainnya",
    };
    return labels[category] || category;
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "AMAN":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Aman
          </Badge>
        );
      case "MENIPIS":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertCircle className="w-3 h-3 mr-1 inline" />
            Menipis
          </Badge>
        );
      case "HABIS":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1 inline" />
            Habis
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("id-ID", { maximumFractionDigits: 4 });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Master Bahan Baku</h1>
          <p className="text-muted-foreground">
            Kelola data bahan baku dengan monitoring stok real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Link href="/dashboard/purchasing/raw-materials/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Bahan Baku
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
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value as MaterialCategory | "")}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status Stok" />
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
              <TableHead>
                <div className="flex items-center">
                  Kode
                  <ArrowUpDown className="w-3 h-3 ml-1 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead>Nama Bahan</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>COA</TableHead>
              <TableHead className="text-right">Stok Tersedia</TableHead>
              <TableHead className="text-right">Min. Stok</TableHead>
              <TableHead className="text-right">Harga Rata-rata</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Tidak ada data bahan baku
                </TableCell>
              </TableRow>
            ) : (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">
                    {material.kode}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/purchasing/raw-materials/${material.id}`}
                      className="hover:underline text-pink-600"
                    >
                      {material.nama}
                    </Link>
                  </TableCell>
                  <TableCell>{getCategoryLabel(material.kategori)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(material as any).coa_production && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">Prod</Badge>
                      )}
                      {(material as any).coa_rnd && (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">RnD</Badge>
                      )}
                      {(material as any).coa_asset && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Asset</Badge>
                      )}
                      {!(material as any).coa_production && !(material as any).coa_rnd && !(material as any).coa_asset && (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        material.qty_onhand <= 0
                          ? "text-red-600 font-semibold"
                          : material.qty_onhand <= material.stok_minimum
                          ? "text-yellow-600 font-semibold"
                          : ""
                      }
                    >
                      {formatNumber(material.qty_onhand)}
                    </span>
                    <span className="text-muted-foreground text-sm ml-1">
                      {material.satuan_besar_nama || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(material.stok_minimum)}
                  </TableCell>
                  <TableCell className="text-right">
                    {material.avg_cost > 0
                      ? `Rp ${material.avg_cost.toLocaleString("id-ID")}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {getStockStatusBadge(material.status_stok)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative z-10">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50 bg-white shadow-lg border border-gray-200">
                        <Link
                          href={`/dashboard/purchasing/raw-materials/${material.id}`}
                        >
                          <DropdownMenuItem>Lihat Detail</DropdownMenuItem>
                        </Link>
                        <Link
                          href={`/dashboard/purchasing/raw-materials/${material.id}/edit`}
                        >
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                        </Link>
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

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Bahan Baku dari CSV</DialogTitle>
            <DialogDescription>
              Upload file CSV untuk menambahkan bahan baku secara massal
            </DialogDescription>
          </DialogHeader>
          <CsvImporter
            title="Import Bahan Baku"
            description="Import data bahan baku dari file CSV"
            templateName="template-bahan-baku.csv"
            apiEndpoint="/api/purchasing/import/raw-materials"
            onSuccess={() => loadMaterials()}
            columns={[
              { key: "kode", label: "Kode", required: true },
              { key: "nama", label: "Nama", required: true },
              { key: "nama_lain", label: "Nama Lain", required: false },
              { key: "kategori", label: "Kategori", required: false },
              { key: "satuan_pembelian", label: "Satuan Pembelian", required: true },
              { key: "satuan_penggunaan", label: "Satuan Penggunaan", required: false },
              { key: "qty_per_unit", label: "Qty Per Unit", required: false, type: "number" },
              { key: "harga_rata_rata", label: "Harga Rata-rata", required: false, type: "number" },
              { key: "stok_minimum", label: "Stok Minimum", required: false, type: "number" },
              { key: "stok_maksimum", label: "Stok Maksimum", required: false, type: "number" },
              { key: "tanggal_mulai_produksi", label: "Tanggal Mulai Produksi", required: false, type: "date" },
              { key: "masa_simpan", label: "Masa Simpan (bulan)", required: false, type: "number" },
              { key: "supplier_utama", label: "Supplier Utama", required: false },
              { key: "deskripsi", label: "Deskripsi", required: false },
              { key: "status", label: "Status", required: false },
            ]}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
