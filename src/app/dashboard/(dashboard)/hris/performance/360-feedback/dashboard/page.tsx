"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  TrophyIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  UsersIcon,
  AlertTriangleIcon,
  DownloadIcon,
  BarChart3Icon,
  TargetIcon,
  MedalIcon,
  ArrowUpIcon,
  ArrowDownIcon
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
  overall_360_score: number;
  kpi_score: number;
  burnout_risk: string;
  promotion_potential: string;
}

interface DepartmentStats {
  name: string;
  employee_count: number;
  avg_final_score: number;
  avg_kpi_score: number;
  avg_360_score: number;
  grade_a: number;
  grade_b: number;
  grade_c: number;
  grade_d: number;
}

export default function ExecutiveDashboardPage() {
  const [summaries, setSummaries] = useState<FeedbackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [topPerformers, setTopPerformers] = useState<FeedbackSummary[]>([]);
  const [lowPerformers, setLowPerformers] = useState<FeedbackSummary[]>([]);
  const [atRiskEmployees, setAtRiskEmployees] = useState<FeedbackSummary[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/hris/feedback-summaries?limit=500");
      const json = await res.json();
      const data = json.data || [];
      
      setSummaries(data);
      
      // Calculate department stats
      const deptMap: Record<string, DepartmentStats> = {};
      data.forEach((s: FeedbackSummary) => {
        const deptName = s.employee.department?.name || "No Department";
        if (!deptMap[deptName]) {
          deptMap[deptName] = {
            name: deptName,
            employee_count: 0,
            avg_final_score: 0,
            avg_kpi_score: 0,
            avg_360_score: 0,
            grade_a: 0,
            grade_b: 0,
            grade_c: 0,
            grade_d: 0,
          };
        }
        deptMap[deptName].employee_count++;
        deptMap[deptName].avg_final_score += s.final_score;
        deptMap[deptName].avg_kpi_score += s.kpi_score;
        deptMap[deptName].avg_360_score += s.overall_360_score;
        if (s.final_grade === 'A') deptMap[deptName].grade_a++;
        else if (s.final_grade === 'B') deptMap[deptName].grade_b++;
        else if (s.final_grade === 'C') deptMap[deptName].grade_c++;
        else if (s.final_grade === 'D') deptMap[deptName].grade_d++;
      });
      
      // Calculate averages
      const deptStats = Object.values(deptMap).map(dept => ({
        ...dept,
        avg_final_score: dept.employee_count > 0 ? dept.avg_final_score / dept.employee_count : 0,
        avg_kpi_score: dept.employee_count > 0 ? dept.avg_kpi_score / dept.employee_count : 0,
        avg_360_score: dept.employee_count > 0 ? dept.avg_360_score / dept.employee_count : 0,
      })).sort((a, b) => b.avg_final_score - a.avg_final_score);
      
      setDepartmentStats(deptStats);
      
      // Top performers (top 10 by final score)
      const top10 = [...data].sort((a, b) => b.final_score - a.final_score).slice(0, 10);
      setTopPerformers(top10);
      
      // Low performers (bottom 10)
      const bottom10 = [...data].sort((a, b) => a.final_score - b.final_score).slice(0, 10);
      setLowPerformers(bottom10);
      
      // At-risk employees (high burnout risk OR grade D/E)
      const atRisk = data.filter((s: FeedbackSummary) => 
        s.burnout_risk === 'high' || s.final_grade === 'D' || s.final_grade === 'E'
      ).sort((a, b) => a.final_score - b.final_score);
      setAtRiskEmployees(atRisk);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "bg-green-100 text-green-700",
      B: "bg-blue-100 text-blue-700",
      C: "bg-yellow-100 text-yellow-700",
      D: "bg-orange-100 text-orange-700",
      E: "bg-red-100 text-red-700",
    };
    return colors[grade] || "bg-gray-100 text-gray-700";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // Calculate overall stats
  const overallStats = {
    total_employees: summaries.length,
    avg_final_score: summaries.length > 0 ? summaries.reduce((sum, s) => sum + s.final_score, 0) / summaries.length : 0,
    avg_kpi_score: summaries.length > 0 ? summaries.reduce((sum, s) => sum + s.kpi_score, 0) / summaries.length : 0,
    avg_360_score: summaries.length > 0 ? summaries.reduce((sum, s) => sum + s.overall_360_score, 0) / summaries.length : 0,
    grade_a: summaries.filter(s => s.final_grade === 'A').length,
    grade_b: summaries.filter(s => s.final_grade === 'B').length,
    grade_c: summaries.filter(s => s.final_grade === 'C').length,
    grade_d: summaries.filter(s => s.final_grade === 'D' || s.final_grade === 'E').length,
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-gray-500 py-12">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl print:max-w-none">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-sm text-gray-500">360° Performance Overview - Q1 2026</p>
        </div>
        <Button onClick={exportToPDF} variant="outline">
          <DownloadIcon className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{overallStats.total_employees}</div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              Across {departmentStats.length} departments
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TargetIcon className="w-4 h-4" />
              Avg Final Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(overallStats.avg_final_score)}`}>
              {overallStats.avg_final_score.toFixed(1)}
            </div>
            <Progress value={overallStats.avg_final_score} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <BarChart3Icon className="w-4 h-4" />
              KPI vs 360°
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>KPI</span>
                <span className="font-medium">{overallStats.avg_kpi_score.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>360°</span>
                <span className="font-medium">{overallStats.avg_360_score.toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <MedalIcon className="w-4 h-4" />
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge className="bg-green-100 text-green-700">A: {overallStats.grade_a}</Badge>
              <Badge className="bg-blue-100 text-blue-700">B: {overallStats.grade_b}</Badge>
              <Badge className="bg-yellow-100 text-yellow-700">C: {overallStats.grade_c}</Badge>
              <Badge className="bg-orange-100 text-orange-700">D: {overallStats.grade_d}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Comparison */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="w-5 h-5" />
            Department Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departmentStats.map((dept) => (
              <div key={dept.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{dept.name}</span>
                    <Badge variant="outline" className="text-xs">{dept.employee_count} employees</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(dept.avg_final_score)}`}>
                        {dept.avg_final_score.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">Avg Score</div>
                    </div>
                    <div className="w-32">
                      <Progress value={dept.avg_final_score} className="h-2" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-gray-500">KPI:</span>
                  <span className="font-medium">{dept.avg_kpi_score.toFixed(1)}</span>
                  <span className="text-gray-500 ml-2">360°:</span>
                  <span className="font-medium">{dept.avg_360_score.toFixed(1)}</span>
                  <div className="ml-auto flex gap-1">
                    {dept.grade_a > 0 && <Badge className="bg-green-100 text-green-700 text-xs">A:{dept.grade_a}</Badge>}
                    {dept.grade_b > 0 && <Badge className="bg-blue-100 text-blue-700 text-xs">B:{dept.grade_b}</Badge>}
                    {dept.grade_c > 0 && <Badge className="bg-yellow-100 text-yellow-700 text-xs">C:{dept.grade_c}</Badge>}
                    {dept.grade_d > 0 && <Badge className="bg-orange-100 text-orange-700 text-xs">D:{dept.grade_d}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top & Low Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrophyIcon className="w-5 h-5" />
              Top 10 Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((emp, idx) => (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                      idx === 0 ? "bg-yellow-500" :
                      idx === 1 ? "bg-gray-400" :
                      idx === 2 ? "bg-orange-500" :
                      "bg-blue-500"
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{emp.employee.full_name}</div>
                      <div className="text-xs text-gray-500">{emp.employee.department?.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(emp.final_score)}`}>
                      {emp.final_score.toFixed(1)}
                    </div>
                    <Badge className={getGradeColor(emp.final_grade)}>Grade {emp.final_grade}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <TrendingDownIcon className="w-5 h-5" />
              Bottom 10 Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowPerformers.map((emp, idx) => (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm bg-red-500">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{emp.employee.full_name}</div>
                      <div className="text-xs text-gray-500">{emp.employee.department?.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(emp.final_score)}`}>
                      {emp.final_score.toFixed(1)}
                    </div>
                    <Badge className={getGradeColor(emp.final_grade)}>Grade {emp.final_grade}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Employees */}
      {atRiskEmployees.length > 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangleIcon className="w-5 h-5" />
              Employees Requiring Attention ({atRiskEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Employee</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Department</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Final Score</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Grade</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Burnout Risk</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Promotion Potential</th>
                  </tr>
                </thead>
                <tbody>
                  {atRiskEmployees.slice(0, 10).map(emp => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">{emp.employee.full_name}</td>
                      <td className="py-3 px-3 text-gray-500">{emp.employee.department?.name}</td>
                      <td className={`py-3 px-3 text-right font-bold ${getScoreColor(emp.final_score)}`}>
                        {emp.final_score.toFixed(1)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={getGradeColor(emp.final_grade)}>Grade {emp.final_grade}</Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={
                          emp.burnout_risk === "high" ? "bg-red-100 text-red-700" :
                          emp.burnout_risk === "medium" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }>
                          {emp.burnout_risk === "high" ? "✕ High" : emp.burnout_risk === "medium" ? "⚠ Medium" : "✓ Low"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={
                          emp.promotion_potential === "high" ? "bg-green-100 text-green-700" :
                          emp.promotion_potential === "medium" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }>
                          {emp.promotion_potential === "high" ? "High" : emp.promotion_potential === "medium" ? "Medium" : "Low"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .card { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
