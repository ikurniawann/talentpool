"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { useKpiTemplate } from "../queries";
import { useUpdateKpiTemplate } from "../mutations";

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
  item_order?: number;
}

interface BehavioralItem {
  id?: string;
  value?: string;
  value_name?: string;
  competency: string;
  behavioral_standard: string;
  weight: number;
  score_5_description: string;
  score_4_description: string;
  score_3_description: string;
  score_2_description: string;
  score_1_description: string;
}

interface KpiTemplate {
  id: string;
  template_name: string;
  department_id?: string;
  position_id?: string;
  applicable_period: string;
  effective_date: string;
  expiry_date: string;
  status: string;
  behavioral_weight: number;
  project_weight: number;
  template_items: KpiTemplateItem[];
  behavioral_items?: BehavioralItem[];
}

export function EditKpiTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const { toast } = useToast();
  const templateQuery = useKpiTemplate(templateId);
  const updateMutation = useUpdateKpiTemplate();
  const loading = updateMutation.isPending;
  const fetching = templateQuery.isLoading;

  // Template header
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

  // KPI Items
  const [items, setItems] = useState<KpiTemplateItem[]>([]);
  
  // Behavioral Items
  const [behavioralItems, setBehavioralItems] = useState<BehavioralItem[]>([]);

  useEffect(() => {
    const data = templateQuery.data as KpiTemplate | undefined;
    if (!data) return;
    setFormData({
      template_name: data.template_name,
      department_id: data.department_id || "",
      position_id: data.position_id || "",
      applicable_period: data.applicable_period || "",
      effective_date: data.effective_date || "",
      expiry_date: data.expiry_date || "",
      status: data.status,
      behavioral_weight: data.behavioral_weight || 20,
      project_weight: data.project_weight || 10,
    });
    setItems(data.template_items || []);

    if (data.behavioral_items && Array.isArray(data.behavioral_items)) {
      setBehavioralItems(data.behavioral_items.map((item) => ({
        id: item.id,
        value_name: item.value_name || item.value || "",
        competency: item.competency || "",
        behavioral_standard: item.behavioral_standard || "",
        weight: Number(item.weight || 0),
        score_5_description: item.score_5_description || "",
        score_4_description: item.score_4_description || "",
        score_3_description: item.score_3_description || "",
        score_2_description: item.score_2_description || "",
        score_1_description: item.score_1_description || "",
      })));
    } else {
      setBehavioralItems([
        { value_name: "Caring", competency: "", behavioral_standard: "", weight: 3, score_5_description: "", score_4_description: "", score_3_description: "", score_2_description: "", score_1_description: "" },
        { value_name: "Credible", competency: "", behavioral_standard: "", weight: 3, score_5_description: "", score_4_description: "", score_3_description: "", score_2_description: "", score_1_description: "" },
        { value_name: "Competent", competency: "Achievement Orientation", behavioral_standard: "", weight: 2, score_5_description: "", score_4_description: "", score_3_description: "", score_2_description: "", score_1_description: "" },
        { value_name: "Competent", competency: "Concern for Order & Quality", behavioral_standard: "", weight: 2, score_5_description: "", score_4_description: "", score_3_description: "", score_2_description: "", score_1_description: "" },
        { value_name: "Competitive", competency: "Initiative", behavioral_standard: "", weight: 6, score_5_description: "", score_4_description: "", score_3_description: "", score_2_description: "", score_1_description: "" },
        { value_name: "Customer Delight", competency: "Customer Service Orientation", behavioral_standard: "", weight: 4, score_5_description: "", score_4_description: "", score_3_description: "", score_2_description: "", score_1_description: "" },
      ]);
    }
  }, [templateQuery.data]);

  useEffect(() => {
    if (templateQuery.isError) {
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive",
      });
      router.push("/dashboard/hris/kpi-templates");
    }
  }, [templateQuery.isError, router, toast]);

  const updateItem = (index: number, field: keyof KpiTemplateItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateBehavioralItem = (
    index: number,
    field: keyof BehavioralItem,
    value: string | number
  ) => {
    setBehavioralItems((prev) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

    // KPI items should total 70% (Work Result portion)
    // Behavioral (20%) + Project (10%) = 30% comes from other sections
    if (totalWeight !== 70) {
      toast({
        title: "Error",
        description: `Total bobot KPI harus 70%, saat ini ${totalWeight}%`,
        variant: "destructive",
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: templateId,
        payload: {
          ...formData,
          department_id: formData.department_id || null,
          position_id: formData.position_id || null,
          expiry_date: formData.expiry_date || null,
          total_weight: 70,
          items,
          behavioral_items: behavioralItems,
        },
      });

      toast({
        title: "Success",
        description: "Template KPI berhasil diupdate",
      });

      router.push(`/dashboard/hris/kpi-templates/${templateId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  if (fetching) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  const breadcrumbItems = [
    { label: "KPI & Performance", href: "/dashboard/hris/kpi-templates" },
    { label: "Edit Template", href: `/dashboard/hris/kpi-templates/edit/${templateId}` },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BreadcrumbNav items={breadcrumbItems} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit KPI Template</h1>
          <p className="text-sm text-muted-foreground">{formData.template_name}</p>
        </div>
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
                      value={item.target_text || ""}
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

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">KPI Items (Work Result):</span>
              <span className={`text-lg font-bold ${items.reduce((s, k) => s + k.weight, 0) !== 70 ? "text-red-500" : "text-green-600"}`}>
                {items.reduce((sum, item) => sum + item.weight, 0)}%
                {items.reduce((s, k) => s + k.weight, 0) !== 70 && " (Harus = 70%)"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Behavioral 5C:</span>
              <span className="text-lg font-bold text-green-600">
                {behavioralItems.reduce((sum, item) => sum + item.weight, 0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Project:</span>
              <span className="text-lg font-bold text-blue-600">{formData.project_weight}%</span>
            </div>
            <div className="border-t pt-2 mt-2 flex items-center justify-between">
              <span className="font-bold">TOTAL:</span>
              <span className={`text-xl font-bold ${(items.reduce((s, k) => s + k.weight, 0) + behavioralItems.reduce((s, b) => s + b.weight, 0) + formData.project_weight) !== 100 ? "text-red-500" : "text-green-600"}`}>
                {(items.reduce((sum, item) => sum + item.weight, 0) + behavioralItems.reduce((sum, item) => sum + item.weight, 0) + formData.project_weight)}%
              </span>
            </div>
          </div>
        </div>

        {/* Behavioral 5C Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Behavioral 5C Assessment</h2>
          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-4">
            <p>Values 5C dengan total bobot {behavioralItems.reduce((s, b) => s + b.weight, 0)}%</p>
          </div>
          
          {behavioralItems.map((beh, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{beh.value_name || beh.value || "Behavioral"} {beh.competency && `— ${beh.competency}`}</span>
                  <Badge variant="outline">{beh.weight}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Values</Label>
                    <Input
                      value={beh.value_name || beh.value || ""}
                      onChange={(e) => updateBehavioralItem(index, "value_name", e.target.value)}
                      placeholder="Contoh: Caring"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Kompetensi</Label>
                    <Input
                      value={beh.competency}
                      onChange={(e) => updateBehavioralItem(index, "competency", e.target.value)}
                      placeholder="Contoh: Achievement Orientation"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bobot (%)</Label>
                    <Input
                      type="number"
                      value={beh.weight}
                      onChange={(e) => updateBehavioralItem(index, "weight", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Behavioral Standard</Label>
                  <Textarea
                    value={beh.behavioral_standard}
                    onChange={(e) => updateBehavioralItem(index, "behavioral_standard", e.target.value)}
                    rows={2}
                    placeholder="Deskripsi perilaku yang diharapkan..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {[
                    { field: "score_1_description" as const, label: "Nilai 1" },
                    { field: "score_2_description" as const, label: "Nilai 2" },
                    { field: "score_3_description" as const, label: "Nilai 3" },
                    { field: "score_4_description" as const, label: "Nilai 4" },
                    { field: "score_5_description" as const, label: "Nilai 5" },
                  ].map(({ field, label }) => (
                    <div key={field} className="space-y-2">
                      <Label className="text-xs">{label}</Label>
                      <Textarea
                        value={beh[field]}
                        onChange={(e) => updateBehavioralItem(index, field, e.target.value)}
                        rows={3}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
