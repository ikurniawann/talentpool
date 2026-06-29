import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPosSession } from "@/lib/api/auth";
import { createPgClient } from "@/lib/pg/create-client";
import { apiErrorResponse, isMissingCrmSchema, toNumber, validationErrorResponse } from "@/lib/crm/server";

const redemptionSchema = z.object({
  member_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  reward_id: z.string().uuid(),
  notes: z.string().trim().max(500).nullable().optional(),
}).refine((value) => value.member_id || value.customer_id, {
  message: "member_id atau customer_id wajib diisi",
  path: ["member_id"],
});

type TierRow = {
  id: string;
  code: string;
  name: string;
  rank: number | string | null;
};

type MemberRow = {
  id: string;
  customer_id: string | null;
  tier_id: string | null;
  current_xp: number | string | null;
  lifetime_xp: number | string | null;
  spent_xp: number | string | null;
  tier?: TierRow | null;
};

type RewardRow = {
  id: string;
  code: string;
  name: string;
  reward_type: string;
  xp_cost: number | string | null;
  required_tier_id: string | null;
  linked_avatar_id: string | null;
  stock_total: number | string | null;
  stock_redeemed: number | string | null;
  max_redemptions_per_member: number | string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  reward_data: Record<string, unknown> | null;
  required_tier?: TierRow | null;
};

type MemberQueryRow = Omit<MemberRow, "tier"> & {
  tier?: TierRow | TierRow[] | null;
};

function normalizeDate(value: string | null) {
  return value ? new Date(value).getTime() : null;
}

function shouldGenerateVoucher(rewardType: string) {
  return rewardType === "discount" || rewardType === "voucher";
}

function makeVoucherCode(rewardCode: string) {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `${rewardCode.toUpperCase().slice(0, 8)}-${suffix}`;
}

function normalizeMemberRow(row: MemberQueryRow): MemberRow {
  return {
    ...row,
    tier: Array.isArray(row.tier) ? row.tier[0] ?? null : row.tier ?? null,
  };
}

