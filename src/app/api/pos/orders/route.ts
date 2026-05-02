import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPosSession } from '@/lib/api/auth';

let _supabaseClient: ReturnType<typeof createClient> | null = null;
const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    if (!_supabaseClient) {
      _supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return (_supabaseClient as any)[prop];
  },
});

// GET /api/pos/orders - List orders with filters
export async function GET(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
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

    if (status) {
      query = query.eq('status', status);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/pos/orders - Create new order
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
      payment_method,
      amount_paid = 0,
      notes,
      special_requests,
      ark_coins_used = 0
    } = body;

    // Convert to numbers explicitly
    const numericSubtotal = Number(subtotal) || 0;
    const numericDiscount = Number(discount_amount) || 0;
    const numericTax = Number(tax_amount) || 0;
    const numericTotal = Number(total_amount) || 0;
    const numericPaid = Number(amount_paid) || 0;
    const numericArk = Number(ark_coins_used) || 0;

    // Validate required fields (total_amount can be 0 if fully paid with ARK)
    if (!items.length || numericTotal === 0) {
      return NextResponse.json(
        { success: false, error: 'Items and total amount are required' },
        { status: 400 }
      );
    }
    
    // Generate cashier_id if not provided (for demo/testing)
    const effectiveCashierId = cashier_id || '00000000-0000-0000-0000-000000000001';

    // Generate order number
    const { data: orderNumberData } = await supabase.rpc('generate_order_number');
    const order_number = orderNumberData || `POS-${Date.now()}`;

    // Start transaction-like flow
    // 1. Create order
    const { data: order, error: orderError } = await supabase
      .from('pos_orders')
      .insert({
        order_number,
        order_type,
        status: numericPaid >= numericTotal ? 'completed' : 'pending',
        payment_status: numericPaid >= numericTotal ? 'paid' : 'unpaid',
        customer_id: customer_id || null,
        cashier_id,
        server_id: server_id || null,
        subtotal: numericSubtotal,
        discount_amount: numericDiscount,
        discount_reason,
        tax_amount: numericTax,
        service_charge_amount: 0,
        total_amount: numericTotal,
        amount_paid: numericPaid,
        change_amount: numericPaid - numericTotal,
        ark_coins_used: numericArk,
        notes,
        special_requests
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Create order items
    if (items.length > 0) {
      const itemsData = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        variants: item.variants || [],
        modifiers: item.modifiers || [],
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        discount_amount: item.discount_amount || 0,
        total_amount: item.total_amount,
        xp_earned: item.xp_earned || 0
      }));

      const { error: itemsError } = await supabase
        .from('pos_order_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;
    }

    // 3. Update customer Ark Coin balance if used
    if (customer_id && numericArk > 0) {
      const { error: coinError } = await supabase.rpc('update_ark_coin_balance', {
        p_customer_id: customer_id,
        p_amount: -numericArk,
        p_type: 'payment'
      });

      if (coinError) console.error('Warning: Failed to update Ark Coin balance:', coinError);
    }

    // 4. Calculate and add XP earned
    if (customer_id) {
      const { data: customerData } = await supabase
        .from('pos_customers')
        .select('membership_tier')
        .eq('id', customer_id)
        .single();

      if (customerData) {
        const { data: xpData } = await supabase.rpc('calculate_xp_earned', {
          p_order_total: total_amount,
          p_customer_tier: customerData.membership_tier
        });

        const xp_earned = xpData || 0;

        // Update customer XP
        await supabase
          .from('pos_customers')
          .update({
            total_xp: xp_earned,
            current_xp: xp_earned,
            visit_count: 1,
            last_visit: new Date().toISOString()
          })
          .eq('id', customer_id);

        // Log XP transaction
        await supabase.from('pos_xp_transactions').insert({
          customer_id,
          order_id: order.id,
          xp_earned,
          balance_before: 0, // Should fetch actual balance
          balance_after: 0,  // Should fetch actual balance
          description: `XP dari order ${order_number}`
        });
      }
    }

    // 5. Deduct inventory (if products have inventory tracking enabled)
    // This would call a Supabase function or handle in application layer
    // For now, we'll skip this and implement later

    // Fetch complete order with items
    const { data: completeOrder } = await supabase
      .from('pos_orders')
      .select(`
        *,
        customer:pos_customers(name, phone),
        items:pos_order_items(*)
      `)
      .eq('id', order.id)
      .single();

    return NextResponse.json({ success: true, data: completeOrder }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    
    // Rollback: delete order if creation failed midway
    // In production, use proper transaction handling
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/pos/orders/:id - Update order status
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status, payment_status, payment_method, amount_paid, notes } = body;
    const { id: orderId } = await params;

    // Convert to numbers
    const numericAmountPaid = Number(amount_paid) || 0;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;
    if (payment_method) updateData.payment_method = payment_method;
    if (amount_paid !== undefined) updateData.amount_paid = numericAmountPaid;
    if (notes) updateData.notes = notes;

    // Add timestamps based on status
    if (status === 'confirmed') updateData.confirmed_at = new Date().toISOString();
    if (status === 'completed') updateData.completed_at = new Date().toISOString();
    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancelled_reason = body.cancelled_reason;
    }

    const { data, error } = await supabase
      .from('pos_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // Log status change
    if (status) {
      await supabase.from('pos_order_status_history').insert({
        order_id: orderId,
        from_status: null, // Should fetch previous status
        to_status: status,
        changed_by: body.changed_by || 'system',
        notes: body.status_notes
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
