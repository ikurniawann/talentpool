"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePendingPRApprovals } from "../queries";
import { useApprovePRApproval } from "../mutations";
import type { ApprovalPR } from "../types";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, Eye, FileText, Loader2 } from "lucide-react";
import { formatDate, formatRupiah, getPriorityBadge, getPRStatusLabel } from "@/lib/purchasing/utils";
import { toast } from "sonner";

export function PRApprovalPage() {
  const router = useRouter();
  const [confirmingPR, setConfirmingPR] = useState<ApprovalPR | null>(null);

  const listQuery = usePendingPRApprovals();
  const prs = listQuery.data ?? [];
  const loading = listQuery.isLoading;

  const approveMutation = useApprovePRApproval();
  const processingId = approveMutation.isPending ? confirmingPR?.id ?? null : null;

  useEffect(() => {
    if (listQuery.isError) {
      toast.error(listQuery.error instanceof Error ? listQuery.error.message : "Gagal memuat approval PR");
    }
  }, [listQuery.isError, listQuery.error]);

  async function approvePR() {
    if (!confirmingPR) return;
    try {
      await approveMutation.mutateAsync(confirmingPR.id);
      toast.success("PR berhasil diapprove");
      setConfirmingPR(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal approve PR");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval PR</h1>
          <p className="text-sm text-gray-500">Review dan approve kebutuhan barang dari Purchase Request</p>
        </div>
        <Link href="/dashboard/purchasing/pr">
          <Button variant="outline" className="h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700">Lihat Semua PR</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-gray-200/70 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PR Menunggu Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">Memuat data approval...</div>
          ) : prs.length === 0 ? (
            <div className="py-14 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-300" />
              <p className="text-gray-500">Tidak ada PR yang perlu diapprove</p>
            </div>
          ) : (
            <>
              <div className="px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-gray-900">No. PR</TableHead>
                      <TableHead className="text-gray-900">Tanggal</TableHead>
                      <TableHead className="text-gray-900">Departemen</TableHead>
                      <TableHead className="text-gray-900">Requester</TableHead>
                      <TableHead className="text-right text-gray-900">Estimasi</TableHead>
                      <TableHead className="text-center text-gray-900">Prioritas</TableHead>
                      <TableHead className="text-center text-gray-900">Status</TableHead>
                      <TableHead className="text-center text-gray-900">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prs.map((pr) => {
                      const priorityBadge = getPriorityBadge(pr.priority);
                      const statusBadge = getPRStatusLabel(pr.status);
                      return (
                        <TableRow
                          key={pr.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/dashboard/purchasing/pr/${pr.id}`)}
                        >
                          <TableCell className="font-medium text-gray-900">{pr.pr_number}</TableCell>
                          <TableCell className="text-gray-600">{formatDate(pr.created_at)}</TableCell>
                          <TableCell className="text-gray-600">{pr.department_name || "-"}</TableCell>
                          <TableCell className="text-gray-600">{pr.requester_name || "-"}</TableCell>
                          <TableCell className="text-right font-medium">{formatRupiah(pr.total_amount || 0)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={priorityBadge.color}>{priorityBadge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-center" onClick={(event) => event.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <Link href={`/dashboard/purchasing/pr/${pr.id}`}>
                                <Button variant="ghost" size="sm" className="h-9 w-9 cursor-pointer p-0">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                onClick={() => setConfirmingPR(pr)}
                                disabled={processingId === pr.id}
                                className="purchasing-main-button"
                              >
                                Approve
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-gray-200/70 px-4 py-3 text-sm text-gray-500">
                Menampilkan {prs.length} PR menunggu approval
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={confirmingPR !== null}
        onOpenChange={(open) => !open && !processingId && setConfirmingPR(null)}
      >
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-4 py-3.5">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Setujui PR?
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              PR {confirmingPR?.pr_number} akan disetujui sebagai kebutuhan valid dan bisa diproses ke PO.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <DialogClose render={<Button type="button" variant="outline" size="sm" disabled={Boolean(processingId)} className="purchasing-secondary-button" />}>
              Batal
            </DialogClose>
            <Button type="button" size="sm" onClick={approvePR} disabled={Boolean(processingId)} className="purchasing-main-button">
              {processingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processingId ? "Memproses..." : "Ya, Setujui PR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
