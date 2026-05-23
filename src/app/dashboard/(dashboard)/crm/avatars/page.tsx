"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type Tier = {
  id: string;
  code: string;
  name: string;
  rank: number;
};

type Avatar = {
  id: string;
  code: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "limited";
  image_url: string;
  thumbnail_url: string | null;
  required_tier_id: string | null;
  required_tier?: Pick<Tier, "code" | "name" | "rank"> | null;
  xp_cost: number;
  stock_total: number | null;
  stock_redeemed: number;
  is_active: boolean;
  created_at: string;
};

type AvatarsState = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  message: string | null;
  avatars: Avatar[];
  tiers: Tier[];
};

type AvatarForm = {
  id: string;
  code: string;
  name: string;
  rarity: Avatar["rarity"];
  image_url: string;
  thumbnail_url: string;
  required_tier_id: string;
  xp_cost: number;
  stock_total: string;
  stock_redeemed: number;
  is_active: boolean;
};

const numberFormat = new Intl.NumberFormat("id-ID");

const defaultForm: AvatarForm = {
  id: "",
  code: "",
  name: "",
  rarity: "common",
  image_url: "",
  thumbnail_url: "",
  required_tier_id: "",
  xp_cost: 0,
  stock_total: "",
  stock_redeemed: 0,
  is_active: true,
};

function formatNumber(value: number) {
  return numberFormat.format(value || 0);
}

function rarityTone(rarity: Avatar["rarity"]) {
  const tones: Record<Avatar["rarity"], string> = {
    common: "bg-slate-100 text-slate-700",
    rare: "bg-sky-50 text-sky-700",
    epic: "bg-violet-50 text-violet-700",
    legendary: "bg-amber-50 text-amber-700",
    limited: "bg-rose-50 text-rose-700",
  };
  return tones[rarity];
}

