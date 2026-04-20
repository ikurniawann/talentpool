"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardCheck, Save, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { GoodsReceipt, GoodsReceiptItem, QCInspectionFormData } from "@/types/purchasing";
import { getGoodsReceipt, createQCInspection } from "@/lib/purchasing";

const QC_PARAMETERS = [
  "Kemasan",
  "Label",
  "Warna",
  "Bau",
  "Tekstur",
  "Kadar Air",
  "Expired Date",
];

export default function QCInspectionPage() {
  const params = useParams();
  const router = useRouter();
  const grnId = params.id as string;

  const [grn, setGrn] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<QCInspectionFormData>({
    status: "PENDING",
    parameter_inspeksi: QC_PARAMETERS,
    hasil_inspeksi: {},
    catatan_qc: "",
    rekomendasi: "ACCEPT",
  });

  useEffect(() => {
    if (grnId) {
      loadGRN();
    }
  }, [grnId]);

  const loadGRN = async () => {
    try {
      const data = await getGoodsReceipt(grnId);
      setGrn(data);
      
      // Initialize hasil inspeksi
      const initialHasil: Record<string, string> = {};
      QC_PARAMETERS.forEach((param) => {
        initialHasil[param] = "OK";
      });
      setFormData((prev) => ({ ...prev, hasil_inspeksi: initialHasil }));
    } catch (error) {
      console.error("Error loading GRN:", error);
      toast.error("Gagal memuat data GRN");
    } finally {
      setLoading(false);
    }
  };

  const updateHasil = (param: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      hasil_inspeksi: { ...prev.hasil_inspeksi, [param]: value },
    }));
  };

  const calculateStatus = (): "APPROVED" | "REJECTED" | "PARTIAL" => {
    const hasil = Object.values(formData.hasil_inspeksi || {});
    const ngCount = hasil.filter((h) => h === "NG").length;
    
    if (ngCount === 0) return "APPROVED";
    if (ngCount === hasil.length) return "REJECTED";
    return "PARTIAL";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const status = calculateStatus();
    const rekomendasi = status === "REJECTED" ? "REJECT" : 
                        status === "PARTIAL" ? "REWORK" : "ACCEPT";

    setIsSubmitting(true);
    try {
      await createQCInspection(grnId, {
        ...formData,
        status,
        rekomendasi,
      });
      
      toast.success("QC inspection berhasil disimpan");
      router.push(`/dashboard/purchasing/grn/${grnId}`);
    } catch (error: any) {
      console.error("Error saving QC:", error);
      toast.error(error.message || "Gagal menyimpan QC inspection");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Memuat data...</div>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-red-500">GRN tidak ditemukan</div>
      </div>
    );
  }

  const status = calculateStatus();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/purchasing/grn/${grnId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">QC Inspection</h1>
          <p className="text-muted-foreground">
            GRN: {grn.nomor_grn}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QC Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Parameter Inspeksi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {QC_PARAMETERS.map((param) => (
                <div key={param} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{param}</span>
                  <Select
                    value={formData.hasil_inspeksi?.[param] || "OK"}
                    onValueChange={(v) => updateHasil(param, v)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OK">
                        <span className="text-green-600">✓ OK</span>
                      </SelectItem>
                      <SelectItem value="NG">
                        <span className="text-red-600">✗ NG</span>
                      </SelectItem>
                      <SelectItem value="NA">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <div className="space-y-2 pt-4">
                <Label>Catatan QC</Label>
                <Textarea
                  value={formData.catatan_qc}
                  onChange={(e) => setFormData({ ...formData, catatan_qc: e.target.value })}
                  placeholder="Catatan tambahan hasil inspeksi..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status Hasil</span>
                <Badge
                  className={
                    status === "APPROVED"
                      ? "bg-green-100 text-green-800"
                      : status === "REJECTED"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {status}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Parameter</span>
                <span>{QC_PARAMETERS.length}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">OK</span>
                <span className="text-green-600">
                  {Object.values(formData.hasil_inspeksi || {}).filter((h) => h === "OK").length}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">NG</span>
                <span className="text-red-600">
                  {Object.values(formData.hasil_inspeksi || {}).filter((h) => h === "NG").length}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm text-muted-foreground mb-2">Rekomendasi</div>
                <div className="font-medium">
                  {status === "APPROVED" && (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> ACCEPT - Terima Barang
                    </span>
                  )}
                  {status === "REJECTED" && (
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> REJECT - Tolak Barang
                    </span>
                  )}
                  {status === "PARTIAL" && (
                    <span className="text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> REWORK - Perlu Perbaikan
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Item yang Diinspeksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {grn.items?.map((item) => (
                <div key={item.id} className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">{item.raw_material?.nama}</div>
                  <div className="text-xs text-muted-foreground">{item.raw_material?.kode}</div>
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Diterima:</span>{" "}
                    <span className="font-medium">{item.qty_diterima}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/purchasing/grn/${grnId}`}>
            <Button variant="outline" disabled={isSubmitting}>
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan QC Inspection"}
          </Button>
        </div>
      </form>
    </div>
  );
}
