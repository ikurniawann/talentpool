"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  ScaleIcon,
  HeartIcon,
  ChartBarIcon,
  DocumentCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { usePerformanceEmployees, usePerformanceTemplates, usePerformanceTemplateDetail } from "../queries";
import { useCreatePerformanceReview } from "../mutations";

interface Employee {
  id: string;
  full_name: string;
  job_title?: string | { title?: string };
  department_id?: string;
  department?: { name: string };
  brand_id?: string;
}

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
  status: string;
  behavioral_weight?: number;
  project_weight?: number;
  template_items: KpiTemplateItem[];
  behavioral_items?: KpiTemplateBehavioralItem[];
}

interface KpiTemplateBehavioralItem {
  id: string;
  value_name: string;
  competency?: string;
  behavioral_standard?: string;
  weight: number;
  score_5_description?: string;
  score_4_description?: string;
  score_3_description?: string;
  score_2_description?: string;
  score_1_description?: string;
}

interface KpiItem {
  id?: string;
  perspective: string;
  strategic_objective: string;
  kpi_name: string;
  kpi_definition: string;
  control: string;
  target: string;
  target_text: string;
  weight: number;
  frequency: string;
  target_value: number;
  actual_value: number;
  quality_actual: number; // percentage 0-200
  quantity_actual: number; // percentage 0-200
  timeliness_actual: number; // percentage 0-200
  final_score: number;
}

interface BehavioralItem {
  template_behavioral_id?: string;
  value_name: string;
  competency?: string;
  behavioral_standard?: string;
  score_5_description?: string;
  score_4_description?: string;
  score_3_description?: string;
  score_2_description?: string;
  score_1_description?: string;
  score: number;
  notes: string;
  weight: number;
}

interface DevelopmentItem {
  type: string;
  supported_kpi: string;
  parties: string;
  timeframe: string;
  notes: string;
}

const STEPS = [
  { id: 1, label: "Cover", icon: UserIcon },
  { id: 2, label: "RKK KPI", icon: ClipboardDocumentListIcon },
  { id: 3, label: "Realisasi", icon: ScaleIcon },
  { id: 4, label: "Values 5C", icon: HeartIcon },
  { id: 5, label: "Hasil & Plan", icon: ChartBarIcon },
  { id: 6, label: "Tanda Tangan", icon: DocumentCheckIcon },
];

