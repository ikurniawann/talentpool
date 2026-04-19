import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePRNumber } from "@/lib/purchasing/utils";
import { requireUser } from "@/lib/supabase/auth";

const prItemSchema = z.object({
  product_id: z.string().optional(),
  description: z.string().min(1, "Deskripsi barang wajib diisi"),
  qty: z.number().min(1, "Jumlah minimal 1"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  estimated_price: z.number().min(0, "Harga estimasi tidak boleh negatif"),
});

const prSchema = z.object({
  department_id: z.string().uuid("Department tidak valid"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  required_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(prItemSchema).min(1, "Minimal 1 item"),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireUser();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const department_id = searchParams.get("department_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("purchase_requests")
      .select(
        `
        *,
        items:pr_items(*),
        requester:users(full_name),
        department:departments(name)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.ilike("pr_number", `%${search}%`);
    }

    if (department_id) {
      query = query.eq("department_id", department_id);
    }

    // Role-based filtering
    const restrictedRoles = ["hiring_manager"];
    if (restrictedRoles.includes(user.role)) {
      // Hiring manager only sees their own PRs
      query = query.eq("requester_id", user.id);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: prs, error, count } = await query.range(from, to);

    if (error) throw error;

    return NextResponse.json({
      data: prs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching PR:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data PR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireUser();
    
    // Check authorization
    const allowedRoles = ["purchasing_staff", "purchasing_manager", "hrd"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk membuat PR" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validated = prSchema.parse(body);
    
    // Generate PR number
    const prNumber = await generatePRNumber(supabase);
    
    // Calculate total
    const totalAmount = validated.items.reduce(
      (sum, item) => sum + item.qty * item.estimated_price,
      0
    );
    
    // Start transaction
    const { data: pr, error: prError } = await supabase
      .from("purchase_requests")
      .insert({
        pr_number: prNumber,
        requester_id: user.id,
        department_id: validated.department_id,
        status: "draft",
        total_amount: totalAmount,
        priority: validated.priority,
        notes: validated.notes || null,
        required_date: validated.required_date || null,
        current_approval_level: null,
      })
      .select()
      .single();
    
    if (prError) throw prError;
    
    // Insert items
    const itemsWithTotal = validated.items.map((item) => ({
      pr_id: pr.id,
      product_id: item.product_id || null,
      description: item.description,
      qty: item.qty,
      unit: item.unit,
      estimated_price: item.estimated_price,
      total: item.qty * item.estimated_price,
    }));
    
    const { error: itemsError } = await supabase
      .from("pr_items")
      .insert(itemsWithTotal);
    
    if (itemsError) throw itemsError;
    
    return NextResponse.json({ data: pr }, { status: 201 });
  } catch (error) {
    console.error("Error creating PR:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Gagal membuat PR" },
      { status: 500 }
    );
  }
}
