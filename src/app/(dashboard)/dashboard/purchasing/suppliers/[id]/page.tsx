"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import PurchasingGuard from "@/modules/purchasing/components/auth/PurchasingGuard";
import { SupplierPriceHistoryPanel } from "@/modules/purchasing/components/supplier-price-history/SupplierPriceHistoryPanel";
import {
  BuildingOfficeIcon,
  PencilSquareIcon,
  PowerIcon,
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  ChartBarIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  SupplierDetail,
  SupplierPOSummary,
  formatNPWP,
  KOTA_OPTIONS,
} from "@/types/supplier";
import {
  getSupplier,
  deactivateSupplier,
  getSupplierPOHistory,
} from "@/lib/purchasing/supplier";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";

// ─── Format helpers ─────────────────────────────────────────────

function formatCurrency(amount: number, currency: string = "IDR"): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch (e) {
    console.error("Invalid date:", dateStr, e);
    return "-";
  }
}

// ─── PO Status Badge ───────────────────────────────────────────

function POStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft:            { label: "Draft", className: "bg-gray-100 text-gray-600" },
    pending_head:     { label: "Pending Head", className: "bg-yellow-100 text-yellow-700" },
    pending_finance:  { label: "Pending Finance", className: "bg-orange-100 text-orange-700" },
    pending_direksi:  { label: "Pending Direksi", className: "bg-orange-100 text-orange-800" },
    approved:         { label: "Approved", className: "bg-blue-100 text-blue-700" },
    rejected:         { label: "Rejected", className: "bg-red-100 text-red-700" },
    sent:             { label: "Sent", className: "bg-purple-100 text-purple-700" },
    partially_received: { label: "Partial", className: "bg-indigo-100 text-indigo-700" },
    received:         { label: "Received", className: "bg-green-100 text-green-700" },
    cancelled:        { label: "Cancelled", className: "bg-gray-200 text-gray-500" },
  };
  const cfg = map[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

// ─── KPI Card ──────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Detail Page ──────────────────────────────────────────

export default function SupplierDetailPage() {
  return (
    <PurchasingGuard minRole="purchasing_staff">
      <SupplierDetailInner />
    </PurchasingGuard>
  );
}

function SupplierDetailInner() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const supplierId = params.id as string;
  const isAdmin = user?.role === "purchasing_admin";

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [poHistory, setPOHistory] = useState<SupplierPOSummary[]>([]);
  const [poLoading, setPOLoading] = useState(false);
  const [deactivateDialog, setDeactivateDialog] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Load supplier
  const fetchSupplier = useCallback(async () => {
    try {
      const data = await getSupplier(supplierId);
      setSupplier(data);
    } catch (err: any) {
      toast({ title: "Gagal memuat", description: err.message, variant: "destructive" });
      router.push("/dashboard/purchasing/suppliers");
    } finally {
      setLoading(false);
    }
  }, [supplierId, toast, router]);

  useEffect(() => { fetchSupplier(); }, [fetchSupplier]);

  // Load PO history
  useEffect(() => {
    async function loadPO() {
      setPOLoading(true);
      try {
        const res = await getSupplierPOHistory(supplierId);
        setPOHistory(res.data);
      } catch {}
      setPOLoading(false);
    }
    loadPO();
  }, [supplierId]);

  async function handleDeactivate() {
    if (!supplier) return;
    setDeactivateLoading(true);
    try {
      await deactivateSupplier(supplier.id);
      toast({ title: "Berhasil", description: `Supplier "${supplier.nama_supplier}" dinonaktifkan.` });
      setDeactivateDialog(false);
      fetchSupplier();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setDeactivateLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Memuat data supplier...
        </div>
      </div>
    );
  }

  if (!supplier) return null;

  const a = supplier.analytics;
  const date = formatDate(supplier.created_at);

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Supplier", href: "/dashboard/purchasing/suppliers" },
        { label: supplier.nama_supplier },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <BuildingOfficeIcon className="w-7 h-7 text-gray-900" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{supplier.nama_supplier}</h1>
              <Badge className={supplier.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                {supplier.is_active ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {supplier.kode} &bull; {supplier.kota ?? "—"} &bull; Terdaftar {date}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/purchasing/suppliers">
            <Button variant="outline" size="sm"><ArrowLeftIcon className="w-4 h-4 mr-1" />Daftar</Button>
          </Link>
          {isAdmin && supplier.is_active && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeactivateDialog(true)}
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <PowerIcon className="w-4 h-4 mr-1" />Nonaktifkan
            </Button>
          )}
          {isAdmin && (
            <Link href={`/dashboard/purchasing/suppliers/${supplier.id}/edit`}>
              <Button size="sm"><PencilSquareIcon className="w-4 h-4 mr-1" />Edit</Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="PO Aktif"
          value={String(a.po_aktif_count)}
          sub={a.po_aktif_nilai > 0 ? formatCurrency(a.po_aktif_nilai, supplier.currency) : "—"}
          icon={ReceiptPercentIcon}
          color="bg-gray-50 text-gray-700"
        />
        <KPICard
          label="Transaksi 12 Bulan"
          value={a.jumlah_po_12_bulan > 0 ? String(a.jumlah_po_12_bulan) + " PO" : "—"}
          sub={a.total_transaksi_12_bulan > 0 ? formatCurrency(a.total_transaksi_12_bulan, supplier.currency) : "Tidak ada data"}
          icon={ChartBarIcon}
          color="bg-gray-50 text-gray-700"
        />
        <KPICard
          label="On-Time Delivery"
          value={a.on_time_delivery_rate > 0 ? a.on_time_delivery_rate + "%" : "—"}
          sub={a.on_time_delivery_rate > 0 ? "12 bulan terakhir" : "Tidak ada data"}
          icon={TruckIcon}
          color="bg-gray-50 text-gray-700"
        />
        <KPICard
          label="Payment Terms"
          value={supplier.payment_terms}
          sub={supplier.currency}
          icon={BanknotesIcon}
          color="bg-gray-50 text-gray-700"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="info">Informasi</TabsTrigger>
          <TabsTrigger value="materials">Bahan Sering Dibeli</TabsTrigger>
          <TabsTrigger value="po">Riwayat PO</TabsTrigger>
          <TabsTrigger value="prices">📊 Price History</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Info Card */}
            <Card>
              <CardHeader><CardTitle className="text-base">Detail Supplier</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Kode" value={supplier.kode} />
                <InfoRow label="Nama" value={supplier.nama_supplier} />
                <InfoRow label="Kota" value={supplier.kota} />
                <InfoRow label="NPWP" value={supplier.npwp ?? "—"} />
                <InfoRow label="Payment Terms" value={supplier.payment_terms} />
                <InfoRow label="Mata Uang" value={supplier.currency} />
                <InfoRow label="Kategori" value={supplier.kategori ?? "—"} />
              </CardContent>
            </Card>

            {/* PIC Card */}
            <Card>
              <CardHeader><CardTitle className="text-base">Informasi PIC</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={MapPinIcon} label="Nama PIC" value={supplier.pic_name ?? "—"} />
                <InfoRow icon={PhoneIcon} label="Telepon" value={supplier.pic_phone ?? "—"} />
                <InfoRow icon={EnvelopeIcon} label="Email" value={supplier.email ?? "—"} />
              </CardContent>
            </Card>

            {/* Bank Card */}
            {supplier.bank_nama && (
              <Card>
                <CardHeader><CardTitle className="text-base">Informasi Bank</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow icon={BanknotesIcon} label="Bank" value={supplier.bank_nama} />
                  <InfoRow label="No. Rekening" value={supplier.bank_rekening ?? "—"} />
                  <InfoRow label="Atas Nama" value={supplier.bank_atas_nama ?? "—"} />
                </CardContent>
              </Card>
            )}

            {/* Address Card */}
            <Card>
              <CardHeader><CardTitle className="text-base">Alamat</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {supplier.alamat ?? "—"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <Card>
            <CardHeader><CardTitle className="text-base">Bahan yang Sering Dibeli dari Supplier Ini</CardTitle></CardHeader>
            <CardContent>
              {a.bahan_sering_dibeli && a.bahan_sering_dibeli.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {a.bahan_sering_dibeli.map((bahan, i) => (
                    <Badge key={i} variant="outline" className="text-sm px-3 py-1">{bahan}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">Belum ada data bahan untuk supplier ini.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PO History Tab */}
        <TabsContent value="po">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riwayat Purchase Order</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. PO</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jumlah Item</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                        Memuat...
                      </TableCell>
                    </TableRow>
                  ) : poHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                        Belum ada Purchase Order
                      </TableCell>
                    </TableRow>
                  ) : (
                    poHistory.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono text-sm">{po.po_number}</TableCell>
                        <TableCell className="text-sm">{formatDate(po.tanggal)}</TableCell>
                        <TableCell><POStatusBadge status={po.status} /></TableCell>
                        <TableCell className="text-right text-sm">{po.jumlah_item}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(po.total, po.currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="prices" className="mt-6">
          <SupplierPriceHistoryPanel 
            supplierId={supplier.id} 
            supplierName={supplier.nama_supplier}
          />
        </TabsContent>

      </Tabs>

      {/* Deactivate Dialog */}
      <Dialog open={deactivateDialog} onOpenChange={setDeactivateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nonaktifkan Supplier</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menonaktifkan supplier &quot;{supplier.nama_supplier}&quot;? Supplier tidak akan muncul di daftar aktif tapi data tidak dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeactivateDialog(false)} disabled={deactivateLoading}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivateLoading}
            >
              {deactivateLoading ? "Menonaktifkan..." : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── InfoRow helper ────────────────────────────────────────────

function InfoRow({ label, value, icon: Icon }: {
  label: string; value: string; icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
