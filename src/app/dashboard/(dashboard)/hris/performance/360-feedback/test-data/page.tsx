"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2Icon, 
  DatabaseIcon, 
  UserIcon,
  DownloadIcon,
  SparklesIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  TargetIcon,
  BarChart3Icon
} from "lucide-react";

interface FeedbackSummary {
  id: string;
  employee: any;
  final_score: number;
  final_grade: string;
  leadership_score: number;
  communication_score: number;
  collaboration_score: number;
  accountability_score: number;
  problem_solving_score: number;
  burnout_risk: string;
  promotion_potential: string;
  strengths: string[];
  weaknesses: string[];
}

export default function Test360DataPage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [message, setMessage] = useState("");

  const createTestSummary = async () => {
    setLoading(true);
    setMessage("");
    
    try {
      const response = await fetch("/api/hris/feedback-summaries/test-insert", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setSummary(result.data);
      setMessage("✅ Success! " + result.message);
    } catch (error: any) {
      setMessage("❌ Error: " + (error.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "bg-gradient-to-r from-green-400 to-green-500 text-white shadow-lg",
      B: "bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg",
      C: "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg",
      D: "bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg",
      E: "bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg",
    };
    return colors[grade] || "bg-gray-100 text-gray-700";
  };

  const getCategoryName = (score: number) => {
    if (score >= 4.5) return { label: "Excellent", color: "text-green-600", bg: "bg-green-50" };
    if (score >= 4.0) return { label: "Good", color: "text-blue-600", bg: "bg-blue-50" };
    if (score >= 3.5) return { label: "Average", color: "text-yellow-600", bg: "bg-yellow-50" };
    return { label: "Needs Improvement", color: "text-red-600", bg: "bg-red-50" };
  };

  // Radar Chart Data
  const radarData = summary ? [
    { metric: "Leadership", score: summary.leadership_score, fullMark: 5 },
    { metric: "Communication", score: summary.communication_score, fullMark: 5 },
    { metric: "Collaboration", score: summary.collaboration_score, fullMark: 5 },
    { metric: "Accountability", score: summary.accountability_score, fullMark: 5 },
    { metric: "Problem Solving", score: summary.problem_solving_score, fullMark: 5 },
  ] : [];

  // Calculate radar chart polygon points
  const calculateRadarPoints = (data: typeof radarData, radius: number, centerX: number, centerY: number) => {
    if (data.length === 0) return "";
    const angleSlice = (Math.PI * 2) / data.length;
    return data.map((point, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const r = (point.score / point.fullMark) * radius;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <div className="container mx-auto py-8 max-w-6xl px-4 print:max-w-none">
        {/* Header */}
        <div className="mb-8 no-print">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <DatabaseIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">360° Performance Report Demo</h1>
                  <p className="text-sm text-gray-500 mt-1">Generate test data and preview comprehensive performance analytics</p>
                </div>
              </div>
              <div className="flex gap-3">
                {summary && (
                  <Button onClick={exportToPDF} variant="outline" className="hover:bg-pink-50 hover:border-pink-300 transition-colors">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                )}
                <Button 
                  onClick={createTestSummary} 
                  disabled={loading}
                  className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-6 text-base font-semibold"
                >
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Creating...
                    </>
                  ) : (
                    "Generate Test Data"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <Card className={`mb-6 shadow-lg border-0 overflow-hidden no-print ${
            message.startsWith("✅") ? "bg-gradient-to-r from-green-50 to-green-100 border-green-200" : "bg-gradient-to-r from-red-50 to-red-100 border-red-200"
          }`}>
            <CardContent className="py-4">
              <p className={`font-semibold ${message.startsWith("✅") ? "text-green-800" : "text-red-800"}`}>
                {message}
              </p>
            </CardContent>
          </Card>
        )}

        {!summary ? (
          /* Empty State */
          <Card className="shadow-lg border-0 bg-white overflow-hidden">
            <CardContent className="py-20 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <DatabaseIcon className="w-12 h-12 text-pink-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Test Data Generated</h3>
              <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
                Click the button above to generate sample performance data with AI insights and visualizations
              </p>
              <Button 
                onClick={createTestSummary} 
                disabled={loading}
                className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-lg font-semibold"
              >
                <SparklesIcon className="w-6 h-6 mr-2" />
                Generate Sample Data
              </Button>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                  <BarChart3Icon className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-pink-900">Radar Charts</div>
                  <div className="text-xs text-pink-600 mt-1">5 behavioral metrics</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <TargetIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-purple-900">Gauge Chart</div>
                  <div className="text-xs text-purple-600 mt-1">Final score visualization</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <CheckCircle2Icon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-blue-900">AI Insights</div>
                  <div className="text-xs text-blue-600 mt-1">Strengths & weaknesses</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Report Content */
          <div className="space-y-6">
            {/* Report Header */}
            <Card className="border-2 border-pink-200 shadow-lg overflow-hidden">
              <CardContent className="py-8 bg-gradient-to-r from-pink-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                      {summary.employee.full_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">{summary.employee.full_name}</h2>
                      <p className="text-gray-600 text-lg">{summary.employee.nip} • {summary.employee.position?.title}</p>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        {summary.employee.department?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-2 font-medium">Performance Review</div>
                    <div className="text-lg font-bold text-gray-900">Q1 2026</div>
                    <Badge className={`mt-3 ${getGradeColor(summary.final_grade)} px-6 py-2 text-xl font-bold shadow-lg`}>
                      Grade {summary.final_grade}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Score Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gauge Chart - Final Score */}
              <Card className="lg:col-span-1 shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUpIcon className="w-5 h-5" />
                    Overall Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="relative h-56">
                    {/* Gauge SVG */}
                    <svg viewBox="0 0 200 120" className="w-full h-full">
                      {/* Background Arc */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="20"
                        strokeLinecap="round"
                      />
                      {/* Colored Arc */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={summary.final_score >= 80 ? "#3b82f6" : summary.final_score >= 60 ? "#eab308" : "#ef4444"}
                        strokeWidth="20"
                        strokeLinecap="round"
                        strokeDasharray={`${(summary.final_score / 100) * 251.2} 251.2`}
                      />
                      {/* Center Text */}
                      <text x="100" y="70" textAnchor="middle" className="text-4xl font-bold fill-gray-900" style={{ fontSize: '32px' }}>
                        {summary.final_score.toFixed(1)}
                      </text>
                      <text x="100" y="90" textAnchor="middle" className="fill-gray-500" style={{ fontSize: '12px' }}>
                        Final Score
                      </text>
                      <text x="100" y="108" textAnchor="middle" className={`font-bold ${
                        summary.final_score >= 80 ? "fill-green-600" : summary.final_score >= 60 ? "fill-yellow-600" : "fill-red-600"
                      }`} style={{ fontSize: '16px' }}>
                        Grade {summary.final_grade}
                      </text>
                    </svg>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 font-medium">KPI Score (70%)</span>
                        <span className={`font-bold ${getCategoryName(summary.kpi_score / 20).color}`}>{summary.kpi_score.toFixed(1)}</span>
                      </div>
                      <Progress value={summary.kpi_score} className="h-3 bg-gray-100" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 font-medium">360° Score (30%)</span>
                        <span className={`font-bold ${getCategoryName(summary.overall_360_score / 20).color}`}>{summary.overall_360_score.toFixed(1)}</span>
                      </div>
                      <Progress value={(summary.overall_360_score / 100) * 100} className="h-3 bg-gray-100" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Radar Chart - Behavioral Scores */}
              <Card className="lg:col-span-2 shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3Icon className="w-5 h-5" />
                    Behavioral Competencies (360°)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Radar Chart */}
                    <div className="flex-1 flex items-center justify-center">
                      <svg viewBox="0 0 300 300" className="w-72 h-72">
                        {/* Grid circles */}
                        {[1, 2, 3, 4, 5].map((level) => {
                          const radius = (level / 5) * 100;
                          return (
                            <circle
                              key={level}
                              cx="150"
                              cy="150"
                              r={radius}
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth="1"
                            />
                          );
                        })}
                        
                        {/* Axis lines */}
                        {radarData.map((_, i) => {
                          const angle = ((Math.PI * 2) / radarData.length) * i - Math.PI / 2;
                          const x = 150 + 100 * Math.cos(angle);
                          const y = 150 + 100 * Math.sin(angle);
                          return (
                            <line
                              key={i}
                              x1="150"
                              y1="150"
                              x2={x}
                              y2={y}
                              stroke="#e5e7eb"
                              strokeWidth="1"
                            />
                          );
                        })}
                        
                        {/* Data polygon */}
                        <polygon
                          points={calculateRadarPoints(radarData, 100, 150, 150)}
                          fill="rgba(236, 72, 153, 0.3)"
                          stroke="#ec4899"
                          strokeWidth="3"
                        />
                        
                        {/* Data points */}
                        {radarData.map((point, i) => {
                          const angle = ((Math.PI * 2) / radarData.length) * i - Math.PI / 2;
                          const r = (point.score / point.fullMark) * 100;
                          const x = 150 + r * Math.cos(angle);
                          const y = 150 + r * Math.sin(angle);
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="6"
                              fill="#ec4899"
                              className="drop-shadow-lg"
                            />
                          );
                        })}
                        
                        {/* Labels */}
                        {radarData.map((point, i) => {
                          const angle = ((Math.PI * 2) / radarData.length) * i - Math.PI / 2;
                          const r = 115;
                          const x = 150 + r * Math.cos(angle);
                          const y = 150 + r * Math.sin(angle);
                          return (
                            <text
                              key={i}
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="fill-gray-700 font-semibold"
                              style={{ fontSize: '11px' }}
                            >
                              {point.metric}
                            </text>
                          );
                        })}
                      </svg>
                    </div>
                    
                    {/* Score Cards */}
                    <div className="flex-1 grid grid-cols-1 gap-3">
                      {radarData.map((cat) => {
                        const { label, color, bg } = getCategoryName(cat.score);
                        return (
                          <div key={cat.metric} className={`p-4 rounded-xl border-2 ${bg} ${color.replace('text', 'border')} transition-all hover:scale-105`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-gray-600">{cat.metric}</div>
                                <div className={`text-2xl font-bold ${color}`}>{cat.score.toFixed(1)}</div>
                                <div className="text-xs text-gray-500 font-medium">{label}</div>
                              </div>
                              <Progress value={(cat.score / 5) * 100} className="h-3 w-24 bg-white/50" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-5 h-5" />
                    Key Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {summary.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <CheckCircle2Icon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-800 font-medium">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircleIcon className="w-5 h-5" />
                    Areas for Development
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {summary.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <AlertCircleIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-800 font-medium">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5" />
                  AI-Powered Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200">
                    <div className="text-sm text-green-800 font-bold mb-2 flex items-center gap-2">
                      <TrendingUpIcon className="w-4 h-4" />
                      Burnout Risk Assessment
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={
                        summary.burnout_risk === "low" ? "bg-green-100 text-green-700 border border-green-300" :
                        summary.burnout_risk === "medium" ? "bg-yellow-100 text-yellow-700 border border-yellow-300" :
                        "bg-red-100 text-red-700 border border-red-300"
                      }>
                        {summary.burnout_risk === "low" ? "✓ Low Risk" : 
                         summary.burnout_risk === "medium" ? "⚠ Medium Risk" : "✕ High Risk"}
                      </Badge>
                      <span className="text-sm text-green-700 font-medium">
                        {summary.burnout_risk === "low" ? "Healthy work patterns observed" : 
                         summary.burnout_risk === "medium" ? "Monitor workload and stress levels" : "Immediate attention required"}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                    <div className="text-sm text-blue-800 font-bold mb-2 flex items-center gap-2">
                      <TargetIcon className="w-4 h-4" />
                      Career Growth Potential
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={
                        summary.promotion_potential === "low" ? "bg-gray-100 text-gray-700 border border-gray-300" :
                        summary.promotion_potential === "medium" ? "bg-blue-100 text-blue-700 border border-blue-300" :
                        "bg-green-100 text-green-700 border border-green-300"
                      }>
                        {summary.promotion_potential === "low" ? "Low" : 
                         summary.promotion_potential === "medium" ? "Medium" : "✓ High Potential"}
                      </Badge>
                      <span className="text-sm text-blue-700 font-medium">
                        {summary.promotion_potential === "low" ? "Focus on skill development" : 
                         summary.promotion_potential === "medium" ? "Ready for stretch assignments" : "Ready for advancement opportunities"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Print Styles */}
            <style jsx global>{`
              @media print {
                .no-print { display: none !important; }
                body { background: white; }
                .card { break-inside: avoid; page-break-inside: avoid; }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
