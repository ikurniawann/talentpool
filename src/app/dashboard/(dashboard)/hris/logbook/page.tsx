"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Plus, RefreshCw, Star, Trash2, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Department = { id: string; name: string; code: string };
type CurrentUser = { id: string; full_name: string; role: string; employee?: { department_id: string | null; department?: Department | null } | null };
type TemplateItem = { id?: string; title: string; description?: string | null; weight: number; is_required: boolean; sort_order?: number };
type Template = { id: string; department_id: string; name: string; description?: string | null; frequency: string; is_active: boolean; department?: Department; items?: TemplateItem[] };
type EntryItem = { id: string; title: string; description?: string | null; weight: number; is_required: boolean; is_checked: boolean; notes?: string | null; sort_order: number };
type Entry = { id: string; title: string; entry_date: string; status: string; completion_percentage: number; kpi_score: number; notes?: string | null; department_id: string; department?: Department; template?: Template; items?: EntryItem[] };
type SummaryRow = { department?: Department; total_entries: number; submitted_entries: number; reviewed_entries: number; avg_completion: number; avg_kpi_score: number };

const today = new Date().toISOString().slice(0, 10);
const defaultItem = (): TemplateItem => ({ title: "", description: "", weight: 10, is_required: true });

export default function HRISLogbookPage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [entryDate, setEntryDate] = useState(today);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [templateForm, setTemplateForm] = useState({ name: "", description: "", frequency: "daily", items: [defaultItem()] });

  const isSuperAdmin = me?.role === "super_admin";
  const userDepartmentId = me?.employee?.department_id || "";
  const effectiveDepartment = isSuperAdmin ? selectedDepartment : userDepartmentId || selectedDepartment;

  const filteredTemplates = useMemo(
    () => templates.filter((template) => !effectiveDepartment || template.department_id === effectiveDepartment),
    [templates, effectiveDepartment]
  );

  const filteredEntries = useMemo(
    () => entries.filter((entry) => (!effectiveDepartment || entry.department_id === effectiveDepartment) && (!entryDate || entry.entry_date === entryDate)),
    [entries, effectiveDepartment, entryDate]
  );

  const selectedEntry = filteredEntries.find((entry) => entry.id === selectedEntryId) || filteredEntries[0] || null;

  async function fetchJson(url: string, options?: RequestInit) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      const [meRes, departmentRes, templateRes, entryRes, summaryRes] = await Promise.all([
        fetchJson("/api/hris/logbook?resource=me"),
        fetchJson("/api/hris/logbook?resource=departments"),
        fetchJson("/api/hris/logbook?resource=templates"),
        fetchJson("/api/hris/logbook?resource=entries"),
        fetchJson("/api/hris/logbook?resource=summary"),
      ]);
      setMe(meRes.data || null);
      setDepartments(departmentRes.data || []);
      setTemplates(templateRes.data || []);
      setEntries(entryRes.data || []);
      setSummary(summaryRes.data || []);
      if (!selectedDepartment && meRes.data?.role !== "super_admin" && meRes.data?.employee?.department_id) {
        setSelectedDepartment(meRes.data.employee.department_id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function updateTemplateItem(index: number, patch: Partial<TemplateItem>) {
    setTemplateForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)) }));
  }

  async function createTemplate() {
    if (!effectiveDepartment || !templateForm.name.trim()) return setMessage("Pilih department dan isi nama template terlebih dulu.");
    const items = templateForm.items.filter((item) => item.title.trim());
    if (!items.length) return setMessage("Minimal satu checklist item harus diisi.");
    setLoading(true);
    try {
      await fetchJson("/api/hris/logbook", { method: "POST", body: JSON.stringify({ action: "create-template", department_id: effectiveDepartment, ...templateForm, items }) });
      setTemplateForm({ name: "", description: "", frequency: "daily", items: [defaultItem()] });
      setMessage("Template logbook berhasil dibuat.");
      await loadData();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal membuat template"); }
    finally { setLoading(false); }
  }

  async function createEntry() {
    if (!selectedTemplate || !entryDate) return setMessage("Pilih template dan tanggal logbook terlebih dulu.");
    setLoading(true);
    try {
      const res = await fetchJson("/api/hris/logbook", { method: "POST", body: JSON.stringify({ action: "create-entry", template_id: selectedTemplate, entry_date: entryDate }) });
      setSelectedEntryId(res.data?.id || "");
      setMessage("Logbook berhasil dibuat dari template.");
      await loadData();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal membuat logbook"); }
    finally { setLoading(false); }
  }

  async function toggleItem(item: EntryItem, checked: boolean) {
    try {
      await fetchJson("/api/hris/logbook", { method: "PATCH", body: JSON.stringify({ action: "update-item", item_id: item.id, is_checked: checked }) });
      await loadData();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal update checklist"); }
  }

  async function updateEntryStatus(entryId: string, action: "submit-entry" | "review-entry", status?: "reviewed" | "rejected") {
    setLoading(true);
    try {
      await fetchJson("/api/hris/logbook", { method: "PATCH", body: JSON.stringify({ action, entry_id: entryId, status }) });
      setMessage(action === "submit-entry" ? "Logbook berhasil disubmit." : "Review logbook berhasil disimpan.");
      await loadData();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal update status"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Department Logbook KPI</h1>
          <p className="text-sm text-gray-500">Halaman pengisian kepala department, detail checklist, dan monitoring super admin.</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 pt-2"><ClipboardList className="h-8 w-8 text-green-600" /><div><p className="text-xs text-gray-500">Template</p><p className="text-xl font-semibold">{templates.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-2"><CalendarDays className="h-8 w-8 text-blue-600" /><div><p className="text-xs text-gray-500">Logbook Hari Ini</p><p className="text-xl font-semibold">{filteredEntries.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-2"><CheckCircle2 className="h-8 w-8 text-emerald-600" /><div><p className="text-xs text-gray-500">Submitted/Reviewed</p><p className="text-xl font-semibold">{filteredEntries.filter((entry) => entry.status === "submitted" || entry.status === "reviewed").length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-2"><Star className="h-8 w-8 text-yellow-500" /><div><p className="text-xs text-gray-500">Avg KPI Filter</p><p className="text-xl font-semibold">{filteredEntries.length ? Math.round(filteredEntries.reduce((sum, entry) => sum + Number(entry.kpi_score || 0), 0) / filteredEntries.length) : 0}%</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserRoundCheck className="h-5 w-5" /> Filter Logbook</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Department</label>
            <select className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:bg-gray-100" value={effectiveDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} disabled={!isSuperAdmin && !!userDepartmentId}>
              <option value="">Semua department</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Calendar / Tanggal Logbook</label>
            <Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
          </div>
          <div className="flex items-end"><Button variant="outline" className="w-full" onClick={() => setEntryDate(today)}>Hari Ini</Button></div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>List Logbook</CardTitle><p className="text-sm text-muted-foreground">Kepala department memilih logbook untuk cek detail dan update checklist.</p></CardHeader>
            <CardContent className="space-y-2">
              {filteredEntries.length === 0 && <p className="text-sm text-gray-500">Tidak ada logbook pada tanggal/filter ini.</p>}
              {filteredEntries.map((entry) => (
                <button key={entry.id} onClick={() => setSelectedEntryId(entry.id)} className={`w-full rounded-lg border p-3 text-left transition hover:bg-gray-50 ${selectedEntry?.id === entry.id ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-2"><p className="font-medium text-gray-900">{entry.title}</p><Badge>{entry.status}</Badge></div>
                  <p className="mt-1 text-xs text-gray-500">{entry.department?.name} · {entry.entry_date}</p>
                  <div className="mt-3 h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-green-500" style={{ width: `${entry.completion_percentage || 0}%` }} /></div>
                  <p className="mt-1 text-xs text-gray-500">Done {entry.completion_percentage || 0}% · KPI {entry.kpi_score || 0}%</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Generate Logbook</CardTitle><p className="text-sm text-muted-foreground">Buat logbook aktual dari template department.</p></CardHeader>
            <CardContent className="space-y-3">
              <select className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm" value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}>
                <option value="">Pilih template</option>
                {filteredTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} — {template.department?.name}</option>)}
              </select>
              <Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
              <Button className="w-full" onClick={createEntry} disabled={loading}>Buat Logbook</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Detail & Update Checklist</CardTitle><p className="text-sm text-muted-foreground">Checklist ini yang diisi kepala department dan menjadi dasar KPI.</p></CardHeader>
            <CardContent>
              {!selectedEntry && <p className="text-sm text-gray-500">Pilih logbook dari list.</p>}
              {selectedEntry && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div><h3 className="text-lg font-semibold text-gray-900">{selectedEntry.title}</h3><p className="text-xs text-gray-500">{selectedEntry.department?.name} · {selectedEntry.entry_date} · {selectedEntry.template?.frequency}</p></div>
                    <div className="flex flex-wrap gap-2"><Badge>{selectedEntry.status}</Badge><Badge>{Number(selectedEntry.kpi_score || 0)}% KPI</Badge><Badge>{Number(selectedEntry.completion_percentage || 0)}% done</Badge></div>
                  </div>

                  <div className="space-y-2">
                    {(selectedEntry.items || []).sort((a, b) => a.sort_order - b.sort_order).map((item) => (
                      <label key={item.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-gray-50">
                        <Checkbox checked={item.is_checked} onCheckedChange={(checked) => toggleItem(item, checked === true)} />
                        <div className="flex-1"><div className="flex items-center justify-between gap-2"><p className={item.is_checked ? "font-medium line-through text-gray-400" : "font-medium"}>{item.title}</p><span className="text-xs text-gray-500">Bobot {item.weight}</span></div>{item.description && <p className="text-xs text-gray-500">{item.description}</p>}</div>
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button size="sm" onClick={() => updateEntryStatus(selectedEntry.id, "submit-entry")} disabled={selectedEntry.status !== "draft"}>Submit Logbook</Button>
                    {isSuperAdmin && <Button size="sm" variant="outline" onClick={() => updateEntryStatus(selectedEntry.id, "review-entry", "reviewed")} disabled={selectedEntry.status === "draft"}>Mark Reviewed</Button>}
                    {isSuperAdmin && <Button size="sm" variant="destructive" onClick={() => updateEntryStatus(selectedEntry.id, "review-entry", "rejected")} disabled={selectedEntry.status === "draft"}>Reject</Button>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {isSuperAdmin && <Card>
            <CardHeader><CardTitle>KPI Summary Super Admin</CardTitle><p className="text-sm text-muted-foreground">Monitoring semua department.</p></CardHeader>
            <CardContent><div className="grid gap-3 md:grid-cols-2">{summary.map((row) => <div key={row.department?.id} className="rounded-lg border p-3"><div className="flex items-center justify-between"><p className="font-medium">{row.department?.name}</p><Badge>{row.avg_kpi_score}% KPI</Badge></div><p className="mt-1 text-xs text-gray-500">{row.total_entries} logbook · {row.submitted_entries} submitted · {row.reviewed_entries} reviewed</p><div className="mt-3 h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-green-500" style={{ width: `${row.avg_completion}%` }} /></div></div>)}</div></CardContent>
          </Card>}

          <Card>
            <CardHeader><CardTitle>Buat Template Checklist</CardTitle><p className="text-sm text-muted-foreground">Template dipakai untuk generate logbook rutin.</p></CardHeader>
            <CardContent className="space-y-3">
              <Input value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} placeholder="Daily Department Checklist" />
              <Textarea value={templateForm.description} onChange={(event) => setTemplateForm({ ...templateForm, description: event.target.value })} placeholder="Deskripsi template" />
              <select className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm" value={templateForm.frequency} onChange={(event) => setTemplateForm({ ...templateForm, frequency: event.target.value })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select>
              <div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium">Checklist Items</p><Button size="sm" variant="outline" onClick={() => setTemplateForm((current) => ({ ...current, items: [...current.items, defaultItem()] }))}><Plus className="mr-1 h-3 w-3" />Item</Button></div>{templateForm.items.map((item, index) => <div key={index} className="rounded-lg border p-3 space-y-2"><div className="flex gap-2"><Input value={item.title} onChange={(event) => updateTemplateItem(index, { title: event.target.value })} placeholder={`Item ${index + 1}`} /><Button variant="ghost" size="icon" onClick={() => setTemplateForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 className="h-4 w-4" /></Button></div><Input type="number" min="0" value={item.weight} onChange={(event) => updateTemplateItem(index, { weight: Number(event.target.value) })} placeholder="Bobot KPI" /></div>)}</div>
              <Button className="w-full" onClick={createTemplate} disabled={loading}>Simpan Template</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
