"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  ScaleIcon,
  HeartIcon,
  ChartBarIcon,
  AcademicCapIcon,
  DocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { usePerformanceReviewEditData } from "../queries";
import { useSavePerformanceReviewEdit } from "../mutations";

interface Employee {
  id: string;
  full_name: string;
  job_title?: string;
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
  quality_actual: number;
  quantity_actual: number;
  timeliness_actual: number;
}

interface BehavioralItem {
  value: string;
  competency?: string;
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

export function EditPerformanceReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { id: reviewId } = use(params);
  const [currentStep, setCurrentStep] = useState(1);
  const editDataQuery = usePerformanceReviewEditData(reviewId);
  const loading = editDataQuery.isLoading;
  const employees = (editDataQuery.data?.employees ?? []) as Employee[];
  const saveMutation = useSavePerformanceReviewEdit();
  const saving = saveMutation.isPending;

  // Step 1
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerPosition, setReviewerPosition] = useState("");

  // Step 2
  const [kpis, setKpis] = useState<KpiItem[]>([]);

  // Step 4
  const [behaviorals, setBehaviorals] = useState<BehavioralItem[]>([
    { value: "Caring", score: 3, notes: "", weight: 3 },
    { value: "Credible", score: 3, notes: "", weight: 3 },
    { value: "Competent - Achievement Orientation", score: 3, notes: "", weight: 2 },
    { value: "Competent - Concern for Order & Quality", score: 3, notes: "", weight: 2 },
    { value: "Competitive - Initiative", score: 3, notes: "", weight: 6 },
    { value: "Customer Delight - Customer Service Orientation", score: 3, notes: "", weight: 6 },
  ]);

  // Step 5
  const [developments, setDevelopments] = useState<DevelopmentItem[]>([]);

  // Step 6
  const [revieweeSigned, setRevieweeSigned] = useState(false);
  const [reviewerSigned, setReviewerSigned] = useState(false);
  const [employeeHRSigned, setEmployeeHRSigned] = useState(false);

  // Hydrate form from fetched data
  useEffect(() => {
    const data = editDataQuery.data;
    if (!data) return;

    const review = data.review;
    setSelectedEmployee(review.employee_id);
    setPeriodLabel(review.period_label);
    setStartDate(review.start_date);
    setEndDate(review.end_date);
    setReviewerName(review.reviewer_name || "");
    setReviewerPosition(review.reviewer_position || "");
    setRevieweeSigned(!!review.reviewee_sign_date);
    setReviewerSigned(!!review.reviewer_sign_date);
    setEmployeeHRSigned(!!review.employee_sign_date);

    if (data.kpis && data.kpis.length > 0) {
      setKpis(data.kpis.map((k: any) => ({
        id: k.id,
        perspective: k.perspective || "Business Process",
        strategic_objective: "",
        kpi_name: k.kpi_name,
        kpi_definition: k.kpi_definition || "",
        control: k.reviewer_notes || "",
        target: "",
        target_text: "",
        weight: k.weight || 0,
        frequency: k.frequency || "Monthly",
        target_value: k.target_value || 100,
        quality_actual: k.actual_quality || 100,
        quantity_actual: k.actual_quantity || 100,
        timeliness_actual: k.actual_timeliness || 100,
      })));
    }

    if (data.behavioral) {
      const b = data.behavioral;
      setBehaviorals([
        { value: "Caring", score: b.caring_score || 3, notes: b.caring_notes || "", weight: 3 },
        { value: "Credible", score: b.credible_score || 3, notes: b.credible_notes || "", weight: 3 },
        { value: "Competent - Achievement Orientation", score: b.competent_score || 3, notes: b.competent_notes || "", weight: 2 },
        { value: "Competent - Concern for Order & Quality", score: b.competent_score || 3, notes: b.competent_notes || "", weight: 2 },
        { value: "Competitive - Initiative", score: b.competitive_score || 3, notes: b.competitive_notes || "", weight: 6 },
        { value: "Customer Delight - Customer Service Orientation", score: b.customer_delight_score || 3, notes: b.customer_delight_notes || "", weight: 6 },
      ]);
    }

    if (data.developments && data.developments.length > 0) {
      setDevelopments(data.developments.map((d: any) => ({
        type: d.development_type,
        supported_kpi: d.supported_kpi || "",
        parties: d.involved_parties || "",
        timeframe: d.execution_timeframe || "",
        notes: d.notes || "",
      })));
    } else {
      setDevelopments([{ type: "", supported_kpi: "", parties: "", timeframe: "", notes: "" }]);
    }
  }, [editDataQuery.data]);

  useEffect(() => {
    if (editDataQuery.isError) {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    }
  }, [editDataQuery.isError, toast]);

  const calculateKpiScore = (kpi: KpiItem) => {
    const avg = (kpi.quality_actual + kpi.quantity_actual + kpi.timeliness_actual) / 3;
    let score = 3;
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
      return sum + (score * kpi.weight / 100);
    }, 0) * 500 / 100;
  };

  const calculateBehavioralScore = () => {
    const totalWeight = behaviorals.reduce((sum, b) => sum + b.weight, 0);
    if (totalWeight === 0) return 0;
    return behaviorals.reduce((sum, b) => sum + (b.score * b.weight / totalWeight), 0) * 100;
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

  const handleSubmit = async () => {
    try {
      const grandTotal = calculateGrandTotal();

      const reviewPayload = {
        id: reviewId,
        period_label: periodLabel,
        start_date: startDate,
        end_date: endDate,
        status: "finalized",
        reviewer_name: reviewerName,
        reviewer_position: reviewerPosition,
        total_work_result_score: calculateWorkResultScore(),
        total_behavioral_score: calculateBehavioralScore(),
        grand_total_score: grandTotal,
        category: getCategory(grandTotal),
        reviewee_sign_date: revieweeSigned ? new Date().toISOString().split("T")[0] : null,
        reviewer_sign_date: reviewerSigned ? new Date().toISOString().split("T")[0] : null,
        employee_sign_date: employeeHRSigned ? new Date().toISOString().split("T")[0] : null,
      };

      const kpiRows = kpis.map((kpi) => {
        const { score } = calculateKpiScore(kpi);
        const common = {
          kpi_name: kpi.kpi_name,
          kpi_definition: kpi.kpi_definition,
          weight: kpi.weight,
          frequency: kpi.frequency,
          target_value: kpi.target_value,
          actual_value: score,
          score,
          score_label: getCategory(score * 100),
          actual_quality: kpi.quality_actual,
          actual_quantity: kpi.quantity_actual,
          actual_timeliness: kpi.timeliness_actual,
          reviewer_notes: kpi.control,
        };
        return kpi.id
          ? { id: kpi.id, ...common }
          : { employee_id: selectedEmployee, period_label: periodLabel, ...common };
      });

      await saveMutation.mutateAsync({ reviewId, reviewPayload, kpiRows });
      toast({ title: "Success", description: "Performance review berhasil diupdate!" });
      router.push("/dashboard/hris/performance");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Gagal update review", variant: "destructive" });
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
        quality_actual: 100,
        quantity_actual: 100,
        timeliness_actual: 100,
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
      case 1: return selectedEmployee && periodLabel && startDate && endDate;
      case 2: return kpis.every((k) => k.kpi_name && k.weight > 0);
      case 6: return revieweeSigned && reviewerSigned;
      default: return true;
    }
  };

  if (loading) return <div className="p-6 text-center">Loading data review...</div>;

  const namaPegawai = () => {
    const emp = employees.find((e) => e.id === selectedEmployee);
    return emp ? `${emp.full_name} — ${emp.job_title || "-"}` : "Data karyawan tidak ditemukan";
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeftIcon className="w-4 h-4" /> Kembali
        </Button>
        <div>
          <h1 className="text-xl font-bold">Edit Performance Review</h1>
          <p className="text-sm text-gray-500">{namaPegawai()} — {periodLabel}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                currentStep === step.id ? "bg-indigo-600 text-white" : currentStep > step.id ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {currentStep > step.id ? <CheckCircleIcon className="w-4 h-4" /> : step.id}
            </div>
            <span className={`text-xs hidden sm:block ${currentStep === step.id ? "text-indigo-600 font-semibold" : "text-gray-500"}`}>{step.label}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => { const StepIcon = STEPS[currentStep - 1].icon; return <StepIcon className="w-5 h-5" />; })()}
            {STEPS[currentStep - 1].label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Cover */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Karyawan</Label>
                <Input value={namaPegawai()} disabled className="bg-gray-50" />
              </div>
              <div><Label>Periode</Label><Input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} /></div>
              <div><Label>Tanggal Mulai</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div><Label>Tanggal Selesai</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              <div><Label>Reviewer</Label><Input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} /></div>
              <div><Label>Jabatan Reviewer</Label><Input value={reviewerPosition} onChange={(e) => setReviewerPosition(e.target.value)} /></div>
            </div>
          )}

          {/* Step 2: RKK KPI */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {kpis.map((kpi, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">KPI #{i + 1}</span>
                    <Button variant="destructive" size="sm" onClick={() => removeKpi(i)} disabled={kpis.length <= 1}>Hapus</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label className="text-xs">Strategic Objective</Label><Input value={kpi.strategic_objective} onChange={(e) => updateKpi(i, "strategic_objective", e.target.value)} /></div>
                    <div><Label className="text-xs">Nama KPI</Label><Input value={kpi.kpi_name} onChange={(e) => updateKpi(i, "kpi_name", e.target.value)} /></div>
                    <div className="md:col-span-2"><Label className="text-xs">Definisi KPI</Label><Textarea value={kpi.kpi_definition} onChange={(e) => updateKpi(i, "kpi_definition", e.target.value)} rows={2} /></div>
                    <div><Label className="text-xs">Cara Mengukur & Control</Label><Textarea value={kpi.control} onChange={(e) => updateKpi(i, "control", e.target.value)} rows={2} /></div>
                    <div><Label className="text-xs">Target Output</Label><Textarea value={kpi.target_text || kpi.target || ""} onChange={(e) => updateKpi(i, "target_text", e.target.value)} rows={2} /></div>
                    <div><Label className="text-xs">Bobot (%)</Label><Input type="number" value={kpi.weight} onChange={(e) => updateKpi(i, "weight", Number(e.target.value))} /></div>
                    <div><Label className="text-xs">Frekuensi</Label>
                      <Select value={kpi.frequency} onValueChange={(v) => updateKpi(i, "frequency", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
              <div className="bg-gray-50 p-3 rounded text-sm">Total Bobot: <span className="font-bold">{kpis.reduce((s, k) => s + k.weight, 0)}%</span>{kpis.reduce((s, k) => s + k.weight, 0) !== 100 && <span className="text-red-500 ml-2">(Harus = 100%)</span>}</div>
            </div>
          )}

          {/* Step 3: Realisasi & Skala */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">Masukkan realisasi Kualitas, Kuantitas, dan Ketepatan Waktu untuk setiap KPI.</div>
              {kpis.map((kpi, i) => {
                const { avg, score } = calculateKpiScore(kpi);
                return (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{i + 1}. {kpi.kpi_name || "KPI tanpa nama"}</span>
                      <div className="text-right">
                        <span className={`text-lg font-bold px-3 py-1 rounded ${
                          score === 5 ? "bg-purple-100 text-purple-700" :
                          score === 4 ? "bg-green-100 text-green-700" :
                          score === 3 ? "bg-blue-100 text-blue-700" :
                          score === 2 ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>{score}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-xs">Kualitas (%)</Label><Input type="number" value={kpi.quality_actual} onChange={(e) => updateKpi(i, "quality_actual", Number(e.target.value))} /></div>
                      <div><Label className="text-xs">Kuantitas (%)</Label><Input type="number" value={kpi.quantity_actual} onChange={(e) => updateKpi(i, "quantity_actual", Number(e.target.value))} /></div>
                      <div><Label className="text-xs">Ketepatan Waktu (%)</Label><Input type="number" value={kpi.timeliness_actual} onChange={(e) => updateKpi(i, "timeliness_actual", Number(e.target.value))} /></div>
                    </div>
                    <div className="text-xs text-gray-500">Rata-rata: {avg}% → Score: {score}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 4: Values 5C */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded text-sm text-amber-800">Nilai perilaku karyawan berdasarkan Values 5C. Skala 1-5.</div>
              {behaviorals.map((b, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div><span className="font-semibold">{b.value}</span><span className="text-gray-500 text-sm ml-2">— Bobot: {b.weight}%</span></div>
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
                  <Textarea placeholder={`Keterangan ${b.value}...`} value={b.notes} onChange={(e) => updateBehavioral(i, "notes", e.target.value)} rows={2} />
                </div>
              ))}
              <div className="bg-gray-50 p-3 rounded"><p className="text-sm">Total Perilaku Score: <span className="font-bold">{calculateBehavioralScore().toFixed(2)}</span></p></div>
            </div>
          )}

          {/* Step 5: Hasil & Development Plan */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <p className="text-sm text-green-800 mb-2">HASIL PENILAIAN KINERJA KARYAWAN</p>
                <p className="text-3xl font-bold text-green-700">{calculateGrandTotal().toFixed(2)} / 500</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded text-white font-semibold ${
                  getCategory(calculateGrandTotal()) === "Outstanding" ? "bg-purple-500" :
                  getCategory(calculateGrandTotal()) === "Exceed Expectation" ? "bg-green-500" :
                  getCategory(calculateGrandTotal()) === "Meet Expectation" ? "bg-blue-500" :
                  getCategory(calculateGrandTotal()) === "Need Improvement" ? "bg-yellow-500" :
                  "bg-red-500"
                }`}>{getCategory(calculateGrandTotal())}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded"><p className="font-semibold">Hasil Kerja (70%)</p><p>{calculateWorkResultScore().toFixed(2)}</p></div>
                <div className="bg-gray-50 p-3 rounded"><p className="font-semibold">Perilaku (20%)</p><p>{calculateBehavioralScore().toFixed(2)}</p></div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-semibold">Development Plan</h3><Button variant="outline" size="sm" onClick={addDevelopment}>+ Tambah</Button></div>
                {developments.map((dev, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between"><span className="text-sm font-medium">Plan #{i + 1}</span><Button variant="destructive" size="sm" onClick={() => removeDevelopment(i)} disabled={developments.length <= 1}>Hapus</Button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><Label className="text-xs">Jenis Pengembangan</Label>
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
                      <div><Label className="text-xs">Dukungan KPI</Label><Input value={dev.supported_kpi} onChange={(e) => updateDevelopment(i, "supported_kpi", e.target.value)} /></div>
                      <div><Label className="text-xs">Pihak Terkait</Label><Input value={dev.parties} onChange={(e) => updateDevelopment(i, "parties", e.target.value)} /></div>
                      <div><Label className="text-xs">Waktu Pelaksanaan</Label><Input value={dev.timeframe} onChange={(e) => updateDevelopment(i, "timeframe", e.target.value)} /></div>
                      <div className="md:col-span-2"><Label className="text-xs">Catatan</Label><Textarea value={dev.notes} onChange={(e) => updateDevelopment(i, "notes", e.target.value)} rows={2} /></div>
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
                  <div><p className="font-semibold">Karyawan yang Dinilai (Reviewee)</p><p className="text-sm text-gray-500">{namaPegawai()}</p></div>
                  <Button variant={revieweeSigned ? "outline" : "default"} onClick={() => setRevieweeSigned(!revieweeSigned)}>{revieweeSigned ? "✓ Tanda Tangan Ditambahkan" : "Tambahkan Tanda Tangan"}</Button>
                </div>
                <div className="flex items-center justify-between py-4 border-b">
                  <div><p className="font-semibold">Reviewer (Atasan Langsung)</p><p className="text-sm text-gray-500">{reviewerName || "Belum diisi"} — {reviewerPosition || "-"}</p></div>
                  <Button variant={reviewerSigned ? "outline" : "default"} onClick={() => setReviewerSigned(!reviewerSigned)}>{reviewerSigned ? "✓ Tanda Tangan Ditambahkan" : "Tambahkan Tanda Tangan"}</Button>
                </div>
                <div className="flex items-center justify-between py-4">
                  <div><p className="font-semibold">Employee HR / DMS</p><p className="text-sm text-gray-500">Departemen HRM / HRD</p></div>
                  <Button variant={employeeHRSigned ? "outline" : "default"} onClick={() => setEmployeeHRSigned(!employeeHRSigned)}>{employeeHRSigned ? "✓ Tanda Tangan Ditambahkan" : "Tambahkan Tanda Tangan"}</Button>
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
        <Button variant="outline" onClick={() => setCurrentStep((s) => Math.max(1, s - 1))} disabled={currentStep === 1}>
          <ChevronLeftIcon className="w-4 h-4 mr-1" /> Sebelumnya
        </Button>
        {currentStep < 6 ? (
          <Button onClick={() => setCurrentStep((s) => Math.min(6, s + 1))} disabled={!canProceed()}>
            Selanjutnya <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={saving || !canProceed()} className="bg-green-600 hover:bg-green-700">
            {saving ? "Menyimpan..." : "✓ Update Review"}
          </Button>
        )}
      </div>
    </div>
  );
}
