"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  CalendarIcon,
  UsersIcon,
  CheckCircle2Icon,
  ClockIcon,
  PlusIcon,
  EyeIcon,
  EditIcon,
  Trash2Icon,
  BarChart3Icon,
  TrendingUpIcon,
  FilterIcon
} from "lucide-react";
import Link from "next/link";

interface FeedbackCycle {
  id: string;
  name: string;
  period_label: string;
  start_date: string;
  end_date: string;
  status: string;
  kpi_weight: number;
  feedback_weight: number;
  is_anonymous: boolean;
  created_at: string;
  assignments_count?: { count: number }[];
  summaries_count?: { count: number }[];
}

export default function FeedbackCyclesPage() {
  const [cycles, setCycles] = useState<FeedbackCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    fetchCycles();
  }, [filterStatus]);

  const fetchCycles = async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterStatus) params.set("status", filterStatus);
      
      const res = await fetch(`/api/hris/feedback-cycles?${params}`);
      const json = await res.json();
      setCycles(json.data || []);
    } catch (error) {
      console.error("Error fetching cycles:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md",
      active: "bg-gradient-to-r from-green-400 to-green-500 text-white shadow-md",
      completed: "bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-md",
      cancelled: "bg-gradient-to-r from-red-400 to-red-500 text-white shadow-md",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      active: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return <Badge className={styles[status] || styles.draft}>{labels[status] || status}</Badge>;
  };

  const getCompletionRate = (cycle: FeedbackCycle) => {
    const total = cycle.assignments_count?.[0]?.count || 0;
    const completed = cycle.summaries_count?.[0]?.count || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Statistics
  const stats = {
    total: cycles.length,
    active: cycles.filter(c => c.status === 'active').length,
    completed: cycles.filter(c => c.status === 'completed').length,
    draft: cycles.filter(c => c.status === 'draft').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading cycles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto py-8 max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <CalendarIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Feedback Cycles</h1>
                  <p className="text-sm text-gray-500 mt-1">Manage performance review periods and track progress</p>
                </div>
              </div>
              <Link href="/dashboard/hris/performance/360-feedback/cycles/new">
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-6 text-base font-semibold">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  New Cycle
                </Button>
              </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Cycles</div>
                </div>
                <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2Icon className="w-4 h-4 text-green-600" />
                  <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Active</div>
                </div>
                <div className="text-3xl font-bold text-green-900">{stats.active}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUpIcon className="w-4 h-4 text-purple-600" />
                  <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Completed</div>
                </div>
                <div className="text-3xl font-bold text-purple-900">{stats.completed}</div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <ClockIcon className="w-4 h-4 text-gray-600" />
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Draft</div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.draft}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-lg border-0 bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <FilterIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Filter by Status:</span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filterStatus === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("")}
                  className={filterStatus === "" ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-gray-100"}
                >
                  All ({stats.total})
                </Button>
                <Button
                  variant={filterStatus === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("active")}
                  className={filterStatus === "active" ? "bg-green-600 hover:bg-green-700" : "hover:bg-gray-100"}
                >
                  Active ({stats.active})
                </Button>
                <Button
                  variant={filterStatus === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("completed")}
                  className={filterStatus === "completed" ? "bg-purple-600 hover:bg-purple-700" : "hover:bg-gray-100"}
                >
                  Completed ({stats.completed})
                </Button>
                <Button
                  variant={filterStatus === "draft" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("draft")}
                  className={filterStatus === "draft" ? "bg-gray-600 hover:bg-gray-700" : "hover:bg-gray-100"}
                >
                  Draft ({stats.draft})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cycles Grid */}
        {cycles.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mx-auto mb-6">
                <CalendarIcon className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Cycles Yet</h3>
              <p className="text-gray-500 text-lg mb-6">Create your first feedback cycle to get started</p>
              <Link href="/dashboard/hris/performance/360-feedback/cycles/new">
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create First Cycle
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cycles.map((cycle) => (
              <Card key={cycle.id} className="shadow-lg border-0 bg-white overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                {/* Card Header with Gradient */}
                <div className={`bg-gradient-to-r ${
                  cycle.status === 'active' ? 'from-green-500 to-green-600' :
                  cycle.status === 'completed' ? 'from-blue-500 to-blue-600' :
                  cycle.status === 'cancelled' ? 'from-red-500 to-red-600' :
                  'from-gray-500 to-gray-600'
                } px-6 py-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg font-bold mb-1">{cycle.name}</CardTitle>
                      <CardDescription className="text-white/90 text-sm font-medium">
                        {cycle.period_label}
                      </CardDescription>
                    </div>
                    {getStatusBadge(cycle.status)}
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  {/* Dates */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-700">Period</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}
                      </div>
                    </div>
                  </div>

                  {/* Weights */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="text-xs text-blue-600 font-semibold mb-1">KPI Weight</div>
                      <div className="text-2xl font-bold text-blue-900">{cycle.kpi_weight}%</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <div className="text-xs text-purple-600 font-semibold mb-1">360° Weight</div>
                      <div className="text-2xl font-bold text-purple-900">{cycle.feedback_weight}%</div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium flex items-center gap-2">
                        <BarChart3Icon className="w-4 h-4" />
                        Completion Progress
                      </span>
                      <span className="font-bold text-blue-600">{getCompletionRate(cycle)}%</span>
                    </div>
                    <Progress value={getCompletionRate(cycle)} className="h-2.5 bg-gray-100" />
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <UsersIcon className="w-3 h-3" />
                      <span>
                        {cycle.summaries_count?.[0]?.count || 0} of {cycle.assignments_count?.[0]?.count || 0} completed
                      </span>
                    </div>
                  </div>

                  {/* Settings Badges */}
                  <div className="flex gap-2 flex-wrap pt-2">
                    <Badge variant={cycle.is_anonymous ? "default" : "outline"} className="text-xs">
                      {cycle.is_anonymous ? "🔒 Anonymous" : "👤 Not Anonymous"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {cycle.allow_self_assessment ? "✓ Self Review" : "✕ No Self"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {cycle.require_manager_review ? "✓ Manager Approval" : "✕ No Approval"}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <Link href={`/dashboard/hris/performance/360-feedback/cycles/${cycle.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full hover:bg-blue-50 hover:border-blue-300 transition-colors">
                        <EyeIcon className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </Link>
                    {cycle.status === 'draft' && (
                      <Link href={`/dashboard/hris/performance/360-feedback/cycles/${cycle.id}/edit`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full hover:bg-purple-50 hover:border-purple-300 transition-colors">
                          <EditIcon className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    )}
                    {cycle.status === 'active' && (
                      <Link href={`/dashboard/hris/performance/360-feedback/results?cycle=${cycle.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full hover:bg-green-50 hover:border-green-300 transition-colors">
                          <BarChart3Icon className="w-3 h-3 mr-1" />
                          Results
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
