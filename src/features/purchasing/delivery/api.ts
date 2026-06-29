import type {
  CreateDeliveryPayload,
  DeliveryDetail,
  DeliveryListParams,
  DeliveryListResult,
  DeliveryPOOption,
} from "./types";
import { DeliveryNotFoundError } from "./types";

export type {
  DeliveryStatus,
  DeliveryRow,
  DeliveryDetail,
  DeliveryPOOption,
  DeliveryListParams,
  DeliveryListResult,
  CreateDeliveryPayload,
} from "./types";
export { DeliveryNotFoundError } from "./types";

export async function listDeliveries(
  params: DeliveryListParams = {}
): Promise<DeliveryListResult> {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  if (params.po_id) sp.set("po_id", params.po_id);
  if (params.search) sp.set("search", params.search);

  const res = await fetch(`/api/purchasing/delivery?${sp.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || json.error || "Gagal memuat data delivery");
  }
  const total = json.pagination?.total || 0;
  const limit = params.limit || 10;
  return {
    data: json.data || [],
    total,
    totalPages:
      json.pagination?.totalPages ||
      json.pagination?.total_pages ||
      Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getDelivery(id: string): Promise<DeliveryDetail> {
  const res = await fetch(`/api/purchasing/delivery/${id}`);
  const json = await res.json();
  if (!res.ok || !json.data) {
    throw new DeliveryNotFoundError();
  }
  return json.data;
}

export async function listDeliveryPOOptions(
  includeCancelled = false
): Promise<DeliveryPOOption[]> {
  const sp = new URLSearchParams({ limit: "100" });
  if (includeCancelled) sp.set("include_cancelled", "true");

  const res = await fetch(`/api/purchasing/po?${sp.toString()}`, {
    cache: "no-store",
  });
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

export interface CreateDeliveryResult {
  id?: string;
  nomor_resi?: string;
}

export async function createDelivery(
  payload: CreateDeliveryPayload
): Promise<CreateDeliveryResult> {
  const res = await fetch("/api/purchasing/delivery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    const apiError =
      typeof json.error === "string" ? json.error : json.error?.message;
    throw new Error(apiError || json.message || "Gagal membuat delivery");
  }
  return json.data || {};
}
