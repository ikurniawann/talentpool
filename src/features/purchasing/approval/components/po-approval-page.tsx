"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePurchaseOrderList } from "../../po/queries";
import { useApprovePurchaseOrder } from "../../po/mutations";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, Eye, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function POApprovalPage() {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const listQuery = usePurchaseOrderList({ status: "draft", page: 1, limit: 50 });
  const pos = listQuery.data?.data ?? [];
  const loading = listQuery.isLoading;

  const approveMutation = useApprovePurchaseOrder();

  useEffect(() => {
    if (listQuery.isError) {
      toast.error(listQuery.error instanceof Error ? listQuery.error.message : "Gagal memuat approval PO");
    }
  }, [listQuery.isError, listQuery.error]);

  async function approvePO(id: string) {
    setProcessingId(id);
    try {
      await approveMutation.mutateAsync(id);
      toast.success("PO berhasil diapprove");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal approve PO");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval PO</h1>
          <p className="text-sm text-gray-500">Review supplier, harga, pajak, dan total final sebelum PO dikirim</p>
        </div>
        <Link href="/dashboard/purchasing/po">
          <Button variant="outline" className="h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700">Lihat Semua PO</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-gray-200/70 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            PO Menunggu Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">Memuat data approval...</div>
          ) : pos.length === 0 ? (
            <div className="py-14 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-300" />
              <p className="text-gray-500">Tidak ada PO yang perlu diapprove</p>
            </div>
          ) : (
            <>
              <div className="px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-gray-900">No. PO</TableHead>
                      <TableHead className="text-gray-900">Tanggal</TableHead>
                      <TableHead className="text-gray-900">Supplier</TableHead>
                      <TableHead className="text-gray-900">PR</TableHead>
                      <TableHead className="text-right text-gray-900">Total</TableHead>
                      <TableHead className="text-center text-gray-900">Status</TableHead>
                      <TableHead className="text-right text-gray-900">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pos.map((po) => (
                      <TableRow
                        key={po.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/purchasing/po/${po.id}`)}
                      >
                        <TableCell className="font-medium text-gray-900">{po.nomor_po}</TableCell>
                        <TableCell className="text-gray-600">{formatDate(po.tanggal_po)}</TableCell>
                        <TableCell className="text-gray-600">{po.nama_supplier || "-"}</TableCell>
                        <TableCell className="text-gray-600">{po.pr_number || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(po.grand_total || po.total || po.subtotal || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-gray-100 text-gray-800">Draft</Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/purchasing/po/${po.id}`}>
                              <Button variant="ghost" size="sm" className="cursor-pointer">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              onClick={() => approvePO(po.id)}
                              disabled={processingId === po.id}
                              className="purchasing-main-button"
                            >
                              {processingId === po.id ? "Memproses..." : "Approve"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-gray-200/70 px-4 py-3 text-sm text-gray-500">
                Menampilkan {pos.length} PO menunggu approval
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
