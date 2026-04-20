"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
import { ArrowLeft, Package, TrendingUp, TrendingDown, AlertTriangle, History } from "lucide-react";
import { toast } from "sonner";
import { Inventory, InventoryMovement, RawMaterialWithStock } from "@/types/purchasing";
import { getInventory, getInventoryMovements } from "@/lib/purchasing";

export default function InventoryDetailPage() {
  const params = useParams();
  const materialId = params.id as string;

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (materialId) {
      loadData();
    }
  }, [materialId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invData, movData] = await Promise.all([
        getInventory(materialId),
        getInventoryMovements(materialId),
      ]);
      setInventory(invData);
      setMovements(movData);
    } catch (error) {
      console.error("Error loading data:", error);
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

  const getMovementIcon = (type: string) => {
    if (type === "IN") return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (type === "OUT") return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <History className="w-4 h-4 text-blue-600" />;
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("id-ID");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Memuat data...</div>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-red-500">Data tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/inventory">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{inventory.raw_material?.nama}</h1>
          <p className="text-muted-foreground">{inventory.raw_material?.kode}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Stok Tersedia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.qty_available?.toFixed(4)}</div>
            <div className="text-sm text-muted-foreground">
              {inventory.satuan?.nama}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Stok Minimum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.stok_minimum}</div>
            <div className="text-sm text-muted-foreground">
              {inventory.satuan?.nama}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Status Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>{getStatusBadge(inventory.status_stok)}</div>
            {inventory.status_stok === "MENIPIS" && (
              <div className="flex items-center gap-1 mt-2 text-yellow-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Perlu restock
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Nilai Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(inventory.inventory_value || 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              HPP × Stok
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movement History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Riwayat Pergerakan Stok
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada pergerakan stok
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead className="text-right">Masuk</TableHead>
                  <TableHead className="text-right">Keluar</TableHead>
                  <TableHead className="text-right">Stok Akhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>{formatDate(mov.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(mov.movement_type)}
                        <span
                          className={
                            mov.movement_type === "IN"
                              ? "text-green-600"
                              : mov.movement_type === "OUT"
                              ? "text-red-600"
                              : "text-blue-600"
                          }
                        >
                          {mov.movement_type === "IN"
                            ? "Masuk"
                            : mov.movement_type === "OUT"
                            ? "Keluar"
                            : "Adjustment"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{mov.reference_type}</div>
                      {mov.reference_no && (
                        <div className="text-xs text-muted-foreground">
                          {mov.reference_no}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {mov.qty_in > 0 ? `+${mov.qty_in}` : "-"}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {mov.qty_out > 0 ? `-${mov.qty_out}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {mov.qty_after?.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
