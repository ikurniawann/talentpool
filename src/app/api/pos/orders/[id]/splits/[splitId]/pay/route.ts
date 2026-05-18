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
    const { id: _orderId, splitId } = await params;
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

    const { data, error } = await supabase.rpc('pos_pay_split_transaction', {
      p_split_id: splitId,
      p_payment_method: payment_method,
      p_amount_paid: Number(amount_paid),
      p_ark_coins_used: Number(ark_coins_used),
      p_cashier_id: cashierId,
      p_reference_number: reference_number || null,
    });

    if (error) {
      console.error('RPC pay split error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (!result?.success) {
      return NextResponse.json({ success: false, error: result?.error || 'Payment failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error paying split:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function resolveCashierId(sessionUserId: string): Promise<string> {
  return '00000000-0000-0000-0000-000000000001';
}
