import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiRole, paginatedResponse } from "@/lib/api/auth";

// GET /api/purchasing/reports/low-stock
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(["warehouse_staff", "warehouse_admin", "purchasing_admin", "purchasing_staff", "admin"]);
    
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || ""; // out_of_stock | low_stock

    // Query inventory with shortage calculation
    let query = supabase
      .from("v_inventory")
      .select(`
        *,
        supplier:raw_material_id(
          suppliers:pr_items!inner(
            purchase_order:purchase_orders!inner(
              supplier_id
            )
          )
        )
      `)
      .or(`stock_status.eq.out_of_stock,stock_status.eq.low_stock`)
      .order("qty_available", { ascending: true });

    if (category && category !== "all") {
      query = query.eq("material_kategori", category);
    }

    if (status === "out_of_stock") {
      query = query.eq("stock_status", "out_of_stock");
    } else if (status === "low_stock") {
      query = query.eq("stock_status", "low_stock");
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transform data dengan calculated fields
    const transformedData = (data || []).map((item: any) => {
      const shortage = Math.max(0, item.qty_minimum - item.qty_available);
      const suggestedOrderQty = shortage > 0 ? Math.ceil(shortage * 1.5) : item.qty_minimum; // 1.5x safety stock
      const estimatedCost = suggestedOrderQty * (item.unit_cost || 0);

      // Get supplier name from nested data
      let supplierName = undefined;
      if (item.supplier && Array.isArray(item.supplier)) {
        const firstSupplier = item.supplier[0];
        if (firstSupplier?.suppliers && Array.isArray(firstSupplier.suppliers)) {
          supplierName = firstSupplier.suppliers[0]?.supplier_name;
        }
      }

      return {
        id: item.id,
        material_kode: item.material_kode,
        material_nama: item.material_nama,
        kategori: item.material_kategori,
        qty_available: item.qty_available,
        qty_minimum: item.qty_minimum,
        qty_maximum: item.qty_maximum,
        unit_cost: item.unit_cost,
        satuan: item.satuan,
        stock_status: item.stock_status,
        shortage_qty: shortage,
        suggested_order_qty: suggestedOrderQty,
        estimated_cost: estimatedCost,
        supplier_name: supplierName,
      };
    });

    return paginatedResponse(transformedData, { 
      page: 1, 
      limit: transformedData.length, 
      total: transformedData.length 
    }, "Low stock report retrieved");

  } catch (e: any) {
    console.error("Error fetching low stock report:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
