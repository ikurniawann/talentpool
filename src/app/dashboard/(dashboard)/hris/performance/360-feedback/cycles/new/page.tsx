"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeftIcon, SaveIcon, CalendarIcon, PercentIcon, EyeIcon, UserCheckIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

export default function NewFeedbackCyclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    period_label: "",
    start_date: "",
    end_date: "",
    kpi_weight: 70,
    feedback_weight: 30,
    is_anonymous: true,
    allow_self_assessment: true,
    require_manager_review: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/hris/feedback-cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/dashboard/hris/performance/360-feedback/cycles");
      } else {
        const error = await res.json();
        alert("Error: " + error.error);
      }
    } catch (error) {
      console.error("Error creating cycle:", error);
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (field: string, value: number) => {
    const newData = { ...formData, [field]: value };
    // Auto-adjust the other weight
    if (field === "kpi_weight") {
      newData.feedback_weight = 100 - value;
    } else if (field === "feedback_weight") {
      newData.kpi_weight = 100 - value;
    }
    setFormData(newData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-gray-100">
      <div className="container mx-auto py-8 max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/hris/performance/360-feedback/cycles">
            <Button variant="ghost" size="sm" className="mb-4 hover:bg-pink-100 hover:text-pink-700 transition-colors">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Cycles
            </Button>
          </Link>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-md">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create New Feedback Cycle</h1>
                <p className="text-sm text-gray-500 mt-1">Setup periode penilaian 360° feedback dengan konfigurasi lengkap</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Card className="mb-6 shadow-lg border-0 bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4">
              <CardTitle className="text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Basic Information
              </CardTitle>
              <CardDescription className="text-pink-100 mt-1">
                Define cycle name and period
              </CardDescription>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
                  Cycle Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Q1 2026 Performance Review"
                  required
                  className="border-gray-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">Give it a descriptive name for easy identification</p>
              </div>

              {/* Period Label */}
              <div className="space-y-2">
                <Label htmlFor="period_label" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
                  Period Label *
                </Label>
                <Input
                  id="period_label"
                  value={formData.period_label}
                  onChange={(e) => setFormData({ ...formData, period_label: e.target.value })}
                  placeholder="Contoh: Q1 2026, 2026 Annual"
                  required
                  className="border-gray-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">Short label for grouping (e.g., Q1 2026)</p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
                    Start Date *
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="border-gray-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
                    End Date *
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="border-gray-200 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Weights */}
          <Card className="mb-6 shadow-lg border-0 bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <CardTitle className="text-white flex items-center gap-2">
                <PercentIcon className="w-5 h-5" />
                Scoring Weights
              </CardTitle>
              <CardDescription className="text-blue-100 mt-1">
                Balance between KPI results and 360° feedback
              </CardDescription>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="kpi_weight" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    KPI Weight (%)
                  </Label>
                  <div className="relative">
                    <Input
                      id="kpi_weight"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.kpi_weight}
                      onChange={(e) => handleWeightChange("kpi_weight", parseInt(e.target.value) || 0)}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors text-lg font-semibold"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Result-based performance metrics</p>
                  <div className="bg-blue-50 rounded-lg p-3 mt-3">
                    <div className="text-xs text-blue-600 font-medium">KPI contributes {formData.kpi_weight}% to final score</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="feedback_weight" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    360° Feedback Weight (%)
                  </Label>
                  <div className="relative">
                    <Input
                      id="feedback_weight"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.feedback_weight}
                      onChange={(e) => handleWeightChange("feedback_weight", parseInt(e.target.value) || 0)}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors text-lg font-semibold"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Behavior-based assessment from multi-source feedback</p>
                  <div className="bg-blue-50 rounded-lg p-3 mt-3">
                    <div className="text-xs text-blue-600 font-medium">360° feedback contributes {formData.feedback_weight}% to final score</div>
                  </div>
                </div>
              </div>
              
              {/* Total Summary */}
              <div className={`rounded-xl p-4 border-2 ${
                formData.kpi_weight + formData.feedback_weight === 100 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      formData.kpi_weight + formData.feedback_weight === 100 ? "bg-green-500" : "bg-red-500"
                    }`}></div>
                    <span className={`font-semibold ${
                      formData.kpi_weight + formData.feedback_weight === 100 ? "text-green-800" : "text-red-800"
                    }`}>
                      Total Weight
                    </span>
                  </div>
                  <div className={`text-xl font-bold ${
                    formData.kpi_weight + formData.feedback_weight === 100 ? "text-green-700" : "text-red-700"
                  }`}>
                    {formData.kpi_weight}% + {formData.feedback_weight}% = {formData.kpi_weight + formData.feedback_weight}%
                    {formData.kpi_weight + formData.feedback_weight === 100 && (
                      <span className="ml-2 text-sm font-normal">✓ Perfect!</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cycle Options */}
          <Card className="mb-6 shadow-lg border-0 bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
              <CardTitle className="text-white flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5" />
                Cycle Configuration
              </CardTitle>
              <CardDescription className="text-purple-100 mt-1">
                Customize feedback process settings
              </CardDescription>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Anonymous Feedback */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-white border border-purple-100 hover:border-purple-300 transition-all">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <EyeIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="is_anonymous" className="text-base font-semibold text-gray-900 cursor-pointer">
                      Anonymous Feedback
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">Reviewers identities will be hidden from ratees to encourage honest feedback</p>
                  </div>
                </div>
                <Switch
                  id="is_anonymous"
                  checked={formData.is_anonymous}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_anonymous: checked })}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>

              {/* Self Assessment */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-white border border-purple-100 hover:border-purple-300 transition-all">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <UserCheckIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="allow_self_assessment" className="text-base font-semibold text-gray-900 cursor-pointer">
                      Allow Self Assessment
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">Employees can evaluate themselves as part of the 360° process</p>
                  </div>
                </div>
                <Switch
                  id="allow_self_assessment"
                  checked={formData.allow_self_assessment}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_self_assessment: checked })}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>

              {/* Manager Review */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-white border border-purple-100 hover:border-purple-300 transition-all">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="require_manager_review" className="text-base font-semibold text-gray-900 cursor-pointer">
                      Require Manager Review
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">Managers must approve feedback before it becomes final</p>
                  </div>
                </div>
                <Switch
                  id="require_manager_review"
                  checked={formData.require_manager_review}
                  onCheckedChange={(checked) => setFormData({ ...formData, require_manager_review: checked })}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4 items-center justify-end pt-4">
            <Link href="/dashboard/hris/performance/360-feedback/cycles">
              <Button type="button" variant="outline" className="hover:bg-gray-100 transition-colors border-gray-300">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-base font-semibold"
            >
              <SaveIcon className="w-5 h-5 mr-2" />
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating Cycle...
                </>
              ) : (
                "Create Feedback Cycle"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
