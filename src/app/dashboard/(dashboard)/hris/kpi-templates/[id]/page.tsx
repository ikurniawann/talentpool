"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2, FileText, Printer, Copy } from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";

interface KpiTemplateItem {
  id: string;
  perspective: string;
  category: string;
  kpi_name: string;
  kpi_definition: string;
  formula: string;
  target_text?: string;
  target_value: number;
  measurement_unit: string;
  weight: number;
  frequency: string;
  item_order: number;
}

interface KpiTemplate {
  id: string;
  template_name: string;
  department?: { name: string };
  position?: { title: string };
  applicable_period: string;
  effective_date: string;
  expiry_date: string;
  status: string;
  total_weight?: number;
  behavioral_weight?: number;
  project_weight?: number;
  created_at: string;
  template_items: KpiTemplateItem[];
}

export default function KpiTemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  
  const [template, setTemplate] = useState<KpiTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const res = await fetch(`/api/hris/kpi-templates/${templateId}`);
      const json = await res.json();
      if (res.ok) {
        setTemplate(json.data);
      } else {
        toast.error(json.error || "Gagal memuat data");
        router.push("/dashboard/hris/kpi-templates");
      }
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Yakin ingin menghapus template ini?")) return;
    
    try {
      const res = await fetch(`/api/hris/kpi-templates/${templateId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Template berhasil dihapus");
        router.push("/dashboard/hris/kpi-templates");
      } else {
        const json = await res.json();
        toast.error(json.error || "Gagal menghapus");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const handlePrint = () => {
    window.print();
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

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!template) {
    return <div className="p-6 text-center text-red-500">Template tidak ditemukan</div>;
  }

  const breadcrumbItems = [
    { label: "KPI & Performance", href: "/dashboard/hris/kpi-templates" },
    { label: template.template_name, href: `/dashboard/hris/kpi-templates/${template.id}` },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <BreadcrumbNav items={breadcrumbItems} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{template.template_name}</h1>
            <p className="text-sm text-muted-foreground">
              {template.department?.name} - {template.position?.title || "All Positions"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Link href={`/dashboard/hris/kpi-templates/${template.id}/edit`}>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Edit Template
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informasi Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(template.status)}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Periode</p>
              <p className="font-medium mt-1">{template.applicable_period || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Efektif</p>
              <p className="font-medium mt-1">
                {template.effective_date ? new Date(template.effective_date).toLocaleDateString("id-ID") : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expired</p>
              <p className="font-medium mt-1">
                {template.expiry_date ? new Date(template.expiry_date).toLocaleDateString("id-ID") : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total KPI Items</p>
              <p className="font-medium mt-1">{template.template_items?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Weight</p>
              <p className="font-medium mt-1">{template.total_weight || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Behavior Weight</p>
              <p className="font-medium mt-1">{template.behavioral_weight || 20}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Project Weight</p>
              <p className="font-medium mt-1">{template.project_weight || 10}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Items ({template.template_items?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {template.template_items && template.template_items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nama KPI</TableHead>
                  <TableHead>Perspective</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Frequency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {template.template_items
                  .sort((a, b) => (a.item_order || 0) - (b.item_order || 0))
                  .map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.kpi_name}</div>
                        {item.kpi_definition && (
                          <div className="text-xs text-muted-foreground mt-1">{item.kpi_definition}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.perspective}</Badge>
                        {item.category && (
                          <div className="text-xs text-muted-foreground mt-1">{item.category}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.target_text || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge>{item.weight}%</Badge>
                      </TableCell>
                      <TableCell>{item.frequency}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Belum ada KPI items dalam template ini
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
