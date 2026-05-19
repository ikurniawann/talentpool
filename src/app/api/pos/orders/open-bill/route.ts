import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { getPosSession } from '@/lib/api/auth';

export async function POST(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      order_type = 'dine_in',
      customer_id,
      cashier_id,
      server_id,
      table_id,
      shift_id,
      items = [],
      subtotal,
      discount_amount = 0,
      discount_reason,
      tax_amount = 0,
      service_charge_amount = 0,
      total_amount,
      notes,
      special_requests,
      membership_discount_pct = 0,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Items are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Generate order number via existing RPC
    const { data: orderNumData, error: orderNumErr } = await supabase.rpc('generate_order_number');
    if (orderNumErr) {
      console.error('Order number generation error:', orderNumErr);
      return NextResponse.json({ success: false, error: 'Failed to generate order number' }, { status: 500 });
    }
    const orderNumber = typeof orderNumData === 'string' ? orderNumData : String(orderNumData);

    // Insert order
    const { data: orderData, error: orderErr } = await supabase
      .from('pos_orders')
      .insert({
        order_number: orderNumber,
        order_type,
        status: 'pending',
        payment_status: 'unpaid',
        customer_id: customer_id || null,
        cashier_id: cashier_id || sessionUserId,
        server_id: server_id || null,
        table_id: table_id || null,
        shift_id: shift_id || null,
        subtotal: Number(subtotal) || 0,
        discount_amount: Number(discount_amount) || 0,
        discount_reason: discount_reason || null,
        tax_amount: Number(tax_amount) || 0,
        service_charge_amount: Number(service_charge_amount) || 0,
        total_amount: Number(total_amount) || 0,
        payment_method: null,
        amount_paid: 0,
        notes: notes || null,
        special_requests: special_requests || null,
        ark_coins_used: 0,
        ordered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr || !orderData) {
      console.error('Open bill insert error:', orderErr);
      return NextResponse.json({ success: false, error: orderErr?.message || 'Failed to create order' }, { status: 500 });
    }

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: orderData.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      variants: item.variants || [],
      modifiers: item.modifiers || [],
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      variant_price_adjustment: item.variant_price_adjustment || 0,
      modifier_price_adjustment: item.modifier_price_adjustment || 0,
      subtotal: Number(item.subtotal),
      total_amount: Number(item.total_amount),
    }));

    const { error: itemsErr } = await supabase.from('pos_order_items').insert(orderItems);
    if (itemsErr) {
      console.error('Open bill items error:', itemsErr);
      // Best-effort: we leave the order without items rather than crashing
      return NextResponse.json({ success: false, error: itemsErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: orderData,
      message: 'Open bill created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Open bill error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
