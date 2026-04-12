"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useForm } from "react-hook-form";
import { Loader2, Plus, Download, Search, User } from "lucide-react";
import type { Candidate, CandidateStatus, Brand } from "@/types";

const STATUS_LABELS: Record<CandidateStatus, string> = {
  new: "Baru",
  screening: "Screening",
  interview_hrd: "Interview HRD",
  interview_manager: "Interview Manager",
  talent_pool: "Talent Pool",
  hired: "Diterima",
  rejected: "Ditolak",
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
};

export default function CandidatesPage() {
  const router = useRouter();
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
    const { error } = await supabase.from("candidates").insert({
      full_name: values.full_name,
      email: values.email,
      phone: values.phone,
      domicile: values.domicile,
      source: values.source,
      brand_id: values.brand_id || null,
      position_id: values.position_id || null,
      status: values.status,
      notes: values.notes || null,
    });

    if (!error) {
      setShowAddDialog(false);
      addForm.reset({ status: "new" });
      fetchCandidates();
    }
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

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kandidat</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalCount} kandidat ditemukan
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Kandidat
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="relative col-span-2 md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nama, email, telepon..."
                value={filter.search}
                onChange={(e) => { setFilter((f) => ({ ...f, search: e.target.value })); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select
              value={filter.status}
              onValueChange={(v) => { setFilter((f) => ({ ...f, status: v === "all" ? "" : (v as string) })); setPage(1); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Status" />
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
              <SelectTrigger>
                <SelectValue placeholder="Semua Outlet" />
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
              className="text-sm"
            />
            <Input
              type="date"
              value={filter.date_to}
              onChange={(e) => { setFilter((f) => ({ ...f, date_to: e.target.value })); setPage(1); }}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/candidates/${c.id}`)}
                      >
                        <User className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Kandidat Manual</DialogTitle>
            <DialogDescription>
              Input kandidat dari walk-in, referral, dll.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={addForm.handleSubmit(handleAddCandidate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nama lengkap"
                  {...addForm.register("full_name")}
                  className={addForm.formState.errors.full_name ? "border-red-500" : ""}
                />
                {addForm.formState.errors.full_name && (
                  <p className="text-xs text-red-500">{addForm.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="email@contoh.com"
                  {...addForm.register("email")}
                  className={addForm.formState.errors.email ? "border-red-500" : ""}
                />
                {addForm.formState.errors.email && (
                  <p className="text-xs text-red-500">{addForm.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  No. WhatsApp <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="081234567890"
                  {...addForm.register("phone")}
                  className={addForm.formState.errors.phone ? "border-red-500" : ""}
                />
                {addForm.formState.errors.phone && (
                  <p className="text-xs text-red-500">{addForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Domisili <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Kota"
                  {...addForm.register("domicile")}
                  className={addForm.formState.errors.domicile ? "border-red-500" : ""}
                />
                {addForm.formState.errors.domicile && (
                  <p className="text-xs text-red-500">{addForm.formState.errors.domicile.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Outlet / Brand</Label>
                <Select
                  value={addForm.watch("brand_id") || ""}
                  onValueChange={(v) => addForm.setValue("brand_id", v || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sumber</Label>
                <Select
                  value={addForm.watch("source") || "portal"}
                  onValueChange={(v) => addForm.setValue("source", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status Awal</Label>
              <Select
                value={addForm.watch("status") || "new"}
                onValueChange={(v) => addForm.setValue("status", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Baru (New)</SelectItem>
                  <SelectItem value="screening">Screening</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <textarea
                placeholder="Catatan internal (opsional)"
                rows={3}
                {...addForm.register("notes")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={addForm.formState.isSubmitting}>
                {addForm.formState.isSubmitting ? (
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
    </div>
  );
}
