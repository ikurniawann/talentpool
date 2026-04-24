import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: {
    id: string;
  };
}

// GET /api/purchasing/grn/[id]/returnable-items
// Get items from GRN that can be returned
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const supabase = await createClient();
    const grnId = params.id;

    // Get returnable items from view
    const { data, error } = await supabase
      .from("v_returnable_items")
      .select("*")
      .eq("grn_id", grnId)
      .gt("qty_available_to_return", 0);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error("Error fetching returnable items:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil item yang bisa di-return" },
      { status: 500 }
    );
  }
}
