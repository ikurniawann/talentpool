"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Trash2, Package, X } from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/datepicker";
import { NumericInput } from "@/components/ui/numeric-input";
import { Supplier, RawMaterialWithStock, PurchaseOrderFormData, PurchaseOrderItemFormData, Unit, SupplierPriceList } from "@/types/purchasing";
import { listPriceLists, listApprovedPRsForPO } from "../api";
import { usePOFormData, useApprovedPRsForPO } from "../queries";
import { useCreatePurchaseOrder, useConvertPRToPurchaseOrder } from "../mutations";

interface POItemForm extends PurchaseOrderItemFormData {
  id: string;
  pr_item_id?: string;
  raw_material_name?: string;
  raw_material_unit?: string;
  requested_qty?: number;
  requested_satuan_id?: string;
  source?: "manual" | "pr" | "prefill";
  subtotal: number;
}

type SuppliersResponse = Supplier[] | { data?: Supplier[] };
type FetchError = Error & {
  response?: Response;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface PRForPO {
  id: string;
  pr_number: string;
  status: string;
  converted_po_id?: string | null;
  department?: { name: string };
  requester_name?: string;
  department_name?: string;
  items?: Array<{
    id: string;
    pr_id?: string;
    raw_material_id?: string | null;
    satuan_id?: string | null;
    description: string;
    qty: number;
    unit: string;
    estimated_price: number;
    raw_material?: { id: string; kode: string; nama: string; satuan?: string };
    satuan?: { id: string; nama: string };
  }>;
}

export function NewPOPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formDataQuery = usePOFormData();
  const suppliers = formDataQuery.data?.suppliers ?? [];
  const materials = formDataQuery.data?.materials ?? [];
  const units = formDataQuery.data?.units ?? [];
  const loading = formDataQuery.isLoading;
  const approvedPRsQuery = useApprovedPRsForPO();
  const approvedPrs = approvedPRsQuery.data ?? [];
  const [selectedPR, setSelectedPR] = useState<PRForPO | null>(null);
  const [loadingPR, setLoadingPR] = useState(false);
  const createMutation = useCreatePurchaseOrder();
  const convertMutation = useConvertPRToPurchaseOrder();
  const isSubmitting = createMutation.isPending || convertMutation.isPending;
  const prId = searchParams.get("pr_id");
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplier_id: "",
    pr_id: prId || undefined,
    tanggal_po: new Date().toISOString().split("T")[0],
    tanggal_kirim_estimasi: "",
    catatan: "",
    alamat_pengiriman: "",
    diskon_persen: 0,
    diskon_nominal: 0,
    ppn_persen: 11,
    source_type: "manual",
    production_order_id: null,
    source_reference: null,
    items: [],
  });
  const [items, setItems] = useState<POItemForm[]>([]);
  const isPrSourced = Boolean(formData.pr_id);

  const getConversionFactor = useCallback((materialId: string, unitId?: string) => {
    if (!unitId) return 1;
    const material = materials.find((item) => item.id === materialId);
    const conversion = material?.unit_conversions?.find(
      (item) => item.satuan_id === unitId && item.is_active !== false
    );
    return Number(conversion?.qty_in_base_unit || 1);
  }, [materials]);

  const getUnitName = useCallback((unitId?: string) => {
    return units.find((unit) => unit.id === unitId)?.nama || "";
  }, [units]);

  const getMaterialUnitOptions = useCallback((materialId?: string) => {
    const material = materials.find((item) => item.id === materialId);
    const conversionUnitIds = (material?.unit_conversions || [])
      .filter((conversion) => conversion.is_active !== false)
      .map((conversion) => conversion.satuan_id);
    const unitIds = Array.from(
      new Set([
        material?.satuan_besar_id,
        ...conversionUnitIds,
      ].filter(Boolean) as string[])
    );

    return unitIds
      .map((unitId) => {
        const unit = units.find((item) => item.id === unitId);
        return unit ? { value: unit.id, label: unit.nama, description: unit.kode } : null;
      })
      .filter(Boolean) as { value: string; label: string; description?: string }[];
  }, [materials, units]);

  const findSupplierPrice = useCallback(async (supplierId: string, materialId: string) => {
    if (!supplierId || !materialId) return null;
    const response = await listPriceLists({ supplier_id: supplierId, raw_material_id: materialId, is_active: true });
    const priceLists = (Array.isArray(response) ? response : [response]).filter(Boolean) as SupplierPriceList[];

    return priceLists
      .filter((price) => Number(price.harga ?? price.price ?? 0) > 0 && (price.satuan_id || price.unit_id))
      .sort((a, b) => {
        if (a.is_preferred !== b.is_preferred) return a.is_preferred ? -1 : 1;
        return Number(a.harga ?? a.price ?? 0) - Number(b.harga ?? b.price ?? 0);
      })[0] || null;
  }, []);

  const findSupplierUnitPrice = useCallback(async (
    supplierId: string,
    materialId: string,
    targetUnitId?: string
  ) => {
    if (!supplierId || !materialId || !targetUnitId) return null;

    const response = await listPriceLists({ supplier_id: supplierId, raw_material_id: materialId, is_active: true });
    const priceLists = (Array.isArray(response) ? response : [response])
      .filter((price) => Number(price?.harga ?? price?.price ?? 0) > 0 && (price?.satuan_id || price?.unit_id)) as SupplierPriceList[];

    const sortedPrices = [...priceLists].sort((a, b) => {
      if (a.is_preferred !== b.is_preferred) return a.is_preferred ? -1 : 1;
      return Number(a.harga ?? a.price ?? 0) - Number(b.harga ?? b.price ?? 0);
    });
    const exactPrice = sortedPrices.find((price) => (price.satuan_id || price.unit_id) === targetUnitId);
    const sourcePrice = exactPrice || sortedPrices[0];
    if (!sourcePrice) return null;

    const sourceUnitId = sourcePrice.satuan_id || sourcePrice.unit_id;
    const sourceFactor = getConversionFactor(materialId, sourceUnitId);
    const targetFactor = getConversionFactor(materialId, targetUnitId);
    const unitPrice = Number(sourcePrice.harga ?? sourcePrice.price ?? 0);

    return {
      unitPrice: sourceFactor > 0 ? (unitPrice / sourceFactor) * targetFactor : unitPrice,
      isExact: Boolean(exactPrice),
    };
  }, [getConversionFactor]);

  const applySupplierPriceToItem = useCallback(async (item: POItemForm, supplierId: string): Promise<POItemForm> => {
    if (!supplierId || !item.raw_material_id) return item;

    try {
      const price = await findSupplierPrice(supplierId, item.raw_material_id);
      if (!price) return item;

      const priceUnitId = price.satuan_id || price.unit_id;
      const targetUnitId = item.source === "pr"
        ? item.requested_satuan_id || item.satuan_id || priceUnitId
        : priceUnitId;
      const requestedQty = Number(item.requested_qty ?? item.qty_ordered ?? 0);
      const shouldConvertQty = item.source === "prefill";
      const requestUnitId = item.requested_satuan_id || item.satuan_id || targetUnitId;
      const requestFactor = getConversionFactor(item.raw_material_id, requestUnitId);
      const targetFactor = getConversionFactor(item.raw_material_id, targetUnitId);
      const convertedQty = shouldConvertQty && targetFactor > 0
        ? (requestedQty * requestFactor) / targetFactor
        : Math.max(1, Number(item.qty_ordered || requestedQty || 1));
      const priceFactor = getConversionFactor(item.raw_material_id, priceUnitId);
      const supplierPrice = Number(price.harga ?? price.price ?? 0);
      const unitPrice = priceFactor > 0 ? (supplierPrice / priceFactor) * targetFactor : supplierPrice;

      return {
        ...item,
        satuan_id: targetUnitId,
        raw_material_unit: getUnitName(targetUnitId) || item.raw_material_unit,
        qty_ordered: convertedQty,
        harga_satuan: Math.round(unitPrice),
        subtotal: convertedQty * Math.round(unitPrice),
      };
    } catch (error) {
      console.error("Error applying supplier price:", error);
      return item;
    }
  }, [findSupplierPrice, getConversionFactor, getUnitName]);

  const applySupplierPrices = useCallback(async (supplierId: string, nextItems = items) => {
    if (!supplierId || nextItems.length === 0) return nextItems;
    const pricedItems = await Promise.all(nextItems.map((item) => applySupplierPriceToItem(item, supplierId)));
    setItems(pricedItems);
    return pricedItems;
  }, [applySupplierPriceToItem, items]);

  const applySupplierPricesForItems = useCallback(async (supplierId: string, nextItems: POItemForm[]) => {
    if (!supplierId || nextItems.length === 0) return nextItems;
    const pricedItems = await Promise.all(nextItems.map((item) => applySupplierPriceToItem(item, supplierId)));
    setItems(pricedItems);
    return pricedItems;
  }, [applySupplierPriceToItem]);

  // Auto-fill from URL query params (from Low Stock Report / Production shortage)
  useEffect(() => {
    if (prefillApplied || materials.length === 0) return;
    const itemsJson = searchParams.get("items");
    const materialCode = searchParams.get('material');
    const qty = searchParams.get('qty');
    const supplierName = searchParams.get('supplier');

    if (itemsJson) {
      try {
        const parsed = JSON.parse(itemsJson) as Array<{
          kode?: string;
          qty?: number;
          price?: number;
        }>;
        const nextItems = parsed
          .map((prefill, index) => {
            const material = materials.find((m) => m.kode === prefill.kode);
            if (!material) return null;
            const qtyOrdered = Math.max(0, Number(prefill.qty || 0));
            const unitPrice = Number(prefill.price ?? material.harga_terakhir ?? material.avg_cost ?? 0);
            return {
              id: `prefill-${Date.now()}-${index}`,
              raw_material_id: material.id,
              qty_ordered: qtyOrdered,
              harga_satuan: unitPrice,
              subtotal: qtyOrdered * unitPrice,
              notes: "Kebutuhan bahan produksi",
              raw_material_name: material.nama,
              raw_material_unit: material.satuan_besar_nama || material.satuan || "Unit",
              requested_qty: qtyOrdered,
              requested_satuan_id: material.satuan_besar_id,
              source: "prefill",
            } as POItemForm;
          })
          .filter(Boolean) as POItemForm[];

        if (nextItems.length > 0) {
          const productionOrderId = searchParams.get("production_order_id");
          const productionOrderNumber = searchParams.get("production_order");
          setItems(nextItems);
          setFormData((prev) => ({
            ...prev,
            source_type: searchParams.get("source") === "production" ? "production_order" : prev.source_type,
            production_order_id: productionOrderId || prev.production_order_id || null,
            source_reference: productionOrderNumber || prev.source_reference || null,
            catatan: productionOrderNumber
              ? `Kebutuhan bahan produksi ${productionOrderNumber}`
              : prev.catatan,
          }));
          setPrefillApplied(true);
          toast.success(`${nextItems.length} material produksi ditambahkan ke PO`);
          return;
        }
      } catch (error) {
        console.error("Failed to parse PO prefill items:", error);
      }
    }
    
    if (materialCode && qty && materials.length > 0) {
      // Find material by code
      const material = materials.find(m => m.kode === materialCode);
      if (material) {
        if (supplierName && suppliers.length > 0) {
          const supplier = suppliers.find(s => s.nama_supplier.includes(supplierName));
          if (supplier) {
            setFormData(prev => ({ ...prev, supplier_id: supplier.id }));
          }
        }
        
        // Add item to PO
        const unit = units.find(u => u.nama === material.satuan);
        const newItem: POItemForm = {
          id: `temp-${Date.now()}`,
          raw_material_id: material.id,
          qty_ordered: parseInt(qty),
          harga_satuan: material.harga_terakhir || 0,
          subtotal: parseInt(qty) * (material.harga_terakhir || 0),
          notes: "",
          raw_material_name: material.nama,
          raw_material_unit: unit?.nama || 'Pcs',
          requested_qty: parseInt(qty),
          requested_satuan_id: material.satuan_besar_id,
          source: "prefill",
        };
        
        setItems([newItem]);
        setPrefillApplied(true);
        toast.success(`Material ${material.nama} ditambahkan ke PO (${qty} ${unit?.nama || 'pcs'})`);
      }
    }
  }, [searchParams, materials, suppliers, units, formData.supplier_id, prefillApplied]);

  const loadPRForPO = useCallback(async (id: string) => {
    setLoadingPR(true);
    try {
      const list = await listApprovedPRsForPO();
      const pr = (list as PRForPO[]).find((item) => item.id === id);

      if (!pr || pr.converted_po_id) {
        toast.error("PR tidak ditemukan, belum approved, atau sudah dibuatkan PO");
        setSelectedPR(null);
        return;
      }

      setSelectedPR(pr);
      setFormData((prev) => ({ ...prev, pr_id: id }));
      const mappedItems: POItemForm[] = (pr.items || []).map((item) => ({
        id: item.id,
        pr_item_id: item.id,
        raw_material_id: item.raw_material_id || "",
        satuan_id: item.satuan_id || undefined,
        qty_ordered: item.qty,
        harga_satuan: item.estimated_price || 0,
        notes: item.description,
        subtotal: item.qty * (item.estimated_price || 0),
        raw_material_name: item.raw_material?.nama || item.description,
        raw_material_unit: item.satuan?.nama || item.unit,
        requested_qty: item.qty,
        requested_satuan_id: item.satuan_id || undefined,
        source: "pr",
      }));
      if (formData.supplier_id) {
        await applySupplierPricesForItems(formData.supplier_id, mappedItems);
      } else {
        setItems(mappedItems);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error loading PR:", error);
      toast.error(message || "Gagal memuat PR");
    } finally {
      setLoadingPR(false);
    }
  }, [applySupplierPricesForItems, formData.supplier_id]);

  useEffect(() => {
    if (formDataQuery.isError) {
      toast.error(`Gagal memuat data: ${getErrorMessage(formDataQuery.error, "Unknown error")}`);
    }
  }, [formDataQuery.isError, formDataQuery.error]);

  useEffect(() => {
    if (prId) {
      loadPRForPO(prId);
    }
  }, [loadPRForPO, prId]);

  const clearSelectedPR = () => {
    setSelectedPR(null);
    setItems([]);
    setFormData((prev) => ({ ...prev, pr_id: undefined }));
    router.replace("/dashboard/purchasing/po/insert");
  };

  const handleSelectPR = (id: string) => {
    if (!id) {
      clearSelectedPR();
      return;
    }
    router.replace(`/dashboard/purchasing/po/insert?pr_id=${id}`);
    loadPRForPO(id);
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        raw_material_id: "",
        qty_ordered: 1,
        harga_satuan: 0,
        subtotal: 0,
        notes: "",
        requested_qty: 1,
        source: "manual",
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const applyUnitPriceForItem = useCallback(async (item: POItemForm, supplierId: string, unitId?: string) => {
    if (!supplierId || !item.raw_material_id || !unitId) return item;

    try {
      const price = await findSupplierUnitPrice(supplierId, item.raw_material_id, unitId);
      if (!price) return item;

      return {
        ...item,
        satuan_id: unitId,
        raw_material_unit: getUnitName(unitId) || item.raw_material_unit,
        harga_satuan: Math.round(price.unitPrice),
        subtotal: Number(item.qty_ordered || 0) * Math.round(price.unitPrice),
      };
    } catch (error) {
      console.error("Error applying unit price:", error);
      return item;
    }
  }, [findSupplierUnitPrice, getUnitName]);

  const updateItem = (index: number, field: keyof POItemForm, value: POItemForm[keyof POItemForm]) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate subtotal
    if (field === "qty_ordered" || field === "harga_satuan") {
      const qty = Number(field === "qty_ordered" ? value : newItems[index].qty_ordered);
      const price = Number(field === "harga_satuan" ? value : newItems[index].harga_satuan);
      newItems[index].subtotal = qty * price;
      if (field === "qty_ordered") {
        newItems[index].requested_qty = qty;
      }
    }

    if (field === "satuan_id") {
      newItems[index].requested_satuan_id = String(value || "");
      newItems[index].raw_material_unit = getUnitName(String(value || "")) || newItems[index].raw_material_unit;
    }

    // Update material info
    if (field === "raw_material_id") {
      const material = materials.find((m) => m.id === value);
      const unitId = material?.satuan_besar_id || "";
      newItems[index].raw_material_name = material?.nama;
      newItems[index].raw_material_unit = getUnitName(unitId) || material?.satuan_besar_nama || material?.satuan;
      newItems[index].satuan_id = unitId || undefined;
      newItems[index].requested_satuan_id = unitId || undefined;
    }

    setItems(newItems);

    if (field === "raw_material_id" && formData.supplier_id && String(value)) {
      applySupplierPriceToItem(newItems[index], formData.supplier_id).then((pricedItem) => {
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? pricedItem : item));
      });
    }

    if (field === "satuan_id" && formData.supplier_id && String(value)) {
      applyUnitPriceForItem(newItems[index], formData.supplier_id, String(value)).then((pricedItem) => {
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? pricedItem : item));
      });
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const diskonNominal = formData.diskon_persen
      ? (subtotal * formData.diskon_persen) / 100
      : formData.diskon_nominal || 0;
    const afterDiskon = subtotal - diskonNominal;
    const ppnNominal = (afterDiskon * (formData.ppn_persen || 11)) / 100;
    const total = afterDiskon + ppnNominal;

    return { subtotal, diskonNominal, ppnNominal, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      toast.error("Pilih supplier terlebih dahulu");
      return;
    }
    if (items.length === 0) {
      toast.error("Tambahkan minimal 1 item");
      return;
    }
    const invalidItem = items.find((item) => !item.raw_material_id || item.qty_ordered <= 0 || item.harga_satuan < 0);
    if (invalidItem) {
      toast.error("Lengkapi bahan baku, jumlah, dan harga untuk semua item");
      return;
    }

    try {
      const payload: PurchaseOrderFormData = {
        ...formData,
        pr_id: formData.pr_id || undefined,
        tanggal_kirim_estimasi: formData.tanggal_kirim_estimasi || "",
        items: items.map((item) => ({
          raw_material_id: item.raw_material_id,
          pr_item_id: item.pr_item_id,
          satuan_id: item.satuan_id,
          qty_ordered: Number(item.qty_ordered || 0),
          harga_satuan: Number(item.harga_satuan || 0),
          notes: item.notes || "",
        })),
      };
      console.log("Creating PO with payload:", payload);
      const po = payload.pr_id
        ? await convertMutation.mutateAsync({ prId: payload.pr_id, payload })
        : await createMutation.mutateAsync(payload);

      console.log("PO created:", po);

      toast.success("PO berhasil dibuat");
      router.push(`/dashboard/purchasing/po/${po.id}`);
    } catch (error: unknown) {
      const typedError = error as FetchError;
      console.error("Error creating PO:", error);
      console.error("Error response:", typedError.response);
      
      if (typedError.response) {
        try {
          const errorData = await typedError.response.json();
          console.error("API Error details:", JSON.stringify(errorData, null, 2));
          
          // Show detailed validation errors
          if (errorData.errors && Object.keys(errorData.errors).length > 0) {
            const errorMessages = Object.entries(errorData.errors)
              .map(([field, messages]) => `${field}: ${(messages as string[]).join(", ")}`)
              .join("\n");
            toast.error(`Validasi gagal:\n${errorMessages}`);
          } else {
            toast.error(errorData.message || "Gagal membuat PO");
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          toast.error("Gagal membuat PO");
        }
      } else {
        toast.error(getErrorMessage(error, "Gagal membuat PO"));
      }
    }
  };

  const { subtotal, diskonNominal, ppnNominal, total } = calculateTotals();
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/po">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Buat Purchase Order Baru</h1>
          <p className="text-muted-foreground">
            {selectedPR ? `Dari PR ${selectedPR.pr_number}` : "Buat PO manual atau pilih PR approved sebagai referensi"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Request Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedPR ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{selectedPR.pr_number}</span>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    {selectedPR.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedPR.department_name || selectedPR.department?.name || "-"} · {selectedPR.items?.length || 0} item
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/purchasing/pr/${selectedPR.id}`)}>
                  Lihat PR
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearSelectedPR}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Pilih PR Approved</Label>
              <Combobox
                options={approvedPrs.map((pr) => ({
                  value: pr.id,
                  label: pr.pr_number,
                  description: `${pr.department_name || pr.department?.name || "-"} · ${pr.items?.length || 0} item`,
                }))}
                value={formData.pr_id || ""}
                onChange={handleSelectPR}
                placeholder="Pilih PR yang sudah approved..."
                searchPlaceholder="Cari nomor PR / departemen..."
                emptyMessage="PR approved tidak ditemukan"
                allowClear
                disabled={loading || loadingPR}
              />
              <p className="text-xs text-muted-foreground">
                Opsional. PO tetap bisa dibuat manual tanpa PR.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informasi PO */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informasi Purchase Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Supplier <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={suppliers.map((supplier) => ({
                    value: supplier.id,
                    label: supplier.nama_supplier,
                    description: supplier.kode_supplier,
                  }))}
                  value={formData.supplier_id}
                    onChange={(value) => {
                      setFormData((prev) => ({ ...prev, supplier_id: value }));
                      if (value) {
                        applySupplierPrices(value);
                      }
                    }}
                  placeholder="Pilih supplier..."
                  searchPlaceholder="Cari supplier..."
                  emptyMessage="Supplier tidak ditemukan"
                  allowClear
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal PO</Label>
                  <DatePicker
                    value={formData.tanggal_po}
                    onChange={(v) => {
                      // Convert to YYYY-MM-DD format
                      const date = v ? new Date(v).toISOString().split('T')[0] : '';
                      setFormData((prev) => ({ ...prev, tanggal_po: date }));
                    }}
                    placeholder="Tanggal PO..."
                    variant="neutral"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Kirim Estimasi</Label>
                  <DatePicker
                    value={formData.tanggal_kirim_estimasi}
                    onChange={(v) => {
                      // Convert to YYYY-MM-DD format
                      const date = v ? new Date(v).toISOString().split('T')[0] : '';
                      setFormData((prev) => ({ ...prev, tanggal_kirim_estimasi: date }));
                    }}
                    placeholder="Estimasi kirim..."
                    variant="neutral"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Catatan</Label>
                <Textarea
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, catatan: e.target.value }))
                  }
                  placeholder="Catatan untuk supplier..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Alamat Pengiriman</Label>
                <Textarea
                  value={formData.alamat_pengiriman}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      alamat_pengiriman: e.target.value,
                    })
                  }
                  placeholder="Alamat pengiriman barang..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diskon</span>
                <span>Rp {diskonNominal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PPN ({formData.ppn_persen}%)</span>
                <span>Rp {ppnNominal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-lg font-semibold">
                <span>Total</span>
                <span>Rp {total.toLocaleString("id-ID")}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4">
                <div className="space-y-1">
                  <Label className="text-xs">Diskon (%)</Label>
                  <div className="flex rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                    <NumericInput
                      min="0"
                      max="100"
                      value={formData.diskon_persen}
                      decimalScale={2}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          diskon_persen: Math.min(100, Math.max(0, value || 0)),
                          diskon_nominal: 0,
                        })
                      }
                      className="h-9 rounded-r-none border-0 text-sm shadow-none focus-visible:ring-0"
                    />
                    <div className="flex min-w-10 items-center justify-center rounded-r-lg border-l border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                      %
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">PPN (%)</Label>
                  <div className="flex rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                    <NumericInput
                      min="0"
                      max="100"
                      value={formData.ppn_persen}
                      decimalScale={2}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          ppn_persen: Math.min(100, Math.max(0, value || 0)),
                        })
                      }
                      className="h-9 rounded-r-none border-0 text-sm shadow-none focus-visible:ring-0"
                    />
                    <div className="flex min-w-10 items-center justify-center rounded-r-lg border-l border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                      %
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Item Purchase Order</CardTitle>
            <Button type="button" onClick={addItem} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-start gap-4 rounded-xl border border-gray-200/70 bg-white p-4 shadow-xs"
                >
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Bahan Baku *</Label>
                    <Combobox
                      options={materials.map((m) => ({
                        value: m.id,
                        label: m.nama,
                        description: m.kode,
                      }))}
                      value={item.raw_material_id}
                      onChange={(v) =>
                        updateItem(index, "raw_material_id", v)
                      }
                      placeholder="Pilih bahan baku..."
                      searchPlaceholder="Cari bahan (nama/kode)..."
                      emptyMessage="Bahan baku tidak ditemukan"
                      allowClear
                      disabled={loading || isPrSourced}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Jumlah *</Label>
                    <NumericInput
                      min="0"
                      value={item.qty_ordered > 0 ? item.qty_ordered : null}
                      decimalScale={4}
                      placeholder="0"
                      disabled={isPrSourced}
                      onFocus={(event) => event.currentTarget.select()}
                      onValueChange={(value) => updateItem(index, "qty_ordered", value || 0)}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Satuan</Label>
                    <Combobox
                      options={getMaterialUnitOptions(item.raw_material_id)}
                      value={item.satuan_id || ""}
                      onChange={(value) => updateItem(index, "satuan_id", value || undefined)}
                      placeholder={item.raw_material_id ? "Pilih satuan..." : "Pilih bahan dulu"}
                      searchPlaceholder="Cari satuan..."
                      emptyMessage={
                        item.raw_material_id
                          ? "Satuan bahan ini belum dikonfigurasi"
                          : "Pilih bahan baku terlebih dahulu"
                      }
                      allowClear={false}
                      disabled={loading || isPrSourced}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Harga *</Label>
                    <div className="flex rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                      <div className="flex min-w-12 items-center justify-center rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
                        Rp
                      </div>
                      <NumericInput
                        min="0"
                        value={item.harga_satuan}
                        decimalScale={0}
                        onValueChange={(value) => updateItem(index, "harga_satuan", value || 0)}
                        className="h-9 rounded-l-none border-0 text-sm shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Subtotal</Label>
                    <div className="text-sm font-medium py-2">
                      Rp {item.subtotal.toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={isPrSourced}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 py-8 text-center text-muted-foreground">
                  Belum ada item. Klik &quot;Tambah Item&quot; untuk memulai.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/purchasing/po">
            <Button variant="outline" disabled={isSubmitting} className="purchasing-secondary-button">
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="purchasing-main-button">
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan PO"}
          </Button>
        </div>
      </form>

    </div>
  );
}
