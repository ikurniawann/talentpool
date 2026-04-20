// ============================================
// API ROUTE: /api/purchasing/units/[id]
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const unitSchema = z.object({
  kode: z.string().min(1).max(10).optional(),
  nama: z.string().min(1).max(50).optional(),
  tipe: z.enum(["BESAR", "KECIL", "KONVERSI"]).optional(),
  deskripsi: z.string().optional(),
  is_active: z.boolean().optional(),
});

// GET /api/purchasing/units/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Satuan tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }
    
    return Response.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching unit:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal mengambil data satuan" },
      { status: 500 }
    );
  }
}

// PUT /api/purchasing/units/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();
    
    // Validasi input
    const validated = unitSchema.parse(body);
    
    // Cek kode unik jika diupdate
    if (validated.kode) {
      const { data: existing } = await supabase
        .from("units")
        .select("id")
        .eq("kode", validated.kode)
        .neq("id", id)
        .single();
      
      if (existing) {
        return Response.json(
          { success: false, message: "Kode satuan sudah digunakan" },
          { status: 400 }
        );
      }
    }
    
    // Update data
    const { data, error } = await supabase
      .from("units")
      .update(validated)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Satuan tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }
    
    return Response.json({
      success: true,
      data,
      message: "Satuan berhasil diupdate",
    });
  } catch (error: any) {
    console.error("Error updating unit:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { 
          success: false, 
          message: "Validasi gagal", 
          errors: error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    return Response.json(
      { success: false, message: error.message || "Gagal mengupdate satuan" },
      { status: 500 }
    );
  }
}

// DELETE /api/purchasing/units/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Cek apakah satuan digunakan di raw_materials
    const { data: usedInMaterials } = await supabase
      .from("raw_materials")
      .select("id")
      .or(`satuan_besar_id.eq.${id},satuan_kecil_id.eq.${id}`)
      .limit(1);
    
    if (usedInMaterials && usedInMaterials.length > 0) {
      return Response.json(
        { 
          success: false, 
          message: "Satuan tidak bisa dihapus karena masih digunakan di bahan baku" 
        },
        { status: 400 }
      );
    }
    
    // Soft delete dengan set is_active = false
    const { error } = await supabase
      .from("units")
      .update({ is_active: false })
      .eq("id", id);
    
    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Satuan tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }
    
    return Response.json({
      success: true,
      message: "Satuan berhasil dinonaktifkan",
    });
  } catch (error: any) {
    console.error("Error deleting unit:", error);
    return Response.json(
      { success: false, message: error.message || "Gagal menghapus satuan" },
      { status: 500 }
    );
  }
}
