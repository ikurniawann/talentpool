import { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Delivery State Machine
// IN_TRANSIT → ARRIVED
// IN_TRANSIT → CANCELLED
// ============================================================

export type DeliveryStatus = "pending" | "shipped" | "in_transit" | "delivered" | "cancelled";

export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ["shipped", "in_transit", "cancelled"],
  shipped: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function validateDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus): void {
  const allowed = DELIVERY_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `Invalid delivery transition: ${from} → ${to}. Allowed: ${allowed?.join(", ") || "none"}`
    );
  }
}

// ============================================================
// GRN State Machine
// PENDING → PARTIAL → COMPLETED
// PENDING/PARTIAL → REJECTED
// ============================================================

export type GRNStatus = "pending" | "partial" | "completed" | "rejected";

export const GRN_TRANSITIONS: Record<GRNStatus, GRNStatus[]> = {
  pending: ["partial", "completed", "rejected"],
  partial: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

export function validateGRNTransition(from: GRNStatus, to: GRNStatus): void {
  const allowed = GRN_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `Invalid GRN transition: ${from} → ${to}. Allowed: ${allowed?.join(", ") || "none"}`
    );
  }
}

// ============================================================
// Return State Machine
// PENDING → APPROVED → SHIPPED → RECEIVED_BY_SUPPLIER → COMPLETED
// PENDING/APPROVED → CANCELLED
// ============================================================

export type ReturnStatus =
  | "pending"
  | "approved"
  | "shipped"
  | "received_by_supplier"
  | "completed"
  | "cancelled";

export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  pending: ["approved", "cancelled"],
  approved: ["shipped", "cancelled"],
  shipped: ["received_by_supplier", "cancelled"],
  received_by_supplier: ["completed"],
  completed: [],
  cancelled: [],
};

export function validateReturnTransition(from: ReturnStatus, to: ReturnStatus): void {
  const allowed = RETURN_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `Invalid return transition: ${from} → ${to}. Allowed: ${allowed?.join(", ") || "none"}`
    );
  }
}

// ============================================================
// Generate delivery number: DEV-{YYYY}{MM}-{SEQ:4}
// ============================================================

export async function generateDeliveryNumber(supabase: SupabaseClient): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const { data } = await supabase
    .from("deliveries")
    .select("nomor_resi")
    .ilike("nomor_resi", `DEV-${year}${month}-%`)
    .order("nomor_resi", { ascending: false })
    .limit(1);

  let seq = 1;
  if (data && data.length > 0) {
    // Try pattern DEV-YYYYMM-####
    const match = data[0].nomor_resi.match(/DEV-\d{6}-(\d+)$/);
    if (match) {
      seq = parseInt(match[1]) + 1;
    }
  }

  return `DEV-${year}${month}-${String(seq).padStart(4, "0")}`;
}

// ============================================================
// Validate PO can receive delivery
// ============================================================

export async function validatePOCanDelivery(
  supabase: SupabaseClient,
  poId: string
): Promise<{ valid: boolean; errors: string[]; po?: any }> {
  const errors: string[] = [];

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, po_number, status, supplier_id, is_active")
    .eq("id", poId)
    .single();

  if (!po) {
    errors.push("Purchase Order tidak ditemukan");
    return { valid: false, errors };
  }

  if (!po.is_active) {
    errors.push("Purchase Order sudah tidak aktif");
  }

  if (po.status !== "sent" && po.status !== "partial") {
    errors.push(
      `PO berstatus "${po.status}" — harus berstatus SENT atau PARTIAL untuk dapat dibuatkan Delivery`
    );
  }

  return { valid: errors.length === 0, errors, po };
}

// ============================================================
// Validate GRN can be created from Delivery
// ============================================================

export async function validateDeliveryForGRN(
  supabase: SupabaseClient,
  deliveryId: string
): Promise<{ valid: boolean; errors: string[]; delivery?: any }> {
  const errors: string[] = [];

  const { data: delivery } = await supabase
    .from("deliveries")
    .select("*, purchase_order:purchase_order_id(*)")
    .eq("id", deliveryId)
    .single();

  if (!delivery) {
    errors.push("Delivery tidak ditemukan");
    return { valid: false, errors };
  }

  if (delivery.status !== "delivered") {
    errors.push(`Delivery belum tiba — status: "${delivery.status}", harus DELIVERED`);
  }

  return { valid: errors.length === 0, errors, delivery };
}

// ============================================================
// Check if all GRN items are QC-completed → auto-update GRN status
// ============================================================

export async function updateGRNStatusFromQC(
  supabase: SupabaseClient,
  grnId: string
): Promise<{ newStatus: GRNStatus; isComplete: boolean }> {
  // Get all QC inspections for this GRN
  const { data: qcItems } = await supabase
    .from("qc_inspections")
    .select("jumlah_diterima, jumlah_ditolak, hasil")
    .eq("goods_receipt_id", grnId)
    .eq("is_active", true);

  if (!qcItems || qcItems.length === 0) {
    return { newStatus: "pending", isComplete: false };
  }

  const allCompleted = qcItems.every((q) => q.hasil !== "pending");
  const anyRejected = qcItems.some((q) => q.hasil === "rejected" || q.jumlah_ditolak > 0);

  let newStatus: GRNStatus = "pending";
  if (allCompleted) {
    newStatus = anyRejected ? "partial" : "completed";
  } else {
    newStatus = "partial";
  }

  await supabase
    .from("goods_receipts")
    .update({ status: newStatus })
    .eq("id", grnId);

  return { newStatus, isComplete: allCompleted && !anyRejected };
}
