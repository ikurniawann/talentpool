"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  UserCircleIcon,
  DocumentTextIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { SupplierDetail, SupplierPOSummary } from "@/types/supplier";
import { getSupplier, deactivateSupplier, getSupplierPOHistory } from "@/lib/purchasing/supplier";
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
    return "-";
  }
}

function formatPercentage(value: number): string {
  if (value <= 0) return "-";
  return `${value.toFixed(1)}%`;
}

// ─── PO Status Badge ───────────────────────────────────────────

function POStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
    pending_head: { label: "Pending Head", className: "bg-yellow-100 text-yellow-700" },
    pending_finance: { label: "Pending Finance", className: "bg-orange-100 text-orange-700" },
    pending_direksi: { label: "Pending Direksi", className: "bg-orange-100 text-orange-800" },
    approved: { label: "Approved", className: "bg-blue-100 text-blue-700" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
    sent: { label: "Sent", className: "bg-purple-100 text-purple-700" },
    partially_received: { label: "Partial", className: "bg-indigo-100 text-indigo-700" },
    received: { label: "Received", className: "bg-green-100 text-green-700" },
    cancelled: { label: "Cancelled", className: "bg-gray-200 text-gray-500" },
  };
  const cfg = map[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
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

  return (
    <div className="space-y-6 pb-8">
      {/* Breadcrumb */}
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Supplier", href: "/dashboard/purchasing/suppliers" },
        { label: supplier.nama_supplier },
      ]} />

      {/* Header Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-gray-200">
                <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="pt-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{supplier.nama_supplier}</h1>
                  <Badge className={supplier.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}>
                    {supplier.is_active ? "✓ Aktif" : "✕ Nonaktif"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2 flex-wrap">
                  {supplier.kode && (
                    <span className="font-mono bg-white px-2 py-0.5 rounded border text-xs">
                      {supplier.kode}
                    </span>
                  )}
                  {supplier.kode && supplier.kota && <span className="text-gray-300">•</span>}
                  {supplier.kota && <span>{supplier.kota}</span>}
                  {(supplier.kode || supplier.kota) && supplier.created_at && <span className="text-gray-300">•</span>}
                  {supplier.created_at && <span>Terdaftar {formatDate(supplier.created_at)}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard/purchasing/suppliers">
                <Button variant="white" size="sm" className="shadow-sm border">
                  <ArrowLeftIcon className="w-4 h-4 mr-1" />Kembali
                </Button>
              </Link>
              {isAdmin && supplier.is_active && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeactivateDialog(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <PowerIcon className="w-4 h-4 mr-1" />Nonaktifkan
                </Button>
              )}
              {isAdmin && (
                <Link href={`/dashboard/purchasing/suppliers/${supplier.id}/edit`}>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <PencilSquareIcon className="w-4 h-4 mr-1" />Edit
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {a.po_aktif_count > 0 && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <ReceiptPercentIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">PO Aktif</p>
                  <p className="text-xl font-bold text-gray-900">{a.po_aktif_count}</p>
                  {a.po_aktif_nilai > 0 && (
                    <p className="text-xs text-gray-400">{formatCurrency(a.po_aktif_nilai, supplier.currency)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {a.jumlah_po_12_bulan > 0 && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Transaksi (12B)</p>
                  <p className="text-xl font-bold text-gray-900">{a.jumlah_po_12_bulan}</p>
                  {a.total_transaksi_12_bulan > 0 && (
                    <p className="text-xs text-gray-400">{formatCurrency(a.total_transaksi_12_bulan, supplier.currency)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {a.on_time_delivery_rate > 0 && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <TruckIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">On-Time Delivery</p>
                  <p className="text-xl font-bold text-gray-900">{formatPercentage(a.on_time_delivery_rate)}</p>
                  <p className="text-xs text-gray-400">12 bulan terakhir</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {supplier.payment_terms && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <BanknotesIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Payment Terms</p>
                  <p className="text-xl font-bold text-gray-900">
                    {supplier.payment_terms.replace("TOP", "TOP ").replace("CBD", "CBD")}
                  </p>
                  <p className="text-xs text-gray-400">{supplier.currency}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full bg-gray-100 rounded-lg mb-6">
          <TabsTrigger value="overview" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="contact" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Kontak</TabsTrigger>
          <TabsTrigger value="transactions" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Transaksi</TabsTrigger>
          <TabsTrigger value="products" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Produk</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Info */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                  Informasi Perusahaan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <InfoRow label="Nama Supplier" value={supplier.nama_supplier} />
                  <InfoRow label="Kode Supplier" value={supplier.kode} />
                  <InfoRow label="Kategori" value={supplier.kategori} />
                  <InfoRow label="NPWP" value={supplier.npwp} />
                  <InfoRow label="Mata Uang" value={supplier.currency} />
                </div>
                {supplier.alamat && (
                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Alamat</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{supplier.alamat}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment & Bank */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BanknotesIcon className="w-5 h-5 text-amber-600" />
                  Pembayaran & Bank
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <InfoRow label="Payment Terms" value={supplier.payment_terms?.replace("TOP", "TOP ")} />
                </div>
                {(supplier.bank_nama || supplier.bank_rekening || supplier.bank_atas_nama) && (
                  <div className="pt-4 border-t space-y-3">
                    <InfoRow label="Nama Bank" value={supplier.bank_nama} icon={BuildingOfficeIcon} />
                    <InfoRow label="Nomor Rekening" value={supplier.bank_rekening} icon={BanknotesIcon} />
                    <InfoRow label="Atas Nama" value={supplier.bank_atas_nama} icon={UserCircleIcon} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card className="border-0 shadow-sm bg-white max-w-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCircleIcon className="w-5 h-5 text-blue-600" />
                Informasi Kontak PIC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplier.pic_name || supplier.pic_jabatan || supplier.email || supplier.pic_phone ? (
                <div className="space-y-3">
                  <InfoRow label="Nama PIC" value={supplier.pic_name} icon={UserCircleIcon} />
                  <InfoRow label="Jabatan" value={supplier.pic_jabatan} icon={UserCircleIcon} />
                  <InfoRow label="Email" value={supplier.email} icon={EnvelopeIcon} />
                  <InfoRow label="Telepon" value={supplier.pic_phone} icon={PhoneIcon} />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <UserCircleIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada informasi kontak PIC</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ReceiptPercentIcon className="w-5 h-5 text-purple-600" />
                Riwayat Purchase Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              {poLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memuat data...
                </div>
              ) : poHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ReceiptPercentIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada purchase order</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">No. PO</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Tanggal</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Items</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {poHistory.map((po) => (
                        <tr key={po.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-blue-600 font-medium">{po.po_number}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(po.tanggal)}</td>
                          <td className="px-4 py-3"><POStatusBadge status={po.status} /></td>
                          <td className="px-4 py-3 text-right text-gray-600">{po.jumlah_item}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {formatCurrency(po.total, po.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-green-600" />
                Bahan yang Sering Dibeli
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.bahan_sering_dibeli && a.bahan_sering_dibeli.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {a.bahan_sering_dibeli.map((bahan, i) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200">
                      {bahan}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada data bahan untuk supplier ini</p>
                </div>
              )}
            </CardContent>
          </Card>

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
            <DialogTitle className="flex items-center gap-2">
              <PowerIcon className="w-5 h-5 text-red-600" />
              Nonaktifkan Supplier
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menonaktifkan supplier &quot;{supplier.nama_supplier}&quot;? 
              Supplier tidak akan muncul di daftar aktif tetapi data tidak dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeactivateDialog(false)} disabled={deactivateLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactivateLoading}>
              {deactivateLoading ? "Menonaktifkan..." : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── InfoRow Component ─────────────────────────────────────────

function InfoRow({ label, value, icon: Icon }: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
}) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm text-gray-900 font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
