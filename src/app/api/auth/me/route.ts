import { createServerPgClient } from "@/lib/pg/create-client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = await createServerPgClient();
    const { data: { user } } = await db.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile } = await db
      .from("users")
      .select("id, full_name, email, role, brand_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        id: user.id,
        email: user.email ?? profile?.email,
      },
    });
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
