"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  MessageSquareIcon,
  FilterIcon,
  EyeIcon,
  AlertTriangleIcon,
  SparklesIcon,
  BarChart3Icon
} from "lucide-react";

interface Assignment {
  id: string;
  status: string;
  relationship_type: string;
  submitted_at: string;
  manager_comments?: string;
  rejection_reason?: string;
  employee: {
    nip: string;
    full_name: string;
    department?: { name: string };
    position?: { title: string };
  };
  cycle: {
    name: string;
    period_label: string;
  };
  responses?: Array<{
    criteria: {
      name: string;
      category: { name: string };
    };
    rating: number;
    comments?: string;
  }>;
}

export default function FeedbackApprovalsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [managerComments, setManagerComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, [filterStatus]);

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`/api/hris/feedback-approvals?status=${filterStatus}&limit=50`);
      const json = await res.json();
      setAssignments(json.data || []);
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (assignmentId: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/hris/feedback-approvals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          manager_comments: managerComments,
        }),
      });

      if (res.ok) {
        alert("✅ Feedback approved successfully!");
        setShowApproveModal(false);
        setManagerComments("");
        fetchApprovals();
      } else {
        const error = await res.json();
        alert("❌ Error: " + error.error);
      }
    } catch (error) {
      console.error("Error approving feedback:", error);
      alert("❌ Failed to approve feedback");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (assignmentId: string) => {
    if (!rejectionReason.trim()) {
      alert("⚠️ Rejection reason is required");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/hris/feedback-approvals/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          rejection_reason: rejectionReason,
        }),
      });

      if (res.ok) {
        alert("✅ Feedback rejected. Employee has been notified.");
        setShowRejectModal(false);
        setRejectionReason("");
        fetchApprovals();
      } else {
        const error = await res.json();
        alert("❌ Error: " + error.error);
      }
    } catch (error) {
      console.error("Error rejecting feedback:", error);
      alert("❌ Failed to reject feedback");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md",
      approved: "bg-gradient-to-r from-green-400 to-green-500 text-white shadow-md",
      rejected: "bg-gradient-to-r from-red-400 to-red-500 text-white shadow-md",
    };
    const labels: Record<string, string> = {
      submitted: "⏳ Pending Review",
      approved: "✓ Approved",
      rejected: "✕ Rejected",
    };
    return <Badge className={styles[status] || styles.submitted}>{labels[status] || status}</Badge>;
  };

  const getAverageRating = (responses?: Assignment['responses']) => {
    if (!responses || responses.length === 0) return 0;
    const sum = responses.reduce((acc, r) => acc + r.rating, 0);
    return (sum / responses.length).toFixed(1);
  };

  const getCategoryAverage = (responses?: Assignment['responses'], categoryName?: string) => {
    if (!responses) return 0;
    const filtered = responses.filter(r => r.criteria.category.name === categoryName);
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, r) => acc + r.rating, 0);
    return (sum / filtered.length).toFixed(1);
  };

  // Stats
  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'submitted').length,
    approved: assignments.filter(a => a.status === 'approved').length,
    rejected: assignments.filter(a => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="container mx-auto py-8 max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <CheckCircle2Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Manager Approval Queue</h1>
                <p className="text-sm text-gray-500 mt-1">Review and approve employee self-assessments</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <ClockIcon className="w-4 h-4 text-yellow-600" />
                  <div className="text-xs text-yellow-600 font-semibold uppercase tracking-wide">Pending</div>
                </div>
                <div className="text-3xl font-bold text-yellow-900">{stats.pending}</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2Icon className="w-4 h-4 text-green-600" />
                  <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Approved</div>
                </div>
                <div className="text-3xl font-bold text-green-900">{stats.approved}</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <XCircleIcon className="w-4 h-4 text-red-600" />
                  <div className="text-xs text-red-600 font-semibold uppercase tracking-wide">Rejected</div>
                </div>
                <div className="text-3xl font-bold text-red-900">{stats.rejected}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3Icon className="w-4 h-4 text-blue-600" />
                  <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total</div>
                </div>
                <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
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
                  variant={filterStatus === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("pending")}
                  className={filterStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" : "hover:bg-gray-100"}
                >
                  ⏳ Pending ({stats.pending})
                </Button>
                <Button
                  variant={filterStatus === "approved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("approved")}
                  className={filterStatus === "approved" ? "bg-green-600 hover:bg-green-700" : "hover:bg-gray-100"}
                >
                  ✓ Approved ({stats.approved})
                </Button>
                <Button
                  variant={filterStatus === "rejected" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("rejected")}
                  className={filterStatus === "rejected" ? "bg-red-600 hover:bg-red-700" : "hover:bg-gray-100"}
                >
                  ✕ Rejected ({stats.rejected})
                </Button>
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                  className={filterStatus === "all" ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-gray-100"}
                >
                  All ({stats.total})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approvals List */}
        {assignments.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2Icon className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">All Caught Up!</h3>
              <p className="text-gray-500 text-lg">No submissions requiring your review at the moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="shadow-lg border-0 bg-white overflow-hidden hover:shadow-xl transition-all duration-300">
                {/* Card Header */}
                <div className={`px-6 py-4 ${
                  assignment.status === 'submitted' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                  assignment.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                  'bg-gradient-to-r from-red-500 to-red-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                        {assignment.employee.full_name.charAt(0)}
                      </div>
                      <div className="text-white">
                        <h3 className="font-bold text-lg">{assignment.employee.full_name}</h3>
                        <p className="text-sm text-white/90">
                          {assignment.employee.nip} • {assignment.employee.department?.name} • {assignment.employee.position?.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(assignment.status)}
                      <div className="text-white/90 text-sm">
                        Submitted: {new Date(assignment.submitted_at!).toLocaleDateString('id-ID', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Cycle Info */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <SparklesIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Cycle:</span>
                    <span>{assignment.cycle.name} ({assignment.cycle.period_label})</span>
                    <span className="mx-2">•</span>
                    <span className="font-medium">Type:</span>
                    <Badge variant="outline" className="text-xs">{assignment.relationship_type}</Badge>
                  </div>

                  {/* Ratings Summary */}
                  {assignment.responses && assignment.responses.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <BarChart3Icon className="w-4 h-4" />
                        Ratings Summary
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {['Leadership', 'Communication', 'Collaboration', 'Accountability', 'Problem Solving'].map((category) => (
                          <div key={category} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-200">
                            <div className="text-xs text-gray-500 font-medium mb-1">{category}</div>
                            <div className="flex items-end justify-between">
                              <div className="text-2xl font-bold text-gray-900">
                                {getCategoryAverage(assignment.responses, category)}
                              </div>
                              <div className="text-xs text-gray-400">/ 5.0</div>
                            </div>
                            <Progress value={(parseFloat(getCategoryAverage(assignment.responses, category)) / 5) * 100} className="h-2 mt-2" />
                          </div>
                        ))}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
                          <div className="text-xs text-blue-600 font-medium mb-1">Overall Average</div>
                          <div className="flex items-end justify-between">
                            <div className="text-3xl font-bold text-blue-900">
                              {getAverageRating(assignment.responses)}
                            </div>
                            <div className="text-xs text-blue-400">/ 5.0</div>
                          </div>
                          <Progress value={(parseFloat(getAverageRating(assignment.responses)) / 5) * 100} className="h-2 mt-2 bg-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Responses */}
                  {assignment.responses && assignment.responses.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MessageSquareIcon className="w-4 h-4" />
                        Detailed Feedback
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {assignment.responses.map((response, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-semibold text-gray-900">{response.criteria.name}</div>
                                <div className="text-xs text-gray-500">{response.criteria.category.name}</div>
                              </div>
                              <Badge className={
                                response.rating >= 4 ? "bg-green-100 text-green-700" :
                                response.rating >= 3 ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              }>
                                {response.rating}/5
                              </Badge>
                            </div>
                            {response.comments && (
                              <p className="text-sm text-gray-600 italic">"{response.comments}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous Manager Comments */}
                  {assignment.manager_comments && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2Icon className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-800">Approved - Manager Comments</span>
                      </div>
                      <p className="text-sm text-green-700">{assignment.manager_comments}</p>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {assignment.rejection_reason && (
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangleIcon className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-red-800">Rejected - Reason</span>
                      </div>
                      <p className="text-sm text-red-700">{assignment.rejection_reason}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {assignment.status === 'submitted' && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <Button
                        onClick={() => {
                          setSelectedAssignment(assignment.id);
                          setShowApproveModal(true);
                        }}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
                      >
                        <CheckCircle2Icon className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedAssignment(assignment.id);
                          setShowRejectModal(true);
                        }}
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                      >
                        <XCircleIcon className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Approve Modal */}
        {showApproveModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-lg w-full shadow-2xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckCircle2Icon className="w-6 h-6" />
                  Approve Submission
                </h3>
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Manager Comments (Optional)
                  </label>
                  <Textarea
                    value={managerComments}
                    onChange={(e) => setManagerComments(e.target.value)}
                    placeholder="Add your feedback, recognition, or suggestions..."
                    rows={4}
                    className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: Acknowledge strengths and provide constructive guidance
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowApproveModal(false);
                      setManagerComments("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedAssignment)}
                    disabled={processing}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  >
                    {processing ? "Processing..." : "Confirm Approval"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-lg w-full shadow-2xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangleIcon className="w-6 h-6" />
                  Reject Submission
                </h3>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">
                    ⚠️ This will send the submission back to the employee for revision. They will be notified with your feedback.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this submission needs revision..."
                    rows={4}
                    className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Be specific and constructive in your feedback
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReason("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedAssignment)}
                    disabled={processing || !rejectionReason.trim()}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  >
                    {processing ? "Processing..." : "Reject Submission"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
