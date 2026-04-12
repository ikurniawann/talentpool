import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@aapextechnology.com";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const full_name = formData.get("full_name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const domicile = formData.get("domicile") as string;
    const source = formData.get("source") as string;
    const position_id = formData.get("position_id") as string | null;
    const brand_id = formData.get("brand_id") as string | null;
    const notes = formData.get("notes") as string | null;

    const cvFile = formData.get("cv") as File | null;
    const photoFile = formData.get("photo") as File | null;

    // --- Basic validation ---
    if (!full_name || !email || !phone || !domicile || !source) {
      return NextResponse.json({ error: "Field wajib belum lengkap" }, { status: 400 });
    }

    // --- Upload files ---
    let cvUrl: string | null = null;
    let photoUrl: string | null = null;

    if (cvFile && cvFile.size > 0) {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(cvFile.type)) {
        return NextResponse.json({ error: "CV harus format PDF atau DOC" }, { status: 400 });
      }
      if (cvFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "CV maksimal 5MB" }, { status: 400 });
      }
      const result = await uploadFile("cv", cvFile, "candidates");
      if (result.error) {
        return NextResponse.json({ error: "Gagal upload CV: " + result.error }, { status: 500 });
      }
      cvUrl = result.url;
    }

    if (photoFile && photoFile.size > 0) {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(photoFile.type)) {
        return NextResponse.json({ error: "Foto harus format JPG/PNG" }, { status: 400 });
      }
      if (photoFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "Foto maksimal 2MB" }, { status: 400 });
      }
      const result = await uploadFile("photos", photoFile, "candidates");
      if (result.error) {
        return NextResponse.json({ error: "Gagal upload foto: " + result.error }, { status: 500 });
      }
      photoUrl = result.url;
    }

    // --- Save to Supabase ---
    const supabase = await createClient();

    // Get position and brand names for email
    let positionTitle = "Belum ditentukan";
    let brandName = "Umum";
    
    if (position_id) {
      const { data: pos } = await supabase.from("positions").select("title").eq("id", position_id).single();
      if (pos) positionTitle = pos.title;
    }
    if (brand_id) {
      const { data: br } = await supabase.from("brands").select("name").eq("id", brand_id).single();
      if (br) brandName = br.name;
    }

    const { data: candidate, error: insertError } = await supabase
      .from("candidates")
      .insert({
        full_name,
        email,
        phone,
        domicile,
        source: source as any,
        position_id: position_id || null,
        brand_id: brand_id || null,
        cv_url: cvUrl,
        photo_url: photoUrl,
        notes: notes || null,
        status: "new",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Gagal simpan lamaran: " + insertError.message }, { status: 500 });
    }

    // --- Send confirmation email ---
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Lamaran Kamu Sudah Kami Terima",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Terima Kasih, ${full_name}!</h2>
              <p style="color: #555;">Lamaran kamu untuk posisi <strong>${positionTitle}</strong> di <strong>${brandName}</strong> sudah kami terima.</p>
              <p style="color: #555;">Tim HRD akan menghubungi kamu melalui WhatsApp atau email dalam 1-3 hari kerja.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #888; font-size: 12px;">Pesan ini dikirim otomatis. Mohon tidak membalas email ini.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Email send error:", emailError);
        // Don't fail the submission if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lamaran berhasil dikirim",
      candidate_id: candidate.id,
    });
  } catch (error: any) {
    console.error("Portal submit error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan: " + error.message }, { status: 500 });
  }
}
