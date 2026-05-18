// ============================================
// PURCHASE ORDER TYPES
// ============================================

export type POStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'rejected'
  | 'cancelled';

export interface Supplier {
  id: string;
  nama_supplier: string;
  kode_supplier: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  npwp?: string;
  status: string;
  kota?: string;
  pic_name?: string;
}

export interface RawMaterialWithStock {
  id: string;
  kode: string;
  nama: string;
  satuan?: string;
  stock?: number;
  harga_terakhir?: number;
  harga_avg?: number;
  satuan_besar?: { nama: string };
}

export interface Unit {
  id: string;
  nama: string;
  simbol?: string;
  tipe?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============================================
// PURCHASE REQUEST TYPES
// ============================================

export type PRStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'cancelled';

export interface PRItem {
  id: string;
  pr_id: string;
  raw_material_id: string;
  qty_requested: number;
  qty_approved: number;
  unit_price?: number;
  subtotal?: number;
  notes?: string;
  description?: string;
  qty?: number;
  unit?: string;
  estimated_price?: number;
  total?: number;
  
  raw_material?: {
    kode: string;
    nama: string;
    satuan?: string;
  };
}

export interface PurchaseRequest {
  id: string;
  pr_number: string;
  request_date: string;
  status: PRStatus;
  total_amount?: number;
  notes?: string;
  requested_by?: string;
  approved_by?: string;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
  
  items?: PRItem[];
}

export interface SupplierPriceListFormData {
  supplier_id: string;
  raw_material_id?: string;
  unit_id?: string;
  price?: number;
  effective_date?: string;
  expiry_date?: string;
  notes?: string;
  bahan_baku_id?: string;
  harga?: number;
  satuan_id?: string;
  minimum_qty?: number;
  lead_time_days?: number;
  is_preferred?: boolean;
  berlaku_dari?: string;
  berlaku_sampai?: string;
  catatan?: string;
}

export interface SupplierPriceList {
  id: string;
  supplier_id: string;
  raw_material_id: string;
  unit_id: string;
  price: number;
  effective_date: string;
  expiry_date?: string | null;
  is_preferred: boolean;
  minimum_qty?: number;
  lead_time_days?: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  
  supplier?: { nama_supplier: string; kode_supplier?: string };
  raw_material?: { kode: string; nama: string };
  unit?: { nama: string; simbol?: string };
  satuan?: { nama: string };
  
  // Legacy field names for compatibility
  bahan_baku_id?: string;
  bahan_baku?: { kode: string; nama: string };
  harga?: number;
  satuan_id?: string;
  berlaku_dari?: string;
  berlaku_sampai?: string;
  catatan?: string | null;
}

// ============================================
// PRODUCT & BOM TYPES
// ============================================

export interface ProductFormData {
  nama_produk?: string;
  kode_produk?: string;
  category?: string;
  unit_id?: string;
  harga_jual?: number;
  notes?: string;
  // Legacy fields for compatibility
  nama?: string;
  kategori?: string;
  deskripsi?: string;
  markup_persen?: number;
  is_active?: boolean;
  harga_modal?: number;
}

export interface ProductWithCOGS {
  id: string;
  nama_produk: string;
  kode_produk: string;
  category?: string;
  unit_id: string;
  harga_jual: number;
  cog: number;
  profit_margin?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  unit?: { nama: string; simbol?: string };
  bom_items?: BOMItem[];
  
  // Legacy fields for compatibility
  nama?: string;
  kategori?: string;
  deskripsi?: string;
  markup_persen?: number;
  is_active?: boolean;
  hpp_estimasi?: number;
}

export interface BOMItem {
  id: string;
  product_id: string;
  raw_material_id: string;
  qty: number;
  unit_id: string;
  cost: number;
  created_at: string;
  updated_at: string;
  
  raw_material?: { kode: string; nama: string; satuan?: string };
  unit?: { nama: string; simbol?: string };
  satuan?: { nama: string };
  
