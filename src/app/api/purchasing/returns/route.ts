import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/purchasing/returns
// List purchase returns with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "all";
    const supplier_id = searchParams.get("supplier_id");
    const reason_type = searchParams.get("reason_type");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const search = searchParams.get("search");
    const sort_by = searchParams.get("sort_by") || "return_date";
    const sort_order = searchParams.get("sort_order") || "DESC";

    // Build query
    let query = supabase
      .from("purchase_returns")
      .select(`
        *,
        supplier:suppliers!inner (
          id,
          nama_supplier
        ),
        grn:grn!inner (
          id,
          grn_number
        ),
        creator:staff!created_by (
          id,
          full_name
        )
      `, { count: "exact" });

    // Apply filters
    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (supplier_id) {
      query = query.eq("supplier_id", supplier_id);
    }
    if (reason_type) {
      query = query.eq("reason_type", reason_type);
    }
    if (date_from) {
      query = query.gte("return_date", date_from);
    }
    if (date_to) {
      query = query.lte("return_date", date_to);
    }
    if (search) {
      query = query.or(`return_number.ilike.%${search}%,reason_notes.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sort_by as any, { ascending: sort_order === "ASC" });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data return" },
      { status: 500 }
    );
  }
}

// POST /api/purchasing/returns
// Create a new purchase return
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      grn_id,
      supplier_id,
      return_date,
      reason_type,
      reason_notes,
      items,
      notes,
    } = body;

    // Validate required fields
    if (!supplier_id || !return_date || !reason_type || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Field wajib belum lengkap" },
        { status: 400 }
      );
    }

    // Calculate total amount
    const total_amount = items.reduce(
      (sum: number, item: any) => sum + (item.qty_returned * item.unit_cost),
      0
    );

    // Start transaction
    const { data: returnData, error: returnError } = await supabase
      .from("purchase_returns")
      .insert({
        grn_id: grn_id || null,
        supplier_id,
        return_date,
        reason_type,
        reason_notes,
        status: "pending_approval",
        total_amount,
        notes,
      })
      .select()
      .single();

    if (returnError) throw returnError;

    // Insert return items
    const returnItems = items.map((item: any) => ({
      return_id: returnData.id,
      grn_item_id: item.grn_item_id,
      raw_material_id: item.raw_material_id,
      qty_returned: item.qty_returned,
      unit_cost: item.unit_cost,
      subtotal: item.qty_returned * item.unit_cost,
      batch_number: item.batch_number || null,
      expiry_date: item.expiry_date || null,
      condition_notes: item.condition_notes || null,
      qc_status: item.qc_status || "rejected",
    }));

    const { error: itemsError } = await supabase
      .from("purchase_return_items")
      .insert(returnItems);

    if (itemsError) {
      // Rollback: delete the return if items insert fails
      await supabase.from("purchase_returns").delete().eq("id", returnData.id);
      throw itemsError;
    }

    // Fetch complete return data
    const { data: completeReturn } = await supabase
      .from("purchase_returns")
      .select(`
        *,
        supplier:suppliers (nama_supplier),
        items:purchase_return_items (
          *,
          raw_material:raw_materials (kode, nama, satuan)
        )
      `)
      .eq("id", returnData.id)
      .single();

    return NextResponse.json({
      success: true,
      data: completeReturn,
      message: "Return berhasil dibuat dan menunggu persetujuan",
    });
  } catch (error: any) {
    console.error("Error creating return:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuat return" },
      { status: 500 }
    );
  }
}
