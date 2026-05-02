"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Briefcase, Mail, Phone, MapPin } from "lucide-react";
import { PromoteCandidateButton } from "@/../components/hris/PromoteCandidateButton";

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position_applied: string;
  status: string;
  created_at: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching candidates:", error);
    } else {
      setCandidates(data || []);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "screening":
        return "bg-yellow-100 text-yellow-800";
      case "interview_hrd":
        return "bg-purple-100 text-purple-800";
      case "interview_manager":
        return "bg-orange-100 text-orange-800";
      case "offered":
        return "bg-indigo-100 text-indigo-800";
      case "hired":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: "Baru",
      screening: "Screening",
      interview_hrd: "Interview HRD",
      interview_manager: "Interview Manager",
      offered: "Offered",
      hired: "Hired",
      rejected: "Rejected",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kandidat</h1>
          <p className="text-gray-500 mt-1">Kelola lamaran masuk</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Total: {candidates.length} kandidat
          </span>
        </div>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Belum ada kandidat</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {candidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{candidate.full_name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{candidate.position_applied}</p>
                  </div>
                  <Badge className={getStatusColor(candidate.status)}>
                    {getStatusLabel(candidate.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{candidate.email}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-xs text-gray-500">
                    Dilamar: {new Date(candidate.created_at).toLocaleDateString('id-ID')}
                  </span>
                  {candidate.status === 'hired' && (
                    <PromoteCandidateButton
                      candidateId={candidate.id}
                      candidateName={candidate.full_name}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
