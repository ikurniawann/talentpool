"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Plus, Trash2, Upload } from "lucide-react";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { ImportExcelDialog } from "@/components/import-excel-dialog";
import { useCreateKpiTemplate } from "../mutations";

interface KpiTemplateItem {
  id?: string;
  perspective: string;
  category: string;
  kpi_name: string;
  kpi_definition: string;
  formula: string;
  control_method: string;
  target_text: string;
  target_value: number;
  measurement_unit: string;
  weight: number;
  frequency: string;
  score_5_description: string;
  score_4_description: string;
  score_3_description: string;
  score_2_description: string;
  score_1_description: string;
}

interface BehavioralItem {
  value: string;
  competency: string;
  behavioral_standard: string;
  weight: number;
  score_5_description: string;
  score_4_description: string;
  score_3_description: string;
  score_2_description: string;
  score_1_description: string;
}

interface ImportedTemplateData {
  template_name: string;
  applicable_period: string;
  behavioral_weight: number;
  project_weight: number;
  kpi_items: KpiTemplateItem[];
  behavioral_items?: BehavioralItem[];
}

export function NewKpiTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const createMutation = useCreateKpiTemplate();
  const loading = createMutation.isPending;

  const [formData, setFormData] = useState({
    template_name: "",
    department_id: "",
    position_id: "",
    applicable_period: "",
    effective_date: "",
    expiry_date: "",
    status: "draft",
    behavioral_weight: 20,
    project_weight: 10,
  });

  const [items, setItems] = useState<KpiTemplateItem[]>([
    {
      perspective: "Business Process",
      category: "Main KPI",
      kpi_name: "",
      kpi_definition: "",
      formula: "",
      control_method: "",
      target_text: "",
      target_value: 100,
      measurement_unit: "%",
      weight: 0,
      frequency: "Monthly",
      score_5_description: "Outstanding - Jauh melampaui target",
      score_4_description: "Exceed - Melampaui target",
      score_3_description: "Meet - Memenuhi target",
      score_2_description: "Need Improvement - Di bawah target",
      score_1_description: "Unacceptable - Jauh di bawah target",
    },
  ]);
  const [behavioralItems, setBehavioralItems] = useState<BehavioralItem[]>([]);

  const updateItem = (index: number, field: keyof KpiTemplateItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        perspective: "Business Process",
        category: "Main KPI",
        kpi_name: "",
        kpi_definition: "",
        formula: "",
        control_method: "",
        target_text: "",
        target_value: 100,
        measurement_unit: "%",
        weight: 0,
        frequency: "Monthly",
        score_5_description: "",
        score_4_description: "",
        score_3_description: "",
        score_2_description: "",
        score_1_description: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImportSuccess = async (importData: ImportedTemplateData) => {
    setFormData({
      ...formData,
      template_name: importData.template_name,
      applicable_period: importData.applicable_period,
      behavioral_weight: importData.behavioral_weight,
      project_weight: importData.project_weight,
    });

    const mappedItems = importData.kpi_items.map((item) => ({
      perspective: item.perspective,
      category: item.category,
      kpi_name: item.kpi_name,
      kpi_definition: item.kpi_definition,
      formula: item.formula,
      control_method: item.control_method,
      target_text: item.target_text,
      target_value: item.target_value,
      measurement_unit: item.measurement_unit,
      weight: item.weight,
      frequency: item.frequency,
      score_5_description: "",
      score_4_description: "",
      score_3_description: "",
      score_2_description: "",
      score_1_description: "",
    }));

    setItems(mappedItems);
    setBehavioralItems(importData.behavioral_items || []);
    toast({
      title: "Success",
      description: "Data dari Excel berhasil diimport",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const overallWeight = totalWeight + formData.behavioral_weight + formData.project_weight;

    if (overallWeight !== 100) {
      toast({
        title: "Error",
        description: `Total bobot keseluruhan harus 100%, saat ini ${overallWeight}%`,
        variant: "destructive",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...formData,
        total_weight: totalWeight,
        items,
        behavioral_items: behavioralItems,
      });

      toast({
        title: "Success",
        description: "Template KPI berhasil dibuat",
      });

      router.push("/dashboard/hris/kpi-templates");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const breadcrumbItems = [
    { label: "KPI & Performance", href: "/dashboard/hris/kpi-templates" },
    { label: "Buat Template Baru", href: "/dashboard/hris/kpi-templates/insert" },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BreadcrumbNav items={breadcrumbItems} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Buat KPI Template Baru</h1>
            <p className="text-sm text-muted-foreground">Template KPI per Department & Position</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Import dari Excel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Header */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Template</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Template *</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="Contoh: KPI Staff Procurement"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Periode Berlaku</Label>
              <Input
                value={formData.applicable_period}
                onChange={(e) => setFormData({ ...formData, applicable_period: e.target.value })}
                placeholder="Contoh: 2026"
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal Efektif</Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal Expired</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bobot Behavior (%)</Label>
              <Input
                type="number"
                value={formData.behavioral_weight}
                onChange={(e) => setFormData({ ...formData, behavioral_weight: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">KPI Items</h2>
            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah KPI
            </Button>
          </div>

          {items.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>KPI #{index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Perspective</Label>
                    <Select
                      value={item.perspective}
                      onValueChange={(v) => updateItem(index, "perspective", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Business Process">Business Process</SelectItem>
                        <SelectItem value="Financial">Financial</SelectItem>
                        <SelectItem value="Customer">Customer</SelectItem>
                        <SelectItem value="Learning & Growth">Learning & Growth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={item.category}
                      onValueChange={(v) => updateItem(index, "category", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Main KPI">Main KPI</SelectItem>
                        <SelectItem value="Supporting KPI">Supporting KPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nama KPI *</Label>
                  <Input
                    value={item.kpi_name}
                    onChange={(e) => updateItem(index, "kpi_name", e.target.value)}
                    placeholder="Nama indikator kinerja"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Definisi KPI</Label>
                    <Textarea
                      value={item.kpi_definition}
                      onChange={(e) => updateItem(index, "kpi_definition", e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Formula</Label>
                    <Textarea
                      value={item.formula}
                      onChange={(e) => updateItem(index, "formula", e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Output</Label>
                    <Textarea
                      value={item.target_text}
                      onChange={(e) => updateItem(index, "target_text", e.target.value)}
                      placeholder="Deskripsi target output sesuai template"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Weight (%) *</Label>
                    <Input
                      type="number"
                      value={item.weight}
                      onChange={(e) => updateItem(index, "weight", Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={item.frequency} onValueChange={(v) => updateItem(index, "frequency", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">KPI Items:</span>
                <span className="font-bold">{items.reduce((sum, item) => sum + item.weight, 0)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Behavioral:</span>
                <span>{formData.behavioral_weight}%</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Project:</span>
                <span>{formData.project_weight}%</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-semibold">Total Weight:</span>
                <span className={`text-lg font-bold ${(items.reduce((s, k) => s + k.weight, 0) + formData.behavioral_weight + formData.project_weight) !== 100 ? "text-red-500" : "text-green-600"}`}>
                  {items.reduce((sum, item) => sum + item.weight, 0) + formData.behavioral_weight + formData.project_weight}%
                  {(items.reduce((s, k) => s + k.weight, 0) + formData.behavioral_weight + formData.project_weight) !== 100 && " (Harus = 100%)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </form>

      <ImportExcelDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
