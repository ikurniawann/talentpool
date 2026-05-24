import { SupabaseClient } from "@supabase/supabase-js";

export type StockStatus = "normal" | "low_stock" | "out_of_stock" | "overstock";
export type MovementType = "in" | "out" | "adjustment" | "transfer" | "return";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  normal: "Normal",
  low_stock: "Stok Rendah",
  out_of_stock: "Habis",
  overstock: "Berlebih",
};

export const STOCK_STATUS_COLORS: Record<StockStatus, string> = {
  normal: "bg-green-100 text-green-700 border-green-200",
  low_stock: "bg-yellow-100 text-yellow-700 border-yellow-200",
  out_of_stock: "bg-red-100 text-red-700 border-red-200",
  overstock: "bg-blue-100 text-blue-700 border-blue-200",
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  in: "Masuk",
  out: "Keluar",
  adjustment: "Penyesuaian",
  transfer: "Transfer",
  return: "Return",
};

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  in: "bg-green-100 text-green-700",
  out: "bg-red-100 text-red-700",
  adjustment: "bg-yellow-100 text-yellow-700",
  transfer: "bg-blue-100 text-blue-700",
  return: "bg-purple-100 text-purple-700",
};

// Update qty_on_order saat PO dikirim, dibatalkan, atau barang diterima.
export async function adjustInventoryOnOrder(
  supabase: SupabaseClient,
  rawMaterialId: string,
  qtyDelta: number,
  userId?: string
): Promise<void> {
  if (qtyDelta === 0) return;

  const { data: existing, error: existingError } = await supabase
    .from("inventory")
    .select("id, qty_on_order")
    .eq("raw_material_id", rawMaterialId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const nextQtyOnOrder = Math.max(0, Number(existing.qty_on_order || 0) + qtyDelta);
    const { error } = await supabase
      .from("inventory")
      .update({
        qty_on_order: nextQtyOnOrder,
        updated_by: userId,
      })
      .eq("id", existing.id);

    if (error) throw error;
    return;
  }

  if (qtyDelta < 0) return;

  const { error } = await supabase.from("inventory").insert({
    raw_material_id: rawMaterialId,
    qty_available: 0,
    qty_on_order: qtyDelta,
    unit_cost: 0,
    created_by: userId,
  });

  if (error) throw error;
}

// Tambah inventory dari GRN
export async function addInventoryFromGrn(
  supabase: SupabaseClient,
  rawMaterialId: string,
  qtyAdded: number,
  unitCost: number,
  grnId: string,
  grnNumber: string,
  userId: string
): Promise<void> {
  if (qtyAdded <= 0) return;

  const { data: existing } = await supabase
    .from("inventory")
    .select("id, qty_available, qty_on_order, unit_cost")
    .eq("raw_material_id", rawMaterialId)
    .eq("is_active", true)
    .maybeSingle();

  let inventoryId: string;
  let qtyBefore: number;
  let newUnitCost: number;

  if (existing) {
    // Weighted average cost
    const totalQty = existing.qty_available + qtyAdded;
    newUnitCost = totalQty > 0
      ? ((existing.qty_available * (existing.unit_cost || 0)) + (qtyAdded * unitCost)) / totalQty
      : unitCost;

    qtyBefore = existing.qty_available;
    await supabase.from("inventory").update({
      qty_available: qtyBefore + qtyAdded,
      qty_on_order: Math.max(0, Number(existing.qty_on_order || 0) - qtyAdded),
      unit_cost: newUnitCost,
      last_movement_at: new Date().toISOString(),
      updated_by: userId,
    }).eq("id", existing.id);
    inventoryId = existing.id;
  } else {
    qtyBefore = 0;
    newUnitCost = unitCost;
    const { data: newInv, error } = await supabase.from("inventory").insert({
      raw_material_id: rawMaterialId,
      qty_available: qtyAdded,
      unit_cost: unitCost,
      last_movement_at: new Date().toISOString(),
      created_by: userId,
    }).select("id").single();
    if (error) throw error;
    inventoryId = newInv.id;
  }

  await supabase.from("inventory_movements").insert({
    inventory_id: inventoryId,
    raw_material_id: rawMaterialId,
    tipe: "in",
    jumlah: qtyAdded,
    qty_before: qtyBefore,
    qty_after: qtyBefore + qtyAdded,
    unit_cost: newUnitCost,
    total_cost: qtyAdded * newUnitCost,
    reference_type: "grn",
    reference_id: grnId,
    reference_number: grnNumber,
    alasan: `Penerimaan barang dari GRN ${grnNumber}`,
    created_by: userId,
  });
}

