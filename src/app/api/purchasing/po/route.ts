// ============================================
// API ROUTE: /api/purchasing/po
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const poSchema = z.object({
  supplier_id: z.string().uuid("Supplier wajib dipilih"),
  pr_id: z.string().uuid().optional(),
  tanggal_po: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD"),
  tanggal_kirim_estimasi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  catatan: z.string().optional(),
  alamat_pengiriman: z.string().optional(),
  diskon_persen: z.number().min(0).max(100).default(0),
  diskon_nominal: z.number().min(0).default(0),
  ppn_persen: z.number().min(0).max(100).default(11),
  source_type: z.enum(["manual", "production_order", "low_stock"]).optional().default("manual"),
  production_order_id: z.string().uuid().optional().nullable(),
  source_reference: z.string().optional().nullable(),
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// Helper: Generate nomor PO
async function generateNomorPO(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const prefix = `PO-${year}${month}`;
  
  // Get latest PO number for this month
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("nomor_po")
    .ilike("nomor_po", `${prefix}-%`)
    .order("nomor_po", { ascending: false })
    .limit(1);
  
  if (error) throw error;
  
  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].nomor_po.split("-").pop() || "0");
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

// GET /api/purchasing/po
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Query params
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplier_id");
    const tanggalMulai = searchParams.get("tanggal_mulai");
    const tanggalSampai = searchParams.get("tanggal_sampai");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build query
    let query = supabase
      .from("v_purchase_orders")
      .select("*", { count: "exact" });

    // Filters
    if (search) {
      query = query.or(`nomor_po.ilike.%${search}%,nama_supplier.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq("status", status.toLowerCase());
    }
    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }
    if (tanggalMulai) {
      query = query.gte("tanggal_po", tanggalMulai);
    }
    if (tanggalSampai) {
      query = query.lte("tanggal_po", tanggalSampai);
    }

    // Exclude cancelled dari default view
    if (!searchParams.get("include_cancelled")) {
      query = query.neq("status", "cancelled");
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Execute query
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

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
  } catch (error: unknown) {
    console.error("Error fetching PO:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mengambil data PO") },
      { status: 500 }
    );
  }
}

// POST /api/purchasing/po
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Validasi input
    const validated = poSchema.parse(body);

    // Generate nomor PO
    const nomor_po = await generateNomorPO(supabase);

    // Insert PO dengan status draft
    const insertData = {
      ...validated,
      nomor_po,
      status: "draft",
      subtotal: 0,
      total: 0,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("purchase_orders")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return Response.json(
      { success: true, data, message: "PO berhasil dibuat" },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating PO:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          message: "Validasi gagal",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal membuat PO") },
      { status: 500 }
    );
  }
}
