import type {
  CogsData,
  CreateProductionOrderPayload,
  ProductionDashboardData,
  ProductRecipe,
} from "./types";

export type {
  ProductionProduct,
  CogsMaterial,
  CogsData,
  ProductionOrder,
  WipInventory,
  WipSummary,
  ProductRecipe,
  ProductionDashboardData,
  CreateProductionOrderPayload,
} from "./types";

export async function getProductionDashboard(): Promise<ProductionDashboardData> {
  const [ordersRes, productsRes, wipRes] = await Promise.all([
    fetch("/api/purchasing/production/orders", { cache: "no-store" }),
    fetch("/api/purchasing/products?limit=100&is_active=true", { cache: "no-store" }),
    fetch("/api/purchasing/production/wip", { cache: "no-store" }),
  ]);
  const [ordersJson, productsJson, wipJson] = await Promise.all([
    ordersRes.json(),
    productsRes.json(),
    wipRes.json(),
  ]);
  return {
    orders: ordersJson.data || [],
    products: productsJson.data || [],
    wipInventory: wipJson.data || [],
    wipSummary: wipJson.summary || null,
  };
}

export async function getProductCogs(id: string): Promise<CogsData | null> {
  const response = await fetch(`/api/purchasing/cogs/product/${id}`, {
    cache: "no-store",
  });
  const json = await response.json();
  return json.data || null;
}

export async function listRecipeProducts(): Promise<ProductRecipe[]> {
  const response = await fetch(
    "/api/purchasing/products?limit=100&is_active=true",
    { cache: "no-store" }
  );
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || "Gagal memuat recipe produk");
  return json.data || [];
}

export interface CreateProductionOrderResult {
  ok: boolean;
  message: string;
}

export async function createProductionOrder(
  payload: CreateProductionOrderPayload
): Promise<CreateProductionOrderResult> {
  const response = await fetch("/api/purchasing/production/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  return {
    ok: response.ok,
    message: json.message || json.error || "Produksi dibuat",
  };
}

export async function getProductionOrder<T = unknown>(id: string): Promise<T> {
  const response = await fetch(`/api/purchasing/production/orders/${id}`, {
    cache: "no-store",
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || json.error || "Gagal memuat detail produksi");
  }
  return json.data as T;
}

export interface ProductionOrderActionResult {
  ok: boolean;
  message: string;
}

export async function updateProductionOrder(
  id: string,
  payload: Record<string, unknown>
): Promise<ProductionOrderActionResult> {
  const response = await fetch(`/api/purchasing/production/orders/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  return {
    ok: response.ok,
    message: json.message || json.error || "Status produksi diupdate",
  };
}
