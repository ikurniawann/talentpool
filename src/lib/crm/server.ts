import { NextResponse } from "next/server";
import { z } from "zod";

export const CRM_DEFAULT_TIERS = [
  {
    code: "bronze",
    name: "Bronze",
    rank: 1,
    min_lifetime_xp: 0,
    min_total_spend: 0,
    xp_multiplier: 1,
    discount_percent: 0,
    display_color: "#B7791F",
  },
  {
    code: "silver",
    name: "Silver",
    rank: 2,
    min_lifetime_xp: 10000,
    min_total_spend: 2000000,
    xp_multiplier: 1.2,
    discount_percent: 5,
    display_color: "#94A3B8",
  },
  {
    code: "gold",
    name: "Gold",
    rank: 3,
    min_lifetime_xp: 30000,
    min_total_spend: 7000000,
    xp_multiplier: 1.5,
    discount_percent: 10,
    display_color: "#F59E0B",
  },
];

export function isMissingCrmSchema(error: unknown) {
  if (!error) return false;
  const candidate = error as { code?: string; message?: string };
  const message = candidate.message ?? "";

  return (
    candidate.code === "42P01"
    || candidate.code === "42703"
    || message.includes("Could not find the table")
    || message.includes("Could not find a relationship")
    || message.includes("schema cache")
  );
}

export function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function validationErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: error.issues },
      { status: 400 }
    );
  }

  return null;
}

export function apiErrorResponse(error: unknown, fallback = "Internal server error") {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
