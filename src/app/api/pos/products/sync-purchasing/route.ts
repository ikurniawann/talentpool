import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { syncPurchasingProductToPos } from '@/lib/pos/purchasing-sync';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
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
      results.push(await syncPurchasingProductToPos(supabase, String(productId), { station: body.station }));
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
