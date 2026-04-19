import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireUser();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("purchase_orders")
      .select(
        `
        *,
        items:po_items(*),
        vendor:vendors(name),
        pr:purchase_requests(pr_number)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`po_number.ilike.%${search}%,vendors.name.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: pos, error, count } = await query.range(from, to);

    if (error) throw error;

    // Transform data
    const transformedData = pos?.map((po: any) => ({
      ...po,
      vendor_name: po.vendor?.name,
      pr_number: po.pr?.pr_number,
    }));

    return NextResponse.json({
      data: transformedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching PO:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data PO" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireUser();

    // Check permission
    const allowedRoles = ["purchasing_staff", "purchasing_manager"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Calculate totals
    const subtotal = body.items?.reduce(
      (sum: number, item: any) => sum + (item.qty * item.unit_price) - (item.discount || 0),
      0
    ) || 0;

    const discountAmount = (subtotal * (body.discount_percent || 0)) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * (body.tax_percent || 11)) / 100;
    const total = afterDiscount + taxAmount + (body.shipping_cost || 0);

    // Generate PO number
    const year = new Date().getFullYear();
    const { data: lastPO } = await supabase
      .from("purchase_orders")
      .select("po_number")
      .ilike("po_number", `PO-${year}-%`)
      .order("po_number", { ascending: false })
      .limit(1);

    let sequence = 1;
    if (lastPO && lastPO.length > 0) {
      const lastNum = parseInt(lastPO[0].po_number.split("-")[2]);
      sequence = lastNum + 1;
    }

    const poNumber = `PO-${year}-${String(sequence).padStart(5, "0")}`;

    // Insert PO
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: poNumber,
        pr_id: body.pr_id || null,
        vendor_id: body.vendor_id,
        status: "draft",
        subtotal,
        discount_percent: body.discount_percent || 0,
        discount_amount: discountAmount,
        tax_percent: body.tax_percent || 11,
        tax_amount: taxAmount,
        shipping_cost: body.shipping_cost || 0,
        total,
        order_date: body.order_date,
        delivery_date: body.delivery_date || null,
        payment_terms: body.payment_terms || null,
        delivery_address: body.delivery_address,
        notes: body.notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (poError) throw poError;

    // Insert items
    if (body.items && body.items.length > 0) {
      const items = body.items.map((item: any) => ({
        po_id: po.id,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        total: (item.qty * item.unit_price) - (item.discount || 0),
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from("po_items")
        .insert(items);

      if (itemsError) throw itemsError;
    }

    // Update PR status if created from PR
    if (body.pr_id) {
      await supabase
        .from("purchase_requests")
        .update({ status: "converted", converted_po_id: po.id })
        .eq("id", body.pr_id);
    }

    return NextResponse.json({ data: po }, { status: 201 });
  } catch (error) {
    console.error("Error creating PO:", error);
    return NextResponse.json(
      { error: "Gagal membuat PO" },
      { status: 500 }
    );
  }
}
