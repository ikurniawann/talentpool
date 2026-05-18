import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';

/** PATCH /api/pos/orders/{id}/status
 *  Body: { status: string, reason?: string }
 *  Updates order status + logs to pos_order_status_history
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  if (!orderId) {
    return NextResponse.json({ success: false, error: 'Order ID required' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { status, reason } = body;

  const validStatuses = ['pending','confirmed','preparing','ready','served','completed','cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: currentOrder, error: fetchError } = await supabase
    .from('pos_orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (fetchError || !currentOrder) {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updateData: Record<string, string> = { status };
  if (status === 'confirmed') updateData.confirmed_at = now;
  if (status === 'ready') updateData.completed_at = now;

  const { error: updateError } = await supabase
    .from('pos_orders')
    .update(updateData)
    .eq('id', orderId);

  if (updateError) {
    console.error('Status update error:', updateError);
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  await supabase.from('pos_order_status_history').insert({
    order_id: orderId,
    from_status: currentOrder.status,
    to_status: status,
    reason: reason || `Status updated to ${status}`,
    changed_at: now,
  });

  return NextResponse.json({ success: true, data: { order_id: orderId, status } });
}
