"use client";

import { useState, useEffect } from "react";
import { LeaveRequestForm } from "@/components/hris/LeaveRequestForm";
import { ApprovalButtons } from "@/components/hris/ApprovalButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Download,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS } from "@/types/hris";

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  created_at: string;
  employee?: {
    full_name: string;
    nip: string;
    department?: { name: string };
  };
  approver?: {
    full_name: string;
  };
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLeaves();
  }, [filterStatus, filterType]);

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "100",
        ...(filterStatus !== "all" ? { status: filterStatus } : {}),
        ...(filterType !== "all" ? { leave_type: filterType } : {}),
      });

      const response = await fetch(`/api/hris/leaves?${params}`);
      const result = await response.json();

      if (result.data) {
        setLeaves(result.data);
      }
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = (data: any) => {
    console.log("Approved:", data);
    fetchLeaves(); // Refresh list
  };

  const handleReject = (data: any) => {
    console.log("Rejected:", data);
    fetchLeaves(); // Refresh list
  };

  const handleSuccess = () => {
    setShowNewDialog(false);
    fetchLeaves(); // Refresh list
  };

  const handleExport = async () => {
    try {
      // Build query params from filters
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.set('status', filterStatus);
      }
      if (filterType !== 'all') {
        params.set('leave_type', filterType);
      }
      
      const response = await fetch(`/api/hris/leaves/export?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }
      
      // Download CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export gagal: ' + (error as Error).message);
    }
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      leave.employee?.full_name?.toLowerCase().includes(query) ||
      leave.employee?.nip?.toLowerCase().includes(query) ||
      leave.reason?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const colors = LEAVE_STATUS_COLORS[status as keyof typeof LEAVE_STATUS_COLORS] || "bg-gray-100 text-gray-800";
    return (
      <Badge variant="outline" className={colors}>
        {LEAVE_STATUS_LABELS[status as keyof typeof LEAVE_STATUS_LABELS] || status}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manajemen Cuti & Izin</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola pengajuan cuti karyawan dengan approval workflow</p>
        </div>

        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setShowNewDialog(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span className="hidden sm:inline">Ajukan Cuti</span>
          <span className="sm:hidden">Cuti</span>
        </Button>
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajukan Cuti / Izin Baru</DialogTitle>
            <DialogDescription>
              Isi formulir untuk mengajukan cuti atau izin
            </DialogDescription>
          </DialogHeader>
          <LeaveRequestForm onSuccess={handleSuccess} onCancel={() => setShowNewDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Filters */}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari berdasarkan nama karyawan atau alasan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </CardContent>
          </Card>
        ) : filteredLeaves.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Belum ada pengajuan cuti</p>
            </CardContent>
          </Card>
        ) : (
          filteredLeaves.map((leave) => (
            <Card key={leave.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{leave.employee?.full_name || "Unknown"}</CardTitle>
                      <p className="text-sm text-gray-500">
                        {leave.employee?.nip} • {leave.employee?.department?.name || "-"}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(leave.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Jenis Cuti</p>
                      <Badge variant="outline" className="mt-1">
                        {LEAVE_TYPE_LABELS[leave.leave_type as keyof typeof LEAVE_TYPE_LABELS] || leave.leave_type}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700">Periode</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(leave.start_date)}</span>
                        <span>-</span>
                        <span>{formatDate(leave.end_date)}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700">Durasi</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{leave.total_days} hari kerja</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Alasan</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{leave.reason}</p>
                    </div>

                    {leave.status === "approved" && leave.approver && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Disetujui oleh {leave.approver.full_name}</span>
                      </div>
                    )}

                    {leave.status === "rejected" && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span>Ditolak</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {leave.status === "pending" && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500">
                      Diajukan: {new Date(leave.created_at).toLocaleDateString("id-ID")}
                    </p>
                    <ApprovalButtons
                      leaveId={leave.id}
                      currentStatus={leave.status}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leaves.filter(l => l.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Disetujui</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leaves.filter(l => l.status === "approved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ditolak</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leaves.filter(l => l.status === "rejected").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{leaves.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
