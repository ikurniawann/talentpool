"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  UsersIcon,
  DocumentArrowDownIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { formatRupiah } from "@/lib/purchasing/utils";
import { toast } from "sonner";

interface SupplierPerfRow {
  id: string;
  supplier_name?: string;
  no_po?: string;
  total_po?: number;
  on_time_count?: number;
  late_count?: number;
  reject_rate?: number;
  avg_lead_time_days?: number;
  total_value?: number;
  rating?: number;
}

export default function SupplierPerformancePage() {
  const [items, setItems] = useState<SupplierPerfRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`/api/purchasing/reports/supplier-performance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Handle both data.data.vendors and data.items response shapes
        const vendors = data.data?.vendors ?? data.data?.summary ?? data.items ?? [];
        setItems(vendors);
      }
    } catch {
      toast.error("Gagal memuat data performa supplier");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Supplier", "Total PO", "On-Time", "Terlambat", "Reject Rate (%)", "Lead Time (Hari)", "Total Nilai", "Rating"];
    const rows = items.map((item) => [
      item.supplier_name || "",
      String(item.total_po || 0),
      String(item.on_time_count || 0),
      String(item.late_count || 0),
      item.reject_rate != null ? item.reject_rate.toFixed(1) : "",
      item.avg_lead_time_days != null ? item.avg_lead_time_days.toFixed(1) : "",
      String(item.total_value || 0),
      item.rating != null ? item.rating.toFixed(1) : "",
    ]);

    const csvContent = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplier-performance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diexport");
  };

  return (
    <div className="p-6">
      <BreadcrumbNav items={[
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Laporan", href: "/dashboard/purchasing/reports" },
        { label: "Performa Supplier" },
      ]} />

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Performa Supplier</h1>
          <p className="text-sm text-gray-500">Evaluasi supplier berdasarkan pengiriman</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Date Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm w-44" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm w-44" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium">Supplier</th>
                  <th className="text-right px-4 py-3 font-medium">Total PO</th>
                  <th className="text-right px-4 py-3 font-medium">On-Time</th>
                  <th className="text-right px-4 py-3 font-medium">Terlambat</th>
                  <th className="text-right px-4 py-3 font-medium">Reject Rate</th>
                  <th className="text-right px-4 py-3 font-medium">Lead Time (Hari)</th>
                  <th className="text-right px-4 py-3 font-medium">Total Nilai</th>
                  <th className="text-center px-4 py-3 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">Memuat...</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center py-12 text-gray-400">
                        <UsersIcon className="w-12 h-12 mb-2" />
                        <p>Belum ada data performa supplier</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id || item.supplier_name} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.supplier_name || "-"}</td>
                      <td className="px-4 py-3 text-right">{item.total_po || 0}</td>
                      <td className="px-4 py-3 text-right text-green-600">{item.on_time_count || 0}</td>
                      <td className="px-4 py-3 text-right text-red-600">{item.late_count || 0}</td>
                      <td className="px-4 py-3 text-right">
                        {item.reject_rate != null ? (
                          <Badge className={item.reject_rate > 5 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                            {item.reject_rate.toFixed(1)}%
                          </Badge>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">{item.avg_lead_time_days?.toFixed(1) || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        {item.total_value ? formatRupiah(item.total_value) : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.rating ? (
                          <span className="flex items-center justify-center gap-1">
                            <StarIcon className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            {item.rating.toFixed(1)}
                          </span>
                        ) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
