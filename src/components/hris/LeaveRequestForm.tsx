"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LEAVE_TYPE_LABELS, calculateLeaveDays } from "@/types/hris";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const leaveFormSchema = z.object({
  employee_id: z.string().uuid().optional(),
  leave_type: z.enum(["annual", "sick", "maternity", "paternity", "unpaid", "emergency", "pilgrimage", "menstrual"]),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  attachment_url: z.string().url().optional().or(z.literal("")),
});

type LeaveFormData = z.infer<typeof leaveFormSchema>;

interface LeaveRequestFormProps {
  employeeId?: string;
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
}

export function LeaveRequestForm({
  employeeId,
  onSuccess,
  onCancel,
}: LeaveRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalDays, setTotalDays] = useState<number>(0);
  const [leaveBalance, setLeaveBalance] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<LeaveFormData>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      employee_id: employeeId,
      leave_type: "annual",
      start_date: "",
      end_date: "",
      reason: "",
      attachment_url: "",
    },
  });

  const startDate = form.watch("start_date");
  const endDate = form.watch("end_date");
  const leaveType = form.watch("leave_type");

  useEffect(() => {
    if (startDate && endDate) {
      const days = calculateLeaveDays(startDate, endDate);
      setTotalDays(days);
    } else {
      setTotalDays(0);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (employeeId && leaveType === "annual") {
      fetchLeaveBalance();
    }
  }, [employeeId, leaveType]);

  const fetchLeaveBalance = async () => {
    try {
      const response = await fetch(`/api/hris/leave-balances/${employeeId}`);
      const result = await response.json();
      
      if (result.data) {
        setLeaveBalance(result.data.annual_leave_remaining);
      }
    } catch (error) {
      console.error("Error fetching leave balance:", error);
    }
  };

  const onSubmit = async (data: LeaveFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/hris/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.includes("Insufficient")) {
          toast({
            title: "❌ Saldo Cuti Tidak Cukup",
            description: `Saldo tersisa: ${result.remaining || 0} hari`,
            variant: "destructive",
          });
        } else {
          throw new Error(result.error || "Failed to submit request");
        }
        return;
      }

      toast({
        title: "✅ Pengajuan Cuti Berhasil",
        description: `${totalDays} hari cuti diajukan`,
      });

      onSuccess?.(result.data);
      form.reset();
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: "Gagal mengajukan cuti. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const insufficientBalance = leaveType === "annual" && leaveBalance !== null && totalDays > leaveBalance;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajukan Cuti / Izin</CardTitle>
        <CardDescription>
          Isi formulir di bawah untuk mengajukan cuti atau izin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Employee ID (hidden if provided) */}
            {!employeeId && (
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Karyawan</FormLabel>
                    <FormControl>
                      <Input placeholder="Pilih karyawan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Leave Type */}
            <FormField
              control={form.control}
              name="leave_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Cuti</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis cuti" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Leave Balance Info */}
            {leaveType === "annual" && leaveBalance !== null && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800 font-medium">
                    Sisa Cuti Tahunan:
                  </span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {leaveBalance} hari
                  </Badge>
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Mulai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Selesai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Days Display */}
            {totalDays > 0 && (
              <div className={`p-3 rounded-lg border ${
                insufficientBalance 
                  ? "bg-red-50 border-red-200" 
                  : "bg-green-50 border-green-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    insufficientBalance ? "text-red-800" : "text-green-800"
                  }`}>
                    Total Hari (hari kerja):
                  </span>
                  <Badge variant="outline" className={
                    insufficientBalance 
                      ? "bg-red-100 text-red-800" 
                      : "bg-green-100 text-green-800"
                  }>
                    {totalDays} hari
                  </Badge>
                </div>
                {insufficientBalance && (
                  <p className="text-xs text-red-600 mt-2">
                    ⚠️ Saldo cuti tidak mencukupi
                  </p>
                )}
              </div>
            )}

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alasan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Jelaskan alasan pengajuan cuti..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimal 10 karakter
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachment URL */}
            <FormField
              control={form.control}
              name="attachment_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lampiran (Opsional)</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://... (surat dokter, dll)"
                        {...field}
                      />
                      <Button type="button" variant="outline" size="icon">
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload surat dokter atau dokumen pendukung lainnya
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || insufficientBalance}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengajukan...
                  </>
                ) : (
                  <>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Ajukan Cuti
                  </>
                )}
              </Button>
              
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Batal
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
