"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreVertical, FileText, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { ImportExcelDialog, type ParsedTemplateData } from "@/components/import-excel-dialog";
import { Upload } from "lucide-react";
import { useKpiTemplates } from "../queries";
import { useCreateKpiTemplate, useDeleteKpiTemplate } from "../mutations";

export function KpiTemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const templatesQuery = useKpiTemplates();
  const templates = templatesQuery.data ?? [];
  const loading = templatesQuery.isLoading;

  const createMutation = useCreateKpiTemplate();
  const deleteMutation = useDeleteKpiTemplate();

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus template ini?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Template berhasil dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus");
    }
  };

  const handleImportSuccess = async (importData: ParsedTemplateData) => {
    try {
      await createMutation.mutateAsync({
        template_name: importData.template_name,
        position_id: null,
        department_id: null,
        applicable_period: importData.applicable_period,
        effective_date: new Date().toISOString().split("T")[0],
        expiry_date: null,
        status: "draft",
        behavioral_weight: importData.behavioral_weight,
        project_weight: importData.project_weight,
        total_weight: importData.total_weight,
        items: importData.kpi_items,
        behavioral_items: importData.behavioral_items,
      });
      toast.success("Template berhasil diimport!");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      archived: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      active: "Active",
      archived: "Archived",
    };
    return <Badge className={styles[status] || "bg-gray-100"}>{labels[status] || status}</Badge>;
  };

  const filteredTemplates = templates.filter((t) =>
    t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.department?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.position?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const breadcrumbItems = [
    { label: "KPI & Performance", href: "/dashboard/hris/performance" },
    { label: "KPI Templates", href: "/dashboard/hris/kpi-templates" },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BreadcrumbNav items={breadcrumbItems} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KPI Templates</h1>
          <p className="text-sm text-muted-foreground">Template KPI per Department & Position</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </Button>
          <Link href="/dashboard/hris/kpi-templates/insert">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Buat Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Template</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">KPI Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Belum ada template. Klik &quot;Buat Template&quot; untuk membuat.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.template_name}</TableCell>
                      <TableCell>{template.department?.name || "-"}</TableCell>
                      <TableCell>{template.position?.title || "-"}</TableCell>
                      <TableCell>{template.applicable_period || "-"}</TableCell>
                      <TableCell>{getStatusBadge(template.status)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{template.kpi_template_items?.count || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md p-0 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                            <MoreVertical className="w-4 h-4" />
                            <span className="sr-only">Open menu</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Link href={`/dashboard/hris/kpi-templates/${template.id}`} className="flex w-full items-center">
                                <FileText className="w-4 h-4 mr-2" />
                                View Detail
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link href={`/dashboard/hris/kpi-templates/edit/${template.id}`} className="flex w-full items-center">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Template
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(template.id)}>
                              <Trash2 className="w-4 h-4 mr-2 text-red-600" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ImportExcelDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
