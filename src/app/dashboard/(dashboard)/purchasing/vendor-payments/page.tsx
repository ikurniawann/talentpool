"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BanknotesIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
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
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
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
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Total Tagihan</p><p className="mt-1 text-xl font-bold">{formatRupiah(summary.payable)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Sudah Dibayar</p><p className="mt-1 text-xl font-bold text-emerald-600">{formatRupiah(summary.paid)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Outstanding</p><p className="mt-1 text-xl font-bold text-pink-600">{formatRupiah(summary.outstanding)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Jatuh Tempo</p><p className="mt-1 text-xl font-bold text-red-600">{summary.overdue}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              loadData();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari PO atau supplier..." className="pl-10" />
            </div>
            <Button type="submit" variant="outline">Cari</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BanknotesIcon className="h-5 w-5 text-pink-600" />
            Daftar Pembayaran PO
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">PO</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Tagihan</th>
                  <th className="px-4 py-3 text-right">Dibayar</th>
                  <th className="px-4 py-3 text-right">Sisa</th>
                  <th className="px-4 py-3">Jatuh Tempo</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Memuat data...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Belum ada data pembayaran vendor.</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.purchase_order_id} className="border-b">
                    <td className="px-4 py-3 font-medium text-pink-600">
                      <Link href={`/dashboard/purchasing/po/${row.purchase_order_id}`} className="hover:underline">{row.nomor_po}</Link>
                    </td>
                    <td className="px-4 py-3">{row.nama_supplier || "-"}</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(row.payable_amount)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatRupiah(row.paid_amount)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatRupiah(row.outstanding_amount)}</td>
                    <td className="px-4 py-3">{formatDate(row.next_due_date)}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_CLASS[row.payment_status] || "bg-gray-100 text-gray-700"}>{STATUS_LABELS[row.payment_status] || row.payment_status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
