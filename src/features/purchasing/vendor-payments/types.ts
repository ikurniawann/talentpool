export type VendorPaymentStatus = "unpaid" | "partial" | "paid" | "overdue";

export interface VendorPaymentRow {
  purchase_order_id: string;
  nomor_po: string;
  nama_supplier?: string | null;
  payable_amount: number;
  scheduled_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  next_due_date?: string | null;
  payment_status: VendorPaymentStatus;
}

export interface VendorPaymentListParams {
  search?: string;
}
