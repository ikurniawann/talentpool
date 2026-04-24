"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { getReturn, approveReturn, rejectReturn } from "@/lib/purchasing/return";
import {
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  RETURN_REASON_LABELS,
  PurchaseReturn,
} from "@/types/purchasing";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Printer,
  Download,
  Calendar,
  BuildingOffice,
  FileText,
  AlertCircle,
} from "lucide-react";
import { formatRupiah } from "@/lib/purchasing/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";

export default function ReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const returnId = params.id as string;

  const [ret, setRet] = useState<PurchaseReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadReturn();
  }, [returnId]);

  const loadReturn = async () => {
    try {
      const data = await getReturn(returnId);
      setRet(data);
    } catch (error) {
      console.error("Error loading return:", error);
      toast.error("Gagal memuat detail return");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      // In real app, get current user ID from context
      await approveReturn(returnId, "current-user-id");
      toast.success("Return berhasil disetujui");
      setApproveDialogOpen(false);
      loadReturn();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyetujui return");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Alasan penolakan wajib diisi");
      return;
    }

    setIsProcessing(true);
    try {
      await rejectReturn(returnId, rejectionReason, "current-user-id");
      toast.success("Return ditolak");
      setRejectDialogOpen(false);
      setRejectionReason("");
      loadReturn();
    } catch (error: any) {
      toast.error(error.message || "Gagal menolak return");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Memuat data...</p>
      </div>
    );
  }

  if (!ret) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Return tidak ditemukan
          </h2>
          <Link href="/dashboard/purchasing/returns">
            <Button>Kembali ke List</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canApprove = ret.status === "pending_approval";
  const isApproved = ret.status === "approved" || ret.status === "completed";

  return (
    <div className="p-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Retur Pembelian", href: "/dashboard/purchasing/returns" },
          { label: ret.return_number },
        ]}
      />

      <div className="flex items-center justify-between mt-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/returns">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{ret.return_number}</h1>
              <Badge className={RETURN_STATUS_COLORS[ret.status]}>
                {RETURN_STATUS_LABELS[ret.status]}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              Return date: {format(new Date(ret.return_date), "dd MMMM yyyy", { locale: localeId })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          {canApprove && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => setApproveDialogOpen(true)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => setRejectDialogOpen(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Return Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi Return</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Supplier</dt>
                  <dd className="font-medium flex items-center gap-2 mt-1">
                    <BuildingOffice className="w-4 h-4 text-gray-400" />
                    {ret.supplier?.nama_supplier || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Tanggal Return</dt>
                  <dd className="font-medium flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {format(new Date(ret.return_date), "dd MMM yyyy", { locale: localeId })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Alasan Return</dt>
                  <dd className="font-medium flex items-center gap-2 mt-1">
                    <FileText className="w-4 h-4 text-gray-400" />
                    {RETURN_REASON_LABELS[ret.reason_type]}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">GRN Reference</dt>
                  <dd className="font-medium mt-1">{ret.grn?.grn_number || "-"}</dd>
                </div>
              </dl>

              {(ret.reason_notes || ret.notes) && (
                <div className="mt-4 pt-4 border-t">
                  {ret.reason_notes && (
                    <div className="mb-3">
                      <dt className="text-sm font-medium text-gray-700 mb-1">
                        Catatan Alasan:
                      </dt>
                      <dd className="text-sm text-gray-600">{ret.reason_notes}</dd>
                    </div>
                  )}
                  {ret.notes && (
                    <div>
                      <dt className="text-sm font-medium text-gray-700 mb-1">
                        Catatan Tambahan:
                      </dt>
                      <dd className="text-sm text-gray-600">{ret.notes}</dd>
                    </div>
                  )}
                </div>
              )}

              {ret.rejection_reason && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900 text-sm mb-1">
                        Alasan Penolakan:
                      </p>
                      <p className="text-sm text-red-800">{ret.rejection_reason}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Return Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Item yang Di-Return</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3">Bahan Baku</th>
                      <th className="text-right px-4 py-3">Batch</th>
                      <th className="text-right px-4 py-3">Expired</th>
                      <th className="text-right px-4 py-3">Qty</th>
                      <th className="text-right px-4 py-3">Unit Cost</th>
                      <th className="text-right px-4 py-3">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ret.items?.map((item) => (
                      <TableRow key={item.id}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{item.raw_material?.nama}</p>
                            <p className="text-xs text-gray-500">
                              {item.raw_material?.kode}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {item.batch_number || "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          {item.expiry_date
                            ? format(new Date(item.expiry_date), "dd MMM yyyy", { locale: localeId })
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.qty_returned.toLocaleString()} {item.raw_material?.satuan || ""}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatRupiah(item.unit_cost)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatRupiah(item.subtotal)}
                        </td>
                      </TableRow>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={5} className="text-right px-4 py-3 font-medium">
                        Total:
                      </td>
                      <td className="text-right px-4 py-3 font-bold text-pink-600">
                        {formatRupiah(ret.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Condition Notes */}
          {ret.items?.some((item) => item.condition_notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kondisi Barang</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ret.items
                  .filter((item) => item.condition_notes)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <p className="font-medium text-sm mb-1">
                        {item.raw_material?.nama}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.condition_notes}
                      </p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Timeline & Actions */}
        <div className="space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Item</span>
                <span className="font-medium">{ret.items?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Qty</span>
                <span className="font-medium">
                  {ret.items?.reduce((sum, i) => sum + i.qty_returned, 0).toLocaleString() || 0}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-medium">Total Nilai</span>
                  <span className="font-bold text-pink-600">
                    {formatRupiah(ret.total_amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Dibuat</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(ret.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                  </p>
                </div>
              </div>

              {ret.approved_at && (
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      ret.status === "rejected" ? "bg-red-500" : "bg-green-500"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {ret.status === "rejected" ? "Ditolak" : "Disetujui"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(ret.approved_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                    </p>
                  </div>
                </div>
              )}

              {ret.shipping_date && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Dikirim ke Supplier</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(ret.shipping_date), "dd MMM yyyy", { locale: localeId })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          {isApproved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Return Approved</p>
                  <p>
                    Stock inventory telah disesuaikan dan GRN telah diupdate.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Return?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menyetujui return ini? Stock inventory akan berkurang dan GRN akan diupdate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? "Memproses..." : "Ya, Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Return</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan return ini.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection_reason">Alasan Penolakan *</Label>
            <Textarea
              id="rejection_reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? "Memproses..." : "Ya, Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
