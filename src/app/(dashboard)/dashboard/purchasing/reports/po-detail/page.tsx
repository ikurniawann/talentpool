"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  DocumentChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  CalculatorIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { formatRupiah } from "@/lib/purchasing/utils";
import { toast } from "sonner";

interface POLineItem {
  id: string;
  nama_bahan: string;
  kode_bahan?: string;
  qty_order: number;
  qty_received: number;
  harga_satuan: number;
  satuan?: string;
  subtotal: number;
}

interface PODetail {
  id: string;
  no_po: string;
  tanggal_po: string;
  supplier: string;
  supplier_id?: string;
  status: string;
  total: number;
  items: POLineItem[];
}

export default function PODetailReportPage() {
  const [loading, setLoading] = useState(true);
  const [poList, setPoList] = useState<PODetail[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");

  useEffect(() => {
    loadReport();
  }, [dateFrom, dateTo, statusFilter, supplierFilter]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (statusFilter) params.set("status", statusFilter);
      if (supplierFilter) params.set("vendor_id", supplierFilter);

      const response = await fetch(`/api/purchasing/reports/po-summary?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        // Map summary rows to our PODetail shape; items come from the summary array
        const mapped: PODetail[] = (result.data.summary || []).map((po: any) => ({
          id: po.id || po.po_number,
          no_po: po.po_number,
          tanggal_po: po.tanggal_po,
          supplier: po.vendor,
          supplier_id: po.vendor_id,
          status: po.status,
          total: po.total_amount,
          items: (po.items || []).map((item: any) => ({
            id: item.id || item.bahan_baku_id,
            nama_bahan: item.nama_bahan || item.nama || "-",
            kode_bahan: item.kode_bahan || item.kode,
            qty_order: item.qty_order || item.quantity || 0,
            qty_received: item.qty_received || 0,
            harga_satuan: item.harga_satuan || item.unit_price || 0,
            satuan: item.satuan,
            subtotal: item.subtotal || (item.qty_order || 0) * (item.harga_satuan || 0),
          })),
        }));
        setPoList(mapped);
      } else {
        toast.error("Gagal memuat laporan Detail PO");
      }
    } catch (error) {
      console.error("Error loading PO detail report:", error);
      toast.error("Gagal memuat laporan Detail PO");
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    const headerRow = ["No PO", "Tanggal", "Supplier", "Status", "Nama Bahan", "Kode Bahan", "Qty Order", "Qty Diterima", "Harga Satuan", "Subtotal", "Total PO"];
    const rows: string[][] = [];

    for (const po of poList) {
      if (po.items.length === 0) {
        rows.push([po.no_po, formatDate(po.tanggal_po), po.supplier, po.status, "-", "-", "", "", "", "", String(po.total)]);
      } else {
        po.items.forEach((item, idx) => {
          rows.push([
            idx === 0 ? po.no_po : "",
            idx === 0 ? formatDate(po.tanggal_po) : "",
            idx === 0 ? po.supplier : "",
            idx === 0 ? po.status : "",
            item.nama_bahan,
            item.kode_bahan || "",
            String(item.qty_order),
            String(item.qty_received),
            String(item.harga_satuan),
            String(item.subtotal),
            idx === 0 ? String(po.total) : "",
          ]);
        });
      }
    }

    const csvContent = [
      headerRow.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `po-detail-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diexport");
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      APPROVED: "bg-blue-100 text-blue-800",
      SENT: "bg-purple-100 text-purple-800",
      PARTIAL: "bg-yellow-100 text-yellow-800",
      RECEIVED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return <Badge className={styles[status] || "bg-gray-100 text-gray-600"}>{status}</Badge>;
  };

  const totalPO = poList.length;
  const totalValue = poList.reduce((sum, po) => sum + (po.total || 0), 0);
  const avgValue = totalPO > 0 ? totalValue / totalPO : 0;
  const statusCounts = poList.reduce<Record<string, number>>((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <BreadcrumbNav items={[
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Laporan", href: "/dashboard/purchasing/reports" },
        { label: "Detail PO" },
      ]} />

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Detail PO</h1>
          <p className="text-sm text-gray-500">Rincian Purchase Order beserta line item</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier</Label>
              <Input
                placeholder="Cari supplier..."
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
              <ShoppingCartIcon className="w-4 h-4" />
              Total PO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-pink-600">{totalPO}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
              <BanknotesIcon className="w-4 h-4" />
              Total Nilai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatRupiah(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
              <CalculatorIcon className="w-4 h-4" />
              Rata-rata Nilai PO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatRupiah(avgValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
              <CheckBadgeIcon className="w-4 h-4" />
              Per Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} variant="outline" className="text-xs">
                  {status}: {count}
                </Badge>
              ))}
              {Object.keys(statusCounts).length === 0 && (
                <span className="text-gray-400 text-sm">-</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expandable Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentChartBarIcon className="w-5 h-5 text-pink-600" />
            Daftar PO
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Memuat data...</div>
          ) : poList.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <DocumentChartBarIcon className="w-12 h-12 mb-2" />
              <p>Tidak ada data PO untuk periode ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium w-8"></th>
                    <th className="text-left px-4 py-3 font-medium">No PO</th>
                    <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-3 font-medium">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-center px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {poList.map((po) => (
                    <>
                      <tr
                        key={po.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleRow(po.id)}
                      >
                        <td className="px-4 py-3">
                          {expandedRows.has(po.id) ? (
                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-pink-600">{po.no_po}</td>
                        <td className="px-4 py-3">{formatDate(po.tanggal_po)}</td>
                        <td className="px-4 py-3">{po.supplier}</td>
                        <td className="px-4 py-3">{getStatusBadge(po.status)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatRupiah(po.total)}</td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/dashboard/purchasing/po/${po.id}`}>
                            <Button variant="ghost" size="sm" className="text-xs h-7">
                              Detail
                            </Button>
                          </Link>
                        </td>
                      </tr>
                      {expandedRows.has(po.id) && (
                        <tr key={`${po.id}-items`} className="bg-gray-50">
                          <td colSpan={7} className="px-8 py-3">
                            {po.items.length === 0 ? (
                              <p className="text-gray-400 text-xs italic">Tidak ada line item</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-2 pr-4 font-semibold text-gray-600">Nama Bahan</th>
                                      <th className="text-left py-2 pr-4 font-semibold text-gray-600">Kode</th>
                                      <th className="text-right py-2 pr-4 font-semibold text-gray-600">Qty Order</th>
                                      <th className="text-right py-2 pr-4 font-semibold text-gray-600">Qty Diterima</th>
                                      <th className="text-right py-2 pr-4 font-semibold text-gray-600">Harga Satuan</th>
                                      <th className="text-right py-2 font-semibold text-gray-600">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {po.items.map((item) => (
                                      <tr key={item.id} className="border-b border-gray-100 last:border-0">
                                        <td className="py-1.5 pr-4">{item.nama_bahan}</td>
                                        <td className="py-1.5 pr-4 font-mono text-gray-500">{item.kode_bahan || "-"}</td>
                                        <td className="py-1.5 pr-4 text-right">{item.qty_order.toLocaleString()} {item.satuan || ""}</td>
                                        <td className="py-1.5 pr-4 text-right">
                                          <span className={item.qty_received < item.qty_order ? "text-yellow-600" : "text-green-600"}>
                                            {item.qty_received.toLocaleString()}
                                          </span>
                                        </td>
                                        <td className="py-1.5 pr-4 text-right">{formatRupiah(item.harga_satuan)}</td>
                                        <td className="py-1.5 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
