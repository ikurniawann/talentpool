import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { awardCrmXpForPosOrder } from '@/lib/crm/loyalty-engine';

type OrderPatchBody = {
  status?: string;
  payment_status?: string;
  payment_method?: string;
  amount_paid?: number | string;
  ark_coins_used?: number | string;
  notes?: string;
  changed_by?: string;
  status_notes?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

// PATCH /api/pos/orders/:id - Update order status and payment
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServiceClient();
    const { id: orderId } = await params;
    const body = (await request.json()) as OrderPatchBody;
    const { status, payment_status, payment_method, amount_paid, ark_coins_used, notes } = body;

    // Convert to numbers
    const numericAmountPaid = Number(amount_paid) || 0;
    const numericArkUsed = Number(ark_coins_used) || 0;

    const updateData: Record<string, string | number> = {};
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

    // Deduct ARK coins atomically BEFORE marking the order paid. The RPC locks
    // the customer row and rejects an insufficient balance in-transaction, so a
    // failed/insufficient deduction never leaves a paid order without the
    // matching coin debit (previously the failure was swallowed).
    if (numericArkUsed > 0) {
      const { data: existing, error: fetchErr } = await supabase
        .from('pos_orders')
        .select('customer_id')
        .eq('id', orderId)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ success: false, error: 'Order tidak ditemukan' }, { status: 404 });
      }

      if (existing.customer_id) {
        const { error: coinError } = await supabase.rpc('update_ark_coin_balance', {
          p_customer_id: existing.customer_id,
          p_amount: -numericArkUsed,
          p_type: 'payment',
          p_order_id: orderId,
        });

        if (coinError) {
          const insufficient = coinError.message?.includes('Insufficient');
          return NextResponse.json(
            { success: false, error: insufficient ? 'Saldo ARK Coin tidak cukup' : 'Gagal memproses ARK Coin' },
            { status: 400 }
          );
        }
      }
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

    let crmXp = null;
    if (data.customer_id && (status === 'completed' || payment_status === 'paid')) {
      const { data: orderItems } = await supabase
        .from('pos_order_items')
        .select('product_id, quantity, unit_price, subtotal, total_amount')
        .eq('order_id', orderId);

      crmXp = await awardCrmXpForPosOrder(supabase, {
        orderId,
        customerId: data.customer_id,
        totalAmount: Number(data.total_amount || 0),
        items: orderItems || [],
        outletId: data.branch_id || null,
      });
    }

    return NextResponse.json({ success: true, data, crm_xp: crmXp });
  } catch (error: unknown) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

// GET /api/pos/orders/:id - Get single order details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServiceClient();
    const { id: orderId } = await params;

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
  } catch (error: unknown) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
