"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/datepicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Download, Filter, Package, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";

interface POSummary {
  po_number: string;
  vendor: string;
  vendor_code: string;
  status: string;
  tanggal_po: string;
  tanggal_diterima?: string;
  total_amount: number;
  total_amount_formatted: string;
  mata_uang: string;
  item_count: number;
  created_by: string;
}

interface StatusSummary {
  status: string;
  count: number;
  total: number;
  total_formatted: string;
}

export default function POSummaryReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<POSummary[]>([]);
  const [statusSummary, setStatusSummary] = useState<StatusSummary[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorId, setVendorId] = useState("");

  useEffect(() => {
    loadReport();
  }, [dateFrom, dateTo, statusFilter, vendorId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (statusFilter) params.set("status", statusFilter);
      if (vendorId) params.set("vendor_id", vendorId);

      const response = await fetch(`/api/purchasing/reports/po-summary?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data.summary || []);
        setStatusSummary(result.data.by_status || []);
        setGrandTotal(result.data.grand_total || 0);
      } else {
        toast.error("Gagal memuat laporan");
      }
    } catch (error) {
      console.error("Error loading report:", error);
      toast.error("Gagal memuat laporan PO Summary");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      const params = new URLSearchParams({
        export: format,
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(statusFilter && { status: statusFilter }),
        ...(vendorId && { vendor_id: vendorId }),
      });

      const response = await fetch(`/api/purchasing/reports/po-summary?${params.toString()}`);
      
      if (format === "csv") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `po-summary-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("CSV exported successfully");
      } else {
        const result = await response.json();
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `po-summary-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("JSON exported successfully");
      }
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Gagal export laporan");
    }
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">PO Summary Report</h1>
          <p className="text-muted-foreground">Ringkasan Purchase Order</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport("csv")}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport("json")}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Dari Tanggal</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sampai Tanggal</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input
                placeholder="Search vendor..."
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PO</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground">Purchase Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grand Total</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grandTotal)}</div>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusSummary.find(s => s.status === "APPROVED")?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(statusSummary.find(s => s.status === "APPROVED")?.total || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusSummary.find(s => s.status === "RECEIVED")?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(statusSummary.find(s => s.status === "RECEIVED")?.total || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      {statusSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {statusSummary.map((item) => (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={
                      item.status === "DRAFT" ? "bg-gray-100 text-gray-800" :
                      item.status === "APPROVED" ? "bg-blue-100 text-blue-800" :
                      item.status === "SENT" ? "bg-purple-100 text-purple-800" :
                      item.status === "PARTIAL" ? "bg-yellow-100 text-yellow-800" :
                      item.status === "RECEIVED" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold">{item.count}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(item.total)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Memuat data...</div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Tidak ada data PO untuk periode ini
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal PO</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((po) => (
                  <TableRow key={po.po_number}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>
                      <div>{po.vendor}</div>
                      <div className="text-xs text-muted-foreground">{po.vendor_code}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={po.status} />
                    </TableCell>
                    <TableCell>{formatDate(po.tanggal_po)}</TableCell>
                    <TableCell>{po.item_count} items</TableCell>
                    <TableCell className="text-right font-medium">
                      {po.total_amount_formatted}
                    </TableCell>
                    <TableCell>{po.created_by}</TableCell>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    APPROVED: "bg-blue-100 text-blue-800",
    SENT: "bg-purple-100 text-purple-800",
    PARTIAL: "bg-yellow-100 text-yellow-800",
    RECEIVED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return <Badge className={styles[status] || "bg-gray-100 text-gray-600"}>{status}</Badge>;
}
