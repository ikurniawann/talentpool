import { NextResponse } from "next/server";
import { createServerPgClient } from "@/lib/pg/create-client";
import { requireUser } from "@/lib/auth/require-user";

const CREATE_PR_ROLES = [
  "purchasing_staff",
  "purchasing_manager",
  "purchasing_admin",
  "super_admin",
  "admin",
  "pos_supervisor",
  "hrd",
];

export async function GET() {
  try {
    const user = await requireUser();
    if (!CREATE_PR_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk membuat PR" },
        { status: 403 }
      );
    }

    const db = await createServerPgClient();

    const [{ data: departments }, { data: materials }, { data: units }] = await Promise.all([
      db.from("departments").select("id, name").eq("is_active", true).order("name"),
      db
        .from("v_raw_materials_stock")
        .select("id, kode, nama, satuan_besar_id, satuan_besar_nama, avg_cost")
        .eq("is_active", true)
        .order("nama"),
      db.from("units").select("id, nama").eq("is_active", true).order("nama"),
    ]);

    const materialIds = (materials || []).map((material) => material.id);
    const { data: conversions } = materialIds.length
      ? await db
          .from("raw_material_unit_conversions")
          .select("raw_material_id, satuan_id, qty_in_base_unit, is_active")
          .in("raw_material_id", materialIds)
          .eq("is_active", true)
      : { data: [] };

    const conversionsByMaterial = new Map<string, NonNullable<typeof conversions>>();
    for (const conversion of conversions || []) {
      const current = conversionsByMaterial.get(conversion.raw_material_id) || [];
      current.push(conversion);
      conversionsByMaterial.set(conversion.raw_material_id, current);
    }

    const materialsWithConversions = (materials || []).map((material) => ({
      ...material,
      unit_conversions: conversionsByMaterial.get(material.id) || [],
    }));

    return NextResponse.json({
      data: {
        departments: departments || [],
        materials: materialsWithConversions,
        units: units || [],
      },
    });
  } catch (error) {
    console.error("Error fetching PR form data:", error);
    return NextResponse.json({ error: "Gagal memuat data form PR" }, { status: 500 });
  }
}
