// ============================================
// API ROUTE: /api/purchasing/po/[id]/send
// ============================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const sendSchema = z.object({
  sent_via: z.enum(["EMAIL", "WHATSAPP", "PRINT", "OTHER"]),
});

// POST /api/purchasing/po/:id/send
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validasi input
    const { sent_via } = sendSchema.parse(body);

    // Cek PO ada
    const { data: po, error: findError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !po) {
      return Response.json(
        { success: false, message: "PO tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi status - harus APPROVED untuk dikirim
    if (po.status !== "APPROVED") {
      return Response.json(
        { success: false, message: "PO harus diapprove terlebih dahulu sebelum dikirim" },
        { status: 400 }
      );
    }

    // Update status ke SENT
    const { data, error } = await supabase
      .from("purchase_orders")
      .update({
        status: "SENT",
        sent_via,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({
      success: true,
      data,
      message: `PO berhasil dikirim ke supplier via ${sent_via}`,
    });
  } catch (error: any) {
    console.error("Error sending PO:", error);

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
      { success: false, message: error.message || "Gagal mengirim PO" },
      { status: 500 }
    );
  }
}
