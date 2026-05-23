import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { getPosSession } from '@/lib/api/auth';

type TableRow = {
  id: string;
  table_number?: string | null;
  capacity?: number | string | null;
  status?: string | null;
  qr_code?: string | null;
  is_active?: boolean | null;
};

type ActiveOrderRow = {
  id: string;
  order_number?: string | null;
  table_id?: string | null;
  status?: string | null;
  payment_status?: string | null;
  total_amount?: number | string | null;
};

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function GET(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const includeInactive = request.nextUrl.searchParams.get('include_inactive') === 'true';

    let tableQuery = supabase
      .from('pos_tables')
      .select('id, table_number, capacity, status, qr_code, is_active')
      .order('table_number');

    if (!includeInactive) tableQuery = tableQuery.eq('is_active', true);

    const { data: tables, error: tableError } = await tableQuery;
    if (tableError) throw tableError;

    const { data: activeOrders, error: orderError } = await supabase
      .from('pos_orders')
      .select('id, order_number, table_id, status, payment_status, total_amount')
      .not('table_id', 'is', null)
      .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served']);

    if (orderError) throw orderError;

    const activeOrderByTable = new Map<string, ActiveOrderRow>();
    for (const order of (activeOrders ?? []) as ActiveOrderRow[]) {
      if (order.table_id) activeOrderByTable.set(order.table_id, order);
    }

    const normalizedTables = ((tables ?? []) as TableRow[]).map((table) => {
      const activeOrder = activeOrderByTable.get(table.id);
      return {
        id: table.id,
        table_number: table.table_number || table.qr_code || table.id,
        name: table.table_number || table.qr_code || table.id,
        label: table.table_number || table.qr_code || table.id,
        capacity: toNumber(table.capacity) || 4,
        area: 'Main Dining',
        status: activeOrder ? 'occupied' : table.status || 'available',
        qr_code: table.qr_code || table.table_number || null,
        is_active: table.is_active !== false,
        active_order: activeOrder
          ? {
              id: activeOrder.id,
              order_number: activeOrder.order_number,
              status: activeOrder.status,
              payment_status: activeOrder.payment_status,
              total_amount: toNumber(activeOrder.total_amount),
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: normalizedTables,
    });
  } catch (error) {
    console.error('POS tables error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Gagal memuat meja POS' },
      { status: 500 }
    );
  }
}
