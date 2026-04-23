// ============================================
// API ROUTE: /api/purchasing/products
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const productSchema = z.object({
  kode: z.string().max(20).optional(),
  nama: z.string().min(1, "Nama produk wajib diisi").max(100),
  deskripsi: z.string().optional(),
  kategori: z.string().optional(),
  satuan_id: z.string().uuid().optional(),
  harga_jual: z.number().min(0).default(0),
});

// GET /api/purchasing/products
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search");
    const isActive = searchParams.get("is_active");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("v_products_cogs")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`nama.ilike.%${search}%,kode.ilike.%${search}%`);
    }
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order("nama", { ascending: true })
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
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data produk" },
      { status: 500 }
    );
  }
}

// POST /api/purchasing/products
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const validated = productSchema.parse(body);

    // Auto-generate kode if not provided
    let kode = validated.kode;
    if (!kode) {
      // Generate kode: PRD-YYYYMMDD-XXX
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      
      // Get last product code for today
      const { data: productsToday } = await supabase
        .from("products")
        .select("kode")
        .like("kode", `PRD-${date}-%`)
        .order("kode", { ascending: false })
        .limit(1);
      
      let seqNum = 1;
      if (productsToday && productsToday.length > 0 && productsToday[0].kode) {
        const parts = productsToday[0].kode.split('-');
        const lastSeq = parseInt(parts[parts.length - 1] || '0', 10);
        seqNum = lastSeq + 1;
      }
      
      kode = `PRD-${date}-${String(seqNum).padStart(3, '0')}`;
    } else {
      // Cek kode unik jika disediakan manual
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("kode", kode)
        .single();

      if (existing) {
        return Response.json(
          { success: false, message: "Kode produk sudah digunakan" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        ...validated,
        kode,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json(
      { success: true, data, message: "Produk berhasil ditambahkan" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating product:", error);

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
      { success: false, message: error.message || "Gagal menambahkan produk" },
      { status: 500 }
    );
  }
}
