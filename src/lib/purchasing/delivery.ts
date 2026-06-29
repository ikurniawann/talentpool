import type { DbClient } from "@/lib/pg/types";

// ============================================================
// Delivery State Machine
// IN_TRANSIT → ARRIVED
// IN_TRANSIT → CANCELLED
// ============================================================

export type DeliveryStatus = "pending" | "shipped" | "in_transit" | "delivered" | "cancelled";

type DeliveryPO = {
  id: string;
  nomor_po?: string | null;
  status?: string | null;
  supplier_id?: string | null;
  is_active?: boolean | null;
};

type DeliveryWithPO = {
  id: string;
  status?: string | null;
  purchase_order_id?: string | null;
  purchase_order?: DeliveryPO | null;
};

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
// Generate delivery number: DEV-{YYYY}{MM}{DD}-{SEQ:4}
// ============================================================

export async function generateDeliveryNumber(db: DbClient): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const prefix = `DEV-${year}${month}${day}`;

  const { data } = await db
    .from("deliveries")
    .select("nomor_resi")
    .ilike("nomor_resi", `${prefix}-%`)
    .order("nomor_resi", { ascending: false })
    .limit(1);

  let seq = 1;
  if (data && data.length > 0) {
    const match = data[0].nomor_resi.match(/^DEV-\d{8}-(\d+)$/);
    if (match) {
      seq = parseInt(match[1]) + 1;
    }
  }

  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

// ============================================================
// Validate PO can receive delivery
// ============================================================

export async function validatePOCanDelivery(
  db: DbClient,
  poId: string
): Promise<{ valid: boolean; errors: string[]; po?: DeliveryPO }> {
  const errors: string[] = [];

  console.log("=== validatePOCanDelivery ===");
  console.log("Looking for PO with id:", poId);

  const { data: po, error } = await db
    .from("purchase_orders")
    .select("id, nomor_po, status, supplier_id, is_active")
    .eq("id", poId)
    .single();

  console.log("Query result:", { po, error });
  
  if (error) {
    console.error("Database query error:", error);
    errors.push(`Database error: ${error.message}`);
    return { valid: false, errors };
  }

  if (!po) {
    errors.push("Purchase Order tidak ditemukan");
    return { valid: false, errors };
  }

  if (!po.is_active) {
    errors.push("Purchase Order sudah tidak aktif");
  }

  const statusLower = po.status?.toLowerCase();
  if (
    statusLower !== "sent" &&
    statusLower !== "partial" &&
    statusLower !== "partially_received" &&
    statusLower !== "approved"
  ) {
    errors.push(
      `PO berstatus "${po.status}" — harus berstatus APPROVED, SENT, PARTIAL, atau PARTIALLY_RECEIVED untuk dapat dibuatkan Delivery`
    );
  }

  return { valid: errors.length === 0, errors, po };
}

// ============================================================
// Validate GRN can be created from Delivery
// ============================================================

export async function validateDeliveryForGRN(
  db: DbClient,
  deliveryId: string
): Promise<{ valid: boolean; errors: string[]; delivery?: DeliveryWithPO }> {
  const errors: string[] = [];

  const { data: delivery } = await db
    .from("deliveries")
    .select("*, purchase_order:purchase_orders!purchase_order_id(*)")
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
  db: DbClient,
  grnId: string
): Promise<{ newStatus: GRNStatus; isComplete: boolean }> {
  // Get all QC inspections for this GRN
  const { data: qcItems } = await db
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

  await db
    .from("goods_receipts")
    .update({ status: newStatus })
    .eq("id", grnId);

  return { newStatus, isComplete: allCompleted && !anyRejected };
}