  // Legacy fields for compatibility
  qty_needed?: number;
  waste_persen?: number;
  subtotal?: number;
}

export interface BOMItemFormData {
  raw_material_id: string;
  qty_needed: number;
  waste_persen?: number;
  unit_id?: string;
  cost?: number;
}

export type MaterialCategory = 
  | 'BAHAN_PANGAN'
  | 'BAHAN_NON_PANGAN'
  | 'KEMASAN'
  | 'BAHAN_BAKAR'
  | 'LAINNYA';

export interface RawMaterialWithStock {
  id: string;
  kode: string;
  nama: string;
  satuan?: string;
  stock?: number;
  harga_terakhir?: number;
  harga_avg?: number;
  satuan_besar?: { nama: string };
  category?: MaterialCategory;
  is_active?: boolean;
  min_stock?: number;
  // Legacy fields for compatibility
  kategori?: MaterialCategory;
  deskripsi?: string;
  satuan_besar_id?: string;
  satuan_kecil_id?: string;
  konversi_factor?: number;
  stok_minimum?: number;
  stok_maximum?: number;
  shelf_life_days?: number;
  is_konversi?: boolean;
  storage_condition?: string;
  coa_production?: string;
  coa_rnd?: string;
  coa_asset?: string;
  hpp?: number;
  stok_akhir?: number;
  status_stok?: string;
  qty_onhand?: number;
  qty_reserved?: number;
  qty_available?: number;
  qty_on_order?: number;
}

export interface PurchaseOrderFormData {
  supplier_id: string;
  tanggal_po: string;
  tanggal_kirim_estimasi: string;
  catatan: string;
  alamat_pengiriman: string;
  diskon_persen: number;
  diskon_nominal: number;
  ppn_persen: number;
  items: PurchaseOrderItemFormData[];
}

export interface PurchaseOrderItemFormData {
  raw_material_id: string;
  qty_ordered: number;
  harga_satuan: number;
  notes: string;
}

export interface PurchaseOrder {
  id: string;
  nomor_po: string;
  supplier_id: string;
  tanggal_po: string;
  tanggal_kirim_estimasi: string | null;
  status: POStatus;
  subtotal?: number;
  diskon_persen?: number;
  diskon_nominal?: number;
  ppn_persen?: number;
  ppn_nominal?: number;
  grand_total?: number;
  catatan: string | null;
  alamat_pengiriman?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  sent_via?: string | null;
  cancelled_at?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  nama_supplier?: string;
  supplier_kode?: string;
  supplier?: { nama_supplier: string; alamat?: string };
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  raw_material_id: string;
  qty_ordered: number;
  qty_received: number;
  harga_satuan: number;
  subtotal: number;
  notes: string | null;
  satuan?: { nama: string };
  
  raw_material?: {
    kode: string;
    nama: string;
    satuan?: string;
  };
}

export interface PurchaseOrderWithStats extends PurchaseOrder {
  total_received: number;
  total_pending: number;
  received_percentage: number;
  total_qty_received: number;
  total_qty_ordered: number;
}

// ============================================
// PURCHASE RETURN TYPES
// ============================================

export type ReturnReasonType = 
  | 'damaged'
  | 'wrong_item'
  | 'expired'
  | 'overstock'
  | 'specification_mismatch'
  | 'other';

export type ReturnStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type QCStatus = 'rejected' | 'partially_rejected';

export interface PurchaseReturn {
  id: string;
  return_number: string;
  grn_id: string | null;
  supplier_id: string;
  return_date: string;
  reason_type: ReturnReasonType;
  reason_notes: string | null;
  status: ReturnStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  total_amount: number;
  shipping_date: string | null;
  tracking_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations (optional, loaded separately)
  supplier?: { nama_supplier: string };
  grn?: { grn_number: string };
  items?: PurchaseReturnItem[];
}

export interface PurchaseReturnItem {
  id: string;
  return_id: string;
  grn_item_id: string | null;
  raw_material_id: string;
  qty_returned: number;
  unit_cost: number;
  subtotal: number;
  batch_number: string | null;
  expiry_date: string | null;
  condition_notes: string | null;
  qc_status: QCStatus;
  created_at: string;
  
  // Relations (optional)
  raw_material?: {
    kode: string;
    nama: string;
    satuan?: string;
  };
}

export interface ReturnableItem {
  grn_item_id: string;
  grn_id: string;
  raw_material_id: string;
  raw_material_kode: string;
  raw_material_nama: string;
  qty_diterima: number;
  qty_returned: number;
  qty_available_to_return: number;
  unit_price: number;
  batch_number: string | null;
  expiry_date: string | null;
  qc_status: string;
  supplier_id: string;
  nama_supplier: string;
}

export interface PurchaseReturnFormData {
  grn_id: string;
  supplier_id: string;
  return_date: string;
  reason_type: ReturnReasonType;
  reason_notes: string;
  items: Array<{
    grn_item_id: string;
    raw_material_id: string;
    qty_returned: number;
    unit_cost: number;
    batch_number?: string;
    expiry_date?: string;
    condition_notes?: string;
  }>;
  notes?: string;
}

export interface ReturnListParams {
  page?: number;
  limit?: number;
  supplier_id?: string;
  status?: ReturnStatus | 'all';
  reason_type?: ReturnReasonType | 'all';
  date_from?: string;
  date_to?: string;
  search?: string;
  sort_by?: 'return_date' | 'created_at' | 'return_number';
  sort_order?: 'ASC' | 'DESC';
}

export interface ReturnSummary {
  total_returns: number;
  total_amount: number;
  by_status: Record<ReturnStatus, number>;
  by_reason: Record<ReturnReasonType, number>;
  top_suppliers: Array<{
    supplier_id: string;
    supplier_name: string;
    return_count: number;
    total_amount: number;
  }>;
}

// Reason type labels for UI
export const RETURN_REASON_LABELS: Record<ReturnReasonType, string> = {
  damaged: 'Barang Rusak',
  wrong_item: 'Barang Salah',
  expired: 'Expired Date',
  overstock: 'Overstock',
  specification_mismatch: 'Tidak Sesuai Spesifikasi',
  other: 'Lainnya',
};

// Status labels for UI
export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

// Status colors for UI badges
export const RETURN_STATUS_COLORS: Record<ReturnStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-600',
};
