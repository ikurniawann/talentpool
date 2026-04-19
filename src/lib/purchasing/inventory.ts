import { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Inventory Movement Types
// ============================================================

export type MovementType = "in" | "out" | "adjustment" | "transfer" | "return";
export type ReferenceType =
  | "purchase_order"
  | "goods_receipt"
  | "qc_inspection"
  | "return"
  | "adjustment"
  | "delivery";

export interface MovementRecord {
  inventory_id: string;
  bahan_baku_id: string;
  tipe: MovementType;
  jumlah: number;
  unit_cost?: number;
  total_cost?: number;
  reference_type: ReferenceType;
  reference_id: string;
  sebelum: number;
  sesudah: number;
  alasan?: string;
  catatan?: string;
  created_by: string;
  tanggal_movement?: string;
}

// ============================================================
// Record a single inventory movement
// ============================================================

export async function recordMovement(
  supabase: SupabaseClient,
  movement: MovementRecord
): Promise<void> {
  await supabase.from("inventory_movements").insert({
    inventory_id: movement.inventory_id,
    bahan_baku_id: movement.bahan_baku_id,
    tipe: movement.tipe,
    jumlah: movement.jumlah,
    unit_cost: movement.unit_cost ?? null,
    total_cost: movement.total_cost ?? null,
    reference_type: movement.reference_type,
    reference_id: movement.reference_id,
    sebelum: movement.sebelum,
    sesudah: movement.sesudah,
    alasan: movement.alasan ?? null,
    catatan: movement.catatan ?? null,
    created_by: movement.created_by,
    tanggal_movement: movement.tanggal_movement ?? new Date().toISOString(),
  });
}

// ============================================================
// Get or create inventory record for a bahan_baku
// ============================================================

export async function getOrCreateInventory(
  supabase: SupabaseClient,
  bahanBakuId: string
): Promise<{ id: string; qty_in_stock: number; avg_cost: number }> {
  const { data: existing } = await supabase
    .from("inventory")
    .select("id, qty_in_stock, avg_cost")
    .eq("bahan_baku_id", bahanBakuId)
    .single();

  if (existing) {
    return existing;
  }

  // Create if doesn't exist
  const { data: newInv, error } = await supabase
    .from("inventory")
    .insert({ bahan_baku_id: bahanBakuId, qty_in_stock: 0, avg_cost: 0 })
    .select("id, qty_in_stock, avg_cost")
    .single();

  if (error || !newInv) {
    throw new Error(`Failed to create inventory record: ${error?.message}`);
  }

  return newInv;
}

// ============================================================
// Weighted Average Cost calculation
// new_avg = (current_qty × current_avg + accepted_qty × unit_price) / (current_qty + accepted_qty)
// ============================================================

export function calculateWeightedAverage(
  currentQty: number,
  currentAvgCost: number,
  acceptedQty: number,
  unitPrice: number
): number {
  if (currentQty + acceptedQty === 0) return 0;
  const totalCurrentValue = currentQty * currentAvgCost;
  const totalAcceptedValue = acceptedQty * unitPrice;
  return (totalCurrentValue + totalAcceptedValue) / (currentQty + acceptedQty);
}

// ============================================================
// Add stock from QC accepted goods (GRN → QC → Inventory)
// Updates qty_in_stock AND avg_cost via weighted average
// Returns the movement record for inventory_movements
// ============================================================

export async function addStockFromQC(
  supabase: SupabaseClient,
  params: {
    grnId: string;
    grnItemId: string;
    bahanBakuId: string;
    qtyAccepted: number;
    unitPrice: number; // from PO item
    userId: string;
  }
): Promise<void> {
  const { grnId, grnItemId, bahanBakuId, qtyAccepted, unitPrice, userId } = params;

  if (qtyAccepted <= 0) return;

  // Get or create inventory
  const inventory = await getOrCreateInventory(supabase, bahanBakuId);

  const sebelum = inventory.qty_in_stock || 0;
  const sesudah = sebelum + qtyAccepted;

  // Calculate new weighted average cost
  const newAvgCost = calculateWeightedAverage(
    sebelum,
    inventory.avg_cost || 0,
    qtyAccepted,
    unitPrice
  );

  // Update inventory
  const { error: invError } = await supabase
    .from("inventory")
    .update({
      qty_in_stock: sesudah,
      avg_cost: newAvgCost,
    })
    .eq("id", inventory.id);

  if (invError) throw new Error(`Failed to update inventory: ${invError.message}`);

  // Record movement
  await recordMovement(supabase, {
    inventory_id: inventory.id,
    bahan_baku_id: bahanBakuId,
    tipe: "in",
    jumlah: qtyAccepted,
    unit_cost: unitPrice,
    total_cost: qtyAccepted * unitPrice,
    reference_type: "goods_receipt",
    reference_id: grnId,
    sebelum,
    sesudah,
    alasan: "QC Accepted",
    created_by: userId,
  });
}

// ============================================================
// Reduce stock on Return sent to supplier
// ============================================================

export async function reduceStockOnReturn(
  supabase: SupabaseClient,
  params: {
    returnId: string;
    bahanBakuId: string;
    qtyReturned: number;
    unitCost: number;
    userId: string;
  }
): Promise<void> {
  const { returnId, bahanBakuId, qtyReturned, unitCost, userId } = params;

  if (qtyReturned <= 0) return;

  const inventory = await getOrCreateInventory(supabase, bahanBakuId);
  const sebelum = inventory.qty_in_stock || 0;
  const sesudah = Math.max(0, sebelum - qtyReturned);

  // Update inventory
  await supabase
    .from("inventory")
    .update({ qty_in_stock: sesudah })
    .eq("id", inventory.id);

  // Record movement
  await recordMovement(supabase, {
    inventory_id: inventory.id,
    bahan_baku_id: bahanBakuId,
    tipe: "out",
    jumlah: qtyReturned,
    unit_cost: unitCost,
    total_cost: qtyReturned * unitCost,
    reference_type: "return",
    reference_id: returnId,
    sebelum,
    sesudah,
    alasan: "Return ke Supplier",
    created_by: userId,
  });
}
