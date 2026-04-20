// ============================================
// API ROUTE: /api/purchasing/units
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Validation schema
const unitSchema = z.object({
  kode: z.string().min(1, "Kode satuan wajib diisi").max(10),
  nama: z.string().min(1, "Nama satuan wajib diisi").max(50),
  tipe: z.enum(["BESAR", "KECIL", "KONVERSI"]),
  deskripsi: z.string().optional(),
});

// GET /api/purchasing/units
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const isActive = searchParams.get("is_active");
    
    let query = supabase
      .from("units")
      .select("*")
      .order("nama", { ascending: true });
    
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return Response.json({ data });
  } catch (error: any) {
    console.error("Error fetching units:", error);
    return Response.json(
      { message: error.message || "Gagal mengambil data satuan" },
      { status: 500 }
    );
  }
}

// POST /api/purchasing/units
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Validasi input
    const validated = unitSchema.parse(body);
    
    // Cek kode unik
    const { data: existing } = await supabase
      .from("units")
      .select("id")
      .eq("kode", validated.kode)
      .single();
    
    if (existing) {
      return Response.json(
        { message: "Kode satuan sudah digunakan" },
        { status: 400 }
      );
    }
    
    // Insert data
    const { data, error } = await supabase
      .from("units")
      .insert({
        ...validated,
        is_active: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return Response.json(
      { data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating unit:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { 
          message: "Validasi gagal", 
          errors: error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    return Response.json(
      { message: error.message || "Gagal menambahkan satuan" },
      { status: 500 }
    );
  }
}
