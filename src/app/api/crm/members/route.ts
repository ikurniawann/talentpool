import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPosSession } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/service-client";
import {
  apiErrorResponse,
  isMissingCrmSchema,
  toNumber,
  validationErrorResponse,
} from "@/lib/crm/server";

const POS_CUSTOMER_COLUMNS = "id, name, phone, email, membership_tier, ark_coin_balance, total_xp, current_xp, total_spent, visit_count, is_active";

type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  membership_tier: string | null;
  ark_coin_balance: number | string | null;
  total_xp: number | string | null;
  current_xp: number | string | null;
  total_spent: number | string | null;
  visit_count: number | string | null;
  is_active: boolean | null;
};

type TierRow = {
  id: string;
  code: string;
  name: string;
  rank: number;
  xp_multiplier?: number | string | null;
  discount_percent?: number | string | null;
};

type MemberProfileRow = {
  id: string;
  customer_id: string;
  member_code: string;
  tier_id: string;
  current_xp: number | string;
  lifetime_xp: number | string;
  spent_xp: number | string;
  loyalty_score: number | string;
  active_avatar_id: string | null;
  joined_at: string;
  last_activity_at: string | null;
  status: string;
  metadata: Record<string, unknown>;
  tier?: TierRow | null;
};

const enrollSchema = z.object({
  customer_id: z.string().uuid(),
  tier_code: z.string().trim().min(1).max(40).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

function normalizeCustomer(customer: CustomerRow) {
  return {
    id: customer.id,
    name: customer.name ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    membership_tier: customer.membership_tier ?? "bronze",
    ark_coin_balance: toNumber(customer.ark_coin_balance),
    total_xp: toNumber(customer.total_xp),
    current_xp: toNumber(customer.current_xp),
    total_spent: toNumber(customer.total_spent),
    visit_count: toNumber(customer.visit_count),
    is_active: customer.is_active !== false,
  };
}

function syntheticMemberFromCustomer(customer: CustomerRow) {
  const normalized = normalizeCustomer(customer);

  return {
    id: `pos-${normalized.id}`,
    customer_id: normalized.id,
    member_code: normalized.phone || normalized.id.slice(0, 8),
    tier: {
      code: normalized.membership_tier,
      name: normalized.membership_tier,
    },
    current_xp: normalized.current_xp,
    lifetime_xp: normalized.total_xp,
    spent_xp: 0,
    loyalty_score: normalized.total_xp + normalized.total_spent / 10000,
    status: normalized.is_active ? "active" : "inactive",
    source: "pos_customers",
    customer: normalized,
  };
}

function normalizeMember(profile: MemberProfileRow, customer?: CustomerRow) {
  return {
    id: profile.id,
    customer_id: profile.customer_id,
    member_code: profile.member_code,
    tier: profile.tier ?? null,
    current_xp: toNumber(profile.current_xp),
    lifetime_xp: toNumber(profile.lifetime_xp),
    spent_xp: toNumber(profile.spent_xp),
    loyalty_score: toNumber(profile.loyalty_score),
    active_avatar_id: profile.active_avatar_id,
    joined_at: profile.joined_at,
    last_activity_at: profile.last_activity_at,
    status: profile.status,
    metadata: profile.metadata ?? {},
    source: "crm_member_profiles",
    customer: customer ? normalizeCustomer(customer) : null,
  };
}

export async function GET(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const tier = searchParams.get("tier");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    let tierId: string | null = null;
    if (tier) {
      const { data: tierRow, error: tierError } = await supabase
        .from("crm_membership_tiers")
        .select("id")
        .eq("code", tier)
        .maybeSingle();

      if (tierError && !isMissingCrmSchema(tierError)) throw tierError;
      tierId = (tierRow as { id?: string } | null)?.id ?? null;
    }

    let profileQuery = supabase
      .from("crm_member_profiles")
      .select("*, tier:crm_membership_tiers(id, code, name, rank, xp_multiplier, discount_percent)")
      .order("lifetime_xp", { ascending: false })
      .limit(limit);

    if (tierId) profileQuery = profileQuery.eq("tier_id", tierId);
    if (search) profileQuery = profileQuery.ilike("member_code", `%${search}%`);

    const { data: profiles, error: profileError } = await profileQuery;

    if (profileError) {
      if (!isMissingCrmSchema(profileError)) throw profileError;

      let customerQuery = supabase
        .from("pos_customers")
        .select(POS_CUSTOMER_COLUMNS)
        .eq("is_active", true)
        .order("total_xp", { ascending: false })
        .limit(limit);

      if (search) {
        customerQuery = customerQuery.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (tier) customerQuery = customerQuery.eq("membership_tier", tier);

      const { data: customers, error: customerError } = await customerQuery;
      if (customerError) throw customerError;

      return NextResponse.json({
        success: true,
        data: ((customers ?? []) as CustomerRow[]).map(syntheticMemberFromCustomer),
        meta: { schemaReady: false },
      });
    }

    const customerIds = ((profiles ?? []) as MemberProfileRow[]).map((profile) => profile.customer_id);
    const customersById = new Map<string, CustomerRow>();

    if (customerIds.length === 0) {
      let customerQuery = supabase
        .from("pos_customers")
        .select(POS_CUSTOMER_COLUMNS)
        .eq("is_active", true)
        .order("total_spent", { ascending: false })
        .limit(limit);

      if (search) {
        customerQuery = customerQuery.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (tier) customerQuery = customerQuery.eq("membership_tier", tier);

      const { data: customers, error: customerError } = await customerQuery;
      if (customerError) throw customerError;

      return NextResponse.json({
        success: true,
        data: ((customers ?? []) as CustomerRow[]).map(syntheticMemberFromCustomer),
        meta: { schemaReady: true },
      });
    }

    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from("pos_customers")
        .select(POS_CUSTOMER_COLUMNS)
        .in("id", customerIds);

      ((customers ?? []) as CustomerRow[]).forEach((customer) => customersById.set(customer.id, customer));
    }

    return NextResponse.json({
      success: true,
      data: ((profiles ?? []) as MemberProfileRow[]).map((profile) => normalizeMember(profile, customersById.get(profile.customer_id))),
      meta: { schemaReady: true },
    });
  } catch (error) {
    console.error("Error fetching CRM members:", error);
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    const payload = enrollSchema.parse(await request.json());
    const supabase = createServiceClient();

    const { data: customer, error: customerError } = await supabase
      .from("pos_customers")
      .select(POS_CUSTOMER_COLUMNS)
      .eq("id", payload.customer_id)
      .maybeSingle();

    if (customerError) throw customerError;
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer tidak ditemukan" }, { status: 404 });
    }

    const customerRow = customer as CustomerRow;
    const requestedTierCode = String(payload.tier_code ?? customerRow.membership_tier ?? "bronze").toLowerCase();
    const { data: requestedTier, error: tierError } = await supabase
      .from("crm_membership_tiers")
      .select("id, code, name, rank")
      .eq("code", requestedTierCode)
      .maybeSingle();
    let tier = requestedTier;

    if (tierError) {
      if (isMissingCrmSchema(tierError)) {
        return NextResponse.json(
          { success: false, error: "CRM migration belum diterapkan" },
          { status: 409 }
        );
      }
      throw tierError;
    }

    if (!tier && requestedTierCode !== "bronze") {
      const fallback = await supabase
        .from("crm_membership_tiers")
        .select("id, code, name, rank")
        .eq("code", "bronze")
        .maybeSingle();

      if (fallback.error) throw fallback.error;
      tier = fallback.data;
    }

    if (!tier) {
      return NextResponse.json({ success: false, error: "Tier CRM tidak ditemukan" }, { status: 404 });
    }

    const normalizedCustomer = normalizeCustomer(customerRow);
    const { data: profile, error: profileError } = await supabase
      .from("crm_member_profiles")
      .upsert(
        {
          customer_id: payload.customer_id,
          tier_id: (tier as TierRow).id,
          current_xp: normalizedCustomer.current_xp,
          lifetime_xp: normalizedCustomer.total_xp,
          spent_xp: 0,
          loyalty_score: normalizedCustomer.total_xp + normalizedCustomer.total_spent / 10000,
          status: "active",
          metadata: payload.metadata,
          last_activity_at: new Date().toISOString(),
        },
        { onConflict: "customer_id" }
      )
      .select("*, tier:crm_membership_tiers(id, code, name, rank, xp_multiplier, discount_percent)")
      .single();

    if (profileError) throw profileError;

    return NextResponse.json({
      success: true,
      data: normalizeMember(profile as MemberProfileRow, customerRow),
    });
  } catch (error) {
    const validation = validationErrorResponse(error);
    if (validation) return validation;

    console.error("Error enrolling CRM member:", error);
    return apiErrorResponse(error);
  }
}
