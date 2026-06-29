import { createServerPgClient } from "@/lib/pg/create-client";
import { NextResponse } from "next/server";

// GET /api/candidates/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await createServerPgClient();
  const { id } = await params;

  const { data, error } = await db
    .from("candidates")
    .select("*, brands(name), positions(title)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Kandidat tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// PUT /api/candidates/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await createServerPgClient();
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await db
    .from("candidates")
    .update({
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      domicile: body.domicile,
      source: body.source,
      position_id: body.position_id,
      brand_id: body.brand_id,
      status: body.status,
      notes: body.notes,
      cv_url: body.cv_url,
      photo_url: body.photo_url,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/candidates/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await createServerPgClient();
  const { id } = await params;

  const { error } = await db.from("candidates").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Kandidat dihapus" });
}
