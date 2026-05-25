"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { PurchasingListSection } from "@/modules/purchasing/components/list/PurchasingListSection";
import { PurchasingTablePagination } from "@/modules/purchasing/components/pagination/PurchasingTablePagination";
import {
  TruckIcon,
  PlusIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { Filter, Search, X } from "lucide-react";
import { toast } from "sonner";

type DeliveryStatus = "pending" | "shipped" | "in_transit" | "delivered" | "cancelled";

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  shipped: "bg-blue-50 text-blue-700 border-blue-200",
  in_transit: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Menunggu",
  shipped: "Dikirim",
  in_transit: "Dalam Perjalanan",
  delivered: "Tiba",
  cancelled: "Dibatalkan",
};

const STATUS_OPTIONS: { value: DeliveryStatus | "all"; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Menunggu" },
  { value: "shipped", label: "Dikirim" },
  { value: "in_transit", label: "Dalam Perjalanan" },
  { value: "delivered", label: "Tiba" },
  { value: "cancelled", label: "Dibatalkan" },
];

interface DeliveryRow {
  id: string;
  delivery_number: string;
  po_id: string;
  po_number: string;
  no_surat_jalan: string;
  ekspedisi: string;
  no_resi: string;
  tanggal_kirim: string;
  tanggal_estimasi_tiba: string;
  tanggal_aktual_tiba: string;
  status: DeliveryStatus;
  created_at: string;
}

interface PurchaseOrderOption {
  id: string;
  nomor_po: string;
  nama_supplier?: string | null;
}

type DeliveryApiResponse = {
  data?: DeliveryRow[];
  pagination?: {
    total?: number;
    totalPages?: number;
    total_pages?: number;
  };
  message?: string;
  error?: string;
};

