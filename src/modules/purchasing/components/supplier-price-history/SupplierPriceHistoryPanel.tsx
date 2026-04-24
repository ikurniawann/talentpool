"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { PriceHistoryTable } from "./PriceHistoryTable";
import { LineChart, Table as TableIcon, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

interface PriceHistoryData {
  id: string;
  supplier_id: string;
  nama_supplier: string;
  bahan_baku_id: string;
  bahan_baku_nama: string;
  harga: number;
  previous_price?: number | null;
  price_change_percent?: number | null;
  berlaku_dari: string;
  berlaku_sampai?: string | null;
  satuan_nama: string;
  minimum_qty: number;
  lead_time_days: number;
  is_preferred: boolean;
  catatan?: string | null;
}

interface PriceStats {
  supplier_id: string;
  nama_supplier: string;
  bahan_baku_id: string;
  bahan_baku_nama: string;
  total_price_changes: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  current_price: number;
  first_price: number;
  total_price_change_percent: number;
  first_recorded_date: string;
  last_updated_date: string;
}

interface SupplierPriceHistoryPanelProps {
  supplierId: string;
  supplierName?: string;
}

export function SupplierPriceHistoryPanel({ 
  supplierId, 
  supplierName 
}: SupplierPriceHistoryPanelProps) {
  // State
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData[]>([]);
  const [priceStats, setPriceStats] = useState<PriceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<number>(6); // months
  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");

  // Get unique materials from history
  const materials = Array.from(
    new Map(priceHistory.map(item => [item.bahan_baku_id, item.bahan_baku_nama])).entries()
  ).map(([id, name]) => ({ id, name }));

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch price history
      const params = new URLSearchParams();
      params.set("months", timeRange.toString());
      if (selectedMaterial !== "all") {
        params.set("material_id", selectedMaterial);
      }

      const historyRes = await fetch(`/api/purchasing/suppliers/${supplierId}/price-history?${params}`);
      const historyData = await historyRes.json();
      
      if (historyData.success) {
        setPriceHistory(historyData.data);
      } else {
        throw new Error(historyData.message);
      }

      // Fetch price stats
      const statsParams = new URLSearchParams();
      if (selectedMaterial !== "all") {
        statsParams.set("material_id", selectedMaterial);
      }

      const statsRes = await fetch(`/api/purchasing/suppliers/${supplierId}/price-stats?${statsParams}`);
      const statsData = await statsRes.json();
      
      if (statsData.success) {
        setPriceStats(statsData.data);
      }
    } catch (error: any) {
      console.error("Error fetching price data:", error);
      toast.error("Gagal memuat data harga: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supplierId, selectedMaterial, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group history by material for display
  const groupedHistory = priceHistory.reduce((acc, item) => {
    if (!acc[item.bahan_baku_id]) {
      acc[item.bahan_baku_id] = [];
    }
    acc[item.bahan_baku_id].push(item);
    return acc;
  }, {} as Record<string, PriceHistoryData[]>);

  // Calculate summary stats
  const totalMaterials = materials.length;
  const totalPriceChanges = priceStats.reduce((sum, stat) => sum + stat.total_price_changes, 0);
  const avgPriceChange = priceStats.length > 0 
    ? priceStats.reduce((sum, stat) => sum + stat.total_price_change_percent, 0) / priceStats.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            📊 Riwayat Harga Supplier
          </h2>
          <p className="text-sm text-gray-500">
            {supplierName || "Supplier"} - {totalMaterials} bahan baku • {totalPriceChanges} perubahan harga
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Bahan Baku</p>
                <p className="text-2xl font-bold text-blue-600">{totalMaterials}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <TableIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Perubahan Harga</p>
                <p className="text-2xl font-bold text-purple-600">{totalPriceChanges}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Rata-rata Perubahan</p>
                <p className={`text-2xl font-bold ${avgPriceChange > 0 ? "text-red-600" : avgPriceChange < 0 ? "text-green-600" : "text-gray-600"}`}>
                  {avgPriceChange > 0 ? "+" : ""}{avgPriceChange.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                {avgPriceChange > 0 ? (
                  <TrendingUp className="w-6 h-6 text-red-600" />
                ) : avgPriceChange < 0 ? (
                  <TrendingDown className="w-6 h-6 text-green-600" />
                ) : (
                  <Minus className="w-6 h-6 text-gray-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                Filter Bahan Baku
              </Label>
              <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua bahan baku" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bahan Baku</SelectItem>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                Periode Waktu
              </Label>
              <Select value={String(timeRange)} onValueChange={(v) => setTimeRange(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Bulan Terakhir</SelectItem>
                  <SelectItem value="6">6 Bulan Terakhir</SelectItem>
                  <SelectItem value="12">12 Bulan Terakhir</SelectItem>
                  <SelectItem value="24">24 Bulan Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart & Table */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chart">
            <LineChart className="w-4 h-4 mr-2" />
            Grafik Trend
          </TabsTrigger>
          <TabsTrigger value="table">
            <TableIcon className="w-4 h-4 mr-2" />
            Tabel Histori
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Trend Harga {selectedMaterial === "all" ? "Semua Bahan Baku" : materials.find(m => m.id === selectedMaterial)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  Memuat data...
                </div>
              ) : selectedMaterial === "all" ? (
                <div className="space-y-8">
                  {Object.entries(groupedHistory).slice(0, 5).map(([materialId, items]) => (
                    <div key={materialId}>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        {items[0]?.bahan_baku_nama}
                      </h4>
                      <PriceHistoryChart 
                        data={items} 
                        height={250}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <PriceHistoryChart 
                  data={priceHistory} 
                  materialName={materials.find(m => m.id === selectedMaterial)?.name}
                  height={350}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Detail Histori Perubahan Harga
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-400">Memuat data...</div>
              ) : (
                <PriceHistoryTable 
                  data={priceHistory}
                  showMaterialName={selectedMaterial === "all"}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
