import { NextRequest, NextResponse } from "next/server";
import { createPgClient } from "@/lib/pg/create-client";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableCode: string }> }
) {
  const { tableCode } = await params;
  const code = decodeURIComponent(tableCode || "").trim();

  if (!code) {
    return NextResponse.json({ success: false, error: "Table code wajib diisi" }, { status: 400 });
  }

  try {
    const db = createPgClient();
    let table: { id: string; table_number?: string | null; qr_code?: string | null; status?: string | null } | null = null;

    const query = db
      .from("pos_tables")
      .select("id, table_number, qr_code, status")
      .limit(1);

    const { data, error } = isUuid(code)
      ? await query.eq("id", code).maybeSingle()
      : await query.or(`table_number.eq.${code},qr_code.eq.${code}`).maybeSingle();

    if (!error && data) {
      table = data;
    }

    return NextResponse.json({
      success: true,
      data: {
        table_id: table?.id ?? null,
        table_code: code.toUpperCase(),
        table_label: table?.table_number || table?.qr_code || code.toUpperCase(),
        order_type: "dine_in",
        status: table?.status ?? "active",
        table_resolved: Boolean(table?.id),
      },
    });
  } catch (error) {
    console.error("Table order session error:", error);
    return NextResponse.json({
      success: true,
      data: {
        table_id: null,
        table_code: code.toUpperCase(),
        table_label: code.toUpperCase(),
        order_type: "dine_in",
        status: "active",
        table_resolved: false,
      },
    });
  }
}
