// ============================================
// TYPES: Purchasing Module
// ============================================

// ─── SUPPLIERS ─────────────────────────────

export interface Supplier {
  id: string;
  kode: string;
  nama_supplier: string;
  pic_name?: string;
  pic_phone?: string;
  email?: string;
  alamat?: string;
  kota?: string;
  npwp?: string;
  payment_terms: "COD" | "NET7" | "NET14" | "NET30" | "NET45" | "NET60";
  currency: "IDR" | "USD" | "EUR";
  bank_nama?: string;
  bank_rekening?: string;
  bank_atas_nama?: string;
  kategori?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface SupplierFormData {
  kode_supplier: string;
  nama_supplier: string;
  pic_name?: string;
  pic_phone?: string;
  email?: string;
  alamat?: string;
  kota?: string;
  npwp?: string;
  payment_terms: "COD" | "NET7" | "NET14" | "NET30" | "NET45" | "NET60";
  currency: "IDR" | "USD" | "EUR";
  bank_nama?: string;
  bank_rekening?: string;
  bank_atas_nama?: string;
  kategori?: string;
}

// ─── UNITS ─────────────────────────────────

export interface Unit {
  id: string;
  kode: string;
  nama: string;
  tipe: "BESAR" | "KECIL" | "KONVERSI";
  deskripsi?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface UnitFormData {
  kode: string;
  nama: string;
  tipe: "BESAR" | "KECIL" | "KONVERSI";
  deskripsi?: string;
}

// ─── RAW MATERIALS ─────────────────────────

export type MaterialCategory =
  | "BAHAN_PANGAN"
  | "BAHAN_NON_PANGAN"
  | "KEMASAN"
  | "BAHAN_BAKAR"
  | "LAINNYA";

export type StorageCondition =
  | "SUHU_RUANG"
  | "DINGIN"
  | "BEKU"
  | "KHUSUS";

export type StockStatus = "AMAN" | "MENIPIS" | "HABIS";

export interface RawMaterial {
  id: string;
  kode: string;
  nama: string;
  kategori: MaterialCategory;
  deskripsi?: string;
  satuan_besar_id?: string;
  satuan_kecil_id?: string;
  konversi_factor: number;
  stok_minimum: number;
  stok_maximum: number;
  shelf_life_days?: number;
  storage_condition?: StorageCondition;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
  // Relations
  satuan_besar?: Unit;
  satuan_kecil?: Unit;
  inventory?: Inventory;
}

export interface RawMaterialWithStock extends RawMaterial {
  satuan_besar_nama?: string;
  satuan_kecil_nama?: string;
  qty_onhand: number;
  qty_reserved: number;
  qty_on_order: number;
  avg_cost: number;
  status_stok: StockStatus;
}

export interface RawMaterialFormData {
  kode?: string;
  nama: string;
  kategori: MaterialCategory;
  deskripsi?: string;
  satuan_besar_id?: string;
  satuan_kecil_id?: string;
  konversi_factor: number;
  stok_minimum: number;
  stok_maximum: number;
  shelf_life_days?: number;
  storage_condition?: StorageCondition;
}

export interface RawMaterialListParams {
  search?: string;
  kategori?: MaterialCategory;
  satuan_besar_id?: string;
  is_active?: boolean;
  below_minimum?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: "ASC" | "DESC";
}

// ─── INVENTORY ───────────────────────────────

export interface Inventory {
  id: string;
  raw_material_id: string;
  qty_onhand: number;
  qty_reserved: number;
  qty_on_order: number;
  avg_cost: number;
  last_movement_at?: string;
  updated_at: string;
  updated_by?: string;
  // Relations
  raw_material?: RawMaterial;
}

export type MovementType = "IN" | "OUT" | "ADJUSTMENT" | "CONVERSION" | "RETURN";

export interface InventoryMovement {
  id: string;
  raw_material_id: string;
  movement_type: MovementType;
  qty: number;
  unit_cost?: number;
  total_cost?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  // Relations
  raw_material?: RawMaterial;
}

export interface InventoryAdjustmentForm {
  raw_material_id: string;
  qty_actual: number;
  notes?: string;
}

// ─── PRODUCTS ────────────────────────────────

export interface Product {
  id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  kategori?: string;
  satuan_id?: string;
  harga_jual: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
  // Relations
  satuan?: Unit;
  bom_items?: BOMItem[];
}

export interface ProductWithCOGS extends Product {
  satuan_nama?: string;
  hpp_estimasi: number;
}

export interface ProductFormData {
  kode?: string;
  nama: string;
  deskripsi?: string;
  kategori?: string;
  satuan_id?: string;
  harga_jual: number;
}

// ─── BOM (BILL OF MATERIALS) ────────────────

export interface BOMItem {
  id: string;
  product_id: string;
  raw_material_id: string;
  qty_required: number;
  satuan_id?: string;
  waste_factor: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  raw_material?: RawMaterialWithStock;
  satuan?: Unit;
}

export interface BOMItemFormData {
  raw_material_id: string;
  qty_required: number;
  satuan_id?: string;
  waste_factor: number;
}

// ─── SUPPLIER PRICE LIST ─────────────────────

export interface SupplierPriceList {
  id: string;
  supplier_id: string;
  bahan_baku_id: string;
  harga: number;
  satuan_id?: string;
  minimum_qty: number;
  lead_time_days: number;
  is_preferred: boolean;
  is_active: boolean;
  berlaku_dari?: string;
  berlaku_sampai?: string;
  catatan?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Relations
  supplier?: {
    id: string;
    kode: string;
    nama_supplier: string;
  };
  bahan_baku?: RawMaterial;
  satuan?: Unit;
}

export interface SupplierPriceListFormData {
  supplier_id: string;
  bahan_baku_id: string;
  harga: number;
  satuan_id?: string;
  minimum_qty: number;
  lead_time_days: number;
  is_preferred: boolean;
  berlaku_dari?: string;
  berlaku_sampai?: string;
  catatan?: string;
}

// ─── PURCHASE ORDERS ─────────────────────────

export type POStatus = "DRAFT" | "APPROVED" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrder {
  id: string;
  nomor_po: string;
  supplier_id: string;
  tanggal_po: string;
  tanggal_kirim_estimasi?: string;
  status: POStatus;
  subtotal: number;
  diskon_persen: number;
  diskon_nominal: number;
  ppn_persen: number;
  ppn_nominal: number;
  total: number;
  catatan?: string;
  alamat_pengiriman?: string;
  approved_by?: string;
  approved_at?: string;
  sent_by?: string;
  sent_at?: string;
  sent_via?: "EMAIL" | "WHATSAPP" | "PRINT" | "OTHER";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  // Relations
  supplier?: {
    id: string;
    kode: string;
    nama_supplier: string;
    kontak_hp?: string;
  };
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderWithStats extends PurchaseOrder {
  item_count: number;
  total_qty_ordered: number;
  total_qty_received: number;
  receive_percentage: number;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  raw_material_id: string;
  qty_ordered: number;
  qty_received: number;
  qty_remaining: number;
  satuan_id?: string;
  harga_satuan: number;
  diskon_item: number;
  subtotal: number;
  catatan?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  raw_material?: RawMaterialWithStock;
  satuan?: Unit;
}

export interface PurchaseOrderFormData {
  supplier_id: string;
  tanggal_po: string;
  tanggal_kirim_estimasi?: string;
  catatan?: string;
  alamat_pengiriman?: string;
  diskon_persen?: number;
  diskon_nominal?: number;
  ppn_persen?: number;
}

export interface PurchaseOrderItemFormData {
  raw_material_id: string;
  qty_ordered: number;
  satuan_id?: string;
  harga_satuan: number;
  diskon_item?: number;
  catatan?: string;
}

export interface POListParams {
  search?: string;
  status?: POStatus;
  supplier_id?: string;
  tanggal_mulai?: string;
  tanggal_sampai?: string;
  page?: number;
  limit?: number;
}

// ─── API RESPONSES ───────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string>;
}

// ─── DELIVERIES (PENGIRIMAN) ─────────────────

export type DeliveryStatus = "IN_TRANSIT" | "ARRIVED" | "RECEIVED" | "CANCELLED";

export interface Delivery {
  id: string;
  nomor_delivery: string;
  po_id: string;
  supplier_id: string;
  tanggal_kirim?: string;
  tanggal_estimasi_tiba?: string;
  tanggal_aktual_tiba?: string;
  kurir?: string;
  nomor_resi?: string;
  status: DeliveryStatus;
  catatan?: string;
  created_at: string;
  updated_at: string;
  // Relations
  po?: PurchaseOrder;
  supplier?: {
    id: string;
    kode: string;
    nama_supplier: string;
  };
}

export interface DeliveryFormData {
  po_id: string;
  tanggal_kirim?: string;
  tanggal_estimasi_tiba?: string;
  kurir?: string;
  nomor_resi?: string;
  catatan?: string;
}

// ─── GOODS RECEIPT (GRN) ──────────────────────

export type GRNStatus = "DRAFT" | "QC_PENDING" | "QC_APPROVED" | "QC_REJECTED" | "COMPLETED";

export interface GoodsReceipt {
  id: string;
  nomor_grn: string;
  po_id: string;
  delivery_id?: string;
  received_by?: string;
  received_at: string;
  gudang_tujuan: string;
  kondisi_packing?: "BAIK" | "RUSAK_RINGAN" | "RUSAK_BERAT";
  status: GRNStatus;
  catatan_penerimaan?: string;
  total_qty_received: number;
  created_at: string;
  updated_at: string;
  // Relations
  po?: PurchaseOrder;
  delivery?: Delivery;
  items?: GoodsReceiptItem[];
  received_by_user?: {
    id: string;
    email: string;
  };
}

export interface GoodsReceiptItem {
  id: string;
  grn_id: string;
  po_item_id: string;
  raw_material_id: string;
  qty_diterima: number;
  qty_diterima_baik: number;
  qty_cacat: number;
  satuan_id?: string;
  harga_satuan: number;
  lokasi_rak?: string;
  catatan?: string;
  created_at: string;
  // Relations
  raw_material?: RawMaterial;
  satuan?: Unit;
  po_item?: PurchaseOrderItem;
}

export interface GoodsReceiptFormData {
  po_id: string;
  delivery_id?: string;
  gudang_tujuan?: string;
  kondisi_packing?: "BAIK" | "RUSAK_RINGAN" | "RUSAK_BERAT";
  catatan_penerimaan?: string;
}

export interface GoodsReceiptItemFormData {
  po_item_id: string;
  raw_material_id: string;
  qty_diterima: number;
  qty_diterima_baik: number;
  qty_cacat: number;
  satuan_id?: string;
  harga_satuan: number;
  lokasi_rak?: string;
  catatan?: string;
}

// ─── QC INSPECTION ────────────────────────────

export type QCStatus = "PENDING" | "APPROVED" | "REJECTED" | "PARTIAL";

export interface QCInspection {
  id: string;
  grn_id: string;
  inspected_by?: string;
  inspected_at: string;
  status: QCStatus;
  parameter_inspeksi?: string[];
  hasil_inspeksi?: Record<string, string>;
  qty_sample?: number;
  qty_sample_diterima?: number;
  qty_sample_ditolak?: number;
  foto_qc?: string[];
  dokumen_lain?: string[];
  catatan_qc?: string;
  rekomendasi?: "ACCEPT" | "REJECT" | "REWORK";
  created_at: string;
  updated_at: string;
  // Relations
  inspected_by_user?: {
    id: string;
    email: string;
  };
}

export interface QCInspectionFormData {
  status: QCStatus;
  parameter_inspeksi?: string[];
  hasil_inspeksi?: Record<string, string>;
  qty_sample?: number;
  qty_sample_diterima?: number;
  qty_sample_ditolak?: number;
  foto_qc?: string[];
  dokumen_lain?: string[];
  catatan_qc?: string;
  rekomendasi?: "ACCEPT" | "REJECT" | "REWORK";
}

// ─── RETURNS ──────────────────────────────────

export type ReturnStatus = "DRAFT" | "SENT" | "RECEIVED_BY_SUPPLIER" | "REPLACEMENT_SENT" | "REFUNDED" | "CANCELLED";
export type ReturnReason = "CACAT" | "KADALUARSA" | "SALAH_KIRIM" | "KELEBIHAN" | "LAINNYA";
export type ReturnResolution = "REPLACEMENT" | "REFUND" | "CREDIT_NOTE";

export interface Return {
  id: string;
  nomor_return: string;
  grn_id: string;
  po_id: string;
  supplier_id: string;
  status: ReturnStatus;
  tanggal_return: string;
  alasan_return: ReturnReason;
  keterangan?: string;
  jenis_resolusi?: ReturnResolution;
  nomor_referensi_resolusi?: string;
  total_qty_return: number;
  total_nilai_return: number;
  created_at: string;
  updated_at: string;
  // Relations
  grn?: GoodsReceipt;
  po?: PurchaseOrder;
  supplier?: {
    id: string;
    kode: string;
    nama_supplier: string;
  };
  items?: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  return_id: string;
  grn_item_id: string;
  raw_material_id: string;
  qty_return: number;
  harga_satuan: number;
  nilai_return: number;
  alasan_item?: string;
  foto_bukti?: string[];
  created_at: string;
  // Relations
  raw_material?: RawMaterial;
  grn_item?: GoodsReceiptItem;
}

export interface ReturnFormData {
  grn_id: string;
  alasan_return: ReturnReason;
  keterangan?: string;
  jenis_resolusi?: ReturnResolution;
}

export interface ReturnItemFormData {
  grn_item_id: string;
  raw_material_id: string;
  qty_return: number;
  harga_satuan: number;
  alasan_item?: string;
  foto_bukti?: string[];
}
