"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, X, CheckCircle, Phone, Mail, MapPin, Briefcase } from "lucide-react";

// Validation schema
const formSchema = z.object({
  full_name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Format email tidak valid"),
  phone: z
    .string()
    .min(9, "Nomor terlalu pendek")
    .regex(/^(\+62|62|0)[0-9]{9,12}$/, "Format nomor WA tidak valid (contoh: 081234567890)"),
  domicile: z.string().min(2, "Domisili harus diisi").max(100, "Maksimal 100 karakter"),
  source: z.enum(["portal", "instagram", "jobstreet", "referral", "walk_in", "other"]),
  position_id: z.string().optional(),
  brand_id: z.string().optional(),
  notes: z.string().max(1000, "Catatan maksimal 1000 karakter").optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function PortalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; title: string }[]>([]);

  // File states
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvPreview, setCvPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: "portal",
    },
  });

  const selectedBrand = watch("brand_id");

  // Fetch brands
  useEffect(() => {
    supabase
      .from("brands")
      .select("id, name")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setBrands(data);
      });
  }, []);

  // Fetch positions when brand changes
  useEffect(() => {
    if (selectedBrand) {
      supabase
        .from("positions")
        .select("id, title")
        .eq("brand_id", selectedBrand)
        .eq("is_active", true)
        .then(({ data }) => {
          if (data) setPositions(data);
          else setPositions([]);
        });
    } else {
      setPositions([]);
      setValue("position_id", "");
    }
  }, [selectedBrand, setValue]);

  // File handlers
  const handleCvChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      setFileError("CV harus format PDF atau DOC");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("CV maksimal 5MB");
      return;
    }

    setCvFile(file);
    setCvPreview(null);
    setFileError(null);
  }, []);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFileError("Foto harus format JPG/PNG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError("Foto maksimal 2MB");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setFileError(null);
  }, []);

  const removeCv = () => {
    setCvFile(null);
    setCvPreview(null);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setSubmitError(null);

    try {
      const submitFormData = new FormData();
      submitFormData.append("full_name", data.full_name);
      submitFormData.append("email", data.email);
      submitFormData.append("phone", data.phone);
      submitFormData.append("domicile", data.domicile);
      submitFormData.append("source", data.source);
      if (data.position_id) submitFormData.append("position_id", data.position_id);
      if (data.brand_id) submitFormData.append("brand_id", data.brand_id);
      if (data.notes) submitFormData.append("notes", data.notes);
      if (cvFile) submitFormData.append("cv", cvFile);
      if (photoFile) submitFormData.append("photo", photoFile);

      const res = await fetch("/api/portal/submit", {
        method: "POST",
        body: submitFormData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Terjadi kesalahan");
      }

      setSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "Gagal mengirim lamaran");
    } finally {
      setLoading(false);
    }
  };

  // Success page
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg border-0">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lamaran Terkirim!</h2>
            <p className="text-gray-600 mb-6">
              Terima kasih sudah melamar. Tim HRD kami akan menghubungi kamu
              melalui WhatsApp atau email dalam 1-3 hari kerja.
            </p>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full"
            >
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Lamar Kerja di Aapex Technology</h1>
          <p className="text-gray-500 mt-1">Isi formulir di bawah untuk melamar posisi yang tersedia</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informasi Diri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Brand */}
              <div className="space-y-1.5">
                <Label htmlFor="brand_id">Outlet / Brand</Label>
                <Select
                  value={watch("brand_id") || ""}
                  onValueChange={(v) => setValue("brand_id", v || undefined)}
                >
                  <SelectTrigger id="brand_id" className={errors.brand_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Pilih Outlet (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <Label htmlFor="position_id">Posisi yang Dilamar</Label>
                <Select
                  value={watch("position_id") || ""}
                  onValueChange={(v) => setValue("position_id", v || undefined)}
                  disabled={!selectedBrand || positions.length === 0}
                >
                  <SelectTrigger id="position_id">
                    <SelectValue placeholder={selectedBrand ? "Pilih Posisi" : "Pilih Outlet dulu"} />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="full_name">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  placeholder="Nama lengkap kamu"
                  {...register("full_name")}
                  className={errors.full_name ? "border-red-500" : ""}
                />
                {errors.full_name && (
                  <p className="text-xs text-red-500">{errors.full_name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@contoh.com"
                    {...register("email")}
                    className={`pl-9 ${errors.email ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  No. WhatsApp <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="081234567890"
                    {...register("phone")}
                    className={`pl-9 ${errors.phone ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>

              {/* Domicile */}
              <div className="space-y-1.5">
                <Label htmlFor="domicile">
                  Domisili / Kota <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="domicile"
                    placeholder="Contoh: Jakarta Selatan"
                    {...register("domicile")}
                    className={`pl-9 ${errors.domicile ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.domicile && (
                  <p className="text-xs text-red-500">{errors.domicile.message}</p>
                )}
              </div>

              {/* Source */}
              <div className="space-y-1.5">
                <Label htmlFor="source">
                  Sumber Informasi Lowongan <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch("source") || "portal"}
                  onValueChange={(v) => setValue("source", v as any)}
                >
                  <SelectTrigger id="source" className={errors.source ? "border-red-500" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portal">Website / Portal</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="jobstreet">JobStreet</SelectItem>
                    <SelectItem value="referral">Rekomendasi (Referral)</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
                {errors.source && (
                  <p className="text-xs text-red-500">{errors.source.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* File Upload Card */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upload Dokumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CV Upload */}
              <div className="space-y-1.5">
                <Label>
                  CV (PDF/DOC) <span className="text-red-500">*</span>
                </Label>
                <span className="text-xs text-gray-500">Maksimal 5MB</span>

                {cvFile ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Upload className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-700 truncate">{cvFile.name}</p>
                      <p className="text-xs text-emerald-600">
                        {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeCv}
                      className="p-1 hover:bg-emerald-100 rounded"
                    >
                      <X className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Klik untuk upload CV</span>
                    <span className="text-xs text-gray-400">PDF atau DOC, maks 5MB</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={handleCvChange}
                    />
                  </label>
                )}
              </div>

              {/* Photo Upload */}
              <div className="space-y-1.5">
                <Label>Foto (JPG/PNG, opsional)</Label>
                <span className="text-xs text-gray-500">Maksimal 2MB</span>

                {photoFile ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    {photoPreview && (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-700 truncate">{photoFile.name}</p>
                      <p className="text-xs text-emerald-600">
                        {(photoFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="p-1 hover:bg-emerald-100 rounded"
                    >
                      <X className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Klik untuk upload foto</span>
                    <span className="text-xs text-gray-400">JPG atau PNG, maks 2MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                )}
              </div>

              {fileError && (
                <Alert variant="destructive">
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Catatan Tambahan</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Info tambahan yang ingin kamu sampaikan (opsional)"
                rows={3}
                {...register("notes")}
                className={errors.notes ? "border-red-500" : ""}
              />
              {errors.notes && (
                <p className="text-xs text-red-500 mt-1">{errors.notes.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Submit Error */}
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !cvFile}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Mengirim Lamaran...
              </>
            ) : (
              "Kirim Lamaran"
            )}
          </Button>

          {!cvFile && (
            <p className="text-xs text-center text-gray-400 -mt-2">
              * Wajib upload CV untuk mengirim lamaran
            </p>
          )}
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Dengan mengirim lamaran, kamu menyetujui kebijakan privasi Aapex Technology
        </p>
      </div>
    </div>
  );
}
