"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { formatDate } from "@/lib/purchasing/utils";
import {
  ClipboardDocumentCheckIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

interface GrnHistory {
  id: string;
  nomor_grn: string;
  tanggal_penerimaan: string;
  status: string;
  total_item_diterima: number;
  total_item_ditolak: number;
  supplier_name?: string;
  po_number?: string;
}

interface ContinueItem {
  purchase_order_item_id: string;
  raw_material_id: string;
  nama_bahan: string;
  kode_bahan?: string;
  qty_ordered: number;
  qty_already_received: number;
  qty_sisa: number;
  satuan: string;
  qty_diterima: number;
  qty_ditolak: number;
  kondisi: "baik" | "rusak" | "cacat";
  catatan: string;
}

export default function ContinueGrnPage() {
  const router = useRouter();
  const params = useParams();
  const grnId = params.id as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GrnHistory | null>(null);
  const [grn, setGrn] = useState<any>(null);
  const [grnHistory, setGrnHistory] = useState<GrnHistory[]>([]);
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [formData, setFormData] = useState({
    tanggal_penerimaan: new Date().toISOString().split("T")[0],
    catatan: "",
  });

  useEffect(() => {
    loadData();
  }, [grnId]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Load GRN yang dipilih
      const grnRes = await fetch(`/api/purchasing/grn/${grnId}`);
      const grnJson = await grnRes.json();
      if (!grnRes.ok) throw new Error(grnJson.message || "GRN tidak ditemukan");
      const grnData = grnJson.data;
      setGrn(grnData);

      // 2. Load semua GRN untuk PO yang sama
      const allGrnsRes = await fetch(`/api/purchasing/grn?po_id=${grnData.purchase_order_id}&limit=100`);
      const allGrnsJson = await allGrnsRes.json();
      const allGrns: GrnHistory[] = (allGrnsJson.data?.data || allGrnsJson.data || []);
      setGrnHistory(allGrns);

      // 3. Load PO items
      const poRes = await fetch(`/api/purchasing/po/${grnData.purchase_order_id}`);
      const poJson = await poRes.json();
      if (!poRes.ok) throw new Error("Gagal load data PO");

      const poItems = poJson.data?.items || [];
      const continueItems: ContinueItem[] = poItems
        .map((item: any) => {
          const qtyOrdered = item.qty_ordered || 0;
          const qtyReceived = item.qty_received || 0;
          const qtySisa = Math.max(0, qtyOrdered - qtyReceived);
          return {
            purchase_order_item_id: item.id,
            raw_material_id: item.raw_material_id,
            nama_bahan: item.raw_material?.nama || "Unknown",
            kode_bahan: item.raw_material?.kode,
            qty_ordered: qtyOrdered,
            qty_already_received: qtyReceived,
            qty_sisa: qtySisa,
            satuan: item.satuan?.nama_satuan || item.satuan?.nama || "pcs",
            qty_diterima: 0,
            qty_ditolak: 0,
            kondisi: "baik" as const,
            catatan: "",
          };
        })
        .filter((item: ContinueItem) => item.qty_sisa > 0);

      setItems(continueItems);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function updateItem(index: number, field: keyof ContinueItem, value: any) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleDeleteGrn(grnToDelete: GrnHistory) {
    setDeleting(grnToDelete.id);
    try {
      const res = await fetch(`/api/purchasing/grn/${grnToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menghapus GRN");
      toast({ title: "✅ Berhasil", description: `GRN ${grnToDelete.nomor_grn} berhasil dihapus` });
      setConfirmDelete(null);
      await loadData(); // refresh semua data
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!grn) return;
    setSubmitting(true);

    try {
      const validItems = items.filter((i) => i.qty_diterima > 0 || i.qty_ditolak > 0);
      if (validItems.length === 0) {
        toast({ title: "Error", description: "Minimal 1 item harus diisi", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      for (const item of validItems) {
        const total = item.qty_diterima + item.qty_ditolak;
        if (total > item.qty_sisa) {
          toast({
            title: "Error",
            description: `${item.nama_bahan}: total (${total}) melebihi sisa (${item.qty_sisa})`,
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        delivery_id: grn.delivery_id,
        tanggal_penerimaan: formData.tanggal_penerimaan,
        catatan: formData.catatan || null,
        items: validItems.map((item) => ({
          purchase_order_item_id: item.purchase_order_item_id,
          raw_material_id: item.raw_material_id,
          qty_diterima: item.qty_diterima,
          qty_ditolak: item.qty_ditolak,
          kondisi: item.kondisi,
          catatan: item.catatan || null,
        })),
      };

      const res = await fetch("/api/purchasing/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Berhasil", description: `GRN ${data.data?.nomor_grn || ""} berhasil dibuat` });
        router.push("/dashboard/purchasing/grn");
        router.refresh();
      } else {
        throw new Error(data.error || data.message || "Gagal melanjutkan penerimaan");
      }
    } catch (error: any) {
      toast({ title: "❌ Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const totalOrdered = items.reduce((s, i) => s + i.qty_ordered, 0) +
    items.reduce((s, i) => s + i.qty_already_received, 0) - items.reduce((s, i) => s + i.qty_already_received, 0);
  const totalQtyOrdered = [...items.map(i => i.qty_ordered), ...items.map(i => i.qty_already_received)]
    .reduce((_, __) => 0, 0);
  // Simpler calc
  const totalReceived = items.reduce((s, i) => s + i.qty_already_received, 0);
  const totalQty = items.reduce((s, i) => s + i.qty_ordered + i.qty_already_received, 0);
  // Actually: qty_ordered is the REMAINING, qty_already_received is what's been received
  // total ordered = qty_already_received + qty_sisa (qty_ordered here = qty_sisa)
  const grandTotalOrdered = items.reduce((s, i) => s + i.qty_ordered + i.qty_already_received, 0);
  const progressPct = grandTotalOrdered > 0 ? Math.round((totalReceived / grandTotalOrdered) * 100) : 0;
  const totalSisa = items.reduce((s, i) => s + i.qty_sisa, 0);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      received: { label: "Diterima", cls: "bg-green-100 text-green-700 border-green-200" },
      partially_received: { label: "Sebagian", cls: "bg-orange-100 text-orange-700 border-orange-200" },
      rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700 border-red-200" },
      pending: { label: "Menunggu", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    };
    const s = map[status] || { label: status, cls: "bg-gray-100 text-gray-600" };
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!grn) return null;

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Penerimaan", href: "/dashboard/purchasing/grn" },
          { label: `Lanjutkan ${grn.nomor_grn}` },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/grn">
          <Button variant="outline" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lanjutkan Penerimaan</h1>
          <p className="text-sm text-gray-500">
            Melanjutkan dari GRN{" "}
            <span className="font-mono font-semibold text-orange-600">{grn.nomor_grn}</span>
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-orange-800">Info Penerimaan Sebelumnya</span>
              {statusBadge(grn.status)}
            </div>
            <Link href={`/dashboard/purchasing/grn/${grn.id}`}>
              <Button variant="outline" size="sm" className="text-xs border-orange-300 text-orange-700">
                Lihat Detail GRN
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-4">
            <div>
              <p className="text-gray-500 text-xs">No. GRN</p>
              <p className="font-mono font-semibold">{grn.nomor_grn}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">No. PO</p>
              <p className="font-semibold">{grn.po_number || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Supplier</p>
              <p className="font-semibold">{grn.supplier_name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Tgl Penerimaan</p>
              <p>{formatDate(grn.tanggal_penerimaan)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Sudah Diterima</p>
              <p className="font-semibold text-green-700">{grn.total_item_diterima || 0} item</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress Penerimaan</span>
              <span>{totalReceived} / {grandTotalOrdered} ({progressPct}%)</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressPct >= 100 ? "bg-green-500" : progressPct > 0 ? "bg-orange-400" : "bg-gray-300"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Riwayat Penerimaan — Tabel */}
      {grnHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="w-4 h-4 text-gray-500" />
              Riwayat Penerimaan ({grnHistory.length} GRN)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-medium text-gray-600">No. GRN</th>
                    <th className="text-left py-2.5 px-4 font-medium text-gray-600">Tgl Penerimaan</th>
                    <th className="text-left py-2.5 px-4 font-medium text-gray-600">Supplier</th>
                    <th className="text-center py-2.5 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-center py-2.5 px-4 font-medium text-green-700">Diterima</th>
                    <th className="text-center py-2.5 px-4 font-medium text-red-600">Ditolak</th>
                    <th className="text-center py-2.5 px-4 font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grnHistory.map((g) => (
                    <tr key={g.id} className={`hover:bg-gray-50 ${g.id === grnId ? "bg-orange-50" : ""}`}>
                      <td className="py-2.5 px-4 font-mono font-medium text-blue-600 text-xs">
                        {g.nomor_grn}
                        {g.id === grnId && <span className="ml-1 text-orange-500 text-xs">(ini)</span>}
                      </td>
                      <td className="py-2.5 px-4 text-gray-700">{formatDate(g.tanggal_penerimaan)}</td>
                      <td className="py-2.5 px-4 text-gray-700">{g.supplier_name || "—"}</td>
                      <td className="py-2.5 px-4 text-center">{statusBadge(g.status)}</td>
                      <td className="py-2.5 px-4 text-center font-semibold text-green-600">{g.total_item_diterima}</td>
                      <td className="py-2.5 px-4 text-center font-semibold text-red-500">{g.total_item_ditolak || 0}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/dashboard/purchasing/grn/${g.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Lihat Detail">
                              <EyeIcon className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          {g.status !== "received" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              title="Hapus GRN"
                              onClick={() => setConfirmDelete(g)}
                              disabled={deleting === g.id}
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-2">Hapus GRN?</h3>
            <p className="text-sm text-gray-500 mb-4">
              GRN <span className="font-mono font-semibold">{confirmDelete.nomor_grn}</span> akan dihapus dan qty yang diterima akan dikurangi dari PO.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Batal</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDeleteGrn(confirmDelete)}
                disabled={deleting === confirmDelete.id}
              >
                {deleting === confirmDelete.id ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Form atau All Done */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircleIcon className="w-14 h-14 text-green-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-green-700">Semua Item Sudah Diterima</p>
            <p className="text-sm text-gray-500 mt-1">Tidak ada sisa item yang perlu diterima.</p>
            <Link href="/dashboard/purchasing/grn" className="mt-4 inline-block">
              <Button variant="outline">Kembali ke Daftar GRN</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ExclamationCircleIcon className="w-5 h-5 text-orange-500" />
                Penerimaan Lanjutan — {totalSisa} qty tersisa
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Penerimaan</Label>
                <Input
                  type="date"
                  value={formData.tanggal_penerimaan}
                  onChange={(e) => setFormData((p) => ({ ...p, tanggal_penerimaan: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Catatan (opsional)</Label>
                <Textarea
                  value={formData.catatan}
                  onChange={(e) => setFormData((p) => ({ ...p, catatan: e.target.value }))}
                  placeholder="Catatan penerimaan lanjutan..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Item Belum Diterima</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-y">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Bahan Baku</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Dipesan</th>
                      <th className="text-center py-3 px-4 font-medium text-green-700">Sudah Diterima</th>
                      <th className="text-center py-3 px-4 font-medium text-orange-700">Sisa</th>
                      <th className="text-center py-3 px-4 font-medium text-blue-700">Qty Diterima</th>
                      <th className="text-center py-3 px-4 font-medium text-red-600">Qty Ditolak</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Kondisi</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item, idx) => (
                      <tr key={item.purchase_order_item_id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{item.nama_bahan}</div>
                          {item.kode_bahan && <div className="text-xs text-gray-400 font-mono">{item.kode_bahan}</div>}
                          <div className="text-xs text-gray-400">{item.satuan}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-medium">{item.qty_ordered + item.qty_already_received}</td>
                        <td className="py-3 px-4 text-center text-green-600 font-semibold">{item.qty_already_received}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded text-xs">{item.qty_sisa}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Input
                            type="number" min={0} max={item.qty_sisa}
                            value={item.qty_diterima || ""}
                            onChange={(e) => updateItem(idx, "qty_diterima", Number(e.target.value))}
                            className="w-20 text-center mx-auto"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Input
                            type="number" min={0} max={item.qty_sisa - item.qty_diterima}
                            value={item.qty_ditolak || ""}
                            onChange={(e) => updateItem(idx, "qty_ditolak", Number(e.target.value))}
                            className="w-20 text-center mx-auto"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={item.kondisi}
                            onChange={(e) => updateItem(idx, "kondisi", e.target.value as any)}
                            className="border rounded px-2 py-1.5 text-sm bg-white w-24"
                          >
                            <option value="baik">Baik</option>
                            <option value="rusak">Rusak</option>
                            <option value="cacat">Cacat</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            value={item.catatan}
                            onChange={(e) => updateItem(idx, "catatan", e.target.value)}
                            placeholder="Catatan..."
                            className="text-sm min-w-[120px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pb-6">
            <Link href="/dashboard/purchasing/grn">
              <Button type="button" variant="outline">Batal</Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-orange-600 hover:bg-orange-700 text-white min-w-[200px]"
            >
              {submitting ? "Menyimpan..." : "Simpan Penerimaan Lanjutan"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