export async function GET(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    const db = createPgClient();
    const memberId = request.nextUrl.searchParams.get("member_id");
    const customerId = request.nextUrl.searchParams.get("customer_id");
    const status = request.nextUrl.searchParams.get("status");

    let query = db
      .from("crm_redemptions")
      .select("*, reward:crm_rewards(id, code, name, reward_type, xp_cost), member:crm_member_profiles(id, member_code, customer_id)")
      .order("requested_at", { ascending: false })
      .limit(100);

    if (memberId) query = query.eq("member_id", memberId);
    if (customerId) query = query.eq("customer_id", customerId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      if (isMissingCrmSchema(error)) {
        return NextResponse.json({ success: true, data: [], meta: { schemaReady: false } });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: data ?? [], meta: { schemaReady: true } });
  } catch (error) {
    console.error("Error fetching CRM redemptions:", error);
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    const payload = redemptionSchema.parse(await request.json());
    const db = createPgClient();

    let memberQuery = db
      .from("crm_member_profiles")
      .select("id, customer_id, tier_id, current_xp, lifetime_xp, spent_xp, tier:crm_membership_tiers(id, code, name, rank)")
      .eq("status", "active");

    memberQuery = payload.member_id
      ? memberQuery.eq("id", payload.member_id)
      : memberQuery.eq("customer_id", payload.customer_id);

    const { data: memberData, error: memberError } = await memberQuery.maybeSingle();
    if (memberError) {
      if (isMissingCrmSchema(memberError)) {
        return NextResponse.json(
          { success: false, error: "CRM migration belum diterapkan" },
          { status: 409 }
        );
      }
      throw memberError;
    }

    if (!memberData) {
      return NextResponse.json(
        { success: false, error: "Member CRM belum aktif. Buat transaksi XP atau enrollment member terlebih dahulu." },
        { status: 409 }
      );
    }

    const member = normalizeMemberRow(memberData as unknown as MemberQueryRow);
    const { data: rewardData, error: rewardError } = await db
      .from("crm_rewards")
      .select("*, required_tier:crm_membership_tiers(id, code, name, rank)")
      .eq("id", payload.reward_id)
      .maybeSingle();

    if (rewardError) throw rewardError;
    if (!rewardData) {
      return NextResponse.json({ success: false, error: "Reward tidak ditemukan" }, { status: 404 });
    }

    const reward = rewardData as RewardRow;
    const now = Date.now();
    const startsAt = normalizeDate(reward.starts_at);
    const endsAt = normalizeDate(reward.ends_at);
    const xpCost = toNumber(reward.xp_cost);
    const currentXp = toNumber(member.current_xp);
    const lifetimeXp = toNumber(member.lifetime_xp);
    const spentXp = toNumber(member.spent_xp);
    const stockTotal = reward.stock_total === null ? null : toNumber(reward.stock_total);
    const stockRedeemed = toNumber(reward.stock_redeemed);
    const maxPerMember = reward.max_redemptions_per_member === null ? null : toNumber(reward.max_redemptions_per_member);

    if (!reward.is_active) {
      return NextResponse.json({ success: false, error: "Reward sedang tidak aktif" }, { status: 400 });
    }
    if (startsAt && now < startsAt) {
      return NextResponse.json({ success: false, error: "Reward belum dimulai" }, { status: 400 });
    }
    if (endsAt && now > endsAt) {
      return NextResponse.json({ success: false, error: "Reward sudah berakhir" }, { status: 400 });
    }
    if (stockTotal !== null && stockRedeemed >= stockTotal) {
      return NextResponse.json({ success: false, error: "Stok reward sudah habis" }, { status: 400 });
    }
    if (currentXp < xpCost) {
      return NextResponse.json({ success: false, error: "Current XP member belum cukup" }, { status: 400 });
    }

    const requiredRank = toNumber(reward.required_tier?.rank);
    const memberRank = toNumber(member.tier?.rank);
    if (requiredRank > 0 && memberRank < requiredRank) {
      return NextResponse.json({ success: false, error: `Reward hanya untuk tier ${reward.required_tier?.name}` }, { status: 400 });
    }

    if (maxPerMember) {
      const { count, error: countError } = await db
        .from("crm_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("member_id", member.id)
        .eq("reward_id", reward.id)
        .in("status", ["pending", "approved", "fulfilled"]);

      if (countError) throw countError;
      if ((count ?? 0) >= maxPerMember) {
        return NextResponse.json({ success: false, error: "Batas redeem reward untuk member ini sudah tercapai" }, { status: 400 });
      }
    }

    const voucherCode = shouldGenerateVoucher(reward.reward_type) ? makeVoucherCode(reward.code) : null;
    const { data: redemption, error: redemptionError } = await db
      .from("crm_redemptions")
      .insert({
        member_id: member.id,
        customer_id: member.customer_id,
        reward_id: reward.id,
        xp_cost: xpCost,
        status: "pending",
        voucher_code: voucherCode,
        notes: payload.notes ?? null,
        metadata: {
          reward_code: reward.code,
          reward_type: reward.reward_type,
        },
      })
      .select()
      .single();

    if (redemptionError) throw redemptionError;

    const balanceAfter = currentXp - xpCost;
    const { data: ledger, error: ledgerError } = await db
      .from("crm_xp_ledger")
      .insert({
        member_id: member.id,
        customer_id: member.customer_id,
        direction: "spend",
        source_channel: "redemption",
        source_type: reward.reward_type,
        source_id: reward.id,
        xp_delta: -xpCost,
        balance_before: currentXp,
        balance_after: balanceAfter,
        lifetime_before: lifetimeXp,
        lifetime_after: lifetimeXp,
        reference_table: "crm_redemptions",
        reference_id: redemption.id,
        idempotency_key: `redemption:${redemption.id}`,
        description: `Redeem ${reward.name}`,
        metadata: {
          redemption_number: redemption.redemption_number,
          reward_code: reward.code,
        },
      })
      .select()
      .single();

    if (ledgerError) throw ledgerError;

    const { error: memberUpdateError } = await db
      .from("crm_member_profiles")
      .update({
        current_xp: balanceAfter,
        spent_xp: spentXp + xpCost,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", member.id);

    if (memberUpdateError) throw memberUpdateError;

    if (member.customer_id) {
      const { error: customerUpdateError } = await db
        .from("pos_customers")
        .update({ current_xp: balanceAfter })
        .eq("id", member.customer_id);

      if (customerUpdateError) throw customerUpdateError;
    }

    if (stockTotal !== null) {
      const { error: rewardUpdateError } = await db
        .from("crm_rewards")
        .update({ stock_redeemed: stockRedeemed + 1 })
        .eq("id", reward.id);

      if (rewardUpdateError) throw rewardUpdateError;
    }

    const { data: approvedRedemption, error: approveError } = await db
      .from("crm_redemptions")
      .update({
        status: "approved",
        xp_ledger_id: ledger.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", redemption.id)
      .select("*, reward:crm_rewards(id, code, name, reward_type, xp_cost)")
      .single();

    if (approveError) throw approveError;

    return NextResponse.json({ success: true, data: approvedRedemption });
  } catch (error) {
    const validation = validationErrorResponse(error);
    if (validation) return validation;

    console.error("Error redeeming CRM reward:", error);
    return apiErrorResponse(error);
  }
}
