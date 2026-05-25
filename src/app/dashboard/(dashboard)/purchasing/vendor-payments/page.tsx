"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Banknote, CheckCircle2, Clock, CreditCard, Eye, Search, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { PurchasingListSection } from "@/modules/purchasing/components/list/PurchasingListSection";
import { formatRupiah } from "@/lib/purchasing/utils";

type VendorPaymentRow = {
  purchase_order_id: string;
  nomor_po: string;
  nama_supplier?: string | null;
  payable_amount: number;
  scheduled_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  next_due_date?: string | null;
  payment_status: "unpaid" | "partial" | "paid" | "overdue";
};

const STATUS_LABELS: Record<VendorPaymentRow["payment_status"], string> = {
  unpaid: "Belum Dibayar",
  partial: "Cicilan Berjalan",
  paid: "Lunas",
  overdue: "Jatuh Tempo",
};

const STATUS_CLASS: Record<VendorPaymentRow["payment_status"], string> = {
  unpaid: "bg-gray-100 text-gray-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default function VendorPaymentsPage() {
  const [rows, setRows] = useState<VendorPaymentRow[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedSearch) params.set("search", appliedSearch);
      const response = await fetch(`/api/purchasing/vendor-payments?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memuat pembayaran vendor");
      }
      setRows(result.data || []);
    } catch (error) {
      console.error("Error loading vendor payments:", error);
      toast.error(error instanceof Error ? error.message : "Gagal memuat pembayaran vendor");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const summary = rows.reduce(
    (acc, row) => {
      acc.payable += Number(row.payable_amount || 0);
      acc.paid += Number(row.paid_amount || 0);
      acc.outstanding += Number(row.outstanding_amount || 0);
      if (row.payment_status === "overdue") acc.overdue += 1;
      return acc;
    },
    { payable: 0, paid: 0, outstanding: 0, overdue: 0 }
  );

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Procurement", href: "/dashboard/purchasing/procurement" },
          { label: "Pembayaran Vendor" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pembayaran Vendor</h1>
          <p className="text-sm text-gray-500">Monitoring termin, jatuh tempo, cicilan, dan outstanding PO.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                <WalletCards className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Total Tagihan</p>
                <p className="text-lg font-bold text-gray-900">{formatRupiah(summary.payable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Sudah Dibayar</p>
                <p className="text-lg font-bold text-emerald-700">{formatRupiah(summary.paid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Outstanding</p>
                <p className="text-lg font-bold text-gray-900">{formatRupiah(summary.outstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Jatuh Tempo</p>
                <p className="text-lg font-bold text-red-600">{summary.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <PurchasingListSection
        icon={Banknote}
        title="Daftar Pembayaran PO"
        description="Pantau tagihan, cicilan, jatuh tempo, dan outstanding vendor."
        toolbar={
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari PO atau supplier..."
              className="h-9 pl-10 text-sm"
            />
          </div>
        }
      >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">PO</th>
                  <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                  <th className="px-4 py-3 text-right font-semibold">Tagihan</th>
                  <th className="px-4 py-3 text-right font-semibold">Dibayar</th>
                  <th className="px-4 py-3 text-right font-semibold">Sisa</th>
                  <th className="px-4 py-3 text-left font-semibold">Jatuh Tempo</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">Memuat data...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-500">Belum ada data pembayaran vendor.</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.purchase_order_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-pink-600">
                      <Link href={`/dashboard/purchasing/po/${row.purchase_order_id}`} className="hover:underline">{row.nomor_po}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.nama_supplier || "-"}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatRupiah(row.payable_amount)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatRupiah(row.paid_amount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatRupiah(row.outstanding_amount)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatDate(row.next_due_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={STATUS_CLASS[row.payment_status] || "bg-gray-100 text-gray-700"}>{STATUS_LABELS[row.payment_status] || row.payment_status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/purchasing/po/${row.purchase_order_id}`}>
                        <Button variant="ghost" size="sm" className="cursor-pointer" title="Lihat detail PO">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </PurchasingListSection>
    </div>
  );
}
