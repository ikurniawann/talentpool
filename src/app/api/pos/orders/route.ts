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

    // Single-payment flow (original)
    const rpcPayload = {
      p_order_type: order_type,
      p_customer_id: customer_id || null,
      p_cashier_id: effectiveCashierId,
      p_server_id: server_id || null,
      p_table_id: table_id || null,
      p_notes: notes || null,
      p_special_requests: special_requests || null,
      p_client_subtotal: Number(subtotal) || 0,
      p_client_discount_amount: Number(discount_amount) || 0,
      p_client_tax_amount: include_tax ? Number(tax_amount) || 0 : 0,
      p_client_service_charge: Number(service_charge_amount) || 0,
      p_client_total_amount: Number(total_amount) || 0,
      p_payment_method: payment_method,
      p_amount_paid: Number(amount_paid) || 0,
      p_ark_coins_used: Number(ark_coins_used) || 0,
      p_membership_discount_pct: Number(membership_discount_pct) || 0,
      p_items: items,
    };

    // Call atomic transaction function
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'pos_create_order_transaction',
      rpcPayload
    );

    if (rpcError) {
      console.error('RPC error:', rpcError);
      return NextResponse.json({ success: false, error: rpcError.message || 'Transaction failed' }, { status: 500 });
    }

    // rpcResult is jsonb; parse if needed
    const result = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;

    if (!result?.success) {
      return NextResponse.json({ success: false, error: result?.error || 'Order creation failed' }, { status: 400 });
    }

    // Fetch complete order with relations for response
    const { data: completeOrder, error: fetchError } = await supabase
      .from('pos_orders')
      .select(`*, customer:pos_customers(name, phone), items:pos_order_items(*)`)
      .eq('id', result.order_id)
      .single();

    if (fetchError) {
      // Order created but fetch failed - return basic data from RPC result
      return NextResponse.json({
        success: true,
        data: result,
      }, { status: 201 });
    }

    return NextResponse.json({ success: true, data: completeOrder }, { status: 201 });
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
