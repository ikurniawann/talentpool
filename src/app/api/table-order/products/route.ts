import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service-client";

type ProductRow = {
  id: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  base_price?: number | string | null;
  image_url?: string | null;
  xp_points?: number | string | null;
  xp?: number | string | null;
  station?: string | null;
  category?: { name?: string | null } | { name?: string | null }[] | null;
  variants?: {
    id: string;
    name: string;
    price_adjustment?: number | string | null;
    is_active?: boolean | null;
  }[] | null;
};

const fallbackImages = {
  Food: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
  Drink: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=900&q=80",
  Dessert: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80",
};

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeCategory(category: ProductRow["category"]) {
  const row = Array.isArray(category) ? category[0] : category;
  const name = row?.name || "Food";
  if (/drink|minuman|coffee|kopi|tea|juice|bar/i.test(name)) return "Drink";
  if (/dessert|cake|pastry|roti|bakery|sweet/i.test(name)) return "Dessert";
  return "Food";
}

function stationFor(category: string, name: string) {
  if (/kopi|coffee|tea|minuman|drink|juice|soda|latte|cappuccino/i.test(name)) {
    return "Bar";
  }
  if (category === "Drink" || /kopi|coffee|tea|minuman|drink|juice|soda|latte|cappuccino/i.test(name)) {
    return "Bar";
  }
  return "Kitchen";
}

function normalizeProduct(product: ProductRow) {
  const category = normalizeCategory(product.category);
  const basePrice = toNumber(product.base_price);
  const variants = (product.variants ?? [])
    .filter((variant) => variant.is_active !== false)
    .map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceAdjustment: toNumber(variant.price_adjustment),
    }));

  return {
    id: product.id,
    sku: product.sku || product.id,
    name: product.name,
    category,
    description: product.description || "",
    price: basePrice,
    xp: toNumber(product.xp_points ?? product.xp),
    station: product.station ? product.station.charAt(0).toUpperCase() + product.station.slice(1) : stationFor(category, product.name),
    image: product.image_url || fallbackImages[category],
    variants: variants.length > 0 ? variants : [{ id: "regular", name: "Regular", priceAdjustment: 0 }],
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const search = request.nextUrl.searchParams.get("search");

    const selectWithStation = `
        id,
        sku,
        name,
        description,
        base_price,
        image_url,
        xp_points,
        station,
        category:pos_categories(name),
        variants:pos_product_variants(id, name, price_adjustment, is_active)
      `;
    const selectLegacy = `
        id,
        sku,
        name,
        description,
        base_price,
        image_url,
        xp_points,
        category:pos_categories(name),
        variants:pos_product_variants(id, name, price_adjustment, is_active)
      `;

    let query = supabase
      .from("pos_products")
      .select(selectWithStation)
      .eq("is_active", true)
      .eq("is_available", true)
      .order("name");

    if (search) query = query.ilike("name", `%${search}%`);

    const stationResult = await query;
    let data = stationResult.data as unknown as ProductRow[] | null;
    let error = stationResult.error;
    if (error?.code === "42703") {
      let legacyQuery = supabase
        .from("pos_products")
        .select(selectLegacy)
        .eq("is_active", true)
        .eq("is_available", true)
        .order("name");

      if (search) legacyQuery = legacyQuery.ilike("name", `%${search}%`);

      const legacyResult = await legacyQuery;
      data = legacyResult.data as unknown as ProductRow[] | null;
      error = legacyResult.error;
    }
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: ((data ?? []) as unknown as ProductRow[]).map(normalizeProduct),
    });
  } catch (error) {
    console.error("Table order products error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gagal memuat produk" },
      { status: 500 }
    );
  }
}
