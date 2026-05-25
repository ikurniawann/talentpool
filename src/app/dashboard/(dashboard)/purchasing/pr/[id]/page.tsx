import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Printer,
  CheckCircle, 
  XCircle, 
  FileText,
  Pencil,
  User
} from "lucide-react";
import { 
  formatRupiah, 
  formatDate, 
  getPRStatusLabel, 
  getPriorityBadge
} from "@/lib/purchasing/utils";
import { PRItem } from "@/types/purchasing";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { PRRevisionButton } from "@/components/purchasing/pr-revision-button";
import { PRDetailToast } from "@/components/purchasing/pr-detail-toast";
import { PRApprovalActions } from "@/components/purchasing/pr-approval-actions";

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
      items:pr_items(
        *,
        raw_material:raw_material_id(id, kode, nama),
        satuan:satuan_id(id, nama)
      )
    `)
    .eq("id", id)
    .single();

  if (!pr) {
    notFound();
  }

  const statusBadge = getPRStatusLabel(pr.status);
  const priorityBadge = getPriorityBadge(pr.priority);
  const relatedUserIds = [
    pr.requester_id,
    pr.approved_by_head,
    pr.approved_by_finance,
    pr.approved_by_direksi,
    pr.rejected_by,
  ].filter(Boolean);
  const { data: relatedUsers } = relatedUserIds.length
    ? await supabase
        .from("users")
        .select("id, full_name")
        .in("id", relatedUserIds)
    : { data: [] };
  const userNameById = new Map(
    (relatedUsers || []).map((relatedUser) => [relatedUser.id, relatedUser.full_name])
  );
  const requesterName = userNameById.get(pr.requester_id) || "-";
  const approvedHeadName = pr.approved_by_head ? userNameById.get(pr.approved_by_head) : null;
  const approvedFinanceName = pr.approved_by_finance ? userNameById.get(pr.approved_by_finance) : null;
  const approvedDireksiName = pr.approved_by_direksi ? userNameById.get(pr.approved_by_direksi) : null;
  const rejectedByName = pr.rejected_by ? userNameById.get(pr.rejected_by) : null;
  const { data: department } = pr.department_id
    ? await supabase
        .from("departments")
        .select("name, code")
        .eq("id", pr.department_id)
        .single()
    : { data: null };

  // Determine what actions user can take
  const canApprove = () => {
    if (pr.status === "approved" || pr.status === "rejected" || pr.status === "converted") {
      return false;
    }
    
    // Check if this user is the current required approver
    if (
      pr.status === "pending_head" &&
      ["hrd", "purchasing_manager", "purchasing_admin", "super_admin", "admin", "pos_supervisor", "direksi"].includes(user.role)
    ) {
      return true;
    }
    return false;
  };

  const canCreatePO = () => {
    return pr.status === "approved" && 
           !pr.converted_po_id && 
           (user.role === "purchasing_manager" || user.role === "purchasing_staff");
  };

  return (
    <div className="space-y-6">
      <PRDetailToast />
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Procurement", href: "/dashboard/purchasing/procurement" },
          { label: "Purchase Request", href: "/dashboard/purchasing/pr" },
          { label: pr.pr_number },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/pr">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{pr.pr_number}</h1>
            <p className="text-sm text-gray-500">
              Dibuat {formatDate(pr.created_at)} oleh {requesterName}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {pr.status === "draft" && (
            <Link href={`/dashboard/purchasing/pr/${id}/edit`}>
              <Button variant="outline">
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {pr.status === "rejected" && <PRRevisionButton prId={id} />}
          <Link href={`/dashboard/purchasing/print/pr/${id}`} target="_blank">
            <Button variant="outline" className="cursor-pointer">
              <Printer className="w-4 h-4 mr-2" />
              Cetak PR
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
          {pr.status === "converted" && pr.converted_po_id && (
            <Link href={`/dashboard/purchasing/po/${pr.converted_po_id}`}>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Lihat PO
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
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
              <div className="overflow-x-auto rounded-lg border border-gray-200/70">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200/70">
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
                    <tr key={item.id} className="border-b border-gray-200/60 last:border-0">
                      <td className="py-3 px-4 text-sm">{index + 1}</td>
                      <td className="py-3 px-4 text-sm">
                        {item.raw_material?.nama || item.description}
                        {item.description && item.raw_material?.nama && (
                          <p className="text-xs text-gray-500">{item.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-center">{item.qty}</td>
                      <td className="py-3 px-4 text-sm text-center">{item.satuan?.nama || item.unit}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        {formatRupiah(item.estimated_price || 0)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {formatRupiah(item.total || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

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
            <CardHeader className="border-b border-gray-200/70 px-4 py-3">
              <CardTitle className="text-base">Timeline Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Requester */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="w-4 h-4 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium">Dibuat oleh {requesterName}</p>
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
                        Disetujui Head Dept ({approvedHeadName || "-"})
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
                        Disetujui Finance ({approvedFinanceName || "-"})
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
                        Disetujui Direksi ({approvedDireksiName || "-"})
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
                        Ditolak oleh {rejectedByName || "-"}
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

        <div className="space-y-4">
          {canApprove() && <PRApprovalActions prId={id} />}

          {/* Info Card */}
          <Card>
            <CardHeader className="border-b border-gray-200/70 px-4 py-3">
              <CardTitle className="text-base">Informasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Departemen</p>
                <p className="font-medium">{department?.name || "-"}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Tanggal Dibutuhkan</p>
                <p className="font-medium">
                  {pr.required_date ? formatDate(pr.required_date) : "-"}
                </p>
              </div>

              {pr.status === "pending_head" && (
                <div className="p-3 bg-blue-50 rounded-lg mt-4">
                  <p className="font-medium text-blue-900">Approval Kebutuhan</p>
                  <p className="mt-1 text-sm text-blue-800">
                    PR ini menunggu approval kebutuhan barang dan qty. Approval nominal final dilakukan di PO.
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
