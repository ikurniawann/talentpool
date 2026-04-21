"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  TruckIcon,
  ArrowLeftIcon,
  SaveIcon,
  Loader2Icon,
  CheckIcon,
  ChevronsUpDown,
  SearchIcon,
} from "lucide-react";

interface POOption {
  id: string;
  nomor_po: string;
  nama_supplier: string;
  status: string;
}

export default function CreateDeliveryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [poList, setPoList] = useState<POOption[]>([]);
  const [fetchingPOs, setFetchingPOs] = useState(true);
  const [poPopoverOpen, setPoPopoverOpen] = useState(false);

  const [formData, setFormData] = useState({
    po_id: "",
    no_surat_jalan: "",
    ekspedisi: "",
    no_resi: "",
    tanggal_kirim: new Date().toISOString().split("T")[0],
    tanggal_estimasi_tiba: "",
    catatan: "",
  });

  useEffect(() => {
    async function fetchPOs() {
      try {
        const res = await fetch("/api/purchasing/po?limit=100");
        const data = await res.json();
        
        if (data.data) {
          const validStatuses = ["approved", "sent", "partial", "completed"];
          const availablePOs = data.data.filter((po: any) => {
            const status = po.status?.toLowerCase() || "";
            return validStatuses.includes(status);
          });
          setPoList(availablePOs);
        }
      } catch (e) {
        console.error("Failed to fetch POs:", e);
      } finally {
        setFetchingPOs(false);
      }
    }
    fetchPOs();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.po_id || !formData.no_surat_jalan) {
      toast({
        title: "Validasi Gagal",
        description: "PO dan No. Surat Jalan wajib diisi",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/purchasing/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "✅ Berhasil",
          description: `Delivery ${data.data?.nomor_resi || ""} berhasil dibuat`,
        });
        router.push("/dashboard/purchasing/delivery");
        router.refresh();
      } else {
        throw new Error(data.error?.message || data.message || "Gagal membuat delivery");
      }
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedPO = poList.find((po) => po.id === formData.po_id);

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Pengiriman", href: "/dashboard/purchasing/delivery" },
          { label: "Buat Baru" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TruckIcon className="w-6 h-6" />
            Input Pengiriman Baru
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Catat pengiriman barang dari supplier
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/purchasing/delivery")}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Pengiriman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* PO Selection - Modal Popover */}
                <div className="space-y-2">
                  <Label>
                    Purchase Order <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={poPopoverOpen} onOpenChange={setPoPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={poPopoverOpen}
                        className="w-full justify-between h-12 text-left font-normal"
                        disabled={fetchingPOs}
                      >
                        {fetchingPOs ? (
                          <span className="text-gray-400">Memuat PO...</span>
                        ) : selectedPO ? (
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{selectedPO.nomor_po}</span>
                            <span className="text-xs text-gray-500">{selectedPO.nama_supplier}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Pilih Purchase Order</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cari PO atau supplier..." />
                        <CommandList>
                          <CommandEmpty>Tidak ada PO yang ditemukan</CommandEmpty>
                          <CommandGroup>
                            {poList.map((po) => (
                              <CommandItem
                                key={po.id}
                                value={`${po.nomor_po} ${po.nama_supplier}`}
                                onSelect={() => {
                                  setFormData({ ...formData, po_id: po.id });
                                  setPoPopoverOpen(false);
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.po_id === po.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{po.nomor_po}</span>
                                  <span className="text-xs text-gray-500">{po.nama_supplier}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="no_surat_jalan">
                    No. Surat Jalan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="no_surat_jalan"
                    placeholder="Contoh: SJ-2025-0001"
                    value={formData.no_surat_jalan}
                    onChange={(e) =>
                      setFormData({ ...formData, no_surat_jalan: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ekspedisi">Ekspedisi / Kurir</Label>
                  <Input
                    id="ekspedisi"
                    placeholder="Contoh: JNE, J&T, SiCepat"
                    value={formData.ekspedisi}
                    onChange={(e) =>
                      setFormData({ ...formData, ekspedisi: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="no_resi">No. Resi / Tracking</Label>
                  <Input
                    id="no_resi"
                    placeholder="Contoh: JNE123456789"
                    value={formData.no_resi}
                    onChange={(e) =>
                      setFormData({ ...formData, no_resi: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_kirim">Tanggal Kirim</Label>
                    <Input
                      id="tanggal_kirim"
                      type="date"
                      value={formData.tanggal_kirim}
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal_kirim: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_estimasi_tiba">Estimasi Tiba</Label>
                    <Input
                      id="tanggal_estimasi_tiba"
                      type="date"
                      value={formData.tanggal_estimasi_tiba}
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal_estimasi_tiba: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Catatan</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Tambahkan catatan jika diperlikan..."
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData({ ...formData, catatan: e.target.value })
                  }
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Aksi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !formData.po_id || !formData.no_surat_jalan}
                >
                  {loading ? (
                    <>
                      <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-4 h-4 mr-2" />
                      Simpan Pengiriman
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/dashboard/purchasing/delivery")}
                >
                  Batal
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-sm text-gray-600">
                <p className="mb-2 font-medium">Informasi:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Pilih PO yang sudah di-approve</li>
                  <li>No. Surat Jalan wajib diisi</li>
                  <li>Status awal: Menunggu</li>
                  <li>Setelah tiba, buat GRN</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
