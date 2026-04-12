import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/fonnte";
import { sendEmail, candidateStatusEmail } from "@/lib/resend";

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { candidate_id, channel, message } = body;

  // Fetch candidate
  const { data: candidate } = await supabase
    .from("candidates")
    .select("full_name, email, phone, status")
    .eq("id", candidate_id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Kandidat tidak ditemukan" }, { status: 404 });
  }

  let success = false;
  let error = "";

  if (channel === "whatsapp") {
    // Format phone number for Fonnte (e.g. 6281234567890)
    const phone = candidate.phone.replace(/\D/g, "");
    const result = await sendWhatsApp({
      target: phone,
      message: message || `Halo ${candidate.full_name}, Status lamaran kamu saat ini: ${candidate.status}`,
    });
    success = result.success;
    error = result.reason || "";
  } else if (channel === "email") {
    const template = candidateStatusEmail(
      candidate.full_name,
      candidate.status,
      message || undefined
    );
    success = await sendEmail({ to: candidate.email, ...template });
    if (!success) error = "Gagal mengirim email";
  } else {
    return NextResponse.json({ error: "Channel tidak valid" }, { status: 400 });
  }

  // Log notification
  await supabase.from("notifications_log").insert({
    candidate_id,
    channel,
    message: message || "Notifikasi status",
    status: success ? "sent" : "failed",
    sent_at: success ? new Date().toISOString() : null,
  });

  if (!success) {
    return NextResponse.json({ error: error || "Gagal mengirim notifikasi" }, { status: 500 });
  }

  return NextResponse.json({ message: "Notifikasi terkirim" });
}
