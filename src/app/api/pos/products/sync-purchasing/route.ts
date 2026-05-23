import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';

type PurchasingProduct = {
  id: string;
  kode?: string | null;
  nama?: string | null;
  deskripsi?: string | null;
  kategori?: string | null;
  harga_jual?: number | string | null;
  hpp_estimasi?: number | string | null;
  estimated_cogs?: number | string | null;
  is_active?: boolean | null;
};

type PosCategory = {
  id: string;
  name?: string | null;
};

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeStation(value?: string | null) {
  const station = String(value || '').trim().toLowerCase();
  if (['kitchen', 'bar', 'bakery', 'dessert', 'merchandise', 'photobooth'].includes(station)) {
    return station;
  }
  return 'kitchen';
}

function normalizeCategoryName(value?: string | null) {
  const category = String(value || '').trim();
  if (!category) return 'Makanan';
  if (/minuman|drink|coffee|kopi|tea|bar/i.test(category)) return 'Minuman';
  if (/dessert|roti|cake|bakery|pastry/i.test(category)) return 'Dessert';
  if (/snack|cemilan/i.test(category)) return 'Snack';
  return category;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function findOrCreateCategory(
  supabase: ReturnType<typeof createServiceClient>,
  name: string
) {
  const { data: existing, error: existingError } = await supabase
    .from('pos_categories')
    .select('id, name')
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') throw existingError;
  if (existing) return (existing as PosCategory).id;

  const { data: created, error: createError } = await supabase
    .from('pos_categories')
    .insert({ name, is_active: true })
    .select('id')
    .single();

  if (createError) {
    console.warn('POS category create warning:', createError.message);
    return null;
  }

  return (created as { id: string }).id;
}

async function syncOneProduct(
  supabase: ReturnType<typeof createServiceClient>,
  purchasingProductId: string,
  station?: string | null
) {
  const { data: product, error: productError } = await supabase
    .from('v_products_cogs')
    .select('*')
    .eq('id', purchasingProductId)
    .single();

  if (productError || !product) {
    throw productError ?? new Error('Purchasing product not found');
  }

  const purchasingProduct = product as PurchasingProduct;
  const sku = `PUR-${purchasingProduct.kode || purchasingProduct.id.slice(0, 8)}`;
  const categoryName = normalizeCategoryName(purchasingProduct.kategori);
  const categoryId = await findOrCreateCategory(supabase, categoryName);
  const basePrice = toNumber(purchasingProduct.harga_jual);
  const costPrice = toNumber(purchasingProduct.hpp_estimasi ?? purchasingProduct.estimated_cogs);
  const now = new Date().toISOString();

  const payload = {
    sku,
    name: purchasingProduct.nama || sku,
    description: purchasingProduct.deskripsi || `Synced from Purchasing product ${purchasingProduct.kode || purchasingProduct.id}`,
    category_id: categoryId,
    base_price: basePrice,
    cost_price: costPrice,
    is_active: purchasingProduct.is_active !== false,
    is_available: true,
    inventory_tracking: false,
    station: normalizeStation(station),
    updated_at: now,
  };

  const { data: existing, error: existingError } = await supabase
    .from('pos_products')
    .select('id')
    .eq('sku', sku)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') throw existingError;

  if (existing?.id) {
    const { data: updated, error: updateError } = await supabase
      .from('pos_products')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updateError) throw updateError;
    return { mode: 'updated', product: updated };
  }

  const { data: created, error: createError } = await supabase
    .from('pos_products')
    .insert({
      ...payload,
      created_at: now,
    })
    .select('*')
    .single();

  if (createError) throw createError;
  return { mode: 'created', product: created };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const productIds = Array.isArray(body.purchasing_product_ids)
      ? body.purchasing_product_ids
      : body.purchasing_product_id
        ? [body.purchasing_product_id]
        : [];

    if (productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'purchasing_product_id is required' },
        { status: 400 }
      );
    }

    const results = [];
    for (const productId of productIds) {
      results.push(await syncOneProduct(supabase, String(productId), body.station));
    }

    return NextResponse.json({
      success: true,
      data: results.length === 1 ? results[0] : results,
    });
  } catch (error: unknown) {
    console.error('Sync purchasing product to POS error:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
