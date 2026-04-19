import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Printer, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  User
} from "lucide-react";
import { 
  formatRupiah, 
  formatDate, 
  getPRStatusLabel, 
  getPriorityBadge,
  getRequiredApprovalLevel 
} from "@/lib/purchasing/utils";
import { PRItem } from "@/types/purchasing";

interface PRDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PRDetailPage({ params }: PRDetailPageProps) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch PR with all relations
  const { data: pr } = await supabase
    .from("purchase_requests")
    .select(`
      *,
      items:pr_items(*),
      requester:users(full_name),
      department:departments(name, code),
      approved_head:users!purchase_requests_approved_by_head_fkey(full_name),
      approved_finance:users!purchase_requests_approved_by_finance_fkey(full_name),
      approved_direksi:users!purchase_requests_approved_by_direksi_fkey(full_name),
      rejected_by_user:users!purchase_requests_rejected_by_fkey(full_name)
    `)
    .eq("id", id)
    .single();

  if (!pr) {
    notFound();
  }

  const statusBadge = getPRStatusLabel(pr.status);
  const priorityBadge = getPriorityBadge(pr.priority);
  const approvalInfo = getRequiredApprovalLevel(pr.total_amount);

  // Determine what actions user can take
  const canApprove = () => {
    if (pr.status === "approved" || pr.status === "rejected" || pr.status === "converted") {
      return false;
    }
    
    // Check if this user is the current required approver
    if (pr.status === "pending_head" && (user.role === "hrd" || user.role === "purchasing_manager")) {
      return true;
    }
    if (pr.status === "pending_finance" && user.role === "finance_staff") {
      return true;
    }
    if (pr.status === "pending_direksi" && user.role === "direksi") {
      return true;
    }
    return false;
  };

  const canCreatePO = () => {
    return pr.status === "approved" && 
           !pr.converted_po_id && 
           (user.role === "purchasing_manager" || user.role === "purchasing_staff");
  };

  // Handle approval action
  async function handleApprove(formData: FormData) {
    "use server";
    
    const action = formData.get("action") as string;
    const reason = formData.get("reason") as string;
    
    const supabase = await createClient();
    const currentUser = await requireUser();
    
    const updates: any = {};
    
    if (action === "approve") {
      if (pr.status === "pending_head") {
        updates.approved_by_head = currentUser.id;
        updates.approved_at_head = new Date().toISOString();
      } else if (pr.status === "pending_finance") {
        updates.approved_by_finance = currentUser.id;
        updates.approved_at_finance = new Date().toISOString();
      } else if (pr.status === "pending_direksi") {
        updates.approved_by_direksi = currentUser.id;
        updates.approved_at_direksi = new Date().toISOString();
      }
      
      // Determine next status
      if (pr.status === "pending_head" && approvalInfo.level === "finance") {
        updates.status = "pending_finance";
        updates.current_approval_level = "finance";
      } else if ((pr.status === "pending_head" || pr.status === "pending_finance") 
                 && approvalInfo.level === "direksi") {
        updates.status = "pending_direksi";
        updates.current_approval_level = "direksi";
      } else {
        updates.status = "approved";
        updates.current_approval_level = null;
      }
    } else if (action === "reject") {
      updates.status = "rejected";
      updates.rejected_by = currentUser.id;
      updates.rejected_at = new Date().toISOString();
      updates.rejection_reason = reason;
    }
    
    await supabase
      .from("purchase_requests")
      .update(updates)
      .eq("id", id);
    
    redirect(`/dashboard/purchasing/pr/${id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{pr.pr_number}</h1>
            <p className="text-sm text-gray-500">
              Dibuat {formatDate(pr.created_at)} oleh {pr.requester?.full_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/purchasing/print/pr/${id}`} target="_blank">
            <Button variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </Link>
          
          {canCreatePO() && (
            <Link href={`/dashboard/purchasing/po/new?pr_id=${id}`}>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Buat PO
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - PR Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Badge className={statusBadge.color} size="lg">
                    {statusBadge.label}
                  </Badge>
                  <Badge className={priorityBadge.color}>
                    Prioritas: {priorityBadge.label}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Estimasi</p>
                  <p className="text-2xl font-bold">{formatRupiah(pr.total_amount)}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium">No</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Deskripsi</th>
                    <th className="text-center py-3 px-4 text-sm font-medium">Qty</th>
                    <th className="text-center py-3 px-4 text-sm font-medium">Satuan</th>
                    <th className="text-right py-3 px-4 text-sm font-medium">Est. Harga</th>
                    <th className="text-right py-3 px-4 text-sm font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pr.items?.map((item: PRItem, index: number) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-4 text-sm">{index + 1}</td>
                      <td className="py-3 px-4 text-sm">{item.description}</td>
                      <td className="py-3 px-4 text-sm text-center">{item.qty}</td>
                      <td className="py-3 px-4 text-sm text-center">{item.unit}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        {formatRupiah(item.estimated_price)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {formatRupiah(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pr.notes && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Catatan:</p>
                  <p className="text-sm text-gray-600">{pr.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Requester */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Dibuat oleh {pr.requester?.full_name}</p>
                    <p className="text-sm text-gray-500">{formatDate(pr.created_at)}</p>
                  </div>
                </div>

                {/* Head Dept Approval */}
                {pr.approved_by_head && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Disetujui Head Dept ({pr.approved_head?.full_name})
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(pr.approved_at_head)}</p>
                    </div>
                  </div>
                )}

                {/* Finance Approval */}
                {pr.approved_by_finance && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Disetujui Finance ({pr.approved_finance?.full_name})
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(pr.approved_at_finance)}</p>
                    </div>
                  </div>
                )}

                {/* Direksi Approval */}
                {pr.approved_by_direksi && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Disetujui Direksi ({pr.approved_direksi?.full_name})
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(pr.approved_at_direksi)}</p>
                    </div>
                  </div>
                )}

                {/* Rejection */}
                {pr.status === "rejected" && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <XCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Ditolak oleh {pr.rejected_by_user?.full_name}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(pr.rejected_at)}</p>
                      {pr.rejection_reason && (
                        <p className="text-sm text-red-600 mt-1">
                          Alasan: {pr.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Approval Actions */}
          {canApprove() && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tindakan Approval</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={handleApprove}>
                  <input type="hidden" name="action" value="approve" />
                  <Button 
                    type="submit" 
                    className="w-full"
                    variant="default"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Setujui PR
                  </Button>
                </form>
                
                <form action={handleApprove} className="space-y-2">
                  <input type="hidden" name="action" value="reject" />
                  <textarea
                    name="reason"
                    placeholder="Alasan penolakan..."
                    className="w-full p-2 border rounded text-sm"
                    rows={2}
                    required
                  />
                  <Button 
                    type="submit" 
                    className="w-full"
                    variant="destructive"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Tolak PR
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Departemen</p>
                <p className="font-medium">{pr.department?.name}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Tanggal Dibutuhkan</p>
                <p className="font-medium">
                  {pr.required_date ? formatDate(pr.required_date) : "-"}
                </p>
              </div>

              {approvalInfo.level && (
                <div className="p-3 bg-blue-50 rounded-lg mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <p className="font-medium text-blue-900">Approval Required</p>
                  </div>
                  <p className="text-sm text-blue-800">
                    PR ini memerlukan approval {approvalInfo.level === "head_dept" ? "Head Dept" : 
                      approvalInfo.level === "finance" ? "Finance" : "Direksi"}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Threshold: &gt; {formatRupiah(approvalInfo.minAmount)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
