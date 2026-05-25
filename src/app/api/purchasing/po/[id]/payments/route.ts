import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service-client";
import { z } from "zod";

const paymentSchema = z.object({
  payment_term_id: z.string().uuid().optional().nullable(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive(),
  method: z.enum(["cash", "bank_transfer", "giro", "qris", "other"]).default("bank_transfer"),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function generatePaymentNumber(supabase: ReturnType<typeof createServiceClient>) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const prefix = `VP-${year}${month}${day}`;

  const { data, error } = await supabase
    .from("vendor_payments")
    .select("payment_number")
    .ilike("payment_number", `${prefix}-%`)
    .order("payment_number", { ascending: false })
    .limit(1);

  if (error) throw error;

  const lastNumber = data?.[0]?.payment_number?.split("-").pop();
  const nextNumber = Number(lastNumber || 0) + 1;
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

async function recalculateTerm(supabase: ReturnType<typeof createServiceClient>, termId: string) {
  const { data: term, error: termError } = await supabase
    .from("purchase_order_payment_terms")
    .select("id, amount, due_date")
    .eq("id", termId)
    .single();

  if (termError || !term) return;

  const { data: payments, error: paymentsError } = await supabase
    .from("vendor_payments")
    .select("amount")
    .eq("payment_term_id", termId)
    .eq("status", "posted");

  if (paymentsError) throw paymentsError;

  const paidAmount = (payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const termAmount = Number(term.amount || 0);
  const dueDate = term.due_date ? new Date(`${term.due_date}T00:00:00`) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const status =
    paidAmount >= termAmount
      ? "paid"
      : paidAmount > 0
      ? "partial"
      : dueDate && dueDate < today
      ? "overdue"
      : "unpaid";

  const { error } = await supabase
    .from("purchase_order_payment_terms")
    .update({ paid_amount: paidAmount, status, updated_at: new Date().toISOString() })
    .eq("id", termId);

  if (error) throw error;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();
    const validated = paymentSchema.parse(body);

    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("id, supplier_id")
      .eq("id", id)
      .single();

    if (poError || !po) {
      return Response.json({ success: false, message: "PO tidak ditemukan" }, { status: 404 });
    }

    let termId = validated.payment_term_id || null;

    if (!termId) {
      const { data: term, error: termError } = await supabase
        .from("purchase_order_payment_terms")
        .select("id")
        .eq("purchase_order_id", id)
        .eq("is_active", true)
        .in("status", ["unpaid", "partial", "overdue"])
        .order("term_no", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (termError) throw termError;
      termId = term?.id || null;
    }

    if (!termId) {
      return Response.json(
        { success: false, message: "Belum ada termin yang bisa dibayar untuk PO ini" },
        { status: 400 }
      );
    }

    const paymentNumber = await generatePaymentNumber(supabase);
    const { data, error } = await supabase
      .from("vendor_payments")
      .insert({
        payment_number: paymentNumber,
        purchase_order_id: id,
        payment_term_id: termId,
        supplier_id: po.supplier_id,
        payment_date: validated.payment_date || new Date().toISOString().slice(0, 10),
        amount: validated.amount,
        method: validated.method,
        reference_number: validated.reference_number || null,
        notes: validated.notes || null,
        status: "posted",
      })
      .select()
      .single();

    if (error) throw error;

    await recalculateTerm(supabase, termId);

    return Response.json({ success: true, data, message: "Pembayaran vendor berhasil dicatat" }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating vendor payment:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ success: false, message: "Validasi gagal", errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mencatat pembayaran vendor") },
      { status: 500 }
    );
  }
}
