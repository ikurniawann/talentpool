"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Loader2, Plus, ShoppingBasket, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumericInput } from "@/components/ui/numeric-input";
import { formatRupiah } from "@/lib/purchasing/utils";
import { toast } from "sonner";

const prItemSchema = z.object({
  raw_material_id: z.string().min(1, "Bahan baku wajib dipilih"),
  satuan_id: z.string().optional(),
  description: z.string().min(1, "Deskripsi wajib diisi"),
  qty: z.number().min(1, "Minimal 1"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  estimated_price: z.preprocess(
    (value) => (value === "" || Number.isNaN(value) ? 0 : value),
    z.number().min(0)
  ),
});

const prSchema = z.object({
  department_id: z.string().min(1, "Departemen wajib dipilih"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  required_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(prItemSchema).min(1, "Minimal 1 item"),
});

type PRFormData = z.infer<typeof prSchema>;

interface PRFormProps {
  departments: { id: string; name: string }[];
  materials: {
    id: string;
    kode: string;
    nama: string;
    satuan_besar_id?: string;
    satuan_besar_nama?: string;
    avg_cost?: number;
  }[];
  units: { id: string; nama: string }[];
  onSubmit: (data: PRFormData, action: "draft" | "submit") => void | Promise<void>;
  isLoading?: boolean;
  initialData?: PRFormData;
  mode?: "create" | "edit";
}

export function PRForm({
  departments,
  materials,
  onSubmit,
  isLoading,
  initialData,
  mode = "create",
}: PRFormProps) {
  const [submitAction, setSubmitAction] = useState<"draft" | "submit" | null>(null);
  
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PRFormData>({
    resolver: zodResolver(prSchema),
    defaultValues: initialData || {
      priority: "medium",
      items: [{ raw_material_id: "", satuan_id: "", description: "", qty: 1, unit: "", estimated_price: 0 }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const selectedDepartment = watch("department_id");
  
  const items = watch("items");
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.qty || 0) * (item.estimated_price || 0),
    0
  );

  function handleSelectMaterial(index: number, materialId: string) {
    const material = materials.find((item) => item.id === materialId);
    setValue(`items.${index}.raw_material_id`, materialId);
    setValue(`items.${index}.description`, material?.nama || "");
    setValue(`items.${index}.unit`, material?.satuan_besar_nama || "");
    setValue(`items.${index}.satuan_id`, material?.satuan_besar_id || "");
    setValue(`items.${index}.estimated_price`, material?.avg_cost || 0);
  }

  const isSubmitting = isLoading || submitAction !== null;

  function submitWithAction(action: "draft" | "submit") {
    return handleSubmit(async (data) => {
      setSubmitAction(action);
      try {
        await onSubmit(data, action);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal membuat PR";
        if (!message.includes("NEXT_REDIRECT")) {
          toast.error(message);
        }
        throw error;
      } finally {
        setSubmitAction(null);
      }
    })();
  }
  
  return (

    <form
      onSubmit={(event) => {
        event.preventDefault();
        submitWithAction("submit");
      }}
      className="space-y-6"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Informasi Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="department_id" className="text-xs">Departemen <span className="text-red-500">*</span></Label>
              <Combobox
                options={departments.map((dept) => ({
                  value: dept.id,
                  label: dept.name,
                }))}
                value={selectedDepartment}
                onChange={(value) => setValue("department_id", value)}
                placeholder="Pilih departemen..."
                searchPlaceholder="Cari departemen..."
                emptyMessage="Departemen tidak ditemukan"
                allowClear
                className="!w-full h-9 text-sm"
              />
              {errors.department_id && (
                <p className="text-xs text-red-500">{errors.department_id.message}</p>
              )}

            </div>
            
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="priority" className="text-xs">Prioritas <span className="text-red-500">*</span></Label>
              <Combobox
                options={[
                  { value: "low", label: "Rendah" },
                  { value: "medium", label: "Sedang" },
                  { value: "high", label: "Tinggi" },
                  { value: "urgent", label: "Mendesak" },
                ]}
                value={watch("priority")}
                onChange={(value) => setValue("priority", value as PRFormData["priority"])}
                placeholder="Pilih prioritas..."
                searchPlaceholder="Cari prioritas..."
                emptyMessage="Prioritas tidak ditemukan"
                className="!w-full h-9 text-sm"
              />
            </div>
            
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="required_date" className="text-xs">Tanggal Dibutuhkan</Label>
              <Input type="date" className="h-9 text-sm" {...register("required_date")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBasket className="h-4 w-4" />
              Item Permintaan
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ raw_material_id: "", satuan_id: "", description: "", qty: 1, unit: "", estimated_price: 0 })
              }
              className="purchasing-secondary-button"
            >
              <Plus className="w-4 h-4 mr-1" /> Tambah Item
            </Button>
          </div>
          <p className="text-xs text-gray-500">Pilih bahan baku dari master agar bisa langsung dibuatkan PO.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-gray-200/70 bg-white/70 p-4">
              <div className="mb-4 flex items-center justify-between border-b border-gray-200/70 pb-3">
                <p className="text-sm font-medium text-gray-900">Item #{index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="h-8 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Hapus
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="min-w-0 space-y-1.5 lg:col-span-4">
                    <Label className="text-xs">Bahan Baku <span className="text-red-500">*</span></Label>
                    <Combobox
                      options={materials.map((material) => ({
                        value: material.id,
                        label: material.nama,
                        description: material.kode,
                      }))}
                      value={items[index]?.raw_material_id || ""}
                      onChange={(value) => handleSelectMaterial(index, value)}
                      placeholder="Pilih bahan..."
                      searchPlaceholder="Cari bahan..."
                      emptyMessage="Bahan tidak ditemukan"
                      allowClear
                      className="!w-full h-9 text-sm"
                    />
                    {errors.items?.[index]?.raw_material_id && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.items[index]?.raw_material_id?.message}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1.5 lg:col-span-4">
                    <Label className="text-xs">Deskripsi</Label>
                    <input type="hidden" {...register(`items.${index}.description`)} />
                    <div className="flex h-9 w-full items-center rounded-lg border border-gray-300 bg-gray-200 px-2.5 text-sm text-gray-700">
                      {items[index]?.description || "Pilih bahan baku terlebih dahulu"}
                    </div>
                  </div>
                  
                  <div className="min-w-0 space-y-1.5 lg:col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <NumericInput
                      value={items[index]?.qty || 0}
                      onValueChange={(value) =>
                        setValue(`items.${index}.qty`, value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      decimalScale={4}
                      className="h-9 text-sm"
                    />
                  </div>
                  
                  <div className="min-w-0 space-y-1.5 lg:col-span-2">
                    <Label className="text-xs">Satuan</Label>
                    <input type="hidden" {...register(`items.${index}.unit`)} />
                    <div className="flex h-9 w-full items-center rounded-lg border border-gray-300 bg-gray-200 px-2.5 text-sm text-gray-700">
                      {items[index]?.unit || "-"}
                    </div>
                  </div>

                  <div className="min-w-0 space-y-1.5 lg:col-span-3">
                    <Label className="text-xs">Est. Harga <span className="text-gray-400">(opsional)</span></Label>
                    <NumericInput
                      value={items[index]?.estimated_price || 0}
                      onValueChange={(value) =>
                        setValue(`items.${index}.estimated_price`, value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      decimalScale={0}
                      placeholder="Kosongkan jika belum tahu"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="min-w-0 rounded-lg bg-gray-50 p-3 lg:col-span-3">
                    <p className="text-xs text-gray-500">Subtotal</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatRupiah(
                        (items[index]?.qty || 0) * (items[index]?.estimated_price || 0)
                      )}
                    </p>
                  </div>
              </div>
            </div>
          ))}
        
          {errors.items && (
            <p className="text-sm text-red-500">{errors.items.message}</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Catatan & Ringkasan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="min-w-0 space-y-1.5 lg:col-span-2">
              <Label htmlFor="notes" className="text-xs">Catatan</Label>
              <Textarea
                {...register("notes")}
                placeholder="Catatan tambahan..."
                rows={4}
                className="text-sm resize-none"
              />
            </div>

            <div className="rounded-xl border border-gray-200/70 bg-gray-50/70 p-4">
              <p className="text-sm text-gray-500">Estimasi Total</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatRupiah(totalAmount)}
              </p>
              <div className="mt-4 rounded-lg bg-white p-3 text-left">
                <p className="text-xs font-medium text-gray-500">
                  Approval Required
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  Head Department
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Setiap PR yang disubmit wajib approval kebutuhan. Approval nominal final dilakukan di PO.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex flex-col-reverse gap-3 border-t border-gray-200/70 pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => submitWithAction("draft")}
          className="purchasing-secondary-button"
        >
          {submitAction === "draft" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitAction === "draft"
            ? "Menyimpan..."
            : mode === "edit"
              ? "Simpan Perubahan"
              : "Simpan Draft"}
        </Button>
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => submitWithAction("submit")}
          className="purchasing-main-button"
        >
          {submitAction === "submit" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitAction === "submit" ? "Mengirim..." : "Submit PR"}
        </Button>
      </div>
    </form>
  );
}
