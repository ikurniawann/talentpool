// ============================================================
// Shared Types — Purchasing Supplier
// ============================================================

export type PaymentTerms = "CBD" | "TOP7" | "TOP14" | "TOP30" | "TOP45" | "TOP60";
export type Currency = "IDR" | "USD" | "EUR";
export type SupplierStatus = "active" | "inactive" | "probation" | "blocked" | "draft";
export type POStatus =
  | "draft"
  | "pending_head"
  | "pending_finance"
  | "pending_direksi"
  | "approved"
  | "rejected"
  | "sent"
  | "partially_received"
  | "received"
  | "cancelled";

// ─── Supplier ───────────────────────────────────────────────

export interface Supplier {
  id: string;
  kode: string;
  nama_supplier: string;
  pic_name: string | null;
  pic_phone: string | null;
  email: string | null;
  alamat: string | null;
  kota: string | null;
  npwp: string | null;
  payment_terms: PaymentTerms;
  currency: Currency;
  bank_nama: string | null;
  bank_rekening: string | null;
  bank_atas_nama: string | null;
  kategori: string | null;
  status: SupplierStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Supplier Form DTO ────────────────────────────────────────

export interface SupplierFormData {
  kode_supplier: string;
  nama_supplier: string;
  pic_name?: string;
  pic_phone?: string;
  email?: string;
  alamat?: string;
  kota?: string;
  npwp?: string;
  payment_terms: PaymentTerms;
  currency: Currency;
  bank_nama?: string;
  bank_rekening?: string;
  bank_atas_nama?: string;
  kategori?: string;
}

// ─── Supplier List Query ──────────────────────────────────────

export interface SupplierListParams {
  search?: string;
  is_active?: boolean;
  payment_terms?: PaymentTerms;
  page?: number;
  limit?: number;
  sort_by?: "nama_supplier" | "kode_supplier" | "kota" | "created_at";
  sort_dir?: "ASC" | "DESC";
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Supplier Analytics (from GET /suppliers/:id) ─────────────

export interface SupplierAnalytics {
  po_aktif_count: number;
  po_aktif_nilai: number;
  total_transaksi_12_bulan: number;
  jumlah_po_12_bulan: number;
  on_time_delivery_rate: number;
  bahan_sering_dibeli: string[];
}

// ─── Supplier Detail (with analytics) ─────────────────────────

export interface SupplierDetail extends Supplier {
  analytics: SupplierAnalytics;
}

// ─── Supplier Price / Material ───────────────────────────────

export interface SupplierPrice {
  id: string;
  supplier_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  unit_name: string;
  price: number;
  currency: Currency;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
}

// ─── PO Summary per Supplier ──────────────────────────────────

export interface SupplierPOSummary {
  id: string;
  po_number: string;
  tanggal: string;
  status: POStatus;
  jumlah_item: number;
  total: number;
  currency: Currency;
}

// ─── Kota options ─────────────────────────────────────────────

export const KOTA_OPTIONS = [
  "Jakarta Pusat",
  "Jakarta Utara",
  "Jakarta Barat",
  "Jakarta Selatan",
  "Jakarta Timur",
  "Tangerang",
  "Tangerang Selatan",
  "Bogor",
  "Depok",
  "Bekasi",
  "Bandung",
  "Surabaya",
  "Semarang",
  "Yogyakarta",
  "Malang",
  "Medan",
  "Makassar",
  "Palembang",
  "Batam",
  "Balikpapan",
  "Denpasar",
  "Lainnya",
] as const;

export const PAYMENT_TERMS_OPTIONS: PaymentTerms[] = [
  "CBD",
  "TOP7",
  "TOP14",
  "TOP30",
  "TOP45",
  "TOP60",
];

export const CURRENCY_OPTIONS: Currency[] = ["IDR", "USD", "EUR"];

// ─── Validation helpers ────────────────────────────────────────

export function validateNPWP(value: string): boolean {
  return /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/.test(value);
}

export function formatNPWP(value: string): string {
  // Auto-format as user types: XX.XXX.XXX.X-XXX.XXX
  const digits = value.replace(/\D/g, "").slice(0, 20);
  let formatted = "";
  if (digits.length > 0) formatted = digits.slice(0, 2);
  if (digits.length > 2) formatted += "." + digits.slice(2, 5);
  if (digits.length > 5) formatted += "." + digits.slice(5, 8);
  if (digits.length > 8) formatted += "." + digits.slice(8, 9);
  if (digits.length > 9) formatted += "-" + digits.slice(9, 12);
  if (digits.length > 12) formatted += "." + digits.slice(12, 15);
  return formatted;
}

// ─── Display helpers ───────────────────────────────────────────

/**
 * Get display label for payment terms
 * CBD = Cash Before Delivery
 * TOP = Term of Payment
 */
export function getPaymentTermsLabel(value: PaymentTerms): string {
  const labels: Record<PaymentTerms, string> = {
    "CBD": "CBD",
    "TOP7": "TOP 7",
    "TOP14": "TOP 14",
    "TOP30": "TOP 30",
    "TOP45": "TOP 45",
    "TOP60": "TOP 60",
  };
  return labels[value] || value;
}
