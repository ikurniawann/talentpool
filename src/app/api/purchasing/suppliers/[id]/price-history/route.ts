// ============================================
// API ROUTE: /api/purchasing/suppliers/[id]/price-history
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/purchasing/suppliers/[id]/price-history
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { id: supplierId } = await params;
    const { searchParams } = new URL(request.url);

    // Query params
    const materialId = searchParams.get("material_id");
    const months = parseInt(searchParams.get("months") || "6");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Build query for price history
    let query = supabase
      .from("v_supplier_price_history")
      .select("*", { count: "exact" })
      .eq("supplier_id", supplierId)
      .gte("berlaku_dari", startDate.toISOString())
      .lte("berlaku_dari", endDate.toISOString())
      .order("berlaku_dari", { ascending: false });

    // Filter by material if specified
    if (materialId) {
      query = query.eq("bahan_baku_id", materialId);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    return Response.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching price history:", error);
    return Response.json(
      { 
        success: false, 
        message: error.message || "Gagal mengambil histori harga" 
      },
      { status: 500 }
    );
  }
}

// POST /api/purchasing/suppliers/[id]/price-history
// Create new price record (automatically archives old one)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { id: supplierId } = await params;
    const body = await request.json();

    const {
      bahan_baku_id,
      harga,
      satuan_id,
      minimum_qty = 1,
      lead_time_days = 0,
      is_preferred = false,
      berlaku_dari,
      berlaku_sampai,
      catatan,
    } = body;

    // Validate required fields
    if (!bahan_baku_id || !harga || !satuan_id) {
      return Response.json(
        { 
          success: false, 
          message: "bahan_baku_id, harga, dan satuan_id wajib diisi" 
        },
        { status: 400 }
      );
    }

    // Check if there's an existing active price for this supplier-material
    const { data: existingPrice } = await supabase
      .from("supplier_price_lists")
      .select("id, berlaku_dari")
      .eq("supplier_id", supplierId)
      .eq("bahan_baku_id", bahan_baku_id)
      .eq("is_active", true)
      .single();

    // If exists, archive it by setting is_active = false and berlaku_sampai
    if (existingPrice) {
      const yesterday = new Date(berlaku_dari || new Date());
      yesterday.setDate(yesterday.getDate() - 1);

      await supabase
        .from("supplier_price_lists")
        .update({
          is_active: false,
          berlaku_sampai: yesterday.toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPrice.id);
    }

    // Insert new price record
    const { data, error } = await supabase
      .from("supplier_price_lists")
      .insert({
        supplier_id: supplierId,
        bahan_baku_id,
        harga,
        satuan_id,
        minimum_qty,
        lead_time_days,
        is_preferred,
        berlaku_dari: berlaku_dari || new Date().toISOString().split('T')[0],
        berlaku_sampai,
        catatan,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json(
      { 
        success: true, 
        data,
        message: existingPrice 
          ? "Harga diupdate (record lama diarsipkan)" 
          : "Harga baru ditambahkan"
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating price record:", error);
    return Response.json(
      { 
        success: false, 
        message: error.message || "Gagal menyimpan harga" 
      },
      { status: 500 }
    );
  }
}
