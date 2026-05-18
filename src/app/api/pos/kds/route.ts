import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';

/** GET /api/pos/kds
 *  Query params:
 *    - status: pending,confirmed,preparing,ready (default multi)
 *    - station: kitchen, bar, bakery (filter by product category)
 *    - limit: default 50
 *    - branch_id: optional
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || 'pending,confirmed,preparing,ready';
  const station = searchParams.get('station');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const branchId = searchParams.get('branch_id');

  const supabase = createServiceClient();

  let query = supabase
    .from('pos_orders')
    .select(`
      id,
      order_number,
      status,
      payment_status,
      order_type,
      table_id,
      notes,
      special_requests,
      ordered_at,
      confirmed_at,
      pos_order_items (
        id,
        product_id,
        product_name,
        product_sku,
        variant_info,
        modifier_info,
        quantity,
        unit_price,
        notes
      )
    `)
    .in('status', statusFilter.split(','))
    .order('ordered_at', { ascending: true })
    .limit(limit);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('KDS query error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  let orders = data || [];
  if (station) {
    orders = orders.filter((order: any) =>
      order.pos_order_items?.some((item: any) => {
        const name = (item.product_name || '').toLowerCase();
        const stationLower = station.toLowerCase();
        if (stationLower === 'bar') {
          return /kopi|coffee|tea|minuman|drink|juice|soda|es|latte|cappuccino/.test(name);
        }
        if (stationLower === 'bakery') {
          return /roti|bread|pastry|cake|kue|croissant|donut/.test(name);
        }
        return !/kopi|coffee|tea|minuman|drink|juice|soda|es|latte|cappuccino|roti|bread|pastry|cake|kue|croissant|donut/.test(name);
      })
    );
  }

  const now = Date.now();
  const ordersWithWait = orders.map((order: any) => {
    const orderedAt = order.ordered_at ? new Date(order.ordered_at).getTime() : now;
    const waitSeconds = Math.floor((now - orderedAt) / 1000);
    const waitMinutes = Math.floor(waitSeconds / 60);
    return {
      ...order,
      wait_seconds: waitSeconds,
      wait_minutes: waitMinutes,
      is_overdue: waitMinutes > 15,
      is_urgent: waitMinutes > 10,
    };
  });

  return NextResponse.json({
    success: true,
    data: ordersWithWait,
    count: ordersWithWait.length,
  });
}