export function NewPerformanceReviewPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const employeesQuery = usePerformanceEmployees();
  const templatesQuery = usePerformanceTemplates();
  const employees = (employeesQuery.data ?? []) as Employee[];
  const templates = (templatesQuery.data ?? []) as KpiTemplate[];
  const createMutation = useCreatePerformanceReview();
  const loading = createMutation.isPending;

  // Step 1: Cover
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [periodLabel, setPeriodLabel] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reviewerName, setReviewerName] = useState<string>("");
  const [reviewerPosition, setReviewerPosition] = useState<string>("");

  // Step 2: RKK KPI
  const [kpis, setKpis] = useState<KpiItem[]>([
    {
      perspective: "Business Process",
      strategic_objective: "",
      kpi_name: "",
      kpi_definition: "",
      control: "",
      target: "",
      target_text: "",
      weight: 0,
      frequency: "Monthly",
      target_value: 100,
      actual_value: 0,
      quality_actual: 100,
      quantity_actual: 100,
      timeliness_actual: 100,
      final_score: 0,
    },
  ]);

  // Step 4: Values 5C
  const [behaviorals, setBehaviorals] = useState<BehavioralItem[]>([
    { value_name: "Caring", score: 3, notes: "", weight: 3 },
    { value_name: "Credible", score: 3, notes: "", weight: 3 },
    { value_name: "Competent", competency: "Achievement Orientation", score: 3, notes: "", weight: 2 },
    { value_name: "Competent", competency: "Concern for Order & Quality", score: 3, notes: "", weight: 2 },
    { value_name: "Competitive", competency: "Initiative", score: 3, notes: "", weight: 6 },
    { value_name: "Customer Delight", competency: "Customer Service Orientation", score: 3, notes: "", weight: 6 },
  ]);

  // Step 5: Development Plan
  const [developments, setDevelopments] = useState<DevelopmentItem[]>([
    { type: "", supported_kpi: "", parties: "", timeframe: "", notes: "" },
  ]);

  // Step 6: Signatures
  const [revieweeSigned, setRevieweeSigned] = useState(false);
  const [reviewerSigned, setReviewerSigned] = useState(false);
  const [employeeHRSigned, setEmployeeHRSigned] = useState(false);

  const templateDetailQuery = usePerformanceTemplateDetail(selectedTemplate);
  const selectedTemplateDetail = (templateDetailQuery.data as KpiTemplate | undefined) ?? null;

  useEffect(() => {
    // Set default period (current quarter)
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    const year = now.getFullYear();
    setPeriodLabel(`Q${q}-${year}`);
    const qs = new Date(year, (q - 1) * 3, 1);
    const qe = new Date(year, q * 3, 0);
    setStartDate(qs.toISOString().split("T")[0]);
    setEndDate(qe.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templateDetailQuery.data as KpiTemplate | undefined;
      if (template) {
        if (template.template_items) {
          const kpisFromTemplate: KpiItem[] = template.template_items.map((item) => ({
            id: item.id,
            perspective: item.perspective,
            strategic_objective: "",
            kpi_name: item.kpi_name,
            kpi_definition: item.kpi_definition,
            control: "",
            target: item.target_text || "",
            target_text: item.target_text || "",
            weight: item.weight,
            frequency: item.frequency,
            target_value: item.target_value,
            actual_value: 0,
            quality_actual: 100,
            quantity_actual: 100,
            timeliness_actual: 100,
            final_score: 0,
          }));
          setKpis(kpisFromTemplate);
        }
        if (template.behavioral_items && template.behavioral_items.length > 0) {
          setBehaviorals(template.behavioral_items.map((item) => ({
            template_behavioral_id: item.id,
            value_name: item.value_name,
            competency: item.competency || "",
            behavioral_standard: item.behavioral_standard || "",
            score_5_description: item.score_5_description || "",
            score_4_description: item.score_4_description || "",
            score_3_description: item.score_3_description || "",
            score_2_description: item.score_2_description || "",
            score_1_description: item.score_1_description || "",
            weight: Number(item.weight || 0),
            score: 3,
            notes: "",
          })));
        }
      }
    }
  }, [selectedTemplate, templateDetailQuery.data]);

  const calculateKpiScore = (kpi: KpiItem) => {
    const avg = (kpi.quality_actual + kpi.quantity_actual + kpi.timeliness_actual) / 3;
    // Map to score 1-5
    let score = 3; // default Meet
    if (avg >= 130.01) score = 5;
    else if (avg >= 115.01) score = 4;
    else if (avg >= 95.01) score = 3;
    else if (avg >= 70.01) score = 2;
    else score = 1;

    return { avg: Math.round(avg * 100) / 100, score };
  };

  const calculateWorkResultScore = () => {
    return kpis.reduce((sum, kpi) => {
      const { score } = calculateKpiScore(kpi);
      return sum + (score * kpi.weight);
    }, 0);
  };

  const calculateBehavioralScore = () => {
    return behaviorals.reduce((sum, b) => sum + (b.score * b.weight), 0);
  };

  const calculateGrandTotal = () => {
    return calculateWorkResultScore() + calculateBehavioralScore();
  };

  const getCategory = (total: number) => {
    if (total >= 441) return "Outstanding";
    if (total >= 351) return "Exceed Expectation";
    if (total >= 251) return "Meet Expectation";
    if (total >= 161) return "Need Improvement";
    return "Unacceptable";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 5) return "Outstanding";
    if (score >= 4) return "Exceed Expectation";
    if (score >= 3) return "Meet Expectation";
    if (score >= 2) return "Need Improvement";
    return "Unacceptable";
  };

  const handleSubmit = async () => {
    try {
      const grandTotal = calculateGrandTotal();
      
      const kpisWithScore = kpis.map(kpi => {
        const { score } = calculateKpiScore(kpi);
        return {
          id: kpi.id,
          perspective: kpi.perspective,
          kpi_name: kpi.kpi_name,
          kpi_definition: kpi.kpi_definition,
          target_text: kpi.target_text,
          target_value: kpi.target_value,
          actual_value: score,
          weight: kpi.weight,
          measurement_unit: "%",
          frequency: kpi.frequency,
          score,
          score_label: getScoreLabel(score),
          actual_quality: kpi.quality_actual,
          actual_quantity: kpi.quantity_actual,
          actual_timeliness: kpi.timeliness_actual,
          achievement_percentage: (kpi.quality_actual + kpi.quantity_actual + kpi.timeliness_actual) / 3,
          weighted_score: score * kpi.weight,
          reviewer_notes: kpi.control,
        };
      });

      const payload = {
        employee_id: selectedEmployee,
        period_label: periodLabel,
        start_date: startDate,
        end_date: endDate,
        status: "finalized",
        reviewer_name: reviewerName,
        reviewer_position: reviewerPosition,
        kpi_template_id: selectedTemplate || null,
        total_work_result_score: calculateWorkResultScore(),
        total_behavioral_score: calculateBehavioralScore(),
        total_project_score: 0,
        grand_total_score: grandTotal,
        category: getCategory(grandTotal),
        reviewee_sign_date: revieweeSigned ? new Date().toISOString().split("T")[0] : null,
        reviewer_sign_date: reviewerSigned ? new Date().toISOString().split("T")[0] : null,
        employee_sign_date: employeeHRSigned ? new Date().toISOString().split("T")[0] : null,
        items: kpisWithScore,
        behavioral_items: behaviorals,
        development_data: developments.filter(dev => dev.type),
      };

      await createMutation.mutateAsync(payload);
      showToast("Performance review berhasil disimpan!", "success");
      router.push("/dashboard/hris/performance");
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan review", "error");
    }
  };

  const updateKpi = (index: number, field: keyof KpiItem, value: any) => {
    setKpis((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addKpi = () => {
    setKpis((prev) => [
      ...prev,
      {
        perspective: "Business Process",
        strategic_objective: "",
        kpi_name: "",
        kpi_definition: "",
        control: "",
        target: "",
        target_text: "",
        weight: 0,
        frequency: "Monthly",
        target_value: 100,
        actual_value: 0,
        quality_actual: 100,
        quantity_actual: 100,
        timeliness_actual: 100,
        final_score: 0,
      },
    ]);
  };

  const removeKpi = (index: number) => {
    if (kpis.length <= 1) return;
    setKpis((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBehavioral = (index: number, field: keyof BehavioralItem, value: any) => {
    setBehaviorals((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateDevelopment = (index: number, field: keyof DevelopmentItem, value: any) => {
    setDevelopments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addDevelopment = () => {
    setDevelopments((prev) => [
      ...prev,
      { type: "", supported_kpi: "", parties: "", timeframe: "", notes: "" },
    ]);
  };

  const removeDevelopment = (index: number) => {
    if (developments.length <= 1) return;
    setDevelopments((prev) => prev.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedEmployee && periodLabel && startDate && endDate;
      case 2:
        return kpis.every((k) => k.kpi_name && k.weight > 0);
      case 3:
        return true;
      case 4:
        return behaviorals.every((b) => b.score >= 1 && b.score <= 5);
      case 5:
        return true;
      case 6:
        return revieweeSigned && reviewerSigned;
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeftIcon className="w-4 h-4" /> Kembali
        </Button>
        <div>
          <h1 className="text-xl font-bold">Performance Review Baru</h1>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                currentStep === step.id
                  ? "bg-indigo-600 text-white"
                  : currentStep > step.id
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {currentStep > step.id ? <CheckCircleIcon className="w-4 h-4" /> : step.id}
            </div>
            <span className={`text-xs hidden sm:block ${currentStep === step.id ? "text-indigo-600 font-semibold" : "text-gray-500"}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = STEPS[currentStep - 1].icon;
              return <StepIcon className="w-5 h-5" />;
            })()}
            {STEPS[currentStep - 1].label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Cover */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2 space-y-2.5">
                <Label className="text-sm font-medium text-gray-700 block mb-1.5">Pilih Karyawan</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="h-10">
                    {selectedEmployee ? (
                      <span className="text-sm">
                        {(() => {
                          const emp = employees.find(e => e.id === selectedEmployee);
                          const jobTitle = typeof emp?.job_title === 'string' ? emp.job_title : (emp?.job_title as any)?.title;
                          return `${emp?.full_name || selectedEmployee} — ${jobTitle || "-"}`;
                        })()}
                      </span>
                    ) : (
                      <SelectValue placeholder="Pilih karyawan..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => {
                      const jobTitle = typeof e.job_title === 'string' ? e.job_title : (e.job_title as any)?.title;
                      return (
                        <SelectItem key={e.id} value={e.id} className="text-sm">{e.full_name} — {jobTitle || "-"}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-2.5">
                <Label className="text-sm font-medium text-gray-700 block mb-1.5">Template KPI (Opsional)</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="h-10">
                    {selectedTemplate ? (
                      <span className="text-sm">
                        {(() => {
                          const tpl = templates.find(t => t.id === selectedTemplate);
                          return tpl ? `${tpl.template_name} (${tpl.department?.name || "All"})` : "Pilih template...";
                        })()}
                      </span>
                    ) : (
                      <SelectValue placeholder="Pilih template KPI..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Manual (tanpa template)</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-sm">
                        {t.template_name} — {t.department?.name || "All"} {t.position?.title ? `(${t.position.title})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Jika dipilih, KPI dan Values 5C akan otomatis terisi dari template</p>
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-gray-700 block mb-1.5">Periode Review</Label>
                <Input 
                  className="h-10 text-sm"
                  value={periodLabel} 
                  onChange={(e) => setPeriodLabel(e.target.value)} 
                  placeholder="Contoh: Q1-2026" 
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-gray-700 block mb-1.5">Tanggal Mulai</Label>
                <Input 
                  type="date" 
                  className="h-10 text-sm"
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-gray-700 block mb-1.5">Tanggal Selesai</Label>
                <Input 
                  type="date" 
                  className="h-10 text-sm"
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-gray-700 block mb-1.5">Nama Reviewer (Atasan Langsung)</Label>
                <Input 
                  className="h-10 text-sm"
                  value={reviewerName} 
                  onChange={(e) => setReviewerName(e.target.value)} 
                  placeholder="Nama lengkap reviewer..."
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-gray-700 block mb-1.5">Jabatan Reviewer</Label>
                <Input 
                  className="h-10 text-sm"
                  value={reviewerPosition} 
                  onChange={(e) => setReviewerPosition(e.target.value)} 
                  placeholder="Jabatan reviewer..."
                />
              </div>
            </div>
          )}

          {/* Step 2: RKK KPI */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {kpis.map((kpi, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">{i + 1}</span>
                      <span className="font-semibold text-base text-gray-900">{kpi.kpi_name || "KPI tanpa nama"}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeKpi(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium text-gray-700 block mb-1.5">Strategic Objective</Label>
                      <Input 
                        className="h-10 text-sm"
                        value={kpi.strategic_objective} 
                        onChange={(e) => updateKpi(i, "strategic_objective", e.target.value)} 
                        placeholder="Tujuan strategis..."
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium text-gray-700 block mb-1.5">Perspective</Label>
                      <Select value={kpi.perspective} onValueChange={(v) => updateKpi(i, "perspective", v)}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Business Process">Business Process</SelectItem>
                          <SelectItem value="Financial">Financial</SelectItem>
                          <SelectItem value="Customer">Customer</SelectItem>
                          <SelectItem value="Learning & Growth">Learning & Growth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-gray-700 block mb-1.5">Nama KPI</Label>
                    <Input 
                      className="h-10 text-sm"
                      value={kpi.kpi_name} 
                      onChange={(e) => updateKpi(i, "kpi_name", e.target.value)} 
                      placeholder="Nama indikator kinerja..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium text-gray-700 block mb-1.5">Definisi KPI / Formula</Label>
                      <Textarea 
                        className="text-sm resize-none"
                        value={kpi.kpi_definition} 
                        onChange={(e) => updateKpi(i, "kpi_definition", e.target.value)} 
                        rows={3}
                        placeholder="Formula perhitungan dan indikator..."
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium text-gray-700 block mb-1.5">Cara Mengukur & Control</Label>
                      <Textarea 
                        className="text-sm resize-none"
                        value={kpi.control} 
                        onChange={(e) => updateKpi(i, "control", e.target.value)} 
                        rows={3}
                        placeholder="Kriteria hasil kerja..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-5 pt-4 border-t border-gray-100">
                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium text-gray-700 block mb-1.5">Target Output</Label>
                      <Textarea
                        className="text-sm resize-none"
                        value={kpi.target_text}
                        onChange={(e) => updateKpi(i, "target_text", e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium text-gray-700 block mb-1.5">Bobot (%)</Label>
                      <Input 
                        type="number" 
                        className="h-10 text-sm font-semibold"
                        value={kpi.weight} 
                        onChange={(e) => updateKpi(i, "weight", Number(e.target.value))} 
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium text-gray-700 block mb-1.5">Frekuensi</Label>
                      <Select value={kpi.frequency} onValueChange={(v) => updateKpi(i, "frequency", v)}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addKpi} className="w-full">+ Tambah KPI</Button>

              <div className="bg-gray-50 p-3 rounded text-sm">
                Total Bobot KPI: <span className="font-bold">{kpis.reduce((s, k) => s + k.weight, 0)}%</span>
                {selectedTemplateDetail?.behavioral_weight ? (
                  <span className="text-gray-500 ml-2">
                    Values 5C: {behaviorals.reduce((s, b) => s + b.weight, 0)}%
                  </span>
                ) : null}
                {(kpis.reduce((s, k) => s + k.weight, 0) + behaviorals.reduce((s, b) => s + b.weight, 0)) !== 100 && (
                  <span className="text-amber-600 ml-2">(KPI + Values saat ini tidak 100%)</span>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Realisasi & Skala */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                Masukkan realisasi Kualitas, Kuantitas, dan Ketepatan Waktu untuk setiap KPI.
                <br />
                Score otomatis dihitung berdasarkan skala: Outstanding (5) ≥130%, Exceed (4) ≥115%, Meet (3) ≥95%, Need Improvement (2) ≥70%, Unacceptable (1) &lt;70%
              </div>

              {kpis.map((kpi, i) => {
                const { avg, score } = calculateKpiScore(kpi);
                return (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{i + 1}</span>
                        <span className="font-semibold text-sm text-gray-900">{kpi.kpi_name || "KPI tanpa nama"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Score:</span>
                        <span className={`text-lg font-bold px-3 py-1 rounded-full ${
                          score === 5 ? "bg-purple-500 text-white" :
                          score === 4 ? "bg-green-500 text-white" :
                          score === 3 ? "bg-blue-500 text-white" :
                          score === 2 ? "bg-yellow-500 text-white" :
                          "bg-red-500 text-white"
                        }`}>{score}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-green-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(kpi.quality_actual, 200)}%` }} />
                          </div>
                        </div>
                        <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Kualitas (%)
                        </Label>
                        <Input
                          type="number"
                          className="text-sm font-semibold"
                          value={kpi.quality_actual}
                          onChange={(e) => updateKpi(i, "quality_actual", Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(kpi.quantity_actual, 200)}%` }} />
                          </div>
                        </div>
                        <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Kuantitas (%)
                        </Label>
                        <Input
                          type="number"
                          className="text-sm font-semibold"
                          value={kpi.quantity_actual}
                          onChange={(e) => updateKpi(i, "quantity_actual", Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-purple-100 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(kpi.timeliness_actual, 200)}%` }} />
                          </div>
                        </div>
                        <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          Ketepatan Waktu (%)
                        </Label>
                        <Input
                          type="number"
                          className="text-sm font-semibold"
                          value={kpi.timeliness_actual}
                          onChange={(e) => updateKpi(i, "timeliness_actual", Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        <span>Rata-rata: </span>
                        <span className="font-semibold text-gray-700">{avg.toFixed(1)}%</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        <span>→ Score Akhir: </span>
                        <span className="font-bold text-gray-900">{score}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 4: Values 5C */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded text-sm text-amber-800">
                Nilai perilaku karyawan berdasarkan Values 5C. Skala 1-5:
                <br />
                1=Unacceptable, 2=Need Improvement, 3=Meet Expectation, 4=Exceed, 5=Outstanding
              </div>

              {behaviorals.map((b, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{b.value_name}</span>
                      {b.competency && <span className="text-gray-500 text-sm ml-2">({b.competency})</span>}
                      <span className="text-gray-500 text-sm ml-2">— Bobot: {b.weight}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Score:</Label>
                      <Select value={String(b.score)} onValueChange={(v) => updateBehavioral(i, "score", Number(v))}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {b.behavioral_standard && (
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-md p-3">
                      {b.behavioral_standard}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                    {[1, 2, 3, 4, 5].map((score) => {
                      const text = b[`score_${score}_description` as keyof BehavioralItem] as string | undefined;
                      return (
                        <div
                          key={score}
                          className={`rounded-md border p-2 ${b.score === score ? "border-amber-400 bg-amber-50" : "bg-white"}`}
                        >
                          <div className="font-semibold mb-1">Nilai {score}</div>
                          <div className="line-clamp-5 text-gray-600">{text || "-"}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-sm text-gray-600">
                    Nilai x Bobot: <span className="font-semibold">{(b.score * b.weight).toFixed(2)}</span>
                  </div>
                  <Textarea
                    placeholder={`Catatan ${b.value_name}...`}
                    value={b.notes}
                    onChange={(e) => updateBehavioral(i, "notes", e.target.value)}
                    rows={2}
                  />
                </div>
              ))}

              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm">
                  Total Nilai x Bobot: <span className="font-bold">{calculateBehavioralScore().toFixed(2)}</span>
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Hasil & Development Plan */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <p className="text-sm text-green-800 mb-2">HASIL PENILAIAN KINERJA KARYAWAN</p>
                <p className="text-3xl font-bold text-green-700">{calculateGrandTotal().toFixed(2)} / 500</p>
                <Badge className={`mt-2 ${
                  getCategory(calculateGrandTotal()) === "Outstanding" ? "bg-purple-500" :
                  getCategory(calculateGrandTotal()) === "Exceed Expectation" ? "bg-green-500" :
                  getCategory(calculateGrandTotal()) === "Meet Expectation" ? "bg-blue-500" :
                  getCategory(calculateGrandTotal()) === "Need Improvement" ? "bg-yellow-500" :
                  "bg-red-500"
                } text-white`}>
                  {getCategory(calculateGrandTotal())}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-semibold">Hasil Kerja ({kpis.reduce((s, k) => s + k.weight, 0)}%)</p>
                  <p>Score: {calculateWorkResultScore().toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-semibold">Perilaku ({behaviorals.reduce((s, b) => s + b.weight, 0)}%)</p>
                  <p>Score: {calculateBehavioralScore().toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Development Plan</h3>
                  <Button variant="outline" size="sm" onClick={addDevelopment}>+ Tambah</Button>
                </div>

                {developments.map((dev, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Plan #{i + 1}</span>
                      <Button variant="destructive" size="sm" onClick={() => removeDevelopment(i)} disabled={developments.length <= 1}>Hapus</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Jenis Pengembangan</Label>
                        <Select value={dev.type} onValueChange={(v) => updateDevelopment(i, "type", v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Training">Training</SelectItem>
                            <SelectItem value="Self Learning">Self Learning</SelectItem>
                            <SelectItem value="Assignment">Assignment</SelectItem>
                            <SelectItem value="Mentoring">Mentoring</SelectItem>
                            <SelectItem value="Coaching">Coaching</SelectItem>
                            <SelectItem value="Cross Functional">Cross Functional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Dukungan KPI</Label>
                        <Input value={dev.supported_kpi} onChange={(e) => updateDevelopment(i, "supported_kpi", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Pihak Terkait</Label>
                        <Input value={dev.parties} onChange={(e) => updateDevelopment(i, "parties", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Waktu Pelaksanaan</Label>
                        <Input value={dev.timeframe} onChange={(e) => updateDevelopment(i, "timeframe", e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Catatan</Label>
                        <Textarea value={dev.notes} onChange={(e) => updateDevelopment(i, "notes", e.target.value)} rows={2} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Tanda Tangan */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="bg-gray-50 border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between py-4 border-b">
                  <div>
                    <p className="font-semibold">Karyawan yang Dinilai (Reviewee)</p>
                    <p className="text-sm text-gray-500">{namaPegawai()}</p>
                  </div>
                  <Button
                    variant={revieweeSigned ? "outline" : "default"}
                    onClick={() => setRevieweeSigned(!revieweeSigned)}
                  >
                    {revieweeSigned ? "✓ Tanda Tangan Ditambahkan" : "Tambahkan Tanda Tangan"}
                  </Button>
                </div>

                <div className="flex items-center justify-between py-4 border-b">
                  <div>
                    <p className="font-semibold">Reviewer (Atasan Langsung)</p>
                    <p className="text-sm text-gray-500">{reviewerName || "Belum diisi"} — {reviewerPosition || "-"}</p>
                  </div>
                  <Button
                    variant={reviewerSigned ? "outline" : "default"}
                    onClick={() => setReviewerSigned(!reviewerSigned)}
                  >
                    {reviewerSigned ? "✓ Tanda Tangan Ditambahkan" : "Tambahkan Tanda Tangan"}
                  </Button>
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-semibold">Employee HR / DMS</p>
                    <p className="text-sm text-gray-500">Departemen HRM / HRD</p>
                  </div>
                  <Button
                    variant={employeeHRSigned ? "outline" : "default"}
                    onClick={() => setEmployeeHRSigned(!employeeHRSigned)}
                  >
                    {employeeHRSigned ? "✓ Tanda Tangan Ditambahkan" : "Tambahkan Tanda Tangan"}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-2">Konfirmasi Sebelum Finalisasi:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Pastikan semua data KPI, Realisasi, Values 5C, dan Development Plan sudah benar</li>
                  <li>Reviewee dan Reviewer wajib menandatangani</li>
                  <li>Setelah difinalisasi, data tidak dapat diubah</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" /> Sebelumnya
        </Button>

        {currentStep < 6 ? (
          <Button onClick={() => setCurrentStep((s) => Math.min(6, s + 1))} disabled={!canProceed()}>
            Selanjutnya <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading || !canProceed()} className="bg-green-600 hover:bg-green-700">
            {loading ? "Menyimpan..." : "✓ Finalisasi Review"}
          </Button>
        )}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );

  function namaPegawai() {
    const emp = employees.find((e) => e.id === selectedEmployee);
    if (!emp) return "Belum dipilih";
    const jobTitle = typeof emp.job_title === 'string' ? emp.job_title : emp.job_title?.title;
    return `${emp.full_name} — ${jobTitle || "-"}`;
  }
}
