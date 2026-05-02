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

// GET /api/pos/topup/history - Get customer topup history
export async function GET(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customer_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('pos_wallet_transactions')
      .select(`
        *,
        customer:pos_customers(name, phone)
      `)
      .eq('type', 'topup')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching topup history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/pos/topup - Process Ark Coin topup
export async function POST(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      customer_id,
      amount, // Fiat amount (IDR)
      payment_method = 'qris',
      xendit_transaction_id
    } = body;

    // Validate required fields
    if (!customer_id || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Customer ID and valid amount are required' },
        { status: 400 }
      );
    }

    // Calculate Ark Coin amount (1 ARK = 1000 IDR)
    const arkCoins = amount / 1000;

    // Get current customer balance and total_spent
    const { data: customer, error: customerError } = await supabase
      .from('pos_customers')
      .select('ark_coin_balance, total_spent')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const balanceBefore = Number(customer.ark_coin_balance) || 0;
    const balanceAfter = balanceBefore + arkCoins;
    const totalSpentAfter = Number(customer.total_spent || 0) + amount;

    // Start transaction
    // 1. Update customer balance
    const { error: updateError } = await supabase
      .from('pos_customers')
      .update({
        ark_coin_balance: balanceAfter,
        total_spent: totalSpentAfter,
        updated_at: new Date().toISOString()
      })
      .eq('id', customer_id);

    if (updateError) throw updateError;

    // 2. Log wallet transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('pos_wallet_transactions')
      .insert({
        customer_id,
        type: 'topup',
        amount: amount,
        ark_coins: arkCoins,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        payment_method,
        xendit_transaction_id: xendit_transaction_id || null,
        notes: `Topup via ${payment_method.toUpperCase()}`
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // 3. If QRIS, generate QR code URL (integrate with Xendit/Midtrans later)
    let qrCodeUrl = null;
    if (payment_method === 'qris') {
      // TODO: Integrate with Xendit QRIS API
      // For now, return mock QR code
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=QRIS_${Date.now()}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        ark_coins: arkCoins,
        qr_code_url: qrCodeUrl
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error processing topup:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
