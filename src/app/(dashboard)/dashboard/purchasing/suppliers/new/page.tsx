"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  SparklesIcon,
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

// ─── Field state ─────────────────────────────────────────────────

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

// ─── NPWP formatter ───────────────────────────────────────────────

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
          touched && error ? "border-red-500 focus:border-red-500" : "",
          touched && !error && value ? "border-green-500 focus:border-green-500" : ""
        )}
      />
      {touched && error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {touched && !error && value && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <CheckCircleIcon className="w-3 h-3" /> Format NPWP valid
        </p>
      )}
    </div>
  );
}

// ─── Form validation ─────────────────────────────────────────────

function validateForm(data: SupplierFormData, isEdit: boolean): Record<string, string> {
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
  if (!isEdit && !data.kode_supplier?.trim()) errors.kode_supplier = "Kode supplier wajib diisi";
  return errors;
}

// ─── Supplier Form ───────────────────────────────────────────────

interface SupplierFormProps {
  initialData?: Partial<SupplierFormData>;
  isEdit?: boolean;
  supplierId?: string;
}

export default function SupplierFormPage({ isEdit = false, supplierId }: { isEdit?: boolean; supplierId?: string } & SupplierFormProps) {
  return (
    <PurchasingGuard minRole="purchasing_admin">
      <SupplierFormInner isEdit={isEdit} supplierId={supplierId} />
    </PurchasingGuard>
  );
}

