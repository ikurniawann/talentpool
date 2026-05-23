"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgePercent,
  Boxes,
  CheckCircle2,
  Copy,
  EyeOff,
  Gift,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Ticket,
  Trash2,
  X,
} from "lucide-react";

type Tier = {
  id: string;
  code: string;
  name: string;
  rank: number;
};

type Reward = {
  id: string;
  code: string;
  name: string;
  reward_type: "discount" | "merchandise" | "avatar" | "voucher" | "ark_coin" | "custom";
  xp_cost: number;
  required_tier_id: string | null;
  required_tier?: Pick<Tier, "code" | "name" | "rank"> | null;
  stock_total: number | null;
  stock_redeemed: number;
  max_redemptions_per_member: number | null;
  image_url: string | null;
  reward_data: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
};

type RewardsState = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  message: string | null;
  rewards: Reward[];
  tiers: Tier[];
};

type RewardForm = {
  id: string;
  code: string;
  name: string;
  reward_type: Reward["reward_type"];
  xp_cost: number;
  required_tier_id: string;
  stock_total: string;
  stock_redeemed: number;
  max_redemptions_per_member: string;
  is_active: boolean;
};

const numberFormat = new Intl.NumberFormat("id-ID");

const defaultForm: RewardForm = {
  id: "",
  code: "",
  name: "",
  reward_type: "discount",
  xp_cost: 0,
  required_tier_id: "",
  stock_total: "",
  stock_redeemed: 0,
  max_redemptions_per_member: "",
  is_active: true,
};

function formatNumber(value: number) {
  return numberFormat.format(value || 0);
}

function rewardTypeLabel(type: Reward["reward_type"]) {
  const labels: Record<Reward["reward_type"], string> = {
    discount: "Discount",
    merchandise: "Merchandise",
    avatar: "Avatar",
    voucher: "Voucher",
    ark_coin: "ARK Coin",
    custom: "Custom",
  };
  return labels[type];
}

function rewardTypeIcon(type: Reward["reward_type"]) {
  if (type === "discount") return BadgePercent;
  if (type === "merchandise") return Boxes;
  if (type === "avatar") return ImageIcon;
  if (type === "voucher") return Ticket;
  return Gift;
}

