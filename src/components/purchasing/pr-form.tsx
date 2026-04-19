"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah, getRequiredApprovalLevel } from "@/lib/purchasing/utils";

const prItemSchema = z.object({
  description: z.string().min(1, "Deskripsi wajib diisi"),
  qty: z.number().min(1, "Minimal 1"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  estimated_price: z.number().min(0),
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
  onSubmit: (data: PRFormData, action: "draft" | "submit") => void;
  isLoading?: boolean;
}

export function PRForm({ departments, onSubmit, isLoading }: PRFormProps) {
  const [totalAmount, setTotalAmount] = useState(0);
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
    defaultValues: {
      priority: "medium",
      items: [{ description: "", qty: 1, unit: "", estimated_price: 0 }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const selectedDepartment = watch("department_id");
  
  const items = watch("items");
  
  // Calculate total when items change
  const calculateTotal = () => {
    const total = items.reduce(
      (sum, item) => sum + (item.qty || 0) * (item.estimated_price || 0),
      0
    );
    setTotalAmount(total);
  };

  // Get approval info based on total
  const approvalInfo = getRequiredApprovalLevel(totalAmount);
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="department_id">Departemen *</Label>
          <Select
            value={selectedDepartment}
            onValueChange={(value) => setValue("department_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih departemen" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.department_id && (
            <p className="text-sm text-red-500">{errors.department_id.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="priority">Prioritas *</Label>
          <Select
            defaultValue="medium"
            onValueChange={(value: any) => setValue("priority", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih prioritas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Rendah</SelectItem>
              <SelectItem value="medium">Sedang</SelectItem>
              <SelectItem value="high">Tinggi</SelectItem>
              <SelectItem value="urgent">Mendesak</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="required_date">Tanggal Dibutuhkan</Label>
          <Input type="date" {...register("required_date")} />
        </div>
      </div>
      
      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label>Item Permintaan *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ description: "", qty: 1, unit: "", estimated_price: 0 })
            }
          >
            <Plus className="w-4 h-4 mr-1" /> Tambah Item
          </Button>
        </div>
        
        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-5">
                    <Label className="text-xs">Deskripsi</Label>
                    <Input
                      {...register(`items.${index}.description`)}
                      placeholder="Nama barang/jasa"
                      onChange={(e) => {
                        register(`items.${index}.description`).onChange(e);
                        calculateTotal();
                      }}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      {...register(`items.${index}.qty`, { valueAsNumber: true })}
                      onChange={(e) => {
                        register(`items.${index}.qty`).onChange(e);
                        calculateTotal();
                      }}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label className="text-xs">Satuan</Label>
                    <Input
                      {...register(`items.${index}.unit`)}
                      placeholder="pcs"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label className="text-xs">Est. Harga</Label>
                    <Input
                      type="number"
                      {...register(`items.${index}.estimated_price`, {
                        valueAsNumber: true,
                      })}
                      onChange={(e) => {
                        register(`items.${index}.estimated_price`).onChange(e);
                        calculateTotal();
                      }}
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Label className="text-xs">&nbsp;</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {items[index] && (
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    Subtotal: {" "}
                    {formatRupiah(
                      (items[index].qty || 0) * (items[index].estimated_price || 0)
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        {errors.items && (
          <p className="text-sm text-red-500">{errors.items.message}</p>
        )}
      </div>
      
      {/* Total & Approval Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="notes">Catatan</Label>
          <Textarea
            {...register("notes")}
            placeholder="Catatan tambahan..."
            rows={3}
          />
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-500">Estimasi Total:</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatRupiah(totalAmount)}
          </p>
          {totalAmount > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-left">
              <p className="text-xs font-medium text-blue-700">
                Approval Required:
              </p>
              <p className="text-sm text-blue-600">
                {approvalInfo.level === "head_dept" && "Head Departemen"}
                {approvalInfo.level === "finance" && "Head Dept → Finance"}
                {approvalInfo.level === "direksi" && "Head Dept → Finance → Direksi"}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Threshold: {formatRupiah(approvalInfo.minAmount)}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Submit Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => {
            setSubmitAction("draft");
            handleSubmit((data) => onSubmit(data, "draft"))();
          }}
        >
          {isLoading && submitAction === "draft" ? "Menyimpan..." : "Simpan Draft"}
        </Button>
        <Button
          type="button"
          disabled={isLoading}
          onClick={() => {
            setSubmitAction("submit");
            handleSubmit((data) => onSubmit(data, "submit"))();
          }}
        >
          {isLoading && submitAction === "submit" ? "Mengirim..." : "Submit PR"}
        </Button>
      </div>
    </form>
  );
}
