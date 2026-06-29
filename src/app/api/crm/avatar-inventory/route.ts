import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPosSession } from "@/lib/api/auth";
import { createPgClient } from "@/lib/pg/create-client";
import { apiErrorResponse, isMissingCrmSchema, toNumber, validationErrorResponse } from "@/lib/crm/server";

const redeemAvatarSchema = z.object({
  action: z.literal("redeem").optional(),
  member_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  avatar_id: z.string().uuid(),
}).refine((value) => value.member_id || value.customer_id, {
  message: "member_id atau customer_id wajib diisi",
  path: ["member_id"],
});

const grantAvatarSchema = z.object({
  action: z.literal("grant"),
  member_id: z.string().uuid(),
  avatar_id: z.string().uuid(),
  acquisition_source: z.enum(["manual", "campaign", "partner"]).default("manual"),
  equip: z.boolean().default(false),
  note: z.string().trim().max(240).optional(),
});

const equipAvatarSchema = z.object({
  member_id: z.string().uuid(),
  inventory_id: z.string().uuid().optional(),
  avatar_id: z.string().uuid().optional(),
}).refine((value) => value.inventory_id || value.avatar_id, {
  message: "inventory_id atau avatar_id wajib diisi",
  path: ["inventory_id"],
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
  current_xp: number | string | null;
  lifetime_xp: number | string | null;
  spent_xp: number | string | null;
  active_avatar_id: string | null;
  tier?: TierRow | TierRow[] | null;
};

type AvatarRow = {
  id: string;
  code: string;
  name: string;
  rarity: string;
  image_url: string;
  thumbnail_url: string | null;
  required_tier_id: string | null;
  xp_cost: number | string | null;
  stock_total: number | string | null;
  stock_redeemed: number | string | null;
  is_active: boolean;
  required_tier?: TierRow | TierRow[] | null;
};

function normalizeTier(tier: TierRow | TierRow[] | null | undefined) {
  return Array.isArray(tier) ? tier[0] ?? null : tier ?? null;
}

async function loadMember(
  db: import("@/lib/pg/types").DbClient,
  input: { memberId?: string; customerId?: string }
) {
  let query = db
    .from("crm_member_profiles")
    .select("id, customer_id, current_xp, lifetime_xp, spent_xp, active_avatar_id, tier:crm_membership_tiers(id, code, name, rank)")
    .eq("status", "active");

  query = input.memberId ? query.eq("id", input.memberId) : query.eq("customer_id", input.customerId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const member = data as unknown as MemberRow;
  return {
    ...member,
    tier: normalizeTier(member.tier),
  };
}

async function ensureAvatarReward(
  db: import("@/lib/pg/types").DbClient,
  avatar: AvatarRow
) {
  const rewardPayload = {
    code: `avatar-${avatar.code}`,
    name: avatar.name,
    reward_type: "avatar",
    xp_cost: Math.max(0, toNumber(avatar.xp_cost)),
    required_tier_id: avatar.required_tier_id,
    linked_avatar_id: avatar.id,
    stock_total: avatar.stock_total == null ? null : Math.max(0, toNumber(avatar.stock_total)),
    stock_redeemed: Math.max(0, toNumber(avatar.stock_redeemed)),
    max_redemptions_per_member: 1,
    image_url: avatar.image_url,
    reward_data: { avatar_code: avatar.code, rarity: avatar.rarity },
    starts_at: null,
    ends_at: null,
    is_active: avatar.is_active,
  };

  const { data, error } = await db
    .from("crm_rewards")
    .upsert(rewardPayload, { onConflict: "code" })
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
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

    if (!memberId && !customerId) {
      return NextResponse.json({ success: false, error: "member_id atau customer_id wajib diisi" }, { status: 400 });
    }

    let query = db
      .from("crm_member_avatar_inventory")
      .select("*, avatar:crm_collectible_avatars(*, required_tier:crm_membership_tiers(code, name, rank))")
      .order("acquired_at", { ascending: false });

    if (memberId) {
      query = query.eq("member_id", memberId);
    } else if (customerId) {
      const member = await loadMember(db, { customerId });
      if (!member) return NextResponse.json({ success: true, data: [], meta: { schemaReady: true } });
      query = query.eq("member_id", member.id);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingCrmSchema(error)) {
        return NextResponse.json({ success: true, data: [], meta: { schemaReady: false } });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: data ?? [], meta: { schemaReady: true } });
  } catch (error) {
    console.error("Error fetching avatar inventory:", error);
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body?.action === "grant") {
      return grantAvatar(body);
    }

    const payload = redeemAvatarSchema.parse(body);
    const db = createPgClient();
    const member = await loadMember(db, { memberId: payload.member_id, customerId: payload.customer_id });

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member CRM belum aktif. Aktifkan member terlebih dahulu." },
        { status: 409 }
      );
    }

    const existing = await db
      .from("crm_member_avatar_inventory")
      .select("id")
      .eq("member_id", member.id)
      .eq("avatar_id", payload.avatar_id)
      .maybeSingle();

    if (existing.error && !isMissingCrmSchema(existing.error)) throw existing.error;
    if (existing.data) {
      return NextResponse.json({ success: false, error: "Member sudah memiliki avatar ini" }, { status: 409 });
    }

    const { data: avatarData, error: avatarError } = await db
      .from("crm_collectible_avatars")
      .select("*, required_tier:crm_membership_tiers(id, code, name, rank)")
      .eq("id", payload.avatar_id)
      .maybeSingle();

    if (avatarError) throw avatarError;
    if (!avatarData) {
      return NextResponse.json({ success: false, error: "Avatar tidak ditemukan" }, { status: 404 });
    }

    const avatar = avatarData as unknown as AvatarRow;
    const requiredTier = normalizeTier(avatar.required_tier);
    const memberTier = normalizeTier(member.tier);
    const xpCost = Math.max(0, toNumber(avatar.xp_cost));
    const currentXp = toNumber(member.current_xp);
    const lifetimeXp = toNumber(member.lifetime_xp);
    const spentXp = toNumber(member.spent_xp);
    const stockTotal = avatar.stock_total == null ? null : toNumber(avatar.stock_total);
    const stockRedeemed = toNumber(avatar.stock_redeemed);

    if (!avatar.is_active) {
      return NextResponse.json({ success: false, error: "Avatar sedang tidak aktif" }, { status: 400 });
    }
    if (requiredTier && toNumber(memberTier?.rank) < toNumber(requiredTier.rank)) {
      return NextResponse.json({ success: false, error: `Avatar hanya untuk tier ${requiredTier.name}` }, { status: 400 });
    }
    if (stockTotal !== null && stockRedeemed >= stockTotal) {
      return NextResponse.json({ success: false, error: "Stok avatar sudah habis" }, { status: 400 });
    }
    if (currentXp < xpCost) {
      return NextResponse.json({ success: false, error: "Current XP member belum cukup" }, { status: 400 });
    }

    const reward = await ensureAvatarReward(db, avatar);
    const { data: redemption, error: redemptionError } = await db
      .from("crm_redemptions")
      .insert({
        member_id: member.id,
        customer_id: member.customer_id,
        reward_id: reward.id,
        xp_cost: xpCost,
        status: "pending",
        metadata: {
          reward_type: "avatar",
          avatar_id: avatar.id,
          avatar_code: avatar.code,
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
        source_type: "avatar",
        source_id: avatar.id,
        xp_delta: -xpCost,
        balance_before: currentXp,
        balance_after: balanceAfter,
        lifetime_before: lifetimeXp,
        lifetime_after: lifetimeXp,
        reference_table: "crm_redemptions",
        reference_id: redemption.id,
        idempotency_key: `avatar-redemption:${redemption.id}`,
        description: `Redeem avatar ${avatar.name}`,
        metadata: {
          avatar_code: avatar.code,
          redemption_number: redemption.redemption_number,
        },
      })
      .select("id")
      .single();

    if (ledgerError) throw ledgerError;

    const shouldEquip = !member.active_avatar_id;
    const { data: inventory, error: inventoryError } = await db
      .from("crm_member_avatar_inventory")
      .insert({
        member_id: member.id,
        avatar_id: avatar.id,
        redemption_id: redemption.id,
        acquisition_source: "redemption",
        is_equipped: shouldEquip,
        metadata: { xp_cost: xpCost },
      })
      .select("*, avatar:crm_collectible_avatars(*)")
      .single();

    if (inventoryError) throw inventoryError;

    const { error: memberUpdateError } = await db
      .from("crm_member_profiles")
      .update({
        current_xp: balanceAfter,
        spent_xp: spentXp + xpCost,
        active_avatar_id: shouldEquip ? avatar.id : member.active_avatar_id,
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
      const { error: avatarStockError } = await db
        .from("crm_collectible_avatars")
        .update({ stock_redeemed: stockRedeemed + 1 })
        .eq("id", avatar.id);

      if (avatarStockError) throw avatarStockError;
    }

    const { error: approveError } = await db
      .from("crm_redemptions")
      .update({
        status: "approved",
        xp_ledger_id: ledger.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", redemption.id);

    if (approveError) throw approveError;

    return NextResponse.json({ success: true, data: inventory });
  } catch (error) {
    const validation = validationErrorResponse(error);
    if (validation) return validation;

    console.error("Error redeeming avatar:", error);
    return apiErrorResponse(error);
  }
}

async function grantAvatar(body: unknown) {
  const payload = grantAvatarSchema.parse(body);
  const db = createPgClient();
  const member = await loadMember(db, { memberId: payload.member_id });

  if (!member) {
    return NextResponse.json(
      { success: false, error: "Member CRM belum aktif. Aktifkan member terlebih dahulu." },
      { status: 409 }
    );
  }

  const existing = await db
    .from("crm_member_avatar_inventory")
    .select("id")
    .eq("member_id", member.id)
    .eq("avatar_id", payload.avatar_id)
    .maybeSingle();

  if (existing.error && !isMissingCrmSchema(existing.error)) throw existing.error;
  if (existing.data) {
    return NextResponse.json({ success: false, error: "Member sudah memiliki avatar ini" }, { status: 409 });
  }

  const { data: avatarData, error: avatarError } = await db
    .from("crm_collectible_avatars")
    .select("*, required_tier:crm_membership_tiers(id, code, name, rank)")
    .eq("id", payload.avatar_id)
    .maybeSingle();

  if (avatarError) throw avatarError;
  if (!avatarData) {
    return NextResponse.json({ success: false, error: "Avatar tidak ditemukan" }, { status: 404 });
  }

  const avatar = avatarData as unknown as AvatarRow;
  const stockTotal = avatar.stock_total == null ? null : toNumber(avatar.stock_total);
  const stockRedeemed = toNumber(avatar.stock_redeemed);

  if (!avatar.is_active) {
    return NextResponse.json({ success: false, error: "Avatar sedang tidak aktif" }, { status: 400 });
  }
  if (stockTotal !== null && stockRedeemed >= stockTotal) {
    return NextResponse.json({ success: false, error: "Stok avatar sudah habis" }, { status: 400 });
  }

  const shouldEquip = payload.equip || !member.active_avatar_id;
  if (shouldEquip) {
    const { error: unequipError } = await db
      .from("crm_member_avatar_inventory")
      .update({ is_equipped: false })
      .eq("member_id", member.id);

    if (unequipError) throw unequipError;
  }

  const { data: inventory, error: inventoryError } = await db
    .from("crm_member_avatar_inventory")
    .insert({
      member_id: member.id,
      avatar_id: avatar.id,
      redemption_id: null,
      acquisition_source: payload.acquisition_source,
      is_equipped: shouldEquip,
      metadata: {
        granted_by: "crm_admin",
        note: payload.note ?? null,
      },
    })
    .select("*, avatar:crm_collectible_avatars(*)")
    .single();

  if (inventoryError) throw inventoryError;

  const { error: memberUpdateError } = await db
    .from("crm_member_profiles")
    .update({
      active_avatar_id: shouldEquip ? avatar.id : member.active_avatar_id,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (memberUpdateError) throw memberUpdateError;

  if (stockTotal !== null) {
    const { error: avatarStockError } = await db
      .from("crm_collectible_avatars")
      .update({ stock_redeemed: stockRedeemed + 1 })
      .eq("id", avatar.id);

    if (avatarStockError) throw avatarStockError;
  }

  return NextResponse.json({ success: true, data: inventory });
}

export async function PATCH(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    const payload = equipAvatarSchema.parse(await request.json());
    const db = createPgClient();

    let inventoryQuery = db
      .from("crm_member_avatar_inventory")
      .select("id, member_id, avatar_id")
      .eq("member_id", payload.member_id);

    inventoryQuery = payload.inventory_id
      ? inventoryQuery.eq("id", payload.inventory_id)
      : inventoryQuery.eq("avatar_id", payload.avatar_id);

    const { data: inventory, error: inventoryError } = await inventoryQuery.maybeSingle();
    if (inventoryError) throw inventoryError;
    if (!inventory) {
      return NextResponse.json({ success: false, error: "Avatar belum dimiliki member" }, { status: 404 });
    }

    const owned = inventory as { id: string; member_id: string; avatar_id: string };
    const { error: unequipError } = await db
      .from("crm_member_avatar_inventory")
      .update({ is_equipped: false })
      .eq("member_id", payload.member_id);

    if (unequipError) throw unequipError;

    const { error: equipError } = await db
      .from("crm_member_avatar_inventory")
      .update({ is_equipped: true })
      .eq("id", owned.id);

    if (equipError) throw equipError;

    const { error: memberUpdateError } = await db
      .from("crm_member_profiles")
      .update({
        active_avatar_id: owned.avatar_id,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", payload.member_id);

    if (memberUpdateError) throw memberUpdateError;

    return NextResponse.json({ success: true, data: owned });
  } catch (error) {
    const validation = validationErrorResponse(error);
    if (validation) return validation;

    console.error("Error equipping avatar:", error);
    return apiErrorResponse(error);
  }
}
