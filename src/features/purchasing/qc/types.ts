export type QCRecord = {
  id: string;
  qc_number?: string | null;
  grn_id?: string | null;
  hasil?: string | null;
  tanggal_inspeksi?: string | null;
  created_at?: string | null;
  items?: Array<{
    bahan_baku_id?: string | null;
    jumlah_diperiksa?: number | null;
    jumlah_diterima?: number | null;
    jumlah_ditolak?: number | null;
  }>;
};

export type QCInspection = {
  id: string;
  qc_number: string;
  goods_receipt_id: string;
  grn_number?: string;
  bahan_baku_id: string;
  bahan_baku?: {
    id: string;
    kode: string;
    nama: string;
  };
  jumlah_diperiksa: number;
  jumlah_diterima: number;
  jumlah_ditolak: number;
  hasil: "passed" | "rejected" | "partial";
  parameter_inspeksi: Record<string, string> | null;
  catatan: string | null;
  inspector_id: string;
  inspector?: {
    id: string;
    name: string;
    email: string;
  };
  tanggal_inspeksi: string;
  created_at: string;
  status: "APPROVED" | "REJECTED" | "PARTIAL";
  rekomendasi: "ACCEPT" | "REJECT" | "REWORK";
};

export interface QCListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface QCListResult {
  data: QCRecord[];
  total: number;
}

export class QCNotFoundError extends Error {
  constructor() {
    super("Data QC tidak ditemukan");
    this.name = "QCNotFoundError";
  }
}
