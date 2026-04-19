"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  DocumentChartBarIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { formatRupiah } from "@/lib/purchasing/utils";

interface POSummaryRow {
  id: string;
  no_po?: string;
  supplier_name?: string;
  tgl_po?: string;
  total_amount?: number;
  status?: string;
  items_count?: number;
  received_count?: number;
}

export default function POSummaryPage() {
  const [items, setItems] = useState<POSummaryRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchasing/reports/po-summary");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter((item) => {
    const matchSearch =
      !search ||
      (item.no_po?.toLowerCase().includes(search.toLowerCase())) ||
      (item.supplier_name?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = status === "all" || item.status === status;
    return matchSearch && matchStatus;
  });

  const totalAmount = filtered.reduce((sum, i) => sum + (i.total_amount || 0), 0);

  return (
    <div className="p-6">
      <BreadcrumbNav items={[
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Laporan", href: "/dashboard/purchasing/reports" },
        { label: "Ringkasan PO" },
      ]} />

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ringkasan Purchase Order</h1>
          <p className="text-sm text-gray-500">Rekap semua purchase order</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <PrinterIcon className="w-4 h-4 mr-1" />
            Cetak
          </Button>
          <Button variant="outline" size="sm">
            <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total PO</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Nilai</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatRupiah(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Rata-rata per PO</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {filtered.length > 0 ? formatRupiah(totalAmount / filtered.length) : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari no. PO, supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium">No. PO</th>
                  <th className="text-left px-4 py-3 font-medium">Supplier</th>
                  <th className="text-left px-4 py-3 font-medium">Tgl PO</th>
                  <th className="text-right px-4 py-3 font-medium">Jumlah Item</th>
                  <th className="text-right px-4 py-3 font-medium">Diterima</th>
                  <th className="text-right px-4 py-3 font-medium">Total Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">Memuat...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="flex flex-col items-center py-12 text-gray-400">
                        <TruckIcon className="w-12 h-12 mb-2" />
                        <p>Belum ada data ringkasan PO</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{item.no_po || "-"}</td>
                      <td className="px-4 py-3">{item.supplier_name || "-"}</td>
                      <td className="px-4 py-3">{item.tgl_po ? new Date(item.tgl_po).toLocaleDateString("id-ID") : "-"}</td>
                      <td className="px-4 py-3 text-right">{item.items_count || 0}</td>
                      <td className="px-4 py-3 text-right">{item.received_count || 0}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {item.total_amount ? formatRupiah(item.total_amount) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{item.status || "-"}</Badge>
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
