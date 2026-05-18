"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ParsedKpiItem {
  item_order?: number;
  perspective: string;
  category: string;
  kpi_name: string;
  kpi_definition: string;
  formula: string;
  control_method: string;
  target_text: string;
  target_value: number;
  measurement_unit: string;
  weight: number;
  frequency: string;
  score_5_description: string;
  score_4_description: string;
  score_3_description: string;
  score_2_description: string;
  score_1_description: string;
}

interface ParsedBehavioralItem {
  value: string;
  competency: string;
  behavioral_standard: string;
  weight: number;
  score_5_description: string;
  score_4_description: string;
  score_3_description: string;
  score_2_description: string;
  score_1_description: string;
}

export interface ParsedTemplateData {
  template_name: string;
  position_name: string;
  applicable_period: string;
  behavioral_weight: number;
  project_weight: number;
  total_weight: number;
  kpi_items: ParsedKpiItem[];
  behavioral_items: ParsedBehavioralItem[];
  summary: {
    total_kpi_items: number;
    total_kpi_weight: number;
    total_behavioral_items: number;
  };
}

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: (data: ParsedTemplateData) => Promise<void>;
}

export function ImportExcelDialog({ open, onOpenChange, onImportSuccess }: ImportExcelDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTemplateData | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
      toast.error("Hanya file Excel (.xlsx atau .xls) yang diperbolehkan");
      return;
    }

    setFile(selectedFile);
    await parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (fileToParse: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", fileToParse);

      const res = await fetch("/api/hris/kpi-templates/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal memparse file");
      }

      setParsedData(json.data);
      toast.success("File Excel berhasil diparse!");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;
    await onImportSuccess(parsedData);
    onOpenChange(false);
    setFile(null);
    setParsedData(null);
  };

  const resetDialog = () => {
    setFile(null);
    setParsedData(null);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) resetDialog();
    }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Import Template KPI dari Excel
          </DialogTitle>
          <DialogDescription>
            Upload file Excel template KPI untuk otomatis membuat template baru
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
            <Input
              id="excel-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />
            <Label
              htmlFor="excel-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className={`w-8 h-8 ${loading ? "text-gray-400" : "text-gray-500"}`} />
              <div>
                <p className="text-sm font-medium">
                  {file ? file.name : "Klik untuk upload file Excel"}
                </p>
                <p className="text-xs text-gray-500">
                  Format: Formulir PK (dari folder template-kpi)
                </p>
              </div>
            </Label>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-4 text-gray-500">
              <p>Memparse file Excel...</p>
            </div>
          )}

          {/* Preview Section */}
          {parsedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">File berhasil diparse!</span>
              </div>

              {/* Template Info */}
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-3">Informasi Template</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Nama Template:</span>
                      <p className="font-medium">{parsedData.template_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Posisi:</span>
                      <p className="font-medium">{parsedData.position_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Periode:</span>
                      <p className="font-medium">{parsedData.applicable_period}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total KPI Weight:</span>
                      <p className={`font-medium ${parsedData.total_weight !== 100 ? "text-red-500" : "text-green-600"}`}>
                        {parsedData.total_weight}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        KPI Items
                      </Badge>
                      <span className="text-2xl font-bold">{parsedData.summary.total_kpi_items}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Total weight: {parsedData.summary.total_kpi_weight}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        Behavioral
                      </Badge>
                      <span className="text-2xl font-bold">{parsedData.summary.total_behavioral_items}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Weight: {parsedData.behavioral_weight}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* KPI Items Preview */}
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    KPI Items Preview
                    {parsedData.total_weight !== 70 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Weight harus 70%
                      </Badge>
                    )}
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {parsedData.kpi_items.map((item, idx) => (
                      <div key={idx} className="text-sm border rounded p-2 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.kpi_name}</span>
                          <Badge variant="outline">{item.weight}%</Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.perspective} • Target: {item.target_text || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-right">
                    <span className="text-gray-500">Total: </span>
                    <span className={`font-bold ${parsedData.total_weight !== 70 ? "text-red-500" : "text-green-600"}`}>
                      {parsedData.total_weight}% (Work Result)
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Behavioral 5C Preview */}
              {parsedData.behavioral_items && parsedData.behavioral_items.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      Behavioral 5C Preview
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        {parsedData.behavioral_weight}%
                      </Badge>
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {parsedData.behavioral_items.map((item, idx) => (
                        <div key={idx} className="text-sm border rounded p-2 bg-purple-50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.value} {item.competency && `— ${item.competency}`}</span>
                            <Badge variant="outline">{item.weight}%</Badge>
                          </div>
                          {item.behavioral_standard && (
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {item.behavioral_standard}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-right">
                      <span className="text-gray-500">Total: </span>
                      <span className="font-bold text-purple-600">
                        {parsedData.behavioral_weight}% (Behavioral)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-3">Total Weight Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">KPI Items (Work Result)</span>
                      <span className={`font-bold ${parsedData.total_weight !== 70 ? "text-red-500" : "text-green-600"}`}>
                        {parsedData.total_weight}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Behavioral 5C</span>
                      <span className="font-bold text-purple-600">{parsedData.behavioral_weight}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Project</span>
                      <span className="font-bold text-blue-600">{parsedData.project_weight}%</span>
                    </div>
                    <div className="border-t border-green-300 pt-2 mt-2 flex items-center justify-between">
                      <span className="font-bold text-green-800">TOTAL</span>
                      <span className={`text-lg font-bold ${(parsedData.total_weight + parsedData.behavioral_weight + parsedData.project_weight) !== 100 ? "text-red-500" : "text-green-600"}`}>
                        {parsedData.total_weight + parsedData.behavioral_weight + parsedData.project_weight}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Import Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
