import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/service-client";

const querySchema = z.object({
  material_id: z.string().uuid().optional(),
  search: z.string().optional(),
  tipe: z.enum(["all", "in", "out", "adjustment", "transfer", "return"]).default("all"),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(200),
});

type MaterialStockRow = {
  id: string;
  kode?: string | null;
  nama?: string | null;
  kategori?: string | null;
  satuan?: string | null;
  lokasi_rak?: string | null;
  qty_onhand?: number | string | null;
  avg_cost?: number | string | null;
  min_stock?: number | string | null;
  max_stock?: number | string | null;
  status_stok?: string | null;
};

type MovementRow = {
  id: string;
  raw_material_id: string;
  tipe: "in" | "out" | "adjustment" | "transfer" | "return";
  jumlah?: number | string | null;
  qty_before?: number | string | null;
  qty_after?: number | string | null;
  unit_cost?: number | string | null;
  total_cost?: number | string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  reference_number?: string | null;
  alasan?: string | null;
  catatan?: string | null;
  created_at?: string | null;
  raw_material?: {
    id?: string | null;
    kode?: string | null;
    nama?: string | null;
    kategori?: string | null;
  } | null;
};

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function endOfDay(date: string) {
  return `${date}T23:59:59.999Z`;
}

function startOfDay(date: string) {
  return `${date}T00:00:00.000Z`;
}

function normalizeMaterial(row: MaterialStockRow) {
  return {
    id: row.id,
    kode: row.kode || "",
    nama: row.nama || row.id,
    kategori: row.kategori || "-",
    satuan: row.satuan || "",
    lokasi_rak: row.lokasi_rak || "-",
    qty_onhand: toNumber(row.qty_onhand),
    avg_cost: toNumber(row.avg_cost),
    min_stock: toNumber(row.min_stock),
    max_stock: row.max_stock == null ? null : toNumber(row.max_stock),
    status_stok: row.status_stok || "AMAN",
  };
}

function normalizeMovement(row: MovementRow) {
  return {
    id: row.id,
    raw_material_id: row.raw_material_id,
    material_kode: row.raw_material?.kode || "",
    material_nama: row.raw_material?.nama || row.raw_material_id,
    material_kategori: row.raw_material?.kategori || "-",
    tipe: row.tipe,
    jumlah: toNumber(row.jumlah),
    qty_before: toNumber(row.qty_before),
    qty_after: toNumber(row.qty_after),
    unit_cost: toNumber(row.unit_cost),
    total_cost: toNumber(row.total_cost),
    reference_type: row.reference_type || "-",
    reference_id: row.reference_id || null,
    reference_number: row.reference_number || "-",
    alasan: row.alasan || "-",
    catatan: row.catatan || "",
    created_at: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(["admin", "purchasing_admin", "purchasing_manager", "warehouse_admin", "warehouse_staff", "qc_staff"]);
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));
    const dateFrom = params.date_from ? startOfDay(params.date_from) : undefined;
    const dateTo = params.date_to ? endOfDay(params.date_to) : undefined;

    let materialsQuery = supabase
      .from("v_raw_materials_stock")
      .select("*")
      .eq("is_active", true)
      .order("nama", { ascending: true });

    if (params.search) {
      materialsQuery = materialsQuery.or(`nama.ilike.%${params.search}%,kode.ilike.%${params.search}%`);
    }

    const { data: materialsData, error: materialsError } = await materialsQuery;
    if (materialsError) throw materialsError;

    const materials = ((materialsData || []) as MaterialStockRow[]).map(normalizeMaterial);
    const selectedMaterial = params.material_id
      ? materials.find((material) => material.id === params.material_id) || null
      : null;

    let movementsQuery = supabase
      .from("inventory_movements")
      .select(`
        id,
        raw_material_id,
        tipe,
        jumlah,
        qty_before,
        qty_after,
        unit_cost,
        total_cost,
        reference_type,
        reference_id,
        reference_number,
        alasan,
        catatan,
        created_at,
        raw_material:raw_material_id(id,kode,nama,kategori)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(params.limit);

    if (params.material_id) movementsQuery = movementsQuery.eq("raw_material_id", params.material_id);
    if (params.tipe !== "all") movementsQuery = movementsQuery.eq("tipe", params.tipe);
    if (dateFrom) movementsQuery = movementsQuery.gte("created_at", dateFrom);
    if (dateTo) movementsQuery = movementsQuery.lte("created_at", dateTo);

    const { data: movementsData, error: movementsError } = await movementsQuery;
    if (movementsError) throw movementsError;

    const movements = ((movementsData || []) as unknown as MovementRow[]).map(normalizeMovement);

    let openingBalance = movements[0]?.qty_before || 0;
    if (params.material_id && dateFrom) {
      const { data: previousMovement, error: previousError } = await supabase
        .from("inventory_movements")
        .select("qty_after")
        .eq("raw_material_id", params.material_id)
        .eq("is_active", true)
        .lt("created_at", dateFrom)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousError) throw previousError;
      openingBalance = previousMovement ? toNumber(previousMovement.qty_after) : openingBalance;
    }

    const summary = movements.reduce(
      (acc, movement) => {
        if (movement.tipe === "in") acc.total_in += movement.jumlah;
        if (movement.tipe === "out") acc.total_out += movement.jumlah;
        if (movement.tipe === "return") acc.total_return += movement.jumlah;
        if (movement.tipe === "transfer") acc.total_transfer += movement.jumlah;
        if (movement.tipe === "adjustment") {
          const diff = movement.qty_after - movement.qty_before;
          if (diff >= 0) acc.total_adjustment_in += diff;
          else acc.total_adjustment_out += Math.abs(diff);
        }
        acc.total_value += movement.total_cost || movement.jumlah * movement.unit_cost;
        acc.closing_balance = movement.qty_after;
        return acc;
      },
      {
        opening_balance: openingBalance,
        closing_balance: movements.at(-1)?.qty_after || selectedMaterial?.qty_onhand || 0,
        total_in: 0,
        total_out: 0,
        total_adjustment_in: 0,
        total_adjustment_out: 0,
        total_return: 0,
        total_transfer: 0,
        total_value: 0,
        movement_count: movements.length,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        materials,
        selected_material: selectedMaterial,
        movements,
        summary,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Invalid query params", error.issues).toResponse();
    }
    console.error("Error fetching stock card:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Gagal mengambil stock card" },
      { status: 500 }
    );
  }
}
