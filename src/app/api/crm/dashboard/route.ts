import { NextResponse } from "next/server";
import { getPosSession } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/service-client";
import { apiErrorResponse, isMissingCrmSchema, toNumber } from "@/lib/crm/server";

const POS_CUSTOMER_COLUMNS = "id, name, phone, email, membership_tier, ark_coin_balance, total_xp, current_xp, total_spent, visit_count, is_active";

type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email?: string | null;
  membership_tier: string | null;
  ark_coin_balance: number | string | null;
  total_xp: number | string | null;
  current_xp: number | string | null;
  total_spent: number | string | null;
  visit_count: number | string | null;
  is_active: boolean | null;
};

type PosOrderArkRow = {
  customer_id: string | null;
  ark_coins_used: number | string | null;
};

function normalizeCustomer(customer: CustomerRow) {
  return {
    id: customer.id,
    name: customer.name ?? "Walk-in Customer",
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

async function countTable(supabase: ReturnType<typeof createServiceClient>, table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    if (isMissingCrmSchema(error)) return { count: 0, ready: false };
    throw error;
  }

  return { count: count ?? 0, ready: true };
}

export async function GET() {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { count: totalCustomers, error: customerCountError } = await supabase
      .from("pos_customers")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if (customerCountError) throw customerCountError;

    const [
      memberCount,
      tierCount,
      xpRuleCount,
      rewardCount,
      avatarCount,
      redemptionCount,
      eventCount,
    ] = await Promise.all([
      countTable(supabase, "crm_member_profiles"),
      countTable(supabase, "crm_membership_tiers"),
      countTable(supabase, "crm_xp_rules"),
      countTable(supabase, "crm_rewards"),
      countTable(supabase, "crm_collectible_avatars"),
      countTable(supabase, "crm_redemptions"),
      countTable(supabase, "crm_external_events"),
    ]);

    const schemaReady = [
      memberCount,
      tierCount,
      xpRuleCount,
      rewardCount,
      avatarCount,
      redemptionCount,
      eventCount,
    ].every((item) => item.ready);

    const { data: loyalCustomers, error: loyalError } = await supabase
      .from("pos_customers")
      .select(POS_CUSTOMER_COLUMNS)
      .eq("is_active", true)
      .order("total_xp", { ascending: false })
      .limit(5);

    if (loyalError) throw loyalError;

    const { data: topTransactionCustomers, error: spenderError } = await supabase
      .from("pos_customers")
      .select(POS_CUSTOMER_COLUMNS)
      .eq("is_active", true)
      .order("total_spent", { ascending: false })
      .limit(5);

    if (spenderError) throw spenderError;

    const { data: arkOrders, error: arkOrderError } = await supabase
      .from("pos_orders")
      .select("customer_id, ark_coins_used")
      .not("customer_id", "is", null)
      .gt("ark_coins_used", 0)
      .limit(1000);

    const topArkMap = new Map<string, number>();
    if (!arkOrderError) {
      ((arkOrders ?? []) as PosOrderArkRow[]).forEach((order) => {
        if (!order.customer_id) return;
        topArkMap.set(order.customer_id, (topArkMap.get(order.customer_id) ?? 0) + toNumber(order.ark_coins_used));
      });
    }

    const topArkCustomerIds = Array.from(topArkMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([customerId]) => customerId);

    const topArkCustomersById = new Map<string, CustomerRow>();
    if (topArkCustomerIds.length > 0) {
      const { data: topArkCustomers } = await supabase
        .from("pos_customers")
        .select(POS_CUSTOMER_COLUMNS)
        .in("id", topArkCustomerIds);

      ((topArkCustomers ?? []) as CustomerRow[]).forEach((customer) => topArkCustomersById.set(customer.id, customer));
    }

    const { count: posMemberFallbackCount, error: posMemberFallbackError } = await supabase
      .from("pos_customers")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gt("total_xp", 0);

    let recentXpActivity: unknown[] = [];
    if (schemaReady) {
      const { data: ledgerRows, error: ledgerError } = await supabase
        .from("crm_xp_ledger")
        .select("id, direction, source_channel, source_type, xp_delta, balance_after, description, created_at, member:crm_member_profiles(member_code, customer_id)")
        .order("created_at", { ascending: false })
        .limit(8);

      if (!ledgerError) recentXpActivity = ledgerRows ?? [];
    }

    if (posMemberFallbackError) throw posMemberFallbackError;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalCustomers: totalCustomers ?? 0,
          totalMembers: schemaReady ? memberCount.count : (posMemberFallbackCount ?? 0),
          tierCount: tierCount.count,
          xpRuleCount: xpRuleCount.count,
          rewardCount: rewardCount.count,
          avatarCount: avatarCount.count,
          redemptionCount: redemptionCount.count,
          externalEventCount: eventCount.count,
        },
        topLoyalMembers: ((loyalCustomers ?? []) as CustomerRow[]).map(normalizeCustomer),
        topTransactionSpenders: ((topTransactionCustomers ?? []) as CustomerRow[]).map(normalizeCustomer),
        topArkSpenders: topArkCustomerIds.map((customerId) => ({
          customer: topArkCustomersById.get(customerId) ? normalizeCustomer(topArkCustomersById.get(customerId)!) : null,
          ark_coins_used: topArkMap.get(customerId) ?? 0,
        })),
        recentXpActivity,
      },
      meta: {
        schemaReady,
      },
    });
  } catch (error) {
    console.error("Error fetching CRM dashboard:", error);
    return apiErrorResponse(error);
  }
}