function SupplierFormInner({ isEdit, supplierId, initialData }: SupplierFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form fields
  const kode = useField(initialData?.kode_supplier ?? "");
  const nama = useField(initialData?.nama_supplier ?? "");
  const picName = useField(initialData?.pic_name ?? "");
  const picPhone = useField(initialData?.pic_phone ?? "");
  const email = useField(initialData?.email ?? "");
  const alamat = useField(initialData?.alamat ?? "");
  const kota = useField(initialData?.kota ?? "");
  const npwp = useField(initialData?.npwp ?? "");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(initialData?.payment_terms ?? "NET30");
  const [currency, setCurrency] = useState<Currency>(initialData?.currency ?? "IDR");
  const [bankNama, setBankNama] = useState(initialData?.bank_nama ?? "");
  const [bankRekening, setBankRekening] = useState(initialData?.bank_rekening ?? "");
  const [bankAtasNama, setBankAtasNama] = useState(initialData?.bank_atas_nama ?? "");

  // Auto-generate kode
  const [autoKode, setAutoKode] = useState(!isEdit);
  const [kodeLoading, setKodeLoading] = useState(false);

  // Dirty check & confirm dialog
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Track dirty
  useEffect(() => { setIsDirty(true); }, [kode.value, nama.value, picName.value, picPhone.value, email.value, alamat.value, kota.value, npwp.value]);

  // Auto-generate kode
  useEffect(() => {
    if (autoKode && !isEdit) {
      setKodeLoading(true);
      const year = new Date().getFullYear();
      // Generate placeholder; real code comes from server
      kode.setValue(`SUP-${year}-XXXX`);
    }
  }, [autoKode, isEdit]);

  function buildFormData(): SupplierFormData {
    return {
      kode_supplier: kode.value,
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
    // Validate all required fields
    const data = buildFormData();
    const errors = validateForm(data, isEdit);

    if (!kode.validate()) errors.kode_supplier = kode.error;
    if (!nama.validate()) errors.nama_supplier = nama.error;
    if (!picName.validate()) errors.pic_name = picName.error;
    if (!picPhone.validate()) errors.pic_phone = picPhone.error;
    if (!kota.validate()) errors.kota = kota.error;
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      errors.email = "Email tidak valid";
      email.setError(errors.email);
    }
    if (npwp.value && !validateNPWP(npwp.value)) {
      errors.npwp = "Format NPWP tidak valid";
      npwp.setError(errors.npwp);
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
      if (isEdit && supplierId) {
        await updateSupplier(supplierId, data);
        toast({ title: "Berhasil", description: "Supplier berhasil diperbarui." });
      } else {
        await createSupplier(data);
        toast({ title: "Berhasil", description: "Supplier baru berhasil dibuat." });
      }
      router.push("/dashboard/purchasing/suppliers");
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    kode.reset();
    nama.reset();
    picName.reset();
    picPhone.reset();
    email.reset();
    alamat.reset();
    kota.reset();
    npwp.reset();
    setBankNama("");
    setBankRekening("");
    setBankAtasNama("");
    setPaymentTerms("NET30");
    setCurrency("IDR");
    setIsDirty(false);
    setFormErrors({});
  }

  function inputClass(field: string) {
    return cn(
      formErrors[field] && "border-red-500 focus:border-red-500",
      !formErrors[field] && (kode.touched || nama.touched) && "border-green-500 focus:border-green-500"
    );
  }

  const title = isEdit ? "Edit Supplier" : "Tambah Supplier";
  const breadcrumbItems = isEdit
    ? [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Supplier", href: "/dashboard/purchasing/suppliers" },
        { label: supplierId ?? "", href: `/dashboard/purchasing/suppliers/${supplierId}` },
        { label: "Edit Supplier" },
      ]
    : [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Supplier", href: "/dashboard/purchasing/suppliers" },
        { label: "Tambah Supplier" },
      ];

  return (
    <div className="space-y-6 max-w-4xl">
      <BreadcrumbNav items={breadcrumbItems} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">
            {isEdit ? "Form edit data supplier" : "Form penambahan supplier baru"}
          </p>
        </div>
        <Link href={supplierId ? `/dashboard/purchasing/suppliers/${supplierId}` : "/dashboard/purchasing/suppliers"}>
          <Button variant="outline"><ChevronLeft className="w-4 h-4 mr-2" />Kembali</Button>
        </Link>
      </div>

      {/* Basic Info Card */}
      <Card>
        <CardHeader><CardTitle>Informasi Supplier</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kode Supplier */}
            <div className="space-y-2">
              <Label htmlFor="kode">Kode Supplier *</Label>
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-2 mt-7">
                  <input
                    type="checkbox"
                    id="autoKode"
                    checked={autoKode}
                    onChange={(e) => {
                      setAutoKode(e.target.checked);
                      if (!e.target.checked) kode.setValue("");
                    }}
                    className="rounded"
                  />
                  <Label htmlFor="autoKode" className="text-xs text-gray-500 mt-0">Auto</Label>
                </div>
                <div className="flex-1">
                  <Input
                    id="kode"
                    value={kode.value}
                    onChange={(e) => kode.setValue(e.target.value.toUpperCase())}
                    onBlur={() => { kode.setTouched(); kode.validate(); }}
                    disabled={autoKode}
                    placeholder="SUP-2025-0001"
                    className={cn(!autoKode && inputClass("kode_supplier"))}
                  />
                  {kode.touched && kode.error && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <XCircleIcon className="w-3 h-3" />{kode.error}
                    </p>
                  )}
                  {kode.touched && !kode.error && kode.value && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />Kode valid
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Nama Supplier */}
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Supplier *</Label>
              <Input
                id="nama"
                value={nama.value}
                onChange={(e) => nama.setValue(e.target.value)}
                onBlur={() => { nama.setTouched(); nama.validate(); }}
                placeholder="PT Maju Bersama"
                className={inputClass("nama_supplier")}
              />
              {nama.touched && nama.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <XCircleIcon className="w-3 h-3" />{nama.error}
                </p>
              )}
            </div>

            {/* Payment Terms */}
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

            {/* Currency */}
            <div className="space-y-2">
              <Label>Mata Uang *</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Kota */}
            <div className="space-y-2">
              <Label htmlFor="kota">Kota *</Label>
              <Select value={kota.value} onValueChange={(v) => { kota.setValue(v); kota.setTouched(); }}>
                <SelectTrigger className={inputClass("kota")}>
                  <SelectValue placeholder="— Pilih Kota —" />
                </SelectTrigger>
                <SelectContent>
                  {KOTA_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {kota.touched && kota.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <XCircleIcon className="w-3 h-3" />{kota.error}
                </p>
              )}
            </div>

            {/* NPWP */}
            <div className="space-y-2">
              <Label htmlFor="npwp">NPWP</Label>
              <NPWPInput
                value={npwp.value}
                onChange={(v) => npwp.setValue(v)}
                onBlur={() => { npwp.setTouched(); }}
                error={npwp.error}
                touched={npwp.touched}
              />
              {npwp.touched && npwp.error && (
                <p className="text-xs text-red-500 mt-1">{npwp.error}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PIC Card */}
      <Card>
        <CardHeader><CardTitle>Informasi PIC</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="picName">Nama PIC *</Label>
              <Input
                id="picName"
                value={picName.value}
                onChange={(e) => picName.setValue(e.target.value)}
                onBlur={() => { picName.setTouched(); picName.validate(); }}
                placeholder="Budi Santoso"
                className={inputClass("pic_name")}
              />
              {picName.touched && picName.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <XCircleIcon className="w-3 h-3" />{picName.error}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="picPhone">Telepon PIC *</Label>
              <Input
                id="picPhone"
                value={picPhone.value}
                onChange={(e) => picPhone.setValue(e.target.value)}
                onBlur={() => { picPhone.setTouched(); picPhone.validate(); }}
                placeholder="0812-xxxx-xxxx"
                className={inputClass("pic_phone")}
              />
              {picPhone.touched && picPhone.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <XCircleIcon className="w-3 h-3" />{picPhone.error}
                </p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email PIC</Label>
              <Input
                id="email"
                type="email"
                value={email.value}
                onChange={(e) => email.setValue(e.target.value)}
                onBlur={() => { email.setTouched(); }}
                placeholder="budi@supplier.com"
                className={inputClass("email")}
              />
              {email.touched && email.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <XCircleIcon className="w-3 h-3" />{email.error}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Card */}
      <Card>
        <CardHeader><CardTitle>Alamat & Bank</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alamat">Alamat</Label>
            <Textarea
              id="alamat"
              value={alamat.value}
              onChange={(e) => alamat.setValue(e.target.value)}
              placeholder="Jl. Sudirman No. 123, Gedung A, Lantai 3"
              rows={3}
            />
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
        <Button variant="outline" type="button" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />Reset
        </Button>
        <Link href="/dashboard/purchasing/suppliers">
          <Button variant="outline" type="button">Batal</Button>
        </Link>
        <Button onClick={() => handleSubmit(false)} disabled={submitting}>
          <Save className="w-4 h-4 mr-2" />
          {submitting ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Penyimpanan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menyimpan perubahan? Klik &quot;Ya, Simpan&quot; untuk melanjutkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Batal</Button>
            <Button onClick={() => doSubmit(buildFormData())} disabled={submitting}>
              Ya, Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
