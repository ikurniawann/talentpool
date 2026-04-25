"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Building2, Pencil, Power, ArrowLeft, Phone, Mail, MapPin, 
  CreditCard, FileText, TrendingUp, Truck, User, CheckCircle2, X
} from "lucide-react";
import { SupplierDetail, SupplierPOSummary } from "@/types/supplier";
import { getSupplier, deactivateSupplier, getSupplierPOHistory } from "@/lib/purchasing/supplier";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";

function formatCurrency(amount: number, currency = "IDR") {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

  useEffect(() => {
    async function load() {
      try {
        const data = await getSupplier(supplierId);
        setSupplier(data);
      } catch (err: any) {
        toast({ title: "Gagal", description: err.message, variant: "destructive" });
        router.push("/dashboard/purchasing/suppliers");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supplierId, toast, router]);

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
      setSupplier(prev => prev ? { ...prev, is_active: false } : null);
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setDeactivateLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Memuat data supplier...</p>
        </div>
      </div>
    );
  }

  if (!supplier) return null;

  const a = supplier.analytics;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* Breadcrumb */}
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Supplier", href: "/dashboard/purchasing/suppliers" },
        { label: supplier.nama_supplier },
      ]} />

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-xl font-bold text-gray-900 truncate">{supplier.nama_supplier}</h1>
                  <Badge variant={supplier.is_active ? "default" : "secondary"} className={supplier.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                    {supplier.is_active ? <><CheckCircle2 className="w-3 h-3 mr-1" />Aktif</> : <><X className="w-3 h-3 mr-1" />Nonaktif</>}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                  {supplier.kode && <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{supplier.kode}</span>}
                  {supplier.kode && supplier.kota && <span className="text-gray-300">•</span>}
                  {supplier.kota && <span>{supplier.kota}</span>}
                  {(supplier.kode || supplier.kota) && supplier.created_at && <span className="text-gray-300">•</span>}
                  {supplier.created_at && <span>Bergabung {formatDate(supplier.created_at)}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard/purchasing/suppliers">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />Kembali
                </Button>
              </Link>
              {isAdmin && supplier.is_active && (
                <Button variant="outline" size="sm" onClick={() => setDeactivateDialog(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Power className="w-4 h-4 mr-1" />Nonaktifkan
                </Button>
              )}
              {isAdmin && (
                <Link href={`/dashboard/purchasing/suppliers/${supplier.id}/edit`}>
                  <Button size="sm">
                    <Pencil className="w-4 h-4 mr-1" />Edit
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {a.po_aktif_count > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">PO Aktif</p>
                  <p className="text-lg font-bold">{a.po_aktif_count}</p>
                  {a.po_aktif_nilai > 0 && <p className="text-xs text-gray-400">{formatCurrency(a.po_aktif_nilai, supplier.currency)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {a.jumlah_po_12_bulan > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Transaksi (12B)</p>
                  <p className="text-lg font-bold">{a.jumlah_po_12_bulan}</p>
                  {a.total_transaksi_12_bulan > 0 && <p className="text-xs text-gray-400">{formatCurrency(a.total_transaksi_12_bulan, supplier.currency)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {a.on_time_delivery_rate > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">On-Time Delivery</p>
                  <p className="text-lg font-bold">{a.on_time_delivery_rate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-400">12 bulan terakhir</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {supplier.payment_terms && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment Terms</p>
                  <p className="text-lg font-bold">{supplier.payment_terms.replace("TOP", "TOP ")}</p>
                  <p className="text-xs text-gray-400">{supplier.currency}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Company Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Informasi Perusahaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Nama" value={supplier.nama_supplier} />
            <InfoRow label="Kode" value={supplier.kode} />
            <InfoRow label="Kategori" value={supplier.kategori} />
            <InfoRow label="NPWP" value={supplier.npwp} />
            <InfoRow label="Mata Uang" value={supplier.currency} />
            {supplier.alamat && (
              <div className="pt-3 border-t">
                <div className="flex gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Alamat</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{supplier.alamat}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              Pembayaran & Bank
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Payment Terms" value={supplier.payment_terms?.replace("TOP", "TOP ")} />
            {(supplier.bank_nama || supplier.bank_rekening || supplier.bank_atas_nama) && (
              <div className="pt-3 border-t space-y-3">
                <InfoRow label="Bank" value={supplier.bank_nama} />
                <InfoRow label="No. Rekening" value={supplier.bank_rekening} />
                <InfoRow label="Atas Nama" value={supplier.bank_atas_nama} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Kontak PIC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm max-w-2xl">
          {supplier.pic_name || supplier.pic_jabatan || supplier.email || supplier.pic_phone ? (
            <>
              <InfoRow label="Nama" value={supplier.pic_name} icon={User} />
              <InfoRow label="Jabatan" value={supplier.pic_jabatan} icon={User} />
              <InfoRow label="Email" value={supplier.email} icon={Mail} />
              <InfoRow label="Telepon" value={supplier.pic_phone} icon={Phone} />
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada informasi kontak</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PO History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            Riwayat Purchase Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          {poLoading ? (
            <div className="text-center py-8 text-gray-400">Memuat...</div>
          ) : poHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada purchase order</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">No. PO</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">Tanggal</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium text-gray-600">Items</th>
                    <th className="px-4 py-2.5 text-right font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {poHistory.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-blue-600 font-medium">{po.po_number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(po.tanggal)}</td>
                      <td className="px-4 py-3"><POStatusBadge status={po.status} /></td>
                      <td className="px-4 py-3 text-right text-gray-600">{po.jumlah_item}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(po.total, po.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-600" />
            Bahan yang Sering Dibeli
          </CardTitle>
        </CardHeader>
        <CardContent>
          {a.bahan_sering_dibeli?.length ? (
            <div className="flex flex-wrap gap-2">
              {a.bahan_sering_dibeli.map((bahan, i) => (
                <Badge key={i} variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100">
                  {bahan}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada data bahan</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price History */}
      <SupplierPriceHistoryPanel supplierId={supplier.id} supplierName={supplier.nama_supplier} />

      {/* Deactivate Dialog */}
      <Dialog open={deactivateDialog} onOpenChange={setDeactivateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Power className="w-5 h-5" />
              Nonaktifkan Supplier
            </DialogTitle>
            <DialogDescription>
              Yakin ingin menonaktifkan "{supplier.nama_supplier}"? Supplier tidak akan muncul di daftar aktif.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeactivateDialog(false)} disabled={deactivateLoading}>Batal</Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactivateLoading}>
              {deactivateLoading ? "Menonaktifkan..." : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-gray-900 font-medium break-all">{value}</p>
      </div>
    </div>
  );
}

function POStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
    pending_head: { label: "Pending Head", className: "bg-yellow-100 text-yellow-700" },
    pending_finance: { label: "Pending Finance", className: "bg-orange-100 text-orange-700" },
    approved: { label: "Approved", className: "bg-blue-100 text-blue-700" },
    sent: { label: "Sent", className: "bg-purple-100 text-purple-700" },
    partially_received: { label: "Partial", className: "bg-indigo-100 text-indigo-700" },
    received: { label: "Received", className: "bg-green-100 text-green-700" },
    cancelled: { label: "Cancelled", className: "bg-gray-200 text-gray-500" },
  };
  const cfg = map[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}
