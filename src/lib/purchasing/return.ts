import { 
  PurchaseReturn, 
  PurchaseReturnFormData, 
  ReturnListParams,
  ReturnableItem 
} from "@/types/purchasing";

const API_BASE = "/api/purchasing/returns";

/**
 * List purchase returns with pagination and filters
 */
export async function listReturns(params: ReturnListParams) {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.status) searchParams.set("status", params.status);
  if (params.supplier_id) searchParams.set("supplier_id", params.supplier_id);
  if (params.reason_type) searchParams.set("reason_type", params.reason_type);
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to) searchParams.set("date_to", params.date_to);
  if (params.search) searchParams.set("search", params.search);
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);

  const response = await fetch(`${API_BASE}?${searchParams}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Gagal mengambil data return");
  }

  return result;
}

/**
 * Get single purchase return by ID
 */
export async function getReturn(id: string): Promise<PurchaseReturn> {
  const response = await fetch(`${API_BASE}/${id}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Gagal mengambil detail return");
  }

  return result.data;
}

/**
 * Create new purchase return
 */
export async function createReturn(data: PurchaseReturnFormData) {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Gagal membuat return");
  }

  return result;
}

/**
 * Approve purchase return
 */
export async function approveReturn(id: string, approvedBy: string) {
  const response = await fetch(`${API_BASE}/${id}/approve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved_by: approvedBy }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Gagal menyetujui return");
  }

  return result;
}

/**
 * Reject purchase return
 */
export async function rejectReturn(id: string, reason: string, rejectedBy: string) {
  const response = await fetch(`${API_BASE}/${id}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rejection_reason: reason, rejected_by: rejectedBy }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Gagal menolak return");
  }

  return result;
}

/**
 * Get returnable items from GRN
 */
export async function getReturnableItems(grnId: string): Promise<ReturnableItem[]> {
  const response = await fetch(`/api/purchasing/grn/${grnId}/returnable-items`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Gagal mengambil item yang bisa di-return");
  }

  return result.data || [];
}

/**
 * Update return (for draft status only)
 */
export async function updateReturn(id: string, data: Partial<PurchaseReturnFormData>) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Gagal mengupdate return");
  }

  return result;
}

/**
 * Cancel return (draft or pending only)
 */
export async function cancelReturn(id: string) {
  const response = await fetch(`${API_BASE}/${id}/cancel`, {
    method: "PATCH",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Gagal membatalkan return");
  }

  return result;
}

/**
 * Mark return as shipped
 */
export async function shipReturn(id: string, shippingDate: string, trackingNumber?: string) {
  const response = await fetch(`${API_BASE}/${id}/ship`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shipping_date: shippingDate, tracking_number: trackingNumber }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Gagal mengupdate status pengiriman");
  }

  return result;
}
