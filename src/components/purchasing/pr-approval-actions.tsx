"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prQueryKeys } from "@/features/purchasing/pr/query-keys";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ApprovalAction = "approve" | "reject";

type PRApprovalActionsProps = {
  prId: string;
};

export function PRApprovalActions({ prId }: PRApprovalActionsProps) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ApprovalAction | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const isReject = action === "reject";

  async function submitApproval() {
    if (!action) return;
    if (isReject && !reason.trim()) {
      toast.error("Alasan penolakan wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/purchasing/pr/${prId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: isReject ? reason.trim() : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Gagal memproses approval PR");
      }

      toast.success(action === "approve" ? "PR berhasil diapprove" : "PR berhasil ditolak");
      setAction(null);
      setReason("");
      await queryClient.invalidateQueries({ queryKey: prQueryKeys.detail(prId) });
      await queryClient.invalidateQueries({ queryKey: prQueryKeys.all });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memproses approval PR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b border-gray-200/70 px-4 py-3">
          <CardTitle className="text-base">Tindakan Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" className="w-full" onClick={() => setAction("approve")}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Setujui PR
          </Button>
          <Button
            type="button"
            className="w-full border-red-200 text-red-600 hover:!border-red-300 hover:!bg-red-50 hover:!text-red-600"
            variant="outline"
            onClick={() => setAction("reject")}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Tolak PR
          </Button>
        </CardContent>
      </Card>

      <Dialog open={action !== null} onOpenChange={(open) => !open && !loading && setAction(null)}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-4 py-3.5">
            <DialogTitle className="text-base font-semibold text-gray-900">
              {isReject ? "Tolak PR?" : "Setujui PR?"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              {isReject
                ? "PR akan ditolak dan requester perlu membuat revisi bila masih dibutuhkan."
                : "PR akan disetujui sebagai kebutuhan valid dan bisa diproses ke PO."}
            </DialogDescription>
          </DialogHeader>

          {isReject && (
            <div className="px-4 py-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700" htmlFor="rejection-reason">
                  Alasan Penolakan
                </label>
                <textarea
                  id="rejection-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Tulis alasan penolakan..."
                  rows={3}
                  className="min-h-24 w-full resize-none rounded-lg border border-gray-200/70 bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <DialogClose render={<Button type="button" variant="outline" size="sm" disabled={loading} />}>
              Batal
            </DialogClose>
            <Button
              type="button"
              variant={isReject ? "outline" : "default"}
              size="sm"
              className={
                isReject
                  ? "border-red-200 text-red-600 hover:!border-red-300 hover:!bg-red-50 hover:!text-red-600"
                  : undefined
              }
              onClick={submitApproval}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Memproses..." : isReject ? "Ya, Tolak PR" : "Ya, Setujui PR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