export default function CrmAvatarsPage() {
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [form, setForm] = useState<AvatarForm>(defaultForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [state, setState] = useState<AvatarsState>({
    loading: true,
    saving: false,
    error: null,
    message: null,
    avatars: [],
    tiers: [],
  });

  const loadAvatars = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));

    try {
      const params = new URLSearchParams();
      if (rarityFilter !== "all") params.set("rarity", rarityFilter);

      const [avatarsResponse, tiersResponse] = await Promise.all([
        fetch(`/api/crm/avatars${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" }),
        fetch("/api/crm/tiers", { cache: "no-store" }),
      ]);
      const [avatarsJson, tiersJson] = await Promise.all([
        avatarsResponse.json(),
        tiersResponse.json(),
      ]);

      if (!avatarsResponse.ok || !avatarsJson.success) {
        throw new Error(avatarsJson.error || "Gagal memuat avatar");
      }
      if (!tiersResponse.ok || !tiersJson.success) {
        throw new Error(tiersJson.error || "Gagal memuat tier");
      }

      setState((current) => ({
        ...current,
        loading: false,
        avatars: avatarsJson.data ?? [],
        tiers: tiersJson.data ?? [],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "Gagal memuat avatar",
      }));
    }
  }, [rarityFilter]);

  useEffect(() => {
    void loadAvatars();
  }, [loadAvatars]);

  const filteredAvatars = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return state.avatars;

    return state.avatars.filter((avatar) =>
      `${avatar.code} ${avatar.name} ${avatar.rarity}`.toLowerCase().includes(term)
    );
  }, [search, state.avatars]);

  const summary = useMemo(() => ({
    active: state.avatars.filter((avatar) => avatar.is_active).length,
    stock: state.avatars.reduce((sum, avatar) => sum + (avatar.stock_total ?? 0), 0),
    redeemed: state.avatars.reduce((sum, avatar) => sum + Number(avatar.stock_redeemed ?? 0), 0),
  }), [state.avatars]);

  async function saveAvatar() {
    setState((current) => ({ ...current, saving: true, error: null, message: null }));

    try {
      const response = await fetch("/api/crm/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          rarity: form.rarity,
          image_url: form.image_url,
          thumbnail_url: form.thumbnail_url || null,
          required_tier_id: form.required_tier_id || null,
          xp_cost: Math.max(0, Number(form.xp_cost) || 0),
          stock_total: form.stock_total === "" ? null : Math.max(0, Number(form.stock_total) || 0),
          stock_redeemed: Math.max(0, Number(form.stock_redeemed) || 0),
          starts_at: null,
          ends_at: null,
          is_active: form.is_active,
          metadata: {},
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Gagal menyimpan avatar");
      }

      setForm(defaultForm);
      await loadAvatars();
      setState((current) => ({ ...current, saving: false, message: "Avatar berhasil disimpan." }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: error instanceof Error ? error.message : "Gagal menyimpan avatar",
      }));
    }
  }

  function editAvatar(avatar: Avatar) {
    setForm({
      id: avatar.id,
      code: avatar.code,
      name: avatar.name,
      rarity: avatar.rarity,
      image_url: avatar.image_url,
      thumbnail_url: avatar.thumbnail_url ?? "",
      required_tier_id: avatar.required_tier_id ?? "",
      xp_cost: avatar.xp_cost,
      stock_total: avatar.stock_total == null ? "" : String(avatar.stock_total),
      stock_redeemed: Number(avatar.stock_redeemed ?? 0),
      is_active: avatar.is_active,
    });
  }

  function duplicateAvatar(avatar: Avatar) {
    setForm({
      id: "",
      code: `${avatar.code}-copy`,
      name: `${avatar.name} Copy`,
      rarity: avatar.rarity,
      image_url: avatar.image_url,
      thumbnail_url: avatar.thumbnail_url ?? "",
      required_tier_id: avatar.required_tier_id ?? "",
      xp_cost: avatar.xp_cost,
      stock_total: avatar.stock_total == null ? "" : String(avatar.stock_total),
      stock_redeemed: 0,
      is_active: false,
    });
  }

  async function toggleAvatarActive(avatar: Avatar) {
    setTogglingId(avatar.id);
    setState((current) => ({ ...current, error: null, message: null }));

    try {
      const response = await fetch("/api/crm/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(avatarPayloadFromAvatar(avatar, { is_active: !avatar.is_active })),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Gagal update status avatar");
      }

      if (form.id === avatar.id) {
        setForm((current) => ({ ...current, is_active: !avatar.is_active }));
      }
      await loadAvatars();
      setState((current) => ({ ...current, message: `Avatar ${avatar.name} ${avatar.is_active ? "dinonaktifkan" : "diaktifkan"}.` }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Gagal update status avatar",
      }));
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteAvatar(avatar: Avatar) {
    setDeletingId(avatar.id);
    setState((current) => ({ ...current, error: null, message: null }));

    try {
      const response = await fetch(`/api/crm/avatars?id=${avatar.id}`, { method: "DELETE" });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Gagal hapus avatar");
      }

      if (form.id === avatar.id) setForm(defaultForm);
      await loadAvatars();
      setState((current) => ({ ...current, message: `Avatar ${avatar.name} berhasil dihapus.` }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Gagal hapus avatar",
      }));
    } finally {
      setDeletingId(null);
    }
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
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">Collectible Avatars</h1>
          </div>
          <button
            type="button"
            onClick={() => void loadAvatars()}
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
          <MetricCard icon={ImageIcon} label="Avatars" value={formatNumber(state.avatars.length)} />
          <MetricCard icon={Sparkles} label="Active" value={formatNumber(summary.active)} />
          <MetricCard icon={ImageIcon} label="Stock" value={formatNumber(summary.stock)} />
          <MetricCard icon={CheckCircle2} label="Redeemed" value={formatNumber(summary.redeemed)} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <Plus className="size-4" />
                {form.id ? "Edit Avatar" : "Avatar Form"}
              </h2>
              {form.id && <div className="mt-1 text-xs text-slate-500">Editing {form.code}</div>}
            </div>
            <div className="space-y-4 p-4">
              {form.image_url ? (
                <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.thumbnail_url || form.image_url} alt={form.name || "Avatar preview"} className="h-40 w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                  <ImageIcon className="size-8" />
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <TextField label="Code" value={form.code} onChange={(value) => setForm((current) => ({ ...current, code: value }))} placeholder="avatar-bronze-01" />
                <TextField label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Bronze Explorer" />
              </div>
              <TextField label="Image URL" value={form.image_url} onChange={(value) => setForm((current) => ({ ...current, image_url: value }))} placeholder="https://..." />
              <TextField label="Thumbnail URL" value={form.thumbnail_url} onChange={(value) => setForm((current) => ({ ...current, thumbnail_url: value }))} placeholder="Optional" />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">Rarity</span>
                  <select
                    value={form.rarity}
                    onChange={(event) => setForm((current) => ({ ...current, rarity: event.target.value as Avatar["rarity"] }))}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="common">Common</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                    <option value="limited">Limited</option>
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
              <TextField label="Stock" type="number" value={form.stock_total} onChange={(value) => setForm((current) => ({ ...current, stock_total: value }))} placeholder="Unlimited" />
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
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
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
                  onClick={() => void saveAvatar()}
                  disabled={state.saving || !form.code || !form.name || !form.image_url}
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
                  placeholder="Cari avatar..."
                  className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </label>
              <select
                value={rarityFilter}
                onChange={(event) => setRarityFilter(event.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                <option value="all">Semua rarity</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
                <option value="limited">Limited</option>
              </select>
            </div>

            {state.loading ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">Memuat avatar...</div>
            ) : filteredAvatars.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">Belum ada collectible avatar.</div>
            ) : (
              <div className="grid gap-3 p-4 lg:grid-cols-2">
                {filteredAvatars.map((avatar) => {
                  const remainingStock = avatar.stock_total == null ? null : Math.max(0, avatar.stock_total - avatar.stock_redeemed);

                  return (
                    <div key={avatar.id} className="rounded-md border border-slate-200 p-3">
                      <div className="flex gap-3">
                        <div className="size-20 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={avatar.thumbnail_url || avatar.image_url} alt={avatar.name} className="size-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-950">{avatar.name}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>{avatar.code}</span>
                            <span className={`rounded-sm px-1.5 py-0.5 ${rarityTone(avatar.rarity)}`}>{avatar.rarity}</span>
                            <span>{avatar.required_tier?.name || "All tier"}</span>
                            <span className={avatar.is_active ? "text-emerald-700" : "text-slate-400"}>
                              {avatar.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-violet-700">{formatNumber(avatar.xp_cost)} XP</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {remainingStock == null ? "Unlimited stock" : `${formatNumber(remainingStock)} left`} · {formatNumber(avatar.stock_redeemed)} redeemed
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editAvatar(avatar)}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateAvatar(avatar)}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          <Copy className="size-3.5" />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleAvatarActive(avatar)}
                          disabled={togglingId === avatar.id}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                          {avatar.is_active ? <EyeOff className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                          {avatar.is_active ? "Off" : "On"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteAvatar(avatar)}
                          disabled={deletingId === avatar.id}
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

function avatarPayloadFromAvatar(avatar: Avatar, overrides: Partial<Avatar> = {}) {
  const next = { ...avatar, ...overrides };
  return {
    code: next.code,
    name: next.name,
    rarity: next.rarity,
    image_url: next.image_url,
    thumbnail_url: next.thumbnail_url || null,
    required_tier_id: next.required_tier_id || null,
    xp_cost: Math.max(0, Number(next.xp_cost) || 0),
    stock_total: next.stock_total == null ? null : Math.max(0, Number(next.stock_total) || 0),
    stock_redeemed: Math.max(0, Number(next.stock_redeemed) || 0),
    starts_at: null,
    ends_at: null,
    is_active: next.is_active,
    metadata: {},
  };
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ImageIcon;
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
