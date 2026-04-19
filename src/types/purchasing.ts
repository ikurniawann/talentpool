// ============================================================
// Types for Purchasing / Procurement Module (ERP)
// ============================================================

// --- Enums ---
export type VendorCategory = "it" | "office" | "stationery" | "services" | "raw_material" | "other";
export type PRStatus = "draft" | "pending_head" | "pending_finance" | "pending_direksi" | "approved" | "rejected" | "converted";
export type POStatus = "draft" | "sent" | "partial" | "received" | "closed" | "cancelled";
export type ApprovalLevel = "head_dept" | "finance" | "direksi";
export type PriorityLevel = "low" | "medium" | "high" | "urgent";

// --- Master Data ---

export interface Department {
  id: string;
  code: string;           // DEP-001
  name: string;
  head_id: string | null; // User ID kepala dept
  created_at: string;
}

export interface Vendor {
  id: string;
  code: string;           // V-2024-001 (auto-generate)
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  category: VendorCategory;
  npwp: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  code: string;           // PRD-001
  name: string;
  description: string | null;
  category: string;
  unit: string;           // pcs, box, meter, kg, dll
  estimated_price: number;
  vendor_id: string | null; // Preferred vendor
  is_active: boolean;
  created_at: string;
}

// --- Purchase Request ---

export interface PurchaseRequest {
  id: string;
  pr_number: string;      // PR-2024-00001 (auto-generate)
  requester_id: string;   // user.id
  requester_name?: string; // join dari users
  department_id: string;
  department_name?: string; // join dari departments
  status: PRStatus;
  total_amount: number;
  priority: PriorityLevel;
  notes: string | null;
  required_date: string | null;
  
  // Approval tracking
  current_approval_level: ApprovalLevel | null;
  approved_by_head: string | null;
  approved_at_head: string | null;
  approved_by_finance: string | null;
  approved_at_finance: string | null;
  approved_by_direksi: string | null;
  approved_at_direksi: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  
  // Link ke PO (jika sudah converted)
  converted_po_id: string | null;
  
  created_at: string;
  updated_at: string;
  items: PRItem[];
}

export interface PRItem {
  id: string;
  pr_id: string;
  product_id: string | null; // kalau dari master data
  description: string;
  qty: number;
  unit: string;
  estimated_price: number;
  total: number;          // qty * estimated_price
}

// --- Purchase Order ---

export interface PurchaseOrder {
  id: string;
  po_number: string;      // PO-2024-00001 (auto-generate)
  pr_id: string;          // reference ke PR
  pr_number?: string;     // join dari purchase_requests
  vendor_id: string;
  vendor_name?: string;   // join dari vendors
  status: POStatus;
  
  // Financial
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;    // default 11% PPN
  tax_amount: number;
  shipping_cost: number;
  total: number;
  
  // Dates
  order_date: string;
  delivery_date: string | null;
  expected_delivery: string | null;
  
  // Additional info
  payment_terms: string | null; // 30 hari, 14 hari, dll
  delivery_address: string;
  notes: string | null;
  
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  items: POItem[];
}

export interface POItem {
  id: string;
  po_id: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  discount: number;       // per item
  total: number;          // (qty * unit_price) - discount
}

// --- Goods Receipt (Penerimaan Barang) ---

export interface GoodsReceipt {
  id: string;
  gr_number: string;      // GR-2024-00001
  po_id: string;
  po_number?: string;
  vendor_id: string;
  vendor_name?: string;
  receipt_date: string;
  received_by: string;
  notes: string | null;
  status: "complete" | "partial";
  items: GRItem[];
  created_at: string;
}

export interface GRItem {
  id: string;
  gr_id: string;
  po_item_id: string;
  description: string;
  qty_ordered: number;
  qty_received: number;
  notes: string | null;
}

// --- Approval Config ---

export interface ApprovalThreshold {
  level: ApprovalLevel;
  min_amount: number;
  max_amount: number | null;
}

// --- DTOs for Forms ---

export interface VendorCreateInput {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  category: VendorCategory;
  npwp?: string;
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  notes?: string;
}

export interface ProductCreateInput {
  name: string;
  description?: string;
  category: string;
  unit: string;
  estimated_price: number;
  vendor_id?: string;
}

export interface PRCreateInput {
  department_id: string;
  priority: PriorityLevel;
  required_date?: string;
  notes?: string;
  items: {
    product_id?: string;
    description: string;
    qty: number;
    unit: string;
    estimated_price: number;
  }[];
}

export interface POCreateInput {
  pr_id: string;
  vendor_id: string;
  order_date: string;
  delivery_date?: string;
  payment_terms?: string;
  delivery_address: string;
  discount_percent?: number;
  tax_percent?: number;
  shipping_cost?: number;
  notes?: string;
  items: {
    description: string;
    qty: number;
    unit: string;
    unit_price: number;
    discount?: number;
  }[];
}

export interface ApprovalActionInput {
  pr_id: string;
  action: "approve" | "reject";
  reason?: string;
}

// --- Dashboard Stats ---

export interface PurchasingStats {
  total_pr_this_month: number;
  pr_pending_approval: number;
  total_po_this_month: number;
  po_outstanding: number;  // belum received
  total_spending_this_month: number;
  by_department: { dept_id: string; dept_name: string; total_pr: number; total_amount: number }[];
  by_category: { category: string; total_po: number; total_amount: number }[];
}
