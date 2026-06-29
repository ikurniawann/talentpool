"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  User,
} from "lucide-react";
import {
  formatRupiah,
  formatDate,
  getPRStatusLabel,
  getPriorityBadge,
} from "@/lib/purchasing/utils";
import { PRRevisionButton } from "@/components/purchasing/pr-revision-button";
import { PRDetailToast } from "@/components/purchasing/pr-detail-toast";
import { PRApprovalActions } from "@/components/purchasing/pr-approval-actions";
import { usePurchaseRequest } from "../queries";
import type { PRDetailItem } from "../types";

type PRDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function PRDetailPage({ params }: PRDetailPageProps) {
  const { id } = use(params);
  const { data: pr, isLoading, error } = usePurchaseRequest(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-500">
        Memuat detail PR...
      </div>
    );
  }

  if (error || !pr) {
    notFound();
  }

  const statusBadge = getPRStatusLabel(pr.status);
  const priorityBadge = getPriorityBadge(pr.priority);
  const requesterName = pr.requester_name || "-";
  const { canApprove, canCreatePO } = pr.permissions;

  return (
    <div className="space-y-6">
      <PRDetailToast />
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{pr.pr_number}</h1>
            <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>Dibuat {formatDate(pr.created_at)}</span>
            <span className="text-gray-300">•</span>
            <span>{requesterName}</span>
            <span className="text-gray-300">•</span>
            <span>Prioritas {priorityBadge.label}</span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link href="/dashboard/purchasing/pr">
            <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          {pr.status === "draft" && pr.permissions.canEdit && (
            <Link href={`/dashboard/purchasing/pr/edit/${id}`}>
              <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {pr.status === "rejected" && <PRRevisionButton prId={id} />}
          <Link href={`/dashboard/purchasing/print/pr/${id}`} target="_blank">
            <Button variant="outline" className="purchasing-secondary-button w-full cursor-pointer sm:w-auto">
              <Printer className="w-4 h-4 mr-2" />
              Cetak PR
            </Button>
          </Link>

          {canCreatePO && (
            <Link href={`/dashboard/purchasing/po/insert?pr_id=${id}`}>
              <Button className="purchasing-main-button w-full sm:w-auto">
                <FileText className="w-4 h-4 mr-2" />
                Buat PO
              </Button>
            </Link>
          )}
          {pr.status === "converted" && pr.converted_po_id && (
            <Link href={`/dashboard/purchasing/po/${pr.converted_po_id}`}>
              <Button className="purchasing-main-button w-full sm:w-auto">
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
                    {pr.items?.map((item: PRDetailItem, index: number) => (
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

          <Card>
            <CardHeader className="border-b border-gray-200/70 px-4 py-3">
              <CardTitle className="text-base">Timeline Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="w-4 h-4 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium">Dibuat oleh {requesterName}</p>
                    <p className="text-sm text-gray-500">{formatDate(pr.created_at)}</p>
                  </div>
                </div>

                {pr.approved_by_head && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Disetujui Head Dept ({pr.approved_head_name || "-"})
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(pr.approved_at_head)}</p>
                    </div>
                  </div>
                )}

                {pr.approved_by_finance && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Disetujui Finance ({pr.approved_finance_name || "-"})
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(pr.approved_at_finance)}</p>
                    </div>
                  </div>
                )}

                {pr.approved_by_direksi && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Disetujui Direksi ({pr.approved_direksi_name || "-"})
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(pr.approved_at_direksi)}</p>
                    </div>
                  </div>
                )}

                {pr.status === "rejected" && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <XCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Ditolak oleh {pr.rejected_by_name || "-"}
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
          {canApprove && <PRApprovalActions prId={id} />}

          <Card>
            <CardHeader className="border-b border-gray-200/70 px-4 py-3">
              <CardTitle className="text-base">Informasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Departemen</p>
                <p className="font-medium">{pr.department?.name || "-"}</p>
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
