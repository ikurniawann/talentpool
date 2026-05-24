import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service-client";
import { requireApiRole, ApiError } from "@/lib/api/auth";
import { addInventoryFromProduction } from "@/lib/inventory";

const updateProductionSchema = z.object({
  action: z.enum(["recheck_stock", "release", "start", "complete", "cancel"]),
  actual_qty: z.number().positive().optional(),
  overhead_cost: z.number().min(0).optional(),
  labor_cost: z.number().min(0).optional(),
  packaging_cost: z.number().min(0).optional(),
  waste_cost: z.number().min(0).optional(),
  materials: z.array(z.object({
    id: z.string().uuid(),
    qty_actual: z.number().min(0),
    waste_qty: z.number().min(0).optional(),
  })).optional(),
});

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function batchNumber(orderNumber: string) {
  return `${orderNumber}-B01`;
}

function nextProductionStep(status: string) {
  if (status === "DRAFT") return "Production order bisa di-release.";
  if (status === "RELEASED") return "Production order bisa dimulai.";
  if (status === "IN_PROGRESS") return "Production order bisa diselesaikan.";
  if (status === "COMPLETED") return "Production order sudah selesai.";
  if (status === "CANCELLED") return "Production order sudah dibatalkan.";
  return "Production order bisa dilanjutkan.";
}

type ProductionMaterialRow = {
  id: string;
  raw_material_id: string;
  qty_planned?: number | string | null;
  qty_actual?: number | string | null;
  inventory_movement_id?: string | null;
  raw_material?: {
    kode?: string | null;
    nama?: string | null;
  } | null;
};

type StockRow = {
  id: string;
  qty_onhand?: number | string | null;
  avg_cost?: number | string | null;
};

