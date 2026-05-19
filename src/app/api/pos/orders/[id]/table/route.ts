import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { getPosSession } from '@/lib/api/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { table_id, order_type } = body;
    const orderId = params.id;

    const supabase = createServiceClient();

    // 1. Check order exists and is active
    const { data: order, error: orderErr } = await supabase
      .from('pos_orders')
      .select('id, status, table_id')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
    if (!activeStatuses.includes(order.status as string)) {
      return Response.json({ success: false, error: 'Cannot move finished order' }, { status: 400 });
    }

    // 2. If moving to a dine-in table, check availability (skip if same table)
    const newTableId = table_id || null;
    if (newTableId && newTableId !== order.table_id) {
      const { data: occupied, error: occErr } = await supabase
        .from('pos_orders')
        .select('id')
        .eq('table_id', newTableId)
        .in('status', activeStatuses)
        .neq('id', orderId)
        .maybeSingle();

      if (occErr) throw occErr;
      if (occupied) {
        return Response.json({ success: false, error: 'Table is occupied' }, { status: 409 });
      }
    }

    // 3. Update order
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (newTableId !== undefined) updatePayload.table_id = newTableId;
    if (order_type) updatePayload.order_type = order_type;

    const { error: updErr } = await supabase
      .from('pos_orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (updErr) throw updErr;

    return Response.json({
      success: true,
      data: {
        order_id: orderId,
        new_table_id: newTableId,
        new_order_type: order_type || undefined,
        message: 'Order moved successfully',
      },
    });
  } catch (error: any) {
    console.error('Move table error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
