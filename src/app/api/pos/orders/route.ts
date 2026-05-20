import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { getPosSession } from '@/lib/api/auth';

// GET /api/pos/orders — list orders with filters
export async function GET(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('pos_orders')
      .select(`
        *,
        customer:pos_customers(name, phone),
        items:pos_order_items(*)
      `)
      .order('ordered_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);
    if (customerId) query = query.eq('customer_id', customerId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/pos/orders — create new order via atomic RPC
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
      items = [],
      subtotal,
      discount_amount = 0,
      discount_reason,
      tax_amount = 0,
      service_charge_amount = 0,
      total_amount,
      payment_method = 'cash',
      amount_paid = 0,
      notes,
      special_requests,
      ark_coins_used = 0,
      include_tax = false,
      membership_discount_pct = 0,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Items and total amount are required' }, { status: 400 });
    }

    const effectiveCashierId = cashier_id || await resolveCashierId(sessionUserId);
    const splits = body.splits as any[];

    const supabase = createServiceClient();

    // Split bill mode
    if (splits && splits.length > 0) {
      const rpcPayload = {
        p_order_type: order_type,
        p_customer_id: customer_id || null,
        p_cashier_id: effectiveCashierId,
        p_server_id: server_id || null,
        p_table_id: table_id || null,
        p_subtotal: Number(subtotal) || 0,
        p_discount_amount: Number(discount_amount) || 0,
        p_discount_reason: discount_reason || null,
        p_tax_amount: include_tax ? Number(tax_amount) || 0 : 0,
        p_service_charge_amount: Number(service_charge_amount) || 0,
        p_total_amount: Number(total_amount) || 0,
        p_notes: notes || null,
        p_special_requests: special_requests || null,
        p_items: items,
        p_splits: splits,
        p_branch_id: (body.branch_id as string) || null,
      };

      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'pos_create_split_order_transaction',
        rpcPayload
      );
      if (rpcError) {
        console.error('RPC split error:', rpcError);
        return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
      }
      const result = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;
      if (!result?.success) {
        return NextResponse.json({ success: false, error: result?.error || 'Split order creation failed' }, { status: 400 });
      }

      // Link shift if provided
      if (body.shift_id) {
        await supabase.from('pos_orders').update({ shift_id: body.shift_id }).eq('id', result.order_id);
      }

      // Fetch complete order with relations
      const { data: completeOrder, error: fetchError } = await supabase
        .from('pos_orders')
        .select(`*, customer:pos_customers(name, phone), items:pos_order_items(*), splits:pos_order_splits(*)`)
        .eq('id', result.order_id)
        .single();

      return NextResponse.json({
        success: true,
        data: completeOrder || result,
      }, { status: 201 });
    }

    // Single-payment flow
    // Avoid the old DB RPC because some deployed databases still have p_order_type TEXT
    // inserted into pos_order_type enum without casting.
    const { data: orderNumData, error: orderNumErr } = await supabase.rpc('generate_order_number');
    if (orderNumErr) {
      return NextResponse.json({ success: false, error: orderNumErr.message }, { status: 500 });
    }

    const orderNumber = typeof orderNumData === 'string' ? orderNumData : String(orderNumData);
    const serverSubtotal = items.reduce((sum: number, item: any) => {
      const qty = Number(item.quantity) || 1;
      const unit = Number(item.unit_price) || 0;
      const variantAdj = Number(item.variant_price_adjustment) || 0;
      const modifierAdj = Number(item.modifier_price_adjustment) || 0;
      return sum + ((unit + variantAdj + modifierAdj) * qty);
    }, 0);
    const serverDiscount = Number(discount_amount) || 0;
    const serverTax = include_tax ? Number(tax_amount) || 0 : 0;
    const serverServiceCharge = Number(service_charge_amount) || 0;
    const serverTotal = Number(total_amount) || (serverSubtotal - serverDiscount + serverTax + serverServiceCharge);
    const paidAmount = Number(amount_paid) || 0;
    const arkUsed = Number(ark_coins_used) || 0;

    if (paidAmount + arkUsed < serverTotal) {
      return NextResponse.json({ success: false, error: 'Payment insufficient' }, { status: 400 });
    }

    const { data: orderData, error: orderErr } = await supabase
      .from('pos_orders')
      .insert({
        order_number: orderNumber,
        order_type,
        status: 'completed',
        payment_status: 'paid',
        customer_id: customer_id || null,
        cashier_id: effectiveCashierId,
        server_id: server_id || null,
        table_id: table_id || null,
        shift_id: body.shift_id || null,
        subtotal: serverSubtotal,
        discount_amount: serverDiscount,
        discount_reason: discount_reason || null,
        tax_amount: serverTax,
        service_charge_amount: serverServiceCharge,
        total_amount: serverTotal,
        amount_paid: paidAmount,
        change_amount: Math.max(0, paidAmount + arkUsed - serverTotal),
        payment_method,
        ark_coins_used: arkUsed,
        notes: notes || null,
        special_requests: special_requests || null,
        ordered_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr || !orderData) {
      console.error('Order insert error:', orderErr);
      return NextResponse.json({ success: false, error: orderErr?.message || 'Failed to create order' }, { status: 500 });
    }

    const orderItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const unitPrice =
        (Number(item.unit_price) || 0) +
        (Number(item.variant_price_adjustment) || 0) +
        (Number(item.modifier_price_adjustment) || 0);
      const subtotalValue = unitPrice * qty;

      return {
        order_id: orderData.id,
        product_id: item.product_id,
        product_name: item.product_name || 'Unknown',
        product_sku: String(item.product_sku || item.product_id || '').slice(0, 50),
        variants: item.variants || [],
        modifiers: item.modifiers || [],
        quantity: qty,
        unit_price: unitPrice,
        subtotal: subtotalValue,
        discount_amount: 0,
        total_amount: subtotalValue,
        xp_earned: 0,
        inventory_deducted: false,
      };
    });

    const { error: itemsErr } = await supabase.from('pos_order_items').insert(orderItems);
    if (itemsErr) {
      console.error('Order items insert error:', itemsErr);
      return NextResponse.json({ success: false, error: itemsErr.message }, { status: 500 });
    }

    await supabase.from('pos_order_status_history').insert({
      order_id: orderData.id,
      from_status: null,
      to_status: 'completed',
      changed_by: effectiveCashierId,
      notes: 'Order created and paid from cashier',
    });

    const { data: completeOrder } = await supabase
      .from('pos_orders')
      .select(`*, customer:pos_customers(name, phone), items:pos_order_items(*)`)
      .eq('id', orderData.id)
      .single();

    return NextResponse.json({ success: true, data: completeOrder || orderData }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function resolveCashierId(sessionUserId: string): Promise<string> {
  // In production, map session user to hrd.employees.id
  // For now, return a fallback/demo ID
  return '00000000-0000-0000-0000-000000000001';
}
