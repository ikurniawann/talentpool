"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrophyIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  UserIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  BarChart3Icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FeedbackSummary {
  id: string;
  employee: any;
  cycle: any;
  leadership_score: number;
  communication_score: number;
  collaboration_score: number;
  accountability_score: number;
  problem_solving_score: number;
  overall_360_score: number;
  kpi_score: number;
  final_score: number;
  final_grade: string;
  burnout_risk: string;
  promotion_potential: string;
  strengths?: string[];
  weaknesses?: string[];
}

export default function FeedbackResultsPage() {
  const [summaries, setSummaries] = useState<FeedbackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "name" | "grade">("score");

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      const res = await fetch("/api/hris/feedback-summaries?limit=500");
      const json = await res.json();
      setSummaries(json.data || []);
    } catch (error) {
      console.error("Error fetching summaries:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "bg-gradient-to-r from-green-400 to-green-500 text-white shadow-md",
      B: "bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-md",
      C: "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md",
      D: "bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md",
      E: "bg-gradient-to-r from-red-400 to-red-500 text-white shadow-md",
    };
    return colors[grade] || "bg-gray-100 text-gray-700";
  };

  const getRiskBadge = (risk: string) => {
    const styles: Record<string, string> = {
      low: "bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200",
      medium: "bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border border-yellow-200",
      high: "bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200",
    };
    return (
      <Badge className={`${styles[risk] || styles.low} px-3 py-1 font-medium`}>
        {risk === "low" ? "✓ Low" : risk === "medium" ? "⚠ Medium" : "✕ High"}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const exportToPDF = () => {
    window.print();
  };

  // Filter & Sort - remove null/invalid data
  const filteredSummaries = summaries
    .filter((s) => s.final_score != null && s.final_score !== undefined)
    .filter((s) => {
      const matchGrade = filterGrade ? s.final_grade === filterGrade : true;
      const matchSearch = searchQuery
        ? s.employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.employee.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.employee.department?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchGrade && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.final_score || 0) - (a.final_score || 0);
      if (sortBy === "name") return a.employee.full_name.localeCompare(b.employee.full_name);
      if (sortBy === "grade") {
        const gradeOrder = { A: 5, B: 4, C: 3, D: 2, E: 1 };
        return gradeOrder[b.final_grade as keyof typeof gradeOrder] - gradeOrder[a.final_grade as keyof typeof gradeOrder];
      }
      return 0;
    });

  // Statistics - only count valid data
  const validSummaries = summaries.filter(s => s.final_score != null && s.final_score !== undefined);
  const stats = {
    total: validSummaries.length,
    avgScore: validSummaries.length > 0 ? validSummaries.reduce((sum, s) => sum + (s.final_score || 0), 0) / validSummaries.length : 0,
    gradeA: validSummaries.filter(s => s.final_grade === 'A').length,
    gradeB: validSummaries.filter(s => s.final_grade === 'B').length,
    gradeC: validSummaries.filter(s => s.final_grade === 'C').length,
    gradeD: validSummaries.filter(s => s.final_grade === 'D' || s.final_grade === 'E').length,
    highRisk: validSummaries.filter(s => s.burnout_risk === 'high').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      <div className="container mx-auto py-8 max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <BarChart3Icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Performance Results</h1>
                  <p className="text-sm text-gray-500 mt-1">Comprehensive 360° feedback analysis for all employees</p>
                </div>
              </div>
              <Button onClick={exportToPDF} variant="outline" className="hover:bg-blue-50 hover:border-blue-300 transition-colors">
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Total</div>
                <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-1">Avg Score</div>
                <div className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>{stats.avgScore.toFixed(1)}</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Grade A</div>
                <div className="text-2xl font-bold text-green-900">{stats.gradeA}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Grade B</div>
                <div className="text-2xl font-bold text-blue-900">{stats.gradeB}</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                <div className="text-xs text-yellow-600 font-semibold uppercase tracking-wide mb-1">Grade C</div>
                <div className="text-2xl font-bold text-yellow-900">{stats.gradeC}</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="text-xs text-orange-600 font-semibold uppercase tracking-wide mb-1">Grade D</div>
                <div className="text-2xl font-bold text-orange-900">{stats.gradeD}</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                <div className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1">High Risk</div>
                <div className="text-2xl font-bold text-red-900">{stats.highRisk}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-lg border-0 bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name, NIP, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                />
              </div>
              
              {/* Grade Filter */}
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                <option value="">All Grades</option>
                <option value="A">Grade A (Excellent)</option>
                <option value="B">Grade B (Good)</option>
                <option value="C">Grade C (Average)</option>
                <option value="D">Grade D (Below Average)</option>
                <option value="E">Grade E (Poor)</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                <option value="score">Sort by Score (High-Low)</option>
                <option value="grade">Sort by Grade (A-E)</option>
                <option value="name">Sort by Name (A-Z)</option>
              </select>
            </div>

            {/* Active Filters Display */}
            {(filterGrade || searchQuery) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <FilterIcon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Active filters:</span>
                {filterGrade && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer" onClick={() => setFilterGrade("")}>
                    Grade {filterGrade} ✕
                  </Badge>
                )}
                {searchQuery && (
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer" onClick={() => setSearchQuery("")}>
                    "{searchQuery}" ✕
                  </Badge>
                )}
                <span className="text-sm text-gray-400 ml-auto">
                  Showing {filteredSummaries.length} of {summaries.length}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {filteredSummaries.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-500">Try adjusting your filters or search query</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSummaries.map((summary) => (
              <Card key={summary.id} className="shadow-lg border-0 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    {/* Avatar & Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-2xl font-bold shadow-md group-hover:scale-110 transition-transform">
                        {summary.employee.full_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{summary.employee.full_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{summary.employee.nip}</span>
                          <span>•</span>
                          <span>{summary.employee.department?.name || "No Dept"}</span>
                          <span>•</span>
                          <span>{summary.employee.position?.title || "No Position"}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Cycle: {summary.cycle?.name || summary.cycle?.period_label || "N/A"}
                        </div>
                      </div>
                    </div>

                    {/* Score & Grade */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-4xl font-bold mb-2 ${getScoreColor(summary.final_score || 0)}`}>
                        {(summary.final_score || 0).toFixed(1)}
                      </div>
                      <Badge className={`${getGradeColor(summary.final_grade || 'C')} px-4 py-1.5 text-base font-bold shadow-md`}>
                        Grade {summary.final_grade || 'N/A'}
                      </Badge>
                    </div>
                  </div>

                  {/* Scores Breakdown */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* KPI & 360 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">KPI Score (70%)</span>
                        <span className={`font-bold ${getScoreColor(summary.kpi_score || 0)}`}>{summary.kpi_score.toFixed(1)}</span>
                      </div>
                      <Progress value={summary.kpi_score} className="h-2.5" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">360° Score (30%)</span>
                        <span className={`font-bold ${getScoreColor(summary.overall_360_score || 0)}`}>{summary.overall_360_score.toFixed(1)}</span>
                      </div>
                      <Progress value={(summary.overall_360_score / 100) * 100} className="h-2.5" />
                    </div>

                    {/* Behavioral Scores */}
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Behavioral Competencies</div>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { label: "Lead", score: summary.leadership_score || 0 },
                          { label: "Comm", score: summary.communication_score || 0 },
                          { label: "Collab", score: summary.collaboration_score || 0 },
                          { label: "Acct", score: summary.accountability_score || 0 },
                          { label: "Prob", score: summary.problem_solving_score || 0 },
                        ].map((cat) => (
                          <div key={cat.label} className="text-center">
                            <div className={`text-lg font-bold ${getScoreColor(cat.score * 20)}`}>{cat.score.toFixed(1)}</div>
                            <div className="text-xs text-gray-400">{cat.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Risk & Potential */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-medium">Burnout Risk</span>
                        {getRiskBadge(summary.burnout_risk || 'low')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-medium">Promotion Potential</span>
                        {getRiskBadge(summary.promotion_potential || 'low')}
                      </div>
                      {summary.strengths && summary.strengths.length > 0 && (
                        <div className="flex items-start gap-2 text-xs text-green-600 mt-2">
                          <CheckCircle2Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{summary.strengths[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
    </div>
  );
}