async function loadStockMap(
  supabase: ReturnType<typeof createServiceClient>,
  materialIds: string[]
) {
  const uniqueIds = Array.from(new Set(materialIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, StockRow>();

  const { data, error } = await supabase
    .from("v_raw_materials_stock")
    .select("id, qty_onhand, avg_cost")
    .in("id", uniqueIds);

  if (error) throw error;
  return new Map((data || []).map((stock) => [stock.id as string, stock as StockRow]));
}

function buildStockCoverage(
  materials: ProductionMaterialRow[],
  stockMap: Map<string, StockRow>,
  mode: "planned" | "actual" = "planned"
) {
  return materials.map((material) => {
    const requiredQty = mode === "actual"
      ? toNumber(material.qty_actual || material.qty_planned)
      : toNumber(material.qty_planned);
    const stock = stockMap.get(material.raw_material_id);
    const qtyOnhand = toNumber(stock?.qty_onhand);
    const shortageQty = Math.max(0, requiredQty - qtyOnhand);

    return {
      id: material.id,
      raw_material_id: material.raw_material_id,
      kode: material.raw_material?.kode || "",
      nama: material.raw_material?.nama || material.raw_material_id,
      required_qty: requiredQty,
      qty_onhand: qtyOnhand,
      shortage_qty: shortageQty,
      stock_status: shortageQty > 0 ? "INSUFFICIENT" : "ENOUGH",
    };
  });
}

async function validateMaterialStock(
  supabase: ReturnType<typeof createServiceClient>,
  productionOrderId: string,
  mode: "planned" | "actual" = "planned",
  overrides?: Map<string, { qty_actual: number }>
) {
  const { data: materials, error } = await supabase
    .from("production_order_materials")
    .select("id, raw_material_id, qty_planned, qty_actual, inventory_movement_id, raw_material:raw_material_id(kode,nama)")
    .eq("production_order_id", productionOrderId);

  if (error) throw error;
  const rows = (materials || []).map((material) => {
    const override = overrides?.get(material.id);
    return {
      ...material,
      qty_actual: override ? override.qty_actual : material.qty_actual,
    } as ProductionMaterialRow;
  });

  const stockMap = await loadStockMap(supabase, rows.map((material) => material.raw_material_id));
  const coverage = buildStockCoverage(
    rows.filter((material) => !material.inventory_movement_id),
    stockMap,
    mode
  );

  return {
    materials: rows,
    coverage,
    shortages: coverage.filter((item) => item.shortage_qty > 0),
  };
}

function buildWipCode(productCode?: string | null) {
  const base = (productCode || "WIP").replace(/[^A-Za-z0-9]/g, "").slice(0, 17);
  return `WP${base}`.slice(0, 20).toUpperCase();
}

async function ensureWipRawMaterial(
  supabase: ReturnType<typeof createServiceClient>,
  product: { id: string; kode?: string | null; nama?: string | null; satuan_id?: string | null },
  userId: string
) {
  const { data: existing, error: existingError } = await supabase
    .from("raw_materials")
    .select("id")
    .eq("source_product_id", product.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("raw_materials")
    .insert({
      kode: buildWipCode(product.kode),
      nama: product.nama || product.kode || "WIP",
      kategori: "LAINNYA",
      material_type: "WIP",
      source_product_id: product.id,
      satuan_besar_id: product.satuan_id || null,
      satuan_kecil_id: product.satuan_id || null,
      konversi_factor: 1,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(["admin", "purchasing_admin", "purchasing_manager", "warehouse_admin"]);
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: order, error: orderError } = await supabase
      .from("v_production_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: "Production order tidak ditemukan" },
        { status: 404 }
      );
    }

    const [{ data: materials, error: materialsError }, { data: batches, error: batchesError }] =
      await Promise.all([
        supabase
          .from("production_order_materials")
          .select("*, raw_material:raw_material_id(id,kode,nama), satuan:satuan_id(id,kode,nama)")
          .eq("production_order_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("production_batches")
          .select("*")
          .eq("production_order_id", id)
          .order("created_at", { ascending: false }),
      ]);

    if (materialsError) throw materialsError;
    if (batchesError) throw batchesError;

    const stockMap = await loadStockMap(
      supabase,
      (materials || []).map((material) => material.raw_material_id)
    );
    const stockCoverage = buildStockCoverage(
      (materials || []) as ProductionMaterialRow[],
      stockMap,
      ["COMPLETED", "IN_PROGRESS"].includes(order.status) ? "actual" : "planned"
    );
    const coverageByMaterialId = new Map(stockCoverage.map((item) => [item.id, item]));

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        materials: (materials || []).map((material) => ({
          ...material,
          stock: coverageByMaterialId.get(material.id) || null,
        })),
        batches: batches || [],
        stock_coverage: stockCoverage,
        stock_summary: {
          total_materials: stockCoverage.length,
          insufficient_materials: stockCoverage.filter((item) => item.shortage_qty > 0).length,
          can_release: stockCoverage.every((item) => item.shortage_qty <= 0),
        },
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("Error fetching production order:", error);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, "Gagal mengambil detail produksi") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(["admin", "purchasing_admin", "purchasing_manager", "warehouse_admin"]);
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();
    const validated = updateProductionSchema.parse(body);

    const { data: order, error: orderError } = await supabase
      .from("production_orders")
      .select("*, product:product_id(id,kode,nama,satuan_id)")
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: "Production order tidak ditemukan" },
        { status: 404 }
      );
    }

    if (validated.action === "recheck_stock") {
      const mode = ["IN_PROGRESS", "COMPLETED"].includes(order.status) ? "actual" : "planned";
      const stockCheck = await validateMaterialStock(supabase, id, mode);
      const shortageCount = stockCheck.shortages.length;

      const { error: touchError } = await supabase
        .from("production_orders")
        .update({
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (touchError) throw touchError;

      return NextResponse.json({
        success: true,
        data: {
          can_release: shortageCount === 0,
          total_materials: stockCheck.coverage.length,
          insufficient_materials: shortageCount,
          shortages: stockCheck.shortages,
          coverage: stockCheck.coverage,
        },
        message: shortageCount === 0
          ? `Stok bahan sudah cukup. ${nextProductionStep(order.status)}`
          : `Masih ada ${shortageCount} bahan yang kurang. Buat PO atau terima barang masuk terlebih dahulu.`,
      });
    }

    if (validated.action === "release") {
      if (order.status !== "DRAFT") {
        return NextResponse.json(
          { success: false, message: "Hanya produksi DRAFT yang bisa direlease" },
          { status: 400 }
        );
      }

      const stockCheck = await validateMaterialStock(supabase, id, "planned");
      if (stockCheck.shortages.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Stok bahan belum cukup untuk release produksi",
            details: { shortages: stockCheck.shortages },
          },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("production_orders")
        .update({ status: "RELEASED", updated_by: user.id, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data, message: "Produksi berhasil direlease" });
    }

    if (validated.action === "start") {
      if (order.status !== "RELEASED") {
        return NextResponse.json(
          { success: false, message: "Hanya produksi RELEASED yang bisa dimulai" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("production_orders")
        .update({
          status: "IN_PROGRESS",
          started_at: new Date().toISOString(),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data, message: "Produksi dimulai" });
    }

    if (validated.action === "cancel") {
      if (order.status === "COMPLETED") {
        return NextResponse.json(
          { success: false, message: "Produksi completed tidak bisa dibatalkan" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("production_orders")
        .update({
          status: "CANCELLED",
          cancelled_at: new Date().toISOString(),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data, message: "Produksi dibatalkan" });
    }

    if (validated.action !== "complete") {
      return NextResponse.json({ success: false, message: "Action tidak valid" }, { status: 400 });
    }

    if (!["RELEASED", "IN_PROGRESS"].includes(order.status)) {
      return NextResponse.json(
        { success: false, message: "Produksi harus RELEASED atau IN_PROGRESS sebelum completed" },
        { status: 400 }
      );
    }

    const actualQty = validated.actual_qty || toNumber(order.planned_qty);
    const { data: materials, error: materialsError } = await supabase
      .from("production_order_materials")
      .select("*")
      .eq("production_order_id", id);

    if (materialsError) throw materialsError;
    if (!materials || materials.length === 0) {
      return NextResponse.json(
        { success: false, message: "Material produksi tidak ditemukan" },
        { status: 400 }
      );
    }

    const actualByMaterialId = new Map((validated.materials || []).map((item) => [item.id, item]));
    const stockCheck = await validateMaterialStock(supabase, id, "actual", actualByMaterialId);
    if (stockCheck.shortages.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Stok bahan belum cukup untuk complete produksi",
          details: { shortages: stockCheck.shortages },
        },
        { status: 400 }
      );
    }

    const materialUpdates = materials.map((material) => {
      const override = actualByMaterialId.get(material.id);
      const qtyActual = override ? override.qty_actual : toNumber(material.qty_actual || material.qty_planned);
      const wasteQty = override?.waste_qty || toNumber(material.waste_qty);
      const unitCost = toNumber(material.unit_cost);
      return {
        ...material,
        qtyActual,
        wasteQty,
        unitCost,
        totalCost: qtyActual * unitCost,
      };
    });

    for (const material of materialUpdates) {
      if (material.inventory_movement_id) {
        const { error: materialUpdateError } = await supabase
          .from("production_order_materials")
          .update({
            qty_actual: material.qtyActual,
            waste_qty: material.wasteQty,
            unit_cost: material.unitCost,
            total_cost: material.totalCost,
          })
          .eq("id", material.id);

        if (materialUpdateError) throw materialUpdateError;
        continue;
      }

      const { data: inventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, qty_available, unit_cost")
        .eq("raw_material_id", material.raw_material_id)
        .eq("is_active", true)
        .single();

      if (inventoryError || !inventory) {
        return NextResponse.json(
          { success: false, message: `Inventory bahan ${material.raw_material_id} tidak ditemukan` },
          { status: 400 }
        );
      }

      const qtyBefore = toNumber(inventory.qty_available);
      if (qtyBefore < material.qtyActual) {
        return NextResponse.json(
          { success: false, message: `Stok bahan tidak cukup. Sisa ${qtyBefore}, butuh ${material.qtyActual}` },
          { status: 400 }
        );
      }

      const qtyAfter = qtyBefore - material.qtyActual;
      const { data: movement, error: movementError } = await supabase
        .from("inventory_movements")
        .insert({
          inventory_id: inventory.id,
          raw_material_id: material.raw_material_id,
          tipe: "out",
          jumlah: material.qtyActual,
          qty_before: qtyBefore,
          qty_after: qtyAfter,
          unit_cost: material.unitCost,
          total_cost: material.totalCost,
          reference_type: "production",
          reference_id: id,
          reference_number: order.nomor_produksi,
          alasan: `Pemakaian bahan untuk produksi ${order.nomor_produksi}`,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (movementError) throw movementError;

      const { error: inventoryUpdateError } = await supabase
        .from("inventory")
        .update({
          qty_available: qtyAfter,
          last_movement_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", inventory.id);

      if (inventoryUpdateError) throw inventoryUpdateError;

      const { error: materialUpdateError } = await supabase
        .from("production_order_materials")
        .update({
          qty_actual: material.qtyActual,
          waste_qty: material.wasteQty,
          unit_cost: material.unitCost,
          total_cost: material.totalCost,
          inventory_movement_id: movement.id,
        })
        .eq("id", material.id);

      if (materialUpdateError) throw materialUpdateError;
    }

    const actualMaterialCost = materialUpdates.reduce((sum, item) => sum + item.totalCost, 0);
    const overheadCost = validated.overhead_cost ?? toNumber(order.overhead_cost);
    const laborCost = validated.labor_cost ?? toNumber(order.labor_cost);
    const packagingCost = validated.packaging_cost ?? toNumber(order.packaging_cost);
    const wasteCost = validated.waste_cost ?? toNumber(order.waste_cost);
    const totalCost = actualMaterialCost + overheadCost + laborCost + packagingCost + wasteCost;
    const hppPerUnit = totalCost / actualQty;
    const now = new Date().toISOString();

    const outputType = order.output_type || "FINISHED_GOOD";
    const wipRawMaterialId = outputType === "WIP" && order.product
      ? await ensureWipRawMaterial(supabase, order.product, user.id)
      : null;

    const nextBatchNumber = batchNumber(order.nomor_produksi);
    const { data: existingBatch, error: existingBatchError } = await supabase
      .from("production_batches")
      .select("*")
      .eq("batch_number", nextBatchNumber)
      .maybeSingle();

    if (existingBatchError) throw existingBatchError;

    const { data: batch, error: batchError } = existingBatch
      ? await supabase
          .from("production_batches")
          .update({
            output_type: outputType,
            wip_raw_material_id: wipRawMaterialId,
            qty_produced: actualQty,
            hpp_per_unit: hppPerUnit,
            total_cost: totalCost,
          })
          .eq("id", existingBatch.id)
          .select()
          .single()
      : await supabase
          .from("production_batches")
          .insert({
            production_order_id: id,
            product_id: order.product_id,
            output_type: outputType,
            wip_raw_material_id: wipRawMaterialId,
            batch_number: nextBatchNumber,
            qty_produced: actualQty,
            hpp_per_unit: hppPerUnit,
            total_cost: totalCost,
            created_by: user.id,
          })
      .select()
      .single();

    if (batchError) throw batchError;

    if (outputType === "WIP" && wipRawMaterialId) {
      await addInventoryFromProduction(
        supabase,
        wipRawMaterialId,
        actualQty,
        hppPerUnit,
        id,
        order.nomor_produksi,
        user.id
      );
    } else {
      const { data: finishedInventory } = await supabase
        .from("finished_goods_inventory")
        .select("id, qty_available, unit_cost")
        .eq("product_id", order.product_id)
        .maybeSingle();

      if (finishedInventory) {
        const currentQty = toNumber(finishedInventory.qty_available);
        const totalQty = currentQty + actualQty;
        const nextUnitCost = totalQty > 0
          ? ((currentQty * toNumber(finishedInventory.unit_cost)) + totalCost) / totalQty
          : hppPerUnit;

        const { error } = await supabase
          .from("finished_goods_inventory")
          .update({
            qty_available: totalQty,
            unit_cost: nextUnitCost,
            last_movement_at: now,
            updated_by: user.id,
            updated_at: now,
          })
          .eq("id", finishedInventory.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("finished_goods_inventory").insert({
          product_id: order.product_id,
          qty_available: actualQty,
          unit_cost: hppPerUnit,
          last_movement_at: now,
          created_by: user.id,
        });

        if (error) throw error;
      }
    }

    const { data: updatedOrder, error: completeError } = await supabase
      .from("production_orders")
      .update({
        status: "COMPLETED",
        actual_qty: actualQty,
        actual_material_cost: actualMaterialCost,
        overhead_cost: overheadCost,
        labor_cost: laborCost,
        packaging_cost: packagingCost,
        waste_cost: wasteCost,
        hpp_per_unit: hppPerUnit,
        completed_at: now,
        updated_by: user.id,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (completeError) throw completeError;

    const productCode = order.product?.kode;
    if (outputType === "FINISHED_GOOD" && productCode) {
      await supabase
        .from("pos_products")
        .update({ cost_price: hppPerUnit, updated_at: now })
        .eq("sku", `PUR-${productCode}`);
    }

    return NextResponse.json({
      success: true,
      data: { order: updatedOrder, batch },
      message: `Produksi ${order.nomor_produksi} selesai. HPP aktual Rp ${Math.round(hppPerUnit).toLocaleString("id-ID")}`,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validasi gagal", errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("Error updating production order:", error);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, "Gagal mengupdate produksi") },
      { status: 500 }
    );
  }
}
