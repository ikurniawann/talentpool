"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

interface Delivery {
  id: string;
  no_resi: string;
  nomor_resi: string;
  no_surat_jalan: string;
  kurir: string;
  status: string;
  purchase_order_id: string;
  supplier_id: string;
  tanggal_kirim: string;
  tanggal_estimasi_tiba: string;
  supplier_name?: string;
  po_number?: string;
}

interface POItem {
  id: string;
  raw_material_id: string;
  nama_bahan: string;
  qty_ordered: number;
  qty_received: number;
  satuan?: string;
}

interface GrnItem {
  id: string;
  purchase_order_item_id?: string;
  raw_material_id: string;
  nama_bahan: string;
  qty_diterima: number;
  qty_ditolak: number;
  kondisi: "baik" | "rusak" | "cacat";
  catatan: string;
}

export default function CreateGrnPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingDeliveries, setFetchingDeliveries] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [grnItems, setGrnItems] = useState<GrnItem[]>([]);
  const [formData, setFormData] = useState({
    delivery_id: "",
    tanggal_penerimaan: new Date().toISOString().split("T")[0],
    catatan: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [openDelivery, setOpenDelivery] = useState(false);

  // Fetch deliveries that can be received
  useEffect(() => {
    fetchDeliveries();
  }, []);

  async function fetchDeliveries() {
    setFetchingDeliveries(true);
    try {
      const res = await fetch("/api/purchasing/delivery?limit=100");
      const data = await res.json();
      console.log('Deliveries API response:', data);
      if (data.data && Array.isArray(data.data)) {
        // Enhance delivery data with searchable text and safe defaults
        const enhanced = data.data.map((d: any) => ({
          id: d.id,
          no_resi: d.no_resi || d.nomor_resi || '',
          nomor_resi: d.nomor_resi || d.no_resi || '',
          no_surat_jalan: d.no_surat_jalan || '',
          kurir: d.kurir || d.ekspedisi || d.vendor_name || '',
          status: d.status || 'pending',
          purchase_order_id: d.purchase_order_id || d.po_id || '',
          po_id: d.po_id || d.purchase_order_id || '',
          supplier_id: d.supplier_id || '',
          tanggal_kirim: d.tanggal_kirim || '',
          tanggal_estimasi_tiba: d.tanggal_estimasi_tiba || '',
          supplier_name: d.supplier_name || d.kurir || d.ekspedisi || d.no_surat_jalan || d.no_resi || 'Unknown',
          po_number: d.po_number || d.nomor_resi || d.no_resi || '',
          search_text: `${d.no_resi || ''} ${d.nomor_resi || ''} ${d.no_surat_jalan || ''} ${d.kurir || ''} ${d.ekspedisi || ''}`.toLowerCase(),
        }));
        console.log('Enhanced deliveries:', enhanced);
        setDeliveries(enhanced);
      }
    } catch (e) {
      console.error(e);
      toast({ 
        title: "Error", 
        description: "Gagal memuat data pengiriman", 
        variant: "destructive" 
      });
    } finally {
      setFetchingDeliveries(false);
    }
  }

  // Fetch PO items when delivery selected
  useEffect(() => {
    const poId = selectedDelivery?.purchase_order_id || selectedDelivery?.po_id;
    if (poId) {
      console.log('Fetching PO items for:', poId);
      fetchPOItems(poId);
    } else {
      setPoItems([]);
      setGrnItems([]);
    }
  }, [selectedDelivery]);

  async function fetchPOItems(poId: string) {
    try {
      const res = await fetch(`/api/purchasing/po/${poId}/items`);
      const data = await res.json();
      console.log('PO Items response:', data);
      if (data.data && Array.isArray(data.data)) {
        // Extract only the fields we need to avoid rendering complex objects
        const simplifiedPoItems: POItem[] = data.data.map((item: any) => ({
          id: item.id,
          raw_material_id: item.raw_material_id,
          nama_bahan: typeof item.nama_bahan === 'string' ? item.nama_bahan : (item.raw_material?.nama || 'Unknown'),
          qty_ordered: typeof item.qty_ordered === 'number' ? item.qty_ordered : 0,
          qty_received: typeof item.qty_received === 'number' ? item.qty_received : 0,
          satuan: typeof item.satuan === 'string' ? item.satuan : (item.unit?.nama || 'pcs'),
        }));
        setPoItems(simplifiedPoItems);
        // Initialize GRN items from PO items
        const initialGrnItems: GrnItem[] = simplifiedPoItems.map((item: POItem) => ({
          id: crypto.randomUUID(),
          purchase_order_item_id: item.id,
          raw_material_id: item.raw_material_id,
          nama_bahan: item.nama_bahan,
          qty_diterima: 0,
          qty_ditolak: 0,
          kondisi: "baik" as const,
          catatan: "",
        }));
        setGrnItems(initialGrnItems);
      }
    } catch (e) {
      console.error(e);
      toast({ 
        title: "Error", 
        description: "Gagal memuat item PO", 
        variant: "destructive" 
      });
    }
  }

  const handleAddItem = () => {
    setGrnItems([
      ...grnItems,
      {
        id: crypto.randomUUID(),
        raw_material_id: "",
        nama_bahan: "",
        qty_diterima: 0,
        qty_ditolak: 0,
        kondisi: "baik",
        catatan: "",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setGrnItems(grnItems.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof GrnItem, value: any) => {
    setGrnItems(
      grnItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.delivery_id) {
      toast({
        title: "Error",
        description: "Pilih pengiriman terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (grnItems.length === 0) {
      toast({
        title: "Error",
        description: "Tambahkan minimal 1 item",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/purchasing/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: grnItems,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal membuat GRN");
      }

      toast({
        title: "Berhasil",
        description: "GRN berhasil dibuat",
      });
      router.push("/dashboard/purchasing/grn");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter((d: any) =>
    d.search_text.includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BreadcrumbNav
            items={[
              { href: "/dashboard/purchasing", label: "Purchasing" },
              { href: "/dashboard/purchasing/grn", label: "Penerimaan Barang" },
              { label: "Buat GRN Baru" },
            ]}
          />
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Buat GRN Baru</h1>
          <p className="text-sm text-gray-500">Goods Receipt Note - Penerimaan Barang</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel - Delivery Selection & Info (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TruckIcon className="w-5 h-5 text-pink-600" />
                  Pilih Pengiriman
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Pengiriman</Label>
                  <Popover open={openDelivery} onOpenChange={setOpenDelivery}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDelivery}
                        className="w-full justify-between h-10 px-3 bg-white hover:bg-gray-50"
                      >
                        <span className="truncate text-left font-medium">
                          {selectedDelivery
                            ? (() => {
                                // Prioritize kurir, then ekspedisi, then show no resi only
                                const displayKurir = selectedDelivery.kurir || selectedDelivery.ekspedisi || '';
                                if (displayKurir) {
                                  return `${selectedDelivery.no_resi} - ${displayKurir}`;
                                }
                                // If no kurir, just show no resi
                                return selectedDelivery.no_resi;
                              })()
                            : "Pilih pengiriman..."}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[calc(var(--radix-popover-trigger-width)-16px)] p-0 shadow-2xl z-[100] border-gray-200 bg-white ml-2" 
                      align="start" 
                      sideOffset={8} 
                      avoidCollisions 
                      collisionPadding={16}
                    >
                      <Command shouldFilter={false} className="bg-white">
                        <div className="flex items-center border-b border-gray-200 px-3 py-2.5">
                          <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nomor resi / surat jalan..."
                            className="w-full text-sm bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900"
                          />
                        </div>
                        <CommandList className="max-h-64 overflow-y-auto bg-white p-1">
                          <CommandEmpty className="py-6 text-center text-sm text-gray-500">Tidak ada pengiriman ditemukan.</CommandEmpty>
                          <CommandGroup className="p-1">
                            {filteredDeliveries.map((d: any) => (
                              <CommandItem
                                key={d.id}
                                value={`${d.no_resi} - ${d.kurir}`}
                                onSelect={() => {
                                  const simplifiedDelivery = {
                                    id: d.id,
                                    no_resi: d.no_resi,
                                    nomor_resi: d.nomor_resi,
                                    no_surat_jalan: d.no_surat_jalan,
                                    kurir: d.kurir,
                                    status: d.status,
                                    purchase_order_id: d.purchase_order_id,
                                    po_id: d.po_id,
                                    supplier_id: d.supplier_id,
                                    tanggal_kirim: d.tanggal_kirim,
                                    tanggal_estimasi_tiba: d.tanggal_estimasi_tiba,
                                  };
                                  setSelectedDelivery(simplifiedDelivery);
                                  setFormData({ ...formData, delivery_id: d.id });
                                  setOpenDelivery(false);
                                  setSearchQuery("");
                                }}
                                className="cursor-pointer hover:bg-pink-50 data-[selected=true]:bg-pink-100 rounded-md py-2.5 px-3 transition-colors"
                              >
                                <div className="flex flex-col gap-1.5 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm text-gray-900">{d.no_resi}</span>
                                    <Check
                                      className={cn(
                                        "h-4 w-4 text-pink-600",
                                        selectedDelivery?.id === d.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    {(() => {
                                      const supplierOrKurir = d.supplier_name || d.kurir || d.ekspedisi || '';
                                      const poOrResi = d.po_number || d.nomor_resi || d.no_resi || '';
                                      
                                      if (supplierOrKurir && poOrResi) {
                                        return (
                                          <>
                                            <span className="font-medium">{supplierOrKurir}</span>
                                            <span className="text-gray-300">•</span>
                                            <span>{poOrResi}</span>
                                          </>
                                        );
                                      }
                                      if (supplierOrKurir) {
                                        return <span className="font-medium">{supplierOrKurir}</span>;
                                      }
                                      if (poOrResi) {
                                        return <span>{poOrResi}</span>;
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedDelivery && (
                  <div className="space-y-3 pt-4 border-t mt-4">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">No. Resi</span>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedDelivery.no_resi}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Surat Jalan</span>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedDelivery.no_surat_jalan || "-"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kurir/Ekspedisi</span>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{(selectedDelivery.kurir || selectedDelivery.ekspedisi) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                      <div className="mt-1">
                        <Badge variant="outline" className="font-medium">{selectedDelivery.status}</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Informasi Penerimaan */}
                <div className="space-y-3 pt-4 border-t mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tanggal" className="text-sm font-medium">Tanggal Penerimaan</Label>
                    <DatePicker
                      id="tanggal"
                      date={formData.tanggal_penerimaan ? new Date(formData.tanggal_penerimaan) : new Date()}
                      onChange={(date) =>
                        setFormData({ ...formData, tanggal_penerimaan: date?.toISOString().split("T")[0] || "" })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="catatan" className="text-sm font-medium">Catatan</Label>
                    <Textarea
                      id="catatan"
                      value={formData.catatan || ""}
                      onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                      placeholder="Catatan tambahan (opsional)"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Items Table (8 cols) */}
          <div className="lg:col-span-8">
            <Card className="h-full">
              <CardHeader className="pb-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ClipboardDocumentCheckIcon className="w-5 h-5 text-pink-600" />
                    Item Penerimaan
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    Tambah Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {grnItems.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Pilih pengiriman untuk melihat item PO
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-2.5">Bahan Baku</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-20">Ordered</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-20">Received</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-24">Diterima</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-24">Ditolak</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-28">Kondisi</th>
                        <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-2.5 w-16">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {grnItems.map((item, idx) => {
                        const poItem = poItems.find((p) => p.id === item.purchase_order_item_id);
                        const qtyOrdered = typeof poItem?.qty_ordered === 'number' ? poItem.qty_ordered : 0;
                        const qtyReceived = typeof poItem?.qty_received === 'number' ? poItem.qty_received : 0;
                        const satuan = typeof poItem?.satuan === 'string' ? poItem.satuan : 'pcs';
                        
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{item.nama_bahan || "Item manual"}</div>
                              {poItem && qtyOrdered > 0 && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  PO: {qtyOrdered} {satuan}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-sm text-gray-600">{qtyOrdered}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-sm text-gray-600">{qtyReceived}</span>
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                min="0"
                                value={item.qty_diterima}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, "qty_diterima", parseFloat(e.target.value) || 0)
                                }
                                className="w-20 text-center text-sm h-9"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                min="0"
                                value={item.qty_ditolak}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, "qty_ditolak", parseFloat(e.target.value) || 0)
                                }
                                className="w-20 text-center text-sm h-9"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <select
                                value={item.kondisi}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, "kondisi", e.target.value as "baik" | "rusak" | "cacat")
                                }
                                className="w-full text-sm border border-gray-300 rounded-md px-2.5 py-1.5 text-center bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                              >
                                <option value="baik">Baik</option>
                                <option value="rusak">Rusak</option>
                                <option value="cacat">Cacat</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
              <div className="border-t border-gray-200 px-4 py-4 flex justify-end gap-3 bg-gray-50">
                <Button type="button" variant="outline" onClick={() => router.back()} className="px-6">
                  Batal
                </Button>
                <Button type="submit" disabled={loading || grnItems.length === 0} className="px-6">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 mr-2" />
                  {loading ? "Menyimpan..." : "Simpan GRN"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