type PurchaseOrderApiResponse = {
  data?: PurchaseOrderOption[];
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DeliveryListPage() {
  const searchParams = useSearchParams();
  const urlPoId = searchParams.get("po_id");
  const requestIdRef = useRef(0);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">("all");
  const [poFilter, setPoFilter] = useState(urlPoId || "all");
  const [filterOpen, setFilterOpen] = useState(Boolean(urlPoId));
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const selectedPoId = poFilter !== "all" ? poFilter : null;

  const fetchDeliveries = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (poFilter !== "all") params.append("po_id", poFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/purchasing/delivery?${params}`);
      const data = (await res.json()) as DeliveryApiResponse;
      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal memuat data delivery");
      }
      if (requestId !== requestIdRef.current) return;
      if (data.data) {
        setDeliveries(data.data);
        const nextTotal = data.pagination?.total || 0;
        setTotal(nextTotal);
        setTotalPages(data.pagination?.totalPages || data.pagination?.total_pages || Math.max(1, Math.ceil(nextTotal / limit)));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Gagal memuat data delivery");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [page, poFilter, search, statusFilter]);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/purchasing/po?limit=100&include_cancelled=true", { cache: "no-store" });
      const data = (await res.json()) as PurchaseOrderApiResponse;
      setPurchaseOrders(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error("Error fetching PO filter options:", error);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  useEffect(() => {
    if (!urlPoId) return;
    setPoFilter(urlPoId);
    setFilterOpen(true);
    setPage(1);
  }, [urlPoId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchQuery.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  function handleResetFilters() {
    setSearch("");
    setSearchQuery("");
    setStatusFilter("all");
    setPoFilter("all");
    setPage(1);
  }

  const isFilterActive = statusFilter !== "all" || poFilter !== "all";
  const activeFilterCount = Number(statusFilter !== "all") + Number(poFilter !== "all");
  const poOptions = [
    { value: "all", label: "Semua PO" },
    ...purchaseOrders.map((po) => ({
      value: po.id,
      label: po.nama_supplier ? `${po.nomor_po} - ${po.nama_supplier}` : po.nomor_po,
    })),
  ];

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Procurement", href: "/dashboard/purchasing/procurement" },
          { label: "Pengiriman" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengiriman</h1>
          <p className="text-sm text-gray-500">
            Pantau surat jalan dan pengiriman supplier berdasarkan PO — {total} total
          </p>
        </div>
        <Link href={selectedPoId ? `/dashboard/purchasing/delivery/new?po_id=${selectedPoId}` : "/dashboard/purchasing/delivery/new"}>
          <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-2" />
            Buat Pengiriman
          </Button>
        </Link>
      </div>

      <PurchasingListSection
        icon={TruckIcon}
        title="Daftar Pengiriman"
        description="Pantau pengiriman per PO, nomor surat jalan, ekspedisi, resi, estimasi tiba, dan status."
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:w-auto md:flex-row md:items-center">
            <label className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari surat jalan, resi, atau ekspedisi..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 bg-white pl-10 pr-10 text-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={() => setFilterOpen((open) => !open)}
              className={
                isFilterActive
                  ? "h-10 gap-2 rounded-lg border-pink-600 bg-pink-600 px-3 text-sm font-semibold !text-white shadow-sm hover:!border-pink-700 hover:!bg-pink-700 hover:!text-white [&_*]:!text-white [&_svg]:!text-white"
                  : "h-10 gap-2 rounded-lg border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700"
              }
            >
              <Filter className={isFilterActive ? "h-4 w-4 text-white" : "h-4 w-4"} />
              Filter
              {isFilterActive && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {(search || isFilterActive || page > 1) && (
              <Button variant="outline" onClick={handleResetFilters} className="h-10 flex-shrink-0 rounded-lg">
                Reset
              </Button>
            )}
          </div>
        }
      >
        <div>
          {filterOpen && (
            <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Filter className="h-3.5 w-3.5 text-pink-500" />
                    Status
                  </div>
                  <Combobox
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={(value) => {
                      setStatusFilter(value as DeliveryStatus | "all");
                      setPage(1);
                    }}
                    placeholder="Filter status..."
                    searchPlaceholder="Cari status..."
                    emptyMessage="Status tidak ditemukan"
                    className="!w-full h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <TruckIcon className="h-3.5 w-3.5 text-pink-500" />
                    Purchase Order
                  </div>
                  <Combobox
                    options={poOptions}
                    value={poFilter}
                    onChange={(value) => {
                      setPoFilter(value || "all");
                      setPage(1);
                    }}
                    placeholder="Filter PO..."
                    searchPlaceholder="Cari nomor PO..."
                    emptyMessage="PO tidak ditemukan"
                    className="!w-full h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
              <p className="mt-2 text-sm text-gray-500">Memuat data pengiriman...</p>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="py-14 text-center">
              <TruckIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">Belum ada data pengiriman sesuai filter</p>
              <Link href={selectedPoId ? `/dashboard/purchasing/delivery/new?po_id=${selectedPoId}` : "/dashboard/purchasing/delivery/new"}>
                <Button variant="outline" className="mt-4 h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700">
                  Buat Pengiriman Pertama
                </Button>
              </Link>
            </div>
          ) : (
            <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  {["No. Surat Jalan", "PO", "Ekspedisi", "No. Resi", "Tgl Kirim", "Estimasi Tiba", "Status", "Aksi"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/purchasing/delivery/${d.id}`} className="font-medium text-gray-900 hover:text-pink-700 hover:underline">
                        {d.no_surat_jalan || "-"}
                      </Link>
                      <div className="text-xs text-gray-500">{d.delivery_number || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/dashboard/purchasing/po/${d.po_id}`} className="font-medium text-pink-700 hover:underline">
                        {d.po_number || d.po_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{d.ekspedisi || "-"}</td>
                    <td className="px-4 py-3 text-sm font-mono text-xs">{d.no_resi || "-"}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(d.tanggal_kirim)}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(d.tanggal_estimasi_tiba)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_COLORS[d.status]}>
                          {STATUS_LABELS[d.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/purchasing/delivery/${d.id}`}>
                          <Button size="sm" variant="ghost" title="Detail" className="cursor-pointer">
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                        {d.status !== "cancelled" && (
                          <Link href={`/dashboard/purchasing/grn/new?delivery_id=${d.id}`}>
                            <Button size="sm" variant="outline" className="text-pink-700 border-pink-200 hover:bg-pink-50">
                              Input Barang Masuk
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

              <PurchasingTablePagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={limit}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </PurchasingListSection>
    </div>
  );
}
