"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  ChevronLeft,
  Save,
  RotateCcw,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";
import {
  SupplierFormData,
  PaymentTerms,
  Currency,
  PAYMENT_TERMS_OPTIONS,
  CURRENCY_OPTIONS,
  KOTA_OPTIONS,
  formatNPWP,
  validateNPWP,
} from "@/types/supplier";
import { createSupplier, updateSupplier } from "@/lib/purchasing/supplier";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";

// ─── Field hook ─────────────────────────────────────────────────

interface FieldState {
  value: string;
  error: string;
  touched: boolean;
}

function useField(initial = "") {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  return {
    value,
    setValue: (v: string) => { setValue(v); if (touched) validate(v); },
    setTouched: () => setTouched(true),
    error,
    setError,
    reset: () => { setValue(initial); setError(""); setTouched(false); },
    validate: (v?: string) => {
      const val = v ?? value;
      if (!val.trim()) { setError("Wajib diisi"); return false; }
      setError("");
      return true;
    },
  };
}

// ─── NPWP input ─────────────────────────────────────────────────

function NPWPInput({ value, onChange, onBlur, error, touched }: {
  value: string; onChange: (v: string) => void; onBlur: () => void;
  error: string; touched: boolean;
}) {
  function handleChange(raw: string) {
    onChange(formatNPWP(raw));
  }
  return (
    <div>
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onBlur}
        placeholder="XX.XXX.XXX.X-XXX.XXX"
        maxLength={20}
        className={cn(
          touched && error ? "border-red-500" : "",
          touched && !error && value ? "border-green-500" : ""
        )}
      />
      {touched && error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
        <XCircleIcon className="w-3 h-3" />{error}
      </p>}
      {touched && !error && value && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <CheckCircleIcon className="w-3 h-3" />Format valid
        </p>
      )}
    </div>
  );
}

// ─── Form validation ─────────────────────────────────────────────

function validateForm(data: SupplierFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.nama_supplier?.trim()) errors.nama_supplier = "Nama supplier wajib diisi";
  if (!data.pic_name?.trim()) errors.pic_name = "Nama PIC wajib diisi";
  if (!data.pic_phone?.trim()) errors.pic_phone = "Telepon PIC wajib diisi";
  if (!data.kota?.trim()) errors.kota = "Kota wajib diisi";
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Email tidak valid";
  }
  if (data.npwp && !validateNPWP(data.npwp)) {
    errors.npwp = "Format NPWP tidak valid";
  }
  return errors;
}

// ─── Edit Page ─────────────────────────────────────────────────

export default function EditSupplierPage() {
  return (
    <PurchasingGuard minRole="purchasing_admin">
      <EditSupplierInner />
    </PurchasingGuard>
  );
}

