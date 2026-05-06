"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle2Icon,
  ClockIcon,
  UserIcon,
  SendIcon,
  AlertCircleIcon,
  StarIcon,
  MessageSquareIcon,
  SparklesIcon,
  ArrowLeftIcon
} from "lucide-react";
import Link from "next/link";

interface Assignment {
  id: string;
  status: string;
  relationship_type: string;
  due_date: string;
  employee: {
    id: string;
    full_name: string;
    department?: { name: string };
    position?: { title: string };
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
  weight: number;
  criteria: {
    id: string;
    name: string;
    description: string;
  }[];
}

export default function SubmitFeedbackPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignmentsRes, categoriesRes] = await Promise.all([
        fetch("/api/hris/feedback-assignments?status=pending&limit=50"),
        fetch("/api/hris/feedback-categories"),
      ]);

      const assignmentsJson = await assignmentsRes.json();
      const categoriesJson = await categoriesRes.json();

      setAssignments(assignmentsJson.data || []);
      setCategories(categoriesJson.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (assignmentId: string) => {
    setSubmitting(true);
    try {
      const responses = categories.flatMap((category) =>
        category.criteria.map((criteria) => ({
          assignment_id: assignmentId,
          criteria_id: criteria.id,
          rating: ratings[criteria.id] || 0,
          comments: comments[criteria.id] || "",
        }))
      );

      const res = await fetch("/api/hris/feedback-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(responses),
      });

      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          fetchData();
          setSelectedAssignment("");
          setRatings({});
          setComments({});
        }, 2000);
      } else {
        const error = await res.json();
        alert("Error: " + error.error);
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const getRelationshipLabel = (type: string) => {
    const labels: Record<string, string> = {
      self: "Self Assessment",
      manager: "Manager Review",
      peer: "Peer Feedback",
      subordinate: "Subordinate Feedback",
      external: "External Stakeholder",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md",
      in_progress: "bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-md",
      submitted: "bg-gradient-to-r from-green-400 to-green-500 text-white shadow-md",
      completed: "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md",
    };
    return <Badge className={styles[status] || styles.pending}>{status.replace('_', ' ')}</Badge>;
  };

  const getProgress = () => {
    const totalCriteria = categories.reduce((sum, cat) => sum + cat.criteria.length, 0);
    const answered = Object.keys(ratings).length;
    return totalCriteria > 0 ? Math.round((answered / totalCriteria) * 100) : 0;
  };

  const isCategoryComplete = (category: Category) => {
    return category.criteria.every(c => ratings[c.id]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading assignments...</p>
        </div>
      </div>
    );
  }

  // Success Screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-green-400 to-green-500 p-8 text-center">
            <CheckCircle2Icon className="w-20 h-20 text-white mx-auto mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold text-white mb-2">Feedback Submitted!</h2>
            <p className="text-green-100">Thank you for your valuable input</p>
          </div>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-6">Your feedback has been successfully recorded and will contribute to the employee's development.</p>
            <div className="animate-pulse">
              <p className="text-sm text-gray-400">Redirecting...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto py-8 max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/hris/performance/360-feedback/cycles">
            <Button variant="ghost" size="sm" className="mb-4 hover:bg-purple-100 hover:text-purple-700 transition-colors">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <MessageSquareIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Submit 360° Feedback</h1>
                <p className="text-sm text-gray-500 mt-1">Provide constructive feedback to help your colleagues grow</p>
              </div>
            </div>
          </div>
        </div>

        {assignments.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2Icon className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">All Caught Up!</h3>
              <p className="text-gray-500 text-lg mb-6">You don't have any pending feedback assignments at the moment</p>
              <p className="text-sm text-gray-400">New assignments will appear here when you're selected as a reviewer</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Assignment Selection */}
            {!selectedAssignment && (
              <Card className="shadow-lg border-0 bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    Pending Feedback Assignments
                  </CardTitle>
                  <CardDescription className="text-purple-100">
                    Select an employee to provide feedback for
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        onClick={() => setSelectedAssignment(assignment.id)}
                        className="group p-5 border-2 border-gray-200 rounded-xl cursor-pointer transition-all duration-300 hover:border-purple-400 hover:shadow-lg hover:scale-[1.01] bg-gradient-to-r from-white to-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-xl font-bold shadow-md group-hover:scale-110 transition-transform">
                              {assignment.employee.full_name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-gray-900 text-lg">{assignment.employee.full_name}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {assignment.employee.department?.name} • {assignment.employee.position?.title}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-purple-100 text-purple-700 text-xs font-medium">
                                  {getRelationshipLabel(assignment.relationship_type)}
                                </Badge>
                                {assignment.due_date && (
                                  <div className="flex items-center gap-1 text-xs text-orange-600">
                                    <ClockIcon className="w-3 h-3" />
                                    Due: {new Date(assignment.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(assignment.status)}
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feedback Form */}
            {selectedAssignment && (
              <div className="space-y-6">
                {/* Progress Bar */}
                <Card className="shadow-lg border-0 bg-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <SparklesIcon className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-semibold text-gray-700">Completion Progress</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">{getProgress()}%</span>
                    </div>
                    <Progress value={getProgress()} className="h-3 bg-gray-100" />
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{Object.keys(ratings).length} of {categories.reduce((sum, cat) => sum + cat.criteria.length, 0)} criteria rated</span>
                      <span>{getProgress() === 100 ? "✓ Ready to submit!" : "Keep going!"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Categories & Criteria */}
                {categories.map((category, catIndex) => (
                  <Card key={category.id} className={`shadow-lg border-0 overflow-hidden transition-all duration-300 ${
                    isCategoryComplete(category) ? "ring-2 ring-green-400" : ""
                  }`}>
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                              {catIndex + 1}
                            </span>
                            {category.name}
                          </CardTitle>
                          <CardDescription className="text-purple-100 mt-1">
                            {category.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-white/20 text-white text-xs font-medium">
                            Weight: {category.weight}%
                          </Badge>
                          {isCategoryComplete(category) && (
                            <CheckCircle2Icon className="w-6 h-6 text-green-300" />
                          )}
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-6">
                      {category.criteria.map((criteria, criteriaIndex) => (
                        <div key={criteria.id} className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 transition-all duration-300">
                          <div className="mb-4">
                            <div className="flex items-start gap-3 mb-2">
                              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-sm font-bold">
                                {catIndex + 1}.{criteriaIndex + 1}
                              </span>
                              <div>
                                <h4 className="font-bold text-gray-900">{criteria.name}</h4>
                                <p className="text-sm text-gray-500 mt-1 ml-8">{criteria.description}</p>
                              </div>
                            </div>
                          </div>

                          {/* Rating Scale */}
                          <div className="ml-8">
                            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Rating</Label>
                            <div className="flex gap-3">
                              {[1, 2, 3, 4, 5].map((rating) => {
                                const isSelected = ratings[criteria.id] === rating;
                                const getColorClass = () => {
                                  if (!isSelected) return "bg-white border-2 border-gray-300 hover:border-gray-400";
                                  if (rating <= 2) return "bg-gradient-to-br from-red-500 to-red-600 border-2 border-red-700 shadow-lg scale-110";
                                  if (rating === 3) return "bg-gradient-to-br from-yellow-400 to-yellow-500 border-2 border-yellow-600 shadow-lg scale-110";
                                  return "bg-gradient-to-br from-green-500 to-green-600 border-2 border-green-700 shadow-lg scale-110";
                                };
                                
                                const getLabel = () => {
                                  if (rating === 1) return "Very Poor";
                                  if (rating === 2) return "Poor";
                                  if (rating === 3) return "Average";
                                  if (rating === 4) return "Good";
                                  return "Excellent";
                                };

                                return (
                                  <button
                                    key={rating}
                                    type="button"
                                    onClick={() => setRatings({ ...ratings, [criteria.id]: rating })}
                                    className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 ${getColorClass()} ${
                                      isSelected ? "text-white transform -translate-y-1" : "text-gray-600 hover:scale-105"
                                    }`}
                                  >
                                    <div className="text-2xl mb-1">{rating}</div>
                                    <div className="text-xs opacity-80">{getLabel()}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Comments */}
                          <div className="ml-8 mt-4">
                            <Label htmlFor={`comment-${criteria.id}`} className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                              <MessageSquareIcon className="w-4 h-4" />
                              Comments <span className="text-gray-400 font-normal">(Optional but encouraged)</span>
                            </Label>
                            <Textarea
                              id={`comment-${criteria.id}`}
                              value={comments[criteria.id] || ""}
                              onChange={(e) => setComments({ ...comments, [criteria.id]: e.target.value })}
                              placeholder="Provide specific examples and constructive suggestions..."
                              rows={3}
                              className="border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-colors resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Tip: Be specific, objective, and focus on behaviors rather than personality
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                {/* Warning & Submit */}
                <Card className="shadow-lg border-0 bg-gradient-to-r from-yellow-50 to-orange-50 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <AlertCircleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="font-bold text-yellow-800 mb-2">Important Reminder</h4>
                        <p className="text-sm text-yellow-700 leading-relaxed">
                          Your feedback plays a crucial role in your colleague's professional development. 
                          Please ensure your ratings are fair, objective, and backed by specific observations. 
                          Constructive comments help recipients understand their strengths and areas for improvement.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedAssignment("");
                          setRatings({});
                          setComments({});
                        }}
                        className="flex-1 hover:bg-gray-100 transition-colors border-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleSubmit(selectedAssignment)}
                        disabled={submitting || Object.keys(ratings).length === 0}
                        className={`flex-1 shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-base font-semibold ${
                          getProgress() === 100
                            ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                            : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                        }`}
                      >
                        {submitting ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <SendIcon className="w-5 h-5 mr-2" />
                            {getProgress() === 100 ? "Submit Complete Feedback" : `Submit (${getProgress()}% Complete)`}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
