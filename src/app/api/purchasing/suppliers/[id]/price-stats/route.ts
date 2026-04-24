// ============================================
// API ROUTE: /api/purchasing/suppliers/[id]/price-stats
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/purchasing/suppliers/[id]/price-stats
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { id: supplierId } = await params;
    const { searchParams } = new URL(request.url);

    // Optional material filter
    const materialId = searchParams.get("material_id");

    // Build query
    let query = supabase
      .from("v_supplier_price_stats")
      .select("*")
      .eq("supplier_id", supplierId);

    if (materialId) {
      query = query.eq("bahan_baku_id", materialId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return Response.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error fetching price stats:", error);
    return Response.json(
      { 
        success: false, 
        message: error.message || "Gagal mengambil statistik harga" 
      },
      { status: 500 }
    );
  }
}
