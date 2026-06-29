"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardList, Eye, FileText, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLogbookMe, useLogbookDepartments, useLogbookEntries } from "../queries";
import { useUpdateLogbookItem, useSubmitLogbookEntry } from "../mutations";
import type { LogbookEntryItem as EntryItem } from "../types";

const today = new Date().toISOString().slice(0, 10);

export function LogbookListPage() {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [message, setMessage] = useState("");
  const [noteItem, setNoteItem] = useState<EntryItem | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const quillHostRef = useRef<HTMLDivElement | null>(null);
  const quillInstanceRef = useRef<any>(null);

  const { data: me } = useLogbookMe();
  const { data: departments = [] } = useLogbookDepartments();

  const isSuperAdmin = me?.role === "super_admin";
  const userDepartmentId = me?.employee?.department_id || "";
  const effectiveDepartment = isSuperAdmin ? selectedDepartment : userDepartmentId || selectedDepartment;

  const entriesQuery = useLogbookEntries({
    department_id: effectiveDepartment || undefined,
    date: selectedDate || undefined,
  });
  const entries = entriesQuery.data ?? [];

  const updateItemMutation = useUpdateLogbookItem();
  const submitEntryMutation = useSubmitLogbookEntry();
  const loading = entriesQuery.isFetching || updateItemMutation.isPending || submitEntryMutation.isPending;

  function reload() {
    setMessage("");
    entriesQuery.refetch();
  }

  const filteredEntries = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((entry) => !q || entry.title.toLowerCase().includes(q) || entry.department?.name?.toLowerCase().includes(q));
  }, [entries, search]);

  const selectedEntry = filteredEntries.find((entry) => entry.id === selectedEntryId) || null;

  async function toggleItem(item: EntryItem, checked: boolean) {
    try {
      await updateItemMutation.mutateAsync({ item_id: item.id, is_checked: checked });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal update checklist");
    }
  }

  function openNote(item: EntryItem) {
    setNoteItem(item);
    setNoteDraft(item.notes || "");
  }

  useEffect(() => {
    if (!noteItem || !quillHostRef.current) return;

    let isMounted = true;
    quillHostRef.current.innerHTML = "";

    import("quill").then(({ default: Quill }) => {
      if (!isMounted || !quillHostRef.current) return;

      const editorNode = document.createElement("div");
      editorNode.className = "h-full";
      quillHostRef.current.appendChild(editorNode);

      const quill = new Quill(editorNode, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ color: [] }, { background: [] }],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ align: [] }],
            ["blockquote", "code-block"],
            ["link"],
            ["clean"],
          ],
        },
        placeholder: "Tulis catatan logbook di sini...",
      });

      quill.clipboard.dangerouslyPasteHTML(noteItem.notes || "");
      quill.on("text-change", () => setNoteDraft(quill.root.innerHTML));
      quillInstanceRef.current = quill;
    });

    return () => {
      isMounted = false;
      quillInstanceRef.current = null;
      if (quillHostRef.current) quillHostRef.current.innerHTML = "";
    };
  }, [noteItem]);

  async function saveNote() {
    if (!noteItem) return;
    try {
      await updateItemMutation.mutateAsync({ item_id: noteItem.id, notes: noteDraft });
      setMessage("Note checklist berhasil disimpan.");
      setNoteItem(null);
      setNoteDraft("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan note");
    }
  }

  async function submitEntry(entryId: string) {
    try {
      await submitEntryMutation.mutateAsync(entryId);
      setMessage("Logbook berhasil disubmit.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal submit logbook");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Logbook List</h1>
          <p className="text-sm text-gray-500">Daftar logbook yang sudah dibuat. Buka detail untuk melakukan update checklist.</p>
        </div>
        <Button variant="outline" onClick={reload} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px_1fr_120px]">
          <select className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:bg-gray-100" value={effectiveDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} disabled={!isSuperAdmin && !!userDepartmentId}>
            <option value="">Semua department</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari logbook" />
          </div>
          <Button onClick={reload} disabled={loading}>Apply</Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Data Table Logbook</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-gray-500">Belum ada logbook pada filter ini.</TableCell></TableRow>
                )}
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className={selectedEntryId === entry.id ? "bg-green-50" : ""}>
                    <TableCell>{entry.entry_date}</TableCell>
                    <TableCell className="font-medium">{entry.title.replace(/\s-\s\d{4}-\d{2}-\d{2}$/, "")}</TableCell>
                    <TableCell><Badge>{entry.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedEntryId(entry.id)}><Eye className="mr-1 h-3 w-3" />Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />Detail Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedEntry && <p className="text-sm text-gray-500">Klik tombol Open pada data table untuk membuka checklist.</p>}
            {selectedEntry && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedEntry.title}</h2>
                  <p className="text-xs text-gray-500">{selectedEntry.department?.name} · {selectedEntry.entry_date} · {selectedEntry.template?.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2"><Badge>{selectedEntry.status}</Badge><Badge>{selectedEntry.completion_percentage || 0}% selesai</Badge><Badge>{selectedEntry.kpi_score || 0}% KPI</Badge></div>
                </div>

                <div className="space-y-2">
                  {(selectedEntry.items || []).sort((a, b) => a.sort_order - b.sort_order).map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${item.is_checked ? "border-green-300 bg-green-50 hover:bg-green-100" : "border-gray-200 hover:bg-gray-50"}`}
                    >
                      <Checkbox checked={item.is_checked} onCheckedChange={(checked) => toggleItem(item, checked === true)} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={item.is_checked ? "font-medium line-through text-gray-400" : "font-medium"}>{item.title}</p>
                          <span className="text-xs text-gray-500">Bobot {item.weight}</span>
                        </div>
                        {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                        {item.notes && (
                          <div
                            className="mt-2 line-clamp-2 rounded-md bg-white/70 px-2 py-1 text-xs text-gray-600"
                            dangerouslySetInnerHTML={{ __html: item.notes }}
                          />
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openNote(item)}>
                        <FileText className="mr-1 h-3 w-3" /> Note
                      </Button>
                    </div>
                  ))}
                </div>

                <Button className="w-full" onClick={() => submitEntry(selectedEntry.id)} disabled={selectedEntry.status !== "draft" || loading}>Submit Logbook</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {noteItem && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Note Checklist</h2>
              <p className="text-sm text-gray-500">{noteItem.title}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setNoteItem(null)}><X className="h-5 w-5" /></Button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-6">
            <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="border-b bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Quill Rich Text Editor</div>
              <div ref={quillHostRef} className="quill-fullscreen-editor min-h-0 flex-1 overflow-hidden" />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setNoteItem(null)}>Cancel</Button>
            <Button onClick={saveNote} disabled={loading}>Simpan Note</Button>
          </div>
        </div>
      )}
    </div>
  );
}
