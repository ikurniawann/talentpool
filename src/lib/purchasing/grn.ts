import { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// GRN State Machine
// pending → received / partially_received / rejected
// ============================================================

export type GrnStatus = "pending" | "partially_received" | "received" | "rejected";

type DeliveryForGrn = {
  id: string;
  purchase_order_id?: string | null;
  supplier_id?: string | null;
  no_surat_jalan?: string | null;
  status?: string | null;
};

type POItemForGrn = {
  id: string;
  raw_material_id?: string | null;
  qty_ordered?: number | null;
  qty_received?: number | null;
  harga_satuan?: number | null;
  unit_price?: number | null;
  raw_material?: {
    id: string;
    nama: string;
  } | null;
};

export const GRN_TRANSITIONS: Record<GrnStatus, GrnStatus[]> = {
  pending: ["received", "partially_received", "rejected"],
  partially_received: ["received"],
  received: [],
  rejected: [],
};

export function validateGrnTransition(from: GrnStatus, to: GrnStatus): void {
  const allowed = GRN_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid GRN transition: ${from} → ${to}`);
  }
}

// ============================================================
// Generate GRN Number
// Format: GRN-YYYYMMDD-XXXX
// ============================================================

export async function generateGrnNumber(supabase: SupabaseClient): Promise<string> {
  const today = new Date();
  const datePrefix = `GRN-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  // Ambil sequence terakhir agar aman jika ada nomor yang pernah dihapus/skip.
  const { data } = await supabase
    .from("grn")
    .select("nomor_grn")
    .ilike("nomor_grn", `${datePrefix}-%`)
    .order("nomor_grn", { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastSeq = Number.parseInt(data[0].nomor_grn.split("-").at(-1) || "", 10);
    if (Number.isFinite(lastSeq)) sequence = lastSeq + 1;
  }

  return `${datePrefix}-${String(sequence).padStart(4, "0")}`;
}

// ============================================================
// Validate Delivery can be received
// ============================================================

export async function validateDeliveryCanReceive(
  supabase: SupabaseClient,
  deliveryId: string
): Promise<{ valid: boolean; errors: string[]; delivery?: DeliveryForGrn; items?: POItemForGrn[] }> {
  const errors: string[] = [];

  // Get delivery details
  const { data: delivery, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("id", deliveryId)
    .eq("is_active", true)
    .single();

  if (error || !delivery) {
    errors.push("Delivery tidak ditemukan");
    return { valid: false, errors };
  }

  // Check if delivery is in valid status (delivered juga OK untuk lanjutan penerimaan)
  if (!["pending", "shipped", "in_transit", "delivered"].includes(delivery.status)) {
    errors.push(`Delivery dengan status ${delivery.status} tidak dapat diterima`);
  }

  // Check if GRN already exists for this delivery
  const { data: existingGrn } = await supabase
    .from("grn")
    .select("id, status")
    .eq("delivery_id", deliveryId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingGrn && existingGrn.status === "received") {
    errors.push("Delivery sudah diterima sebelumnya");
  }

  // Get PO items for reference — always use adminSupabase-level access here
  const { data: poItems, error: poItemsError } = await supabase
    .from("purchase_order_items")
    .select(`
      id,
      raw_material_id,
      qty_ordered,
      qty_received,
      raw_material:raw_material_id(id, nama)
    `)
    .eq("purchase_order_id", delivery.purchase_order_id)
    .eq("is_active", true);

  if (poItemsError) {
    errors.push(poItemsError.message);
  }

  return {
    valid: errors.length === 0,
    errors,
    delivery: delivery as DeliveryForGrn,
    items: (poItems || []).map((item) => ({
      ...item,
      raw_material: Array.isArray(item.raw_material) ? item.raw_material[0] ?? null : item.raw_material,
    })) as POItemForGrn[],
  };
}

// ============================================================
// Calculate GRN totals
// ============================================================

export function calculateGrnTotals(items: { qty_diterima: number; qty_ditolak: number }[]) {
  return items.reduce(
    (acc, item) => ({
      total_diterima: acc.total_diterima + (item.qty_diterima || 0),
      total_ditolak: acc.total_ditolak + (item.qty_ditolak || 0),
    }),
    { total_diterima: 0, total_ditolak: 0 }
  );
}

// ============================================================
// Update PO item received quantities
// ============================================================

export async function updatePOItemReceivedQty(
  supabase: SupabaseClient,
  poItemId: string,
  qtyReceived: number
): Promise<void> {
  const { error } = await supabase
    .from("purchase_order_items")
    .update({ qty_received: qtyReceived })
    .eq("id", poItemId);

  if (error) throw error;
}

// ============================================================
// Update Delivery status after GRN
// ============================================================

export async function updateDeliveryStatusAfterGrn(
  supabase: SupabaseClient,
  deliveryId: string,
  grnStatus: GrnStatus
): Promise<void> {
  let newStatus: string;
  
  switch (grnStatus) {
    case "received":
      newStatus = "delivered";
      break;
    case "partially_received":
      newStatus = "in_transit";
      break;
    case "rejected":
      newStatus = "cancelled";
      break;
    default:
      return;
  }

  const { error } = await supabase
    .from("deliveries")
    .update({ status: newStatus })
    .eq("id", deliveryId);

  if (error) throw error;
}

// ============================================================
// Update PO status based on received quantities
// ============================================================

export async function updatePOStatusAfterGrn(
  supabase: SupabaseClient,
  poId: string
): Promise<void> {
  // Get all PO items
  const { data: poItems, error: itemsError } = await supabase
    .from("purchase_order_items")
    .select("qty_ordered, qty_received")
    .eq("purchase_order_id", poId)
    .eq("is_active", true);

  if (itemsError) throw itemsError;

  if (!poItems || poItems.length === 0) return;

  // Calculate totals
  const totalOrdered = poItems.reduce((sum, item) => sum + (item.qty_ordered || 0), 0);
  const totalReceived = poItems.reduce((sum, item) => sum + (item.qty_received || 0), 0);

  // Determine new status
  let newStatus: string;
  if (totalReceived === 0) {
    newStatus = "sent"; // Belum diterima sama sekali
  } else if (totalReceived >= totalOrdered) {
    newStatus = "received"; // Sudah diterima semua
  } else {
    newStatus = "partially_received"; // Diterima sebagian
  }

  // Update PO status
  const { error } = await supabase
    .from("purchase_orders")
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", poId);

  if (error) throw error;
}
