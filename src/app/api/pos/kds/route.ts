import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';

type KDSOrderItemRow = {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  product_sku?: string | null;
  variants?: unknown;
  modifiers?: unknown;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  kitchen_notes?: string | null;
  station?: string | null;
  kitchen_status?: string | null;
  kitchen_started_at?: string | null;
  kitchen_ready_at?: string | null;
  served_at?: string | null;
};

type KDSOrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status?: string | null;
  order_type?: string | null;
  table_id?: string | null;
  notes?: string | null;
  special_requests?: string | null;
  ordered_at?: string | null;
  confirmed_at?: string | null;
  pos_order_items?: KDSOrderItemRow[] | null;
};

type PosTableRow = {
  id: string;
  table_number?: string | null;
  qr_code?: string | null;
};

const STATIONS = ['kitchen', 'bar', 'bakery', 'dessert', 'merchandise', 'photobooth'];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeStation(value?: string | null, productName = '', kitchenNotes = '') {
  const lower = String(value || '').trim().toLowerCase();
  if (STATIONS.includes(lower)) return lower;

  const haystack = `${productName} ${kitchenNotes}`.toLowerCase();
  if (/kopi|coffee|tea|teh|minuman|drink|juice|jus|soda|es|latte|cappuccino|mocktail|milkshake|bar/.test(haystack)) {
    return 'bar';
  }
  if (/roti|bread|pastry|cake|kue|croissant|donut|dessert|ice cream|gelato|bakery/.test(haystack)) {
    return 'bakery';
  }
  return 'kitchen';
}

function formatVariantInfo(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === 'object' && item ? (item as { name?: string }).name : '')).filter(Boolean).join(', ')
    : '';
}

/** GET /api/pos/kds
 *  Query params:
 *    - status: pending,confirmed,preparing,ready (default multi)
 *    - station: kitchen, bar, bakery, dessert, merchandise, photobooth
 *    - limit: default 50
 *    - branch_id: optional
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || 'pending,confirmed,preparing,ready';
  const station = searchParams.get('station');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const branchId = searchParams.get('branch_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  const supabase = createServiceClient();

  const baseSelect = `
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
        variants,
        modifiers,
        quantity,
        unit_price,
        kitchen_notes
      )
    `;

  const stationSelect = `
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
        variants,
        modifiers,
        quantity,
        unit_price,
        kitchen_notes,
        station,
        kitchen_status,
        kitchen_started_at,
        kitchen_ready_at,
        served_at
      )
    `;

  let query = supabase
    .from('pos_orders')
    .select(stationSelect)
    .in('status', statusFilter.split(','))
    .order('ordered_at', { ascending: false })
    .limit(limit);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }
  if (dateFrom) {
    query = query.gte('ordered_at', dateFrom);
  }
  if (dateTo) {
    query = query.lt('ordered_at', dateTo);
  }

  const stationResult = await query;
  let data = stationResult.data as unknown as KDSOrderRow[] | null;
  let error = stationResult.error;

  if (error?.code === '42703' || error?.code === 'PGRST200') {
    let legacyQuery = supabase
      .from('pos_orders')
      .select(baseSelect)
      .in('status', statusFilter.split(','))
      .order('ordered_at', { ascending: false })
      .limit(limit);

    if (branchId) {
      legacyQuery = legacyQuery.eq('branch_id', branchId);
    }
    if (dateFrom) {
      legacyQuery = legacyQuery.gte('ordered_at', dateFrom);
    }
    if (dateTo) {
      legacyQuery = legacyQuery.lt('ordered_at', dateTo);
    }

    const legacyResult = await legacyQuery;
    data = legacyResult.data as unknown as KDSOrderRow[] | null;
    error = legacyResult.error;
  }

  if (error) {
    console.error('KDS query error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const orderRows = (data || []) as KDSOrderRow[];
  const tableIds = Array.from(
    new Set(
      orderRows
        .map((order) => order.table_id)
        .filter((value): value is string => typeof value === 'string' && isUuid(value))
    )
  );
  let tableById = new Map<string, PosTableRow>();

  if (tableIds.length > 0) {
    const { data: tables, error: tableError } = await supabase
      .from('pos_tables')
      .select('id, table_number, qr_code')
      .in('id', tableIds);

    if (!tableError) {
      tableById = new Map(((tables || []) as PosTableRow[]).map((table) => [table.id, table]));
    }
  }

  const orders = orderRows
    .map((order) => ({
      ...order,
      table_label: order.table_id
        ? tableById.get(order.table_id)?.table_number || tableById.get(order.table_id)?.qr_code || null
        : null,
      pos_order_items: (order.pos_order_items || [])
        .map((item) => {
          const itemStation = normalizeStation(item.station, item.product_name || '', item.kitchen_notes || '');
          return {
            ...item,
            station: itemStation,
            kitchen_status: item.kitchen_status || (order.status === 'preparing' ? 'preparing' : order.status === 'ready' ? 'ready' : order.status === 'served' ? 'served' : 'pending'),
            variant_info: formatVariantInfo(item.variants),
            modifier_info: formatVariantInfo(item.modifiers),
            notes: item.kitchen_notes || '',
          };
        })
        .filter((item) => !station || item.station === station.toLowerCase()),
    }))
    .filter((order) => order.pos_order_items.length > 0);

  const now = Date.now();
  const ordersWithWait = orders.map((order) => {
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