function EditSupplierInner() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const supplierId = params.id as string;

  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Form fields
  const nama = useField();
  const picName = useField();
  const picPhone = useField();
  const email = useField();
  const alamat = useField();
  const kota = useField();
  const npwp = useField();
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("NET30");
  const [currency, setCurrency] = useState<Currency>("IDR");
  const [bankNama, setBankNama] = useState("");
  const [bankRekening, setBankRekening] = useState("");
  const [bankAtasNama, setBankAtasNama] = useState("");

  // Load existing data
  useEffect(() => {
    async function load() {
      try {
        const { getSupplier } = await import("@/lib/purchasing/supplier");
        const supplier = await getSupplier(supplierId);
        nama.setValue(supplier.nama_supplier ?? "");
        picName.setValue(supplier.pic_name ?? "");
        picPhone.setValue(supplier.pic_phone ?? "");
        email.setValue(supplier.email ?? "");
        alamat.setValue(supplier.alamat ?? "");
        kota.setValue(supplier.kota ?? "");
        npwp.setValue(supplier.npwp ?? "");
        setPaymentTerms(supplier.payment_terms);
        setCurrency(supplier.currency);
        setBankNama(supplier.bank_nama ?? "");
        setBankRekening(supplier.bank_rekening ?? "");
        setBankAtasNama(supplier.bank_atas_nama ?? "");
      } catch (err: any) {
        toast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
        router.push("/dashboard/purchasing/suppliers");
      } finally {
        setInitialLoading(false);
      }
    }
    load();
  }, [supplierId]);

  // Track dirty
  useEffect(() => { setIsDirty(true); }, [nama.value, picName.value, picPhone.value, email.value, alamat.value, kota.value, npwp.value]);

  function buildFormData(): SupplierFormData {
    return {
      kode_supplier: "", // not editable
      nama_supplier: nama.value,
      pic_name: picName.value || undefined,
      pic_phone: picPhone.value || undefined,
      email: email.value || undefined,
      alamat: alamat.value || undefined,
      kota: kota.value || undefined,
      npwp: npwp.value || undefined,
      payment_terms: paymentTerms,
      currency,
      bank_nama: bankNama || undefined,
      bank_rekening: bankRekening || undefined,
      bank_atas_nama: bankAtasNama || undefined,
    };
  }

  function handleSubmit(force = false) {
    const data = buildFormData();
    const errors = validateForm(data);
    if (!nama.validate()) errors.nama_supplier = nama.error;
    if (!picName.validate()) errors.pic_name = picName.error;
    if (!picPhone.validate()) errors.pic_phone = picPhone.error;
    if (!kota.validate()) errors.kota = kota.error;
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      errors.email = "Email tidak valid"; email.setError(errors.email);
    }
    if (npwp.value && !validateNPWP(npwp.value)) {
      errors.npwp = "Format NPWP tidak valid"; npwp.setError(errors.npwp);
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: "Validasi gagal", description: "Mohon perbaiki field yang wajib diisi.", variant: "destructive" });
      return;
    }

    if (isDirty && !force) {
      setConfirmDialog(true);
      return;
    }

    doSubmit(data);
  }

  async function doSubmit(data: SupplierFormData) {
    setConfirmDialog(false);
    setSubmitting(true);
    try {
      await updateSupplier(supplierId, data);
      toast({ title: "Berhasil", description: "Supplier berhasil diperbarui." });
      router.push("/dashboard/purchasing/suppliers");
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    nama.reset(); picName.reset(); picPhone.reset(); email.reset();
    alamat.reset(); kota.reset(); npwp.reset();
    setBankNama(""); setBankRekening(""); setBankAtasNama("");
    setIsDirty(false); setFormErrors({});
  }

  function inputClass(hasError: boolean, touched: boolean) {
    return cn(hasError ? "border-red-500" : touched && !hasError ? "border-green-500" : "");
  }

  if (initialLoading) {
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

  return (
    <div className="space-y-6 max-w-4xl">
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Supplier", href: "/dashboard/purchasing/suppliers" },
        { label: supplierId, href: `/dashboard/purchasing/suppliers/${supplierId}` },
        { label: "Edit" },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Supplier</h1>
          <p className="text-sm text-gray-500">Form edit data supplier</p>
        </div>
        <Link href={`/dashboard/purchasing/suppliers/${supplierId}`}>
          <Button variant="outline"><ChevronLeft className="w-4 h-4 mr-2" />Kembali</Button>
        </Link>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle>Informasi Supplier</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Supplier *</Label>
              <Input id="nama" value={nama.value}
                onChange={(e) => nama.setValue(e.target.value)}
                onBlur={() => { nama.setTouched(); nama.validate(); }}
                className={inputClass(!!formErrors.nama_supplier, nama.touched)} />
              {nama.touched && nama.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircleIcon className="w-3 h-3" />{nama.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Kota *</Label>
              <Combobox
                options={KOTA_OPTIONS.map((k) => ({ value: k, label: k }))}
                value={kota.value}
                onChange={(v) => { kota.setValue(v); kota.setTouched(); }}
                placeholder="Pilih kota..."
                searchPlaceholder="Cari kota..."
                emptyMessage="Kota tidak ditemukan"
                allowClear
                className={formErrors.kota && kota.touched ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Contoh: Jakarta, Surabaya, Bandung
              </p>
              {kota.touched && kota.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <XCircleIcon className="w-3 h-3" />{kota.error}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Terms *</Label>
              <Combobox
                options={PAYMENT_TERMS_OPTIONS.map((pt) => ({ value: pt, label: pt }))}
                value={paymentTerms}
                onChange={(v) => setPaymentTerms(v as PaymentTerms)}
                placeholder="Pilih payment terms..."
                searchPlaceholder="Cari terms (contoh: 30 hari)..."
                emptyMessage="Payment terms tidak ditemukan"
                allowClear
              />
              <p className="text-xs text-muted-foreground">
                Contoh: NET 30, COD, CAD
              </p>
            </div>

            <div className="space-y-2">
              <Label>Mata Uang *</Label>
              <Combobox
                options={CURRENCY_OPTIONS.map((c) => ({ value: c, label: c }))}
                value={currency}
                onChange={(v) => setCurrency(v as Currency)}
                placeholder="Pilih mata uang..."
                searchPlaceholder="Cari currency (contoh: IDR)..."
                emptyMessage="Mata uang tidak ditemukan"
                allowClear
              />
              <p className="text-xs text-muted-foreground">
                Contoh: IDR (Rupiah), USD (US Dollar)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="npwp">NPWP</Label>
              <NPWPInput value={npwp.value} onChange={(v) => npwp.setValue(v)}
                onBlur={() => npwp.setTouched()} error={npwp.error} touched={npwp.touched} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PIC */}
      <Card>
        <CardHeader><CardTitle>Informasi PIC</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="picName">Nama PIC *</Label>
              <Input id="picName" value={picName.value}
                onChange={(e) => picName.setValue(e.target.value)}
                onBlur={() => { picName.setTouched(); picName.validate(); }}
                className={inputClass(!!formErrors.pic_name, picName.touched)} />
              {picName.touched && picName.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircleIcon className="w-3 h-3" />{picName.error}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="picPhone">Telepon PIC *</Label>
              <Input id="picPhone" value={picPhone.value}
                onChange={(e) => picPhone.setValue(e.target.value)}
                onBlur={() => { picPhone.setTouched(); picPhone.validate(); }}
                className={inputClass(!!formErrors.pic_phone, picPhone.touched)} />
              {picPhone.touched && picPhone.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircleIcon className="w-3 h-3" />{picPhone.error}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email PIC</Label>
              <Input id="email" type="email" value={email.value}
                onChange={(e) => email.setValue(e.target.value)}
                onBlur={() => email.setTouched()}
                className={inputClass(!!formErrors.email, email.touched)} />
              {email.touched && email.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircleIcon className="w-3 h-3" />{email.error}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address & Bank */}
      <Card>
        <CardHeader><CardTitle>Alamat & Bank</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alamat">Alamat</Label>
            <Textarea id="alamat" value={alamat.value}
              onChange={(e) => alamat.setValue(e.target.value)}
              rows={3} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankNama">Nama Bank</Label>
              <Input id="bankNama" value={bankNama} onChange={(e) => setBankNama(e.target.value)} placeholder="BCA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankRekening">No. Rekening</Label>
              <Input id="bankRekening" value={bankRekening} onChange={(e) => setBankRekening(e.target.value)} placeholder="123-456-7890" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAtasNama">Atas Nama</Label>
              <Input id="bankAtasNama" value={bankAtasNama} onChange={(e) => setBankAtasNama(e.target.value)} placeholder="PT Maju Bersama" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button>
        <Link href="/dashboard/purchasing/suppliers"><Button variant="outline">Batal</Button></Link>
        <Button onClick={() => handleSubmit(false)} disabled={submitting}>
          <Save className="w-4 h-4 mr-2" />{submitting ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Penyimpanan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menyimpan perubahan?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Batal</Button>
            <Button onClick={() => doSubmit(buildFormData())} disabled={submitting}>Ya, Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