export async function addInventoryFromProduction(
  supabase: SupabaseClient,
  rawMaterialId: string,
  qtyAdded: number,
  unitCost: number,
  productionOrderId: string,
  productionNumber: string,
  userId: string
): Promise<void> {
  if (qtyAdded <= 0) return;

  const { data: existingMovement, error: movementLookupError } = await supabase
    .from("inventory_movements")
    .select("id")
    .eq("raw_material_id", rawMaterialId)
    .eq("reference_type", "production_wip")
    .eq("reference_id", productionOrderId)
    .eq("is_active", true)
    .maybeSingle();

  if (movementLookupError) throw movementLookupError;
  if (existingMovement) return;

  const { data: existing, error: existingError } = await supabase
    .from("inventory")
    .select("id, qty_available, unit_cost")
    .eq("raw_material_id", rawMaterialId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) throw existingError;

  let inventoryId: string;
  let qtyBefore = 0;
  let newUnitCost = unitCost;

  if (existing) {
    qtyBefore = Number(existing.qty_available || 0);
    const totalQty = qtyBefore + qtyAdded;
    newUnitCost = totalQty > 0
      ? ((qtyBefore * Number(existing.unit_cost || 0)) + (qtyAdded * unitCost)) / totalQty
      : unitCost;

    const { error } = await supabase
      .from("inventory")
      .update({
        qty_available: totalQty,
        unit_cost: newUnitCost,
        last_movement_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", existing.id);

    if (error) throw error;
    inventoryId = existing.id;
  } else {
    const { data: newInventory, error } = await supabase
      .from("inventory")
      .insert({
        raw_material_id: rawMaterialId,
        qty_available: qtyAdded,
        unit_cost: unitCost,
        last_movement_at: new Date().toISOString(),
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) throw error;
    inventoryId = newInventory.id;
  }

  const { error: movementError } = await supabase.from("inventory_movements").insert({
    inventory_id: inventoryId,
    raw_material_id: rawMaterialId,
    tipe: "in",
    jumlah: qtyAdded,
    qty_before: qtyBefore,
    qty_after: qtyBefore + qtyAdded,
    unit_cost: newUnitCost,
    total_cost: qtyAdded * newUnitCost,
    reference_type: "production_wip",
    reference_id: productionOrderId,
    reference_number: productionNumber,
    alasan: `Output WIP dari produksi ${productionNumber}`,
    created_by: userId,
  });

  if (movementError) throw movementError;
}

// Kurangi inventory saat GRN dihapus
export async function removeInventoryFromGrn(
  supabase: SupabaseClient,
  rawMaterialId: string,
  qtyRemoved: number,
  grnId: string,
  grnNumber: string,
  userId: string
): Promise<void> {
  if (qtyRemoved <= 0) return;

  const { data: existing } = await supabase
    .from("inventory")
    .select("id, qty_available, qty_on_order")
    .eq("raw_material_id", rawMaterialId)
    .eq("is_active", true)
    .maybeSingle();

  if (!existing) return;

  const qtyBefore = existing.qty_available;
  const qtyAfter = Math.max(0, qtyBefore - qtyRemoved);

  await supabase.from("inventory").update({
    qty_available: qtyAfter,
    qty_on_order: Number(existing.qty_on_order || 0) + qtyRemoved,
    last_movement_at: new Date().toISOString(),
    updated_by: userId,
  }).eq("id", existing.id);

  await supabase.from("inventory_movements").insert({
    inventory_id: existing.id,
    raw_material_id: rawMaterialId,
    tipe: "out",
    jumlah: qtyRemoved,
    qty_before: qtyBefore,
    qty_after: qtyAfter,
    reference_type: "grn_delete",
    reference_id: grnId,
    reference_number: grnNumber,
    alasan: `Pembatalan GRN ${grnNumber}`,
    created_by: userId,
  });
}
