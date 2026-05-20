import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { getPosSession } from '@/lib/api/auth';

// POST /api/pos/orders/{id}/splits/{splitId}/pay
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; splitId: string }> }
) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { id: orderId, splitId } = await params;
    const body = await request.json();
    const {
      payment_method,
      amount_paid,
      ark_coins_used = 0,
      reference_number,
    } = body;

    if (!payment_method || amount_paid == null) {
      return NextResponse.json({ success: false, error: 'payment_method and amount_paid required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const cashierId = await resolveCashierId(sessionUserId);

    const { data: split, error: splitError } = await supabase
      .from('pos_order_splits')
      .select('*')
      .eq('id', splitId)
      .eq('order_id', orderId)
      .single();

    if (splitError || !split) {
      return NextResponse.json({ success: false, error: 'Split not found' }, { status: 404 });
    }

    if (split.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Split already cancelled' }, { status: 400 });
    }

    if (split.status === 'paid') {
      return NextResponse.json({ success: false, error: 'Split already paid' }, { status: 400 });
    }

    const amountPaid = Number(amount_paid);
    const splitTotal = Number(split.total_amount || 0);
    if (amountPaid < splitTotal) {
      return NextResponse.json({ success: false, error: `Nominal bayar kurang dari total split ${splitTotal}` }, { status: 400 });
    }

    const changeAmount = amountPaid - splitTotal;
    const arkUsed = Number(ark_coins_used || 0);

    if (arkUsed > 0) {
      if (!split.customer_id) {
        return NextResponse.json({ success: false, error: 'ARK Coin butuh customer member' }, { status: 400 });
      }

      const { data: customer, error: customerError } = await supabase
        .from('pos_customers')
        .select('ark_coin_balance')
        .eq('id', split.customer_id)
        .single();

      if (customerError || !customer) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }

      if (Number(customer.ark_coin_balance || 0) < arkUsed) {
        return NextResponse.json({ success: false, error: 'Saldo ARK Coin tidak cukup' }, { status: 400 });
      }

      const { error: arkError } = await supabase
        .from('pos_customers')
        .update({ ark_coin_balance: Number(customer.ark_coin_balance || 0) - arkUsed })
        .eq('id', split.customer_id);

      if (arkError) {
        return NextResponse.json({ success: false, error: arkError.message }, { status: 500 });
      }
    }

    const { error: paymentError } = await supabase.from('pos_split_payments').insert({
      split_id: splitId,
      order_id: orderId,
      amount: amountPaid,
      change_amount: changeAmount,
      payment_method,
      reference_number: reference_number || null,
      cashier_id: cashierId,
    });

    if (paymentError) {
      return NextResponse.json({ success: false, error: paymentError.message }, { status: 500 });
    }

    const { error: splitUpdateError } = await supabase
      .from('pos_order_splits')
      .update({
        status: 'paid',
        payment_method,
        amount_paid: amountPaid,
        change_amount: changeAmount,
        ark_coins_used: arkUsed,
        paid_at: new Date().toISOString(),
      })
      .eq('id', splitId);

    if (splitUpdateError) {
      return NextResponse.json({ success: false, error: splitUpdateError.message }, { status: 500 });
    }

    const { count: totalSplits } = await supabase
      .from('pos_order_splits')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId);

    const { count: paidSplits } = await supabase
      .from('pos_order_splits')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('status', 'paid');

    const allPaid = (totalSplits || 0) > 0 && totalSplits === paidSplits;
    const paymentStatus = allPaid ? 'paid' : 'partial';

    const { error: orderUpdateError } = await supabase
      .from('pos_orders')
      .update({
        payment_status: paymentStatus,
        ...(allPaid ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', orderId);

    if (orderUpdateError) {
      return NextResponse.json({ success: false, error: orderUpdateError.message }, { status: 500 });
    }

    await supabase.from('pos_order_status_history').insert({
      order_id: orderId,
      from_status: null,
      to_status: null,
      reason: `Split ${split.label || split.split_index} paid via ${payment_method}`,
      changed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        success: true,
        split_id: splitId,
        change: changeAmount,
        paid_splits: paidSplits || 0,
        total_splits: totalSplits || 0,
        payment_status: paymentStatus,
      },
    });
  } catch (error: any) {
    console.error('Error paying split:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function resolveCashierId(sessionUserId: string): Promise<string> {
  return '00000000-0000-0000-0000-000000000001';
}
