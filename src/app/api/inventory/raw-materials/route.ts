import { NextRequest } from "next/server";
import { createServerPgClient } from "@/lib/pg/create-client";
import { paginatedResponse } from "@/lib/api/auth";
import {
  getApiUserScope,
  companyScopeOr,
  branchScopeOr,
  validateWarehouseForReceivingScope,
} from "@/lib/api/scope";
import { z } from "zod";

const STATUS_MAP: Record<string, string> = {
  normal: "AMAN",
  low_stock: "MENIPIS",
  out_of_stock: "HABIS",
};

const V_INVENTORY_STATUS_MAP: Record<string, string> = {
  out_of_stock: "HABIS",
  low_stock: "MENIPIS",
  normal: "AMAN",
  overstock: "AMAN",
};

const querySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  warehouse_id: z.string().uuid().optional(),
});

type VInventoryRow = {
  id: string;
  raw_material_id: string;
  material_kode: string;
  material_nama: string;
  material_kategori: string | null;
  qty_available: number | string;
  qty_minimum: number | string;
  qty_maximum?: number | string | null;
  unit_cost: number | string;
  total_value: number | string;
  stock_status: string;
  satuan?: string | null;
  warehouse_id?: string | null;
  warehouse_nama?: string | null;
  branch_id?: string | null;
};

type RawMaterialExtra = {
  id: string;
  konversi_factor?: number | string | null;
  harga_beli?: number | string | null;
  satuan_besar?: { nama?: string } | null;
  satuan_kecil?: { nama?: string } | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapVInventoryRow(
  row: VInventoryRow,
  extras?: RawMaterialExtra | null
) {
  const qtyOnhand = toNumber(row.qty_available);
  const unitCost = toNumber(row.unit_cost);
  const statusStok =
    V_INVENTORY_STATUS_MAP[row.stock_status] ||
    (qtyOnhand <= 0 ? "HABIS" : "AMAN");

  return {
    id: row.raw_material_id,
    kode: row.material_kode,
    nama: row.material_nama,
    kategori: row.material_kategori,
    qty_onhand: qtyOnhand,
    min_stock: toNumber(row.qty_minimum),
    max_stock: row.qty_maximum != null ? toNumber(row.qty_maximum) : null,
    unit_cost: unitCost,
    avg_cost: unitCost,
    total_value: toNumber(row.total_value),
    status_stok: statusStok,
    satuan: row.satuan || extras?.satuan_besar?.nama || null,
    satuan_besar_nama:
      extras?.satuan_besar?.nama || row.satuan || null,
    satuan_kecil_nama: extras?.satuan_kecil?.nama || null,
    konversi_factor:
      extras?.konversi_factor != null
        ? toNumber(extras.konversi_factor)
        : null,
    harga_beli:
      extras?.harga_beli != null ? toNumber(extras.harga_beli) : null,
    warehouse_id: row.warehouse_id ?? null,
    warehouse_nama: row.warehouse_nama ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const db = await createServerPgClient();
    const scope = await getApiUserScope();
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));
    const { search, status, page, limit, warehouse_id: warehouseIdParam } = params;
    const offset = (page - 1) * limit;

    if (warehouseIdParam) {
      const warehouseCheck = await validateWarehouseForReceivingScope(
        warehouseIdParam,
        scope,
        null
      );
      if ("error" in warehouseCheck) {
        return Response.json(
          { success: false, error: "Gudang tidak valid atau tidak diizinkan" },
          { status: 400 }
        );
      }

      let query = db
        .from("v_inventory")
        .select("*", { count: "exact" })
        .eq("warehouse_id", warehouseIdParam);

      const branchOr = branchScopeOr(scope);
      if (branchOr) query = query.or(branchOr);

      if (search) {
        query = query.or(
          `material_nama.ilike.%${search}%,material_kode.ilike.%${search}%`
        );
      }

      if (status === "out_of_stock") {
        query = query.eq("stock_status", "out_of_stock");
      } else if (status === "low_stock") {
        query = query.eq("stock_status", "low_stock");
      } else if (status === "normal") {
        query = query.in("stock_status", ["normal", "overstock"]);
      }

      const { data, error, count } = await query
        .order("material_nama", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const rows = (data || []) as VInventoryRow[];
      const materialIds = Array.from(
        new Set(rows.map((row) => row.raw_material_id).filter(Boolean))
      );

      let extrasById = new Map<string, RawMaterialExtra>();
      if (materialIds.length > 0) {
        const { data: materials } = await db
          .from("raw_materials")
          .select(
            `
            id,
            konversi_factor,
            harga_beli,
            satuan_besar:units!satuan_besar_id(nama),
            satuan_kecil:units!satuan_kecil_id(nama)
          `
          )
          .in("id", materialIds);

        extrasById = new Map(
          ((materials || []) as RawMaterialExtra[]).map((item) => [item.id, item])
        );
      }

      const mapped = rows.map((row) =>
        mapVInventoryRow(row, extrasById.get(row.raw_material_id))
      );

      return paginatedResponse(
        mapped,
        { page, limit, total: count || 0 },
        "Raw material stock retrieved"
      );
    }

    let query = db
      .from("v_raw_materials_stock")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .eq("is_active", true);

    const companyOr = companyScopeOr(scope);
    if (companyOr) query = query.or(companyOr);
    const branchOr = branchScopeOr(scope);
    if (branchOr) query = query.or(branchOr);

    if (search) {
      query = query.or(`nama.ilike.%${search}%,kode.ilike.%${search}%`);
    }
    if (status && STATUS_MAP[status]) {
      query = query.eq("status_stok", STATUS_MAP[status]);
    }

    const { data, error, count } = await query
      .order("nama", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return paginatedResponse(
      data || [],
      { page, limit, total: count || 0 },
      "Raw material stock retrieved"
    );
  } catch (e: unknown) {
    console.error("Error fetching raw material stock:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
