import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';

// PATCH /api/pos/orders/:id - Update order status and payment
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { status, payment_status, payment_method, amount_paid, ark_coins_used, notes } = body;
    const orderId = params.id;

    // Convert to numbers
    const numericAmountPaid = Number(amount_paid) || 0;
    const numericArkUsed = Number(ark_coins_used) || 0;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;
    if (payment_method) updateData.payment_method = payment_method;
    if (amount_paid !== undefined) updateData.amount_paid = numericAmountPaid;
    if (ark_coins_used !== undefined) updateData.ark_coins_used = numericArkUsed;
    if (notes) updateData.notes = notes;

    // Add timestamps based on status
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.payment_status = 'paid';
    }

    const { data, error } = await supabase
      .from('pos_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // If ARK coins used, deduct from customer balance
    if (data.customer_id && numericArkUsed > 0) {
      const { error: coinError } = await supabase.rpc('update_ark_coin_balance', {
        p_customer_id: data.customer_id,
        p_amount: -numericArkUsed,
        p_type: 'payment'
      });

      if (coinError) console.error('Warning: Failed to update ARK coin balance:', coinError);
    }

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

// GET /api/pos/orders/:id - Get single order details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServiceClient();
    const orderId = params.id;

    const { data, error } = await supabase
      .from('pos_orders')
      .select(`
        *,
        customer:pos_customers(name, phone, membership_tier, ark_coin_balance),
        items:pos_order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
