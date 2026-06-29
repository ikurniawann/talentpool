import { NextRequest, NextResponse } from "next/server";
import { createPgClient } from "@/lib/pg/create-client";

export async function GET(request: NextRequest) {
  try {
    const db = await createPgClient();
    const { data, error } = await db
      .from("score_scales")
      .select("*")
      .eq("is_active", true)
      .order("score", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
