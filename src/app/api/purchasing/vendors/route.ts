import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const vendorSchema = z.object({
  name: z.string().min(1, "Nama vendor wajib diisi"),
  contact_person: z.string().min(1, "Contact person wajib diisi"),
  phone: z.string().min(1, "Nomor telepon wajib diisi"),
  email: z.string().email("Email tidak valid"),
  address: z.string().min(1, "Alamat wajib diisi"),
  category: z.enum(["it", "office", "stationery", "services", "raw_material", "other"]),
  npwp: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_account_name: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    
    let query = supabase
      .from("vendors")
      .select("*")
      .eq("is_active", true)
      .order("name");
    
    if (category) {
      query = query.eq("category", category);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }
    
    const { data: vendors, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ data: vendors });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data vendor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate input
    const validated = vendorSchema.parse(body);
    
    // Generate vendor code: V-YYYY-NNNN
    const year = new Date().getFullYear();
    const { data: lastVendor } = await supabase
      .from("vendors")
      .select("code")
      .ilike("code", `V-${year}-%`)
      .order("code", { ascending: false })
      .limit(1);
    
    let sequence = 1;
    if (lastVendor && lastVendor.length > 0) {
      const lastNum = parseInt(lastVendor[0].code.split("-")[2]);
      sequence = lastNum + 1;
    }
    const code = `V-${year}-${String(sequence).padStart(4, "0")}`;
    
    const { data: vendor, error } = await supabase
      .from("vendors")
      .insert({
        code,
        ...validated,
        is_active: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ data: vendor }, { status: 201 });
  } catch (error) {
    console.error("Error creating vendor:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Gagal membuat vendor" },
      { status: 500 }
    );
  }
}
