"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { Loader2, Plus, Download, Search, User, Trash2, Upload, FileText } from "lucide-react";
import type { Candidate, CandidateStatus, Brand } from "@/types";

const STATUS_LABELS: Record<CandidateStatus, string> = {
  new: "Baru",
  screening: "Screening",
  interview_hrd: "Interview HRD",
  interview_manager: "Interview Manager",
  talent_pool: "Talent Pool",
  hired: "Diterima",
  rejected: "Ditolak",
  archived: "Diarsipkan",
};

const SOURCE_LABELS: Record<string, string> = {
  portal: "Portal",
  internal: "Internal",
  referral: "Rekomendasi",
  jobstreet: "JobStreet",
  instagram: "Instagram",
  jobfair: "Job Fair",
  walk_in: "Walk-in",
  internal_referral: "Referral Internal",
  headhunter: "Headhunter",
  other: "Lainnya",
};

const STATUS_COLORS: Record<CandidateStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  screening: "bg-yellow-100 text-yellow-700",
  interview_hrd: "bg-purple-100 text-purple-700",
  interview_manager: "bg-indigo-100 text-indigo-700",
  talent_pool: "bg-pink-100 text-pink-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-700",
};

export default function CandidatesPage() {
  const supabase = createClient();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<{
    status: string;
    brand_id: string;
    position_id: string;
    search: string;
    date_from: string;
    date_to: string;
  }>({
    status: "",
    brand_id: "",
    position_id: "",
    search: "",
    date_from: "",
    date_to: "",
  });
  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Candidate | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const cvFileRef = useRef<HTMLInputElement>(null);
  const perPage = 20;

  // New candidate form
  type AddFormValues = {
    full_name: string;
    email: string;
    phone: string;
    domicile: string;
    source: string;
    brand_id?: string;
    position_id?: string;
    status: string;
    notes?: string;
  };

  const addForm = useForm<AddFormValues>({
    defaultValues: { status: "new", source: "walk_in" },
  });

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("candidates")
      .select("*, brands(name), positions(title)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (filter.status) query = query.eq("status", filter.status);
    if (filter.brand_id) query = query.eq("brand_id", filter.brand_id);
    if (filter.position_id) query = query.eq("position_id", filter.position_id);
    if (filter.date_from) query = query.gte("created_at", filter.date_from);
    if (filter.date_to) query = query.lte("created_at", filter.date_to + "T23:59:59");
    if (filter.search) {
      query = query.or(
        `full_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone.ilike.%${filter.search}%`
      );
    }

    const { data, count } = await query;
    setCandidates((data as Candidate[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [filter, page]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    supabase.from("brands").select("*").eq("is_active", true).then(({ data }) => {
      if (data) setBrands(data);
    });
  }, []);

  const handleAddCandidate = async (values: AddFormValues) => {
    // Normalize source value to match database constraint
    const normalizedSource = values.source || 'walk_in';
    
    console.log('Submitting candidate with source:', normalizedSource);
    
    // First insert the candidate
    const { data: newCandidate, error } = await supabase.from("candidates").insert({
      full_name: values.full_name,
      email: values.email,
      phone: values.phone,
      domicile: values.domicile,
      source: normalizedSource,
      brand_id: values.brand_id || null,
      position_id: values.position_id || null,
      status: values.status,
      notes: values.notes || null,
    }).select().single();

    if (error) {
      console.error('Insert error:', error);
      alert(`Gagal menyimpan: ${error.message}`);
      return;
    }

    // If there's a CV file, upload it
    if (cvFile && newCandidate) {
      setUploadingCv(true);
      try {
        const formData = new FormData();
        formData.append("file", cvFile);
        const res = await fetch(`/api/candidates/${newCandidate.id}/cv-upload`, {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (!res.ok) {
          console.error("CV upload failed:", result.error);
        }
      } catch (err) {
        console.error("CV upload error:", err);
      } finally {
        setUploadingCv(false);
      }
    }

    setCvFile(null);
    setShowAddDialog(false);
    addForm.reset({ status: "new", source: "walk_in" });
    fetchCandidates();
  };

  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvFile(file);
  };

  const handleExportCSV = async () => {
    let query = supabase
      .from("candidates")
      .select("*, brands(name), positions(title)")
      .order("created_at", { ascending: false });

    if (filter.status) query = query.eq("status", filter.status);
    if (filter.brand_id) query = query.eq("brand_id", filter.brand_id);
    if (filter.search) {
      query = query.or(
        `full_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone.ilike.%${filter.search}%`
      );
    }

    const { data } = await query;
    if (!data || data.length === 0) return;

    const headers = ["Nama", "Email", "Telepon", "Domisili", "Posisi", "Brand", "Status", "Sumber", "Tanggal"];
    const rows = data.map((c: any) => [
      c.full_name,
      c.email,
      c.phone,
      c.domicile,
      c.positions?.title ?? "",
      c.brands?.name ?? "",
      STATUS_LABELS[c.status as CandidateStatus] ?? c.status,
      SOURCE_LABELS[c.source] ?? c.source,
      new Date(c.created_at).toLocaleDateString("id-ID"),
    ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kandidat_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteCandidate = async () => {
    if (!deleteCandidate) return;
    const { error } = await supabase.from("candidates").delete().eq("id", deleteCandidate.id);
    if (!error) {
      setDeleteCandidate(null);
      fetchCandidates();
    }
  };

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kandidat</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalCount} kandidat ditemukan
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Tambah Kandidat</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nama, email, telepon..."
                value={filter.search}
                onChange={(e) => { setFilter((f) => ({ ...f, search: e.target.value })); setPage(1); }}
                className="pl-9"
              />
            </div>
            {/* Dropdown filters - horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <Select
                value={filter.status}
                onValueChange={(v) => { setFilter((f) => ({ ...f, status: v === "all" ? "" : (v as string) })); setPage(1); }}
              >
                <SelectTrigger className="w-[140px] flex-shrink-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filter.brand_id}
                onValueChange={(v) => { setFilter((f) => ({ ...f, brand_id: v === "all" ? "" : (v as string) })); setPage(1); }}
              >
                <SelectTrigger className="w-[140px] flex-shrink-0">
                  <SelectValue placeholder="Outlet">
                    {filter.brand_id && filter.brand_id !== "all" && brands.find(b => b.id === filter.brand_id)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Outlet</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={filter.date_from}
                onChange={(e) => { setFilter((f) => ({ ...f, date_from: e.target.value })); setPage(1); }}
                className="w-[130px] flex-shrink-0 text-sm"
                title="Dari tanggal"
              />
              <Input
                type="date"
                value={filter.date_to}
                onChange={(e) => { setFilter((f) => ({ ...f, date_to: e.target.value })); setPage(1); }}
                className="w-[130px] flex-shrink-0 text-sm"
                title="Sampai tanggal"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table / Mobile Cards */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop Table — hidden on mobile */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="w-20">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Memuat...
                    </TableCell>
                  </TableRow>
                ) : candidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Tidak ada kandidat ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  candidates.map((c) => (
                    <TableRow key={c.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{c.full_name}</p>
                          <p className="text-gray-500 text-xs">{c.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {(c as any).positions?.title ?? "-"}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {(c as any).brands?.name ?? "-"}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {SOURCE_LABELS[c.source] ?? c.source}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[c.status]}>
                          {STATUS_LABELS[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs">
                        {new Date(c.created_at).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link href={`/dashboard/candidates/${c.id}`}>
                            <Button variant="ghost" size="sm" title="Detail">
                              <User className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteCandidate(c)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards — hidden on desktop */}
          <div className="md:hidden divide-y divide-gray-100">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Memuat...</div>
            ) : candidates.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Tidak ada kandidat ditemukan
              </div>
            ) : (
              candidates.map((c) => (
                <div
                  key={c.id}
                  className="p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{c.full_name}</p>
                      <p className="text-gray-500 text-xs truncate">{c.email}</p>
                    </div>
                    <Badge className={`${STATUS_COLORS[c.status]} flex-shrink-0`}>
                      {STATUS_LABELS[c.status]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>{(c as any).positions?.title ?? "-"}</span>
                    <span>{(c as any).brands?.name ?? "-"}</span>
                    <span>{SOURCE_LABELS[c.source] ?? c.source}</span>
                    <span>{new Date(c.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Link href={`/dashboard/candidates/${c.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs h-8">
                        <User className="w-3.5 h-3.5 mr-1" />
                        Detail
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                      onClick={() => setDeleteCandidate(c)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </Button>
              <span className="text-sm text-gray-500">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                Next →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Candidate Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Tambah Kandidat Manual</DialogTitle>
            <DialogDescription className="text-sm">
              Input kandidat dari walk-in, referral, dll.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={addForm.handleSubmit(handleAddCandidate)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nama lengkap"
                  {...addForm.register("full_name", { required: "Nama lengkap wajib diisi" })}
                  className="h-9 text-sm"
                />
                {addForm.formState.errors.full_name && (
                  <p className="text-xs text-red-500">{addForm.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="email@contoh.com"
                  {...addForm.register("email", { 
                    required: "Email wajib diisi",
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Email tidak valid" }
                  })}
                  className="h-9 text-sm"
                />
                {addForm.formState.errors.email && (
                  <p className="text-xs text-red-500">{addForm.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  No. WhatsApp <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="081234567890"
                  {...addForm.register("phone", { required: "No. WhatsApp wajib diisi" })}
                  className="h-9 text-sm"
                />
                {addForm.formState.errors.phone && (
                  <p className="text-xs text-red-500">{addForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Domisili <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Kota"
                  {...addForm.register("domicile", { required: "Domisili wajib diisi" })}
                  className="h-9 text-sm"
                />
                {addForm.formState.errors.domicile && (
                  <p className="text-xs text-red-500">{addForm.formState.errors.domicile.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Outlet / Brand</Label>
                <Controller
                  name="brand_id"
                  control={addForm.control}
                  render={({ field }) => {
                    const selectedBrand = brands.find(b => b.id === field.value);
                    return (
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        disabled={brands.length === 0}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={brands.length === 0 ? "Loading..." : "Pilih Outlet"}>
                            {selectedBrand?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Sumber</Label>
                <Controller
                  name="source"
                  control={addForm.control}
                  defaultValue="walk_in"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Pilih Sumber" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk_in">Walk-in</SelectItem>
                        <SelectItem value="referral">Rekomendasi</SelectItem>
                        <SelectItem value="internal_referral">Referral Internal</SelectItem>
                        <SelectItem value="jobfair">Job Fair</SelectItem>
                        <SelectItem value="headhunter">Headhunter</SelectItem>
                        <SelectItem value="portal">Portal</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="jobstreet">JobStreet</SelectItem>
                        <SelectItem value="other">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status Awal</Label>
              <Controller
                name="status"
                control={addForm.control}
                defaultValue="new"
                render={({ field }) => (
                  <Select value={field.value || "new"} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm w-[180px]">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Baru (New)</SelectItem>
                      <SelectItem value="screening">Screening</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">CV / Resume</Label>
              <input
                ref={cvFileRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleCvFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cvFileRef.current?.click()}
                  disabled={uploadingCv}
                  className="h-9 text-sm"
                >
                  {cvFile ? (
                    <FileText className="w-4 h-4 mr-2 text-blue-600" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {cvFile ? "Ganti File" : "Pilih File"}
                </Button>
                {cvFile && (
                  <span className="text-sm text-gray-600 truncate max-w-[200px]">
                    {cvFile.name}
                  </span>
                )}
                <span className="text-xs text-gray-400">PDF, DOC, DOCX, JPG, PNG (max 10MB)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Catatan</Label>
              <Textarea
                placeholder="Catatan internal (opsional)"
                rows={3}
                {...addForm.register("notes")}
                className="text-sm resize-none"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setCvFile(null);
                }}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={addForm.formState.isSubmitting || uploadingCv}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {addForm.formState.isSubmitting || uploadingCv ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteCandidate} onOpenChange={(v) => !v && setDeleteCandidate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Kandidat</DialogTitle>
            <DialogDescription>
              Apakah kamu yakin ingin menghapus kandidat{" "}
              <span className="font-medium text-gray-900">{deleteCandidate?.full_name}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteCandidate}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
