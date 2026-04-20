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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, DollarSign, Package } from "lucide-react";
import { toast } from "sonner";
import { SupplierPriceList } from "@/types/purchasing";
import { listPriceLists } from "@/lib/purchasing";
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

export default function PriceListPage() {
  const [priceLists, setPriceLists] = useState<SupplierPriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterMaterial, setFilterMaterial] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierPriceList | null>(null);

  useEffect(() => {
    loadPriceLists();
  }, [filterSupplier, filterMaterial]);

  const loadPriceLists = async () => {
    try {
      setLoading(true);
      const response = await listPriceLists({
        supplier_id: filterSupplier || undefined,
        raw_material_id: filterMaterial || undefined,
      });
      setPriceLists(response);
    } catch (error) {
      console.error("Error loading price lists:", error);
      toast.error("Gagal memuat data price list");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
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
          <h1 className="text-2xl font-bold">Price List Supplier</h1>
          <p className="text-muted-foreground">
            Kelola harga bahan baku dari supplier
          </p>
        </div>
        <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Harga
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter supplier..."
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter bahan baku..."
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Bahan Baku</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead>MOQ</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Update Terakhir</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : priceLists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Tidak ada data price list
                </TableCell>
              </TableRow>
            ) : (
              priceLists.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.supplier?.nama_supplier}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.supplier?.kode}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.raw_material?.nama}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.raw_material?.kode}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.harga)}
                  </TableCell>
                  <TableCell>{item.moq || "-"}</TableCell>
                  <TableCell>{item.lead_time_hari || "-"} hari</TableCell>
                  <TableCell>
                    {item.is_active ? (
                      <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(item.updated_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingItem(item);
                            setIsDialogOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
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
  );
}