export default function CrmRewardsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState<RewardForm>(defaultForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [state, setState] = useState<RewardsState>({
    loading: true,
    saving: false,
    error: null,
    message: null,
    rewards: [],
    tiers: [],
  });

  const loadRewards = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));

    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("reward_type", typeFilter);

      const [rewardsResponse, tiersResponse] = await Promise.all([
        fetch(`/api/crm/rewards${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" }),
        fetch("/api/crm/tiers", { cache: "no-store" }),
      ]);
      const [rewardsJson, tiersJson] = await Promise.all([
        rewardsResponse.json(),
        tiersResponse.json(),
      ]);

      if (!rewardsResponse.ok || !rewardsJson.success) {
        throw new Error(rewardsJson.error || "Gagal memuat rewards");
      }

      if (!tiersResponse.ok || !tiersJson.success) {
        throw new Error(tiersJson.error || "Gagal memuat tiers");
      }

      setState((current) => ({
        ...current,
        loading: false,
        error: null,
        rewards: rewardsJson.data ?? [],
        tiers: tiersJson.data ?? [],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "Gagal memuat rewards",
      }));
    }
  }, [typeFilter]);

  useEffect(() => {
    void loadRewards();
  }, [loadRewards]);

  const filteredRewards = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return state.rewards;

    return state.rewards.filter((reward) =>
      `${reward.code} ${reward.name} ${reward.reward_type}`.toLowerCase().includes(term)
    );
  }, [search, state.rewards]);

  const summary = useMemo(() => {
    return {
      active: state.rewards.filter((reward) => reward.is_active).length,
      stock: state.rewards.reduce((sum, reward) => sum + (reward.stock_total ?? 0), 0),
      redeemed: state.rewards.reduce((sum, reward) => sum + Number(reward.stock_redeemed ?? 0), 0),
    };
  }, [state.rewards]);

  async function saveReward() {
    setState((current) => ({ ...current, saving: true, error: null, message: null }));

    try {
      const payload = {
        code: form.code,
        name: form.name,
        reward_type: form.reward_type,
        xp_cost: Math.max(0, Number(form.xp_cost) || 0),
        required_tier_id: form.required_tier_id || null,
        linked_avatar_id: null,
        stock_total: form.stock_total === "" ? null : Math.max(0, Number(form.stock_total) || 0),
        stock_redeemed: Math.max(0, Number(form.stock_redeemed) || 0),
        max_redemptions_per_member: form.max_redemptions_per_member === ""
          ? null
          : Math.max(1, Number(form.max_redemptions_per_member) || 1),
        image_url: null,
        reward_data: {},
        starts_at: null,
        ends_at: null,
        is_active: form.is_active,
      };

      const response = await fetch("/api/crm/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Gagal menyimpan reward");
      }

      setForm(defaultForm);
      await loadRewards();
      setState((current) => ({ ...current, saving: false, message: "Reward berhasil disimpan." }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: error instanceof Error ? error.message : "Gagal menyimpan reward",
      }));
    }
  }

  function editReward(reward: Reward) {
    setForm({
      id: reward.id,
      code: reward.code,
      name: reward.name,
      reward_type: reward.reward_type,
      xp_cost: reward.xp_cost,
      required_tier_id: reward.required_tier_id ?? "",
      stock_total: reward.stock_total == null ? "" : String(reward.stock_total),
      stock_redeemed: Number(reward.stock_redeemed ?? 0),
      max_redemptions_per_member: reward.max_redemptions_per_member == null ? "" : String(reward.max_redemptions_per_member),
      is_active: reward.is_active,
    });
  }

  async function toggleRewardActive(reward: Reward) {
    setTogglingId(reward.id);
    setState((current) => ({ ...current, error: null, message: null }));

    try {
      const response = await fetch("/api/crm/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rewardPayloadFromReward(reward, { is_active: !reward.is_active })),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Gagal update status reward");
      }

      if (form.id === reward.id) {
        setForm((current) => ({ ...current, is_active: !reward.is_active }));
      }
      await loadRewards();
      setState((current) => ({ ...current, message: `Reward ${reward.name} ${reward.is_active ? "dinonaktifkan" : "diaktifkan"}.` }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Gagal update status reward",
      }));
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteReward(reward: Reward) {
    setDeletingId(reward.id);
    setState((current) => ({ ...current, error: null, message: null }));

    try {
      const response = await fetch(`/api/crm/rewards?id=${reward.id}`, { method: "DELETE" });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Gagal hapus reward");
      }

      if (form.id === reward.id) setForm(defaultForm);
      await loadRewards();
      setState((current) => ({ ...current, message: `Reward ${reward.name} berhasil dihapus.` }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Gagal hapus reward",
      }));
    } finally {
      setDeletingId(null);
    }
  }

  function duplicateReward(reward: Reward) {
    const nextCode = `${reward.code}-copy`;
    setForm({
      id: "",
      code: nextCode,
      name: `${reward.name} Copy`,
      reward_type: reward.reward_type,
      xp_cost: reward.xp_cost,
      required_tier_id: reward.required_tier_id ?? "",
      stock_total: reward.stock_total == null ? "" : String(reward.stock_total),
      stock_redeemed: 0,
      max_redemptions_per_member: reward.max_redemptions_per_member == null ? "" : String(reward.max_redemptions_per_member),
      is_active: false,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/dashboard/crm" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900">
              <ArrowLeft className="size-4" />
              CRM Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">Rewards</h1>
          </div>
          <button
            type="button"
            onClick={() => void loadRewards()}
            disabled={state.loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${state.loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {(state.error || state.message) && (
          <div className={`rounded-md border px-4 py-3 text-sm ${
            state.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}>
            {state.error || state.message}
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-4">
          <MetricCard icon={Gift} label="Rewards" value={formatNumber(state.rewards.length)} />
          <MetricCard icon={Gift} label="Active" value={formatNumber(summary.active)} />
          <MetricCard icon={Boxes} label="Stock" value={formatNumber(summary.stock)} />
          <MetricCard icon={Ticket} label="Redeemed" value={formatNumber(summary.redeemed)} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <Plus className="size-4" />
                {form.id ? "Edit Reward" : "Reward Form"}
              </h2>
              {form.id && <div className="mt-1 text-xs text-slate-500">Editing {form.code}</div>}
            </div>
            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <TextField label="Code" value={form.code} onChange={(value) => setForm((current) => ({ ...current, code: value }))} placeholder="discount-10k" />
                <TextField label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Discount 10K" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">Type</span>
                  <select
                    value={form.reward_type}
                    onChange={(event) => setForm((current) => ({ ...current, reward_type: event.target.value as Reward["reward_type"] }))}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="discount">Discount</option>
                    <option value="merchandise">Merchandise</option>
                    <option value="avatar">Avatar</option>
                    <option value="voucher">Voucher</option>
                    <option value="ark_coin">ARK Coin</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <TextField
                  label="XP Cost"
                  type="number"
                  value={String(form.xp_cost)}
                  onChange={(value) => setForm((current) => ({ ...current, xp_cost: Number(value) || 0 }))}
                />
              </div>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">Required Tier</span>
                <select
                  value={form.required_tier_id}
                  onChange={(event) => setForm((current) => ({ ...current, required_tier_id: event.target.value }))}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">Semua tier</option>
                  {state.tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>{tier.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Stock" type="number" value={form.stock_total} onChange={(value) => setForm((current) => ({ ...current, stock_total: value }))} placeholder="Unlimited" />
                <TextField label="Max per Member" type="number" value={form.max_redemptions_per_member} onChange={(value) => setForm((current) => ({ ...current, max_redemptions_per_member: value }))} placeholder="No limit" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                  className="size-4 rounded border-slate-300"
                />
                Active
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setForm(defaultForm)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  {form.id ? (
                    <>
                      <X className="size-4" />
                      Cancel
                    </>
                  ) : (
                    "Reset"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void saveReward()}
                  disabled={state.saving || !form.code || !form.name}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  <Save className="size-4" />
                  {form.id ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_180px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari reward..."
                  className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                <option value="all">Semua type</option>
                <option value="discount">Discount</option>
                <option value="merchandise">Merchandise</option>
                <option value="avatar">Avatar</option>
                <option value="voucher">Voucher</option>
                <option value="ark_coin">ARK Coin</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {state.loading ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">Memuat rewards...</div>
            ) : filteredRewards.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">Belum ada reward catalog.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRewards.map((reward) => {
                  const Icon = rewardTypeIcon(reward.reward_type);
                  const remainingStock = reward.stock_total == null ? null : Math.max(0, reward.stock_total - reward.stock_redeemed);

                  return (
                    <div key={reward.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_140px_130px_220px] lg:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-950">{reward.name}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>{reward.code}</span>
                            <span>{rewardTypeLabel(reward.reward_type)}</span>
                            <span>{reward.required_tier?.name || "All tier"}</span>
                            <span className={reward.is_active ? "text-emerald-700" : "text-slate-400"}>
                              {reward.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-violet-700">{formatNumber(reward.xp_cost)} XP</div>
                      <div className="text-sm text-slate-600">
                        {remainingStock == null ? "Unlimited" : `${formatNumber(remainingStock)} left`}
                        <div className="mt-0.5 text-xs text-slate-400">
                          {formatNumber(reward.stock_redeemed)} redeemed
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => editReward(reward)}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateReward(reward)}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          <Copy className="size-3.5" />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleRewardActive(reward)}
                          disabled={togglingId === reward.id}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                          {reward.is_active ? <EyeOff className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                          {reward.is_active ? "Off" : "On"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteReward(reward)}
                          disabled={deletingId === reward.id}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function rewardPayloadFromReward(reward: Reward, overrides: Partial<Reward> = {}) {
  const next = { ...reward, ...overrides };
  return {
    code: next.code,
    name: next.name,
    reward_type: next.reward_type,
    xp_cost: Math.max(0, Number(next.xp_cost) || 0),
    required_tier_id: next.required_tier_id || null,
    linked_avatar_id: null,
    stock_total: next.stock_total == null ? null : Math.max(0, Number(next.stock_total) || 0),
    stock_redeemed: Math.max(0, Number(next.stock_redeemed) || 0),
    max_redemptions_per_member: next.max_redemptions_per_member == null
      ? null
      : Math.max(1, Number(next.max_redemptions_per_member) || 1),
    image_url: next.image_url || null,
    reward_data: next.reward_data ?? {},
    starts_at: null,
    ends_at: null,
    is_active: next.is_active,
  };
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gift;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
        <Icon className="size-5" />
      </div>
      <div className="text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}
