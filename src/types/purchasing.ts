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
