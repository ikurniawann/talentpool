import { NextRequest } from 'next/server';
import { createPgClient } from "@/lib/pg/create-client";
import { getPosSession } from '@/lib/api/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { target_order_id, supervisor_pin } = body;
    const { id: sourceOrderId } = await params;

    if (!target_order_id || !supervisor_pin) {
      return Response.json({ success: false, error: 'Target order and supervisor PIN required' }, { status: 400 });
    }

    if (sourceOrderId === target_order_id) {
      return Response.json({ success: false, error: 'Cannot merge order with itself' }, { status: 400 });
    }

    const db = createPgClient();

    // 1. Validate supervisor PIN
    const { data: supervisor } = await db
      .from('users')
      .select('id, full_name, role')
      .eq('role', 'pos_supervisor')
      .eq('pos_pin', String(supervisor_pin))
      .single();

    if (!supervisor) {
      return Response.json({ success: false, error: 'PIN supervisor tidak valid' }, { status: 403 });
    }

    // 2. Check both orders exist and are active
    const { data: source } = await db
      .from('pos_orders')
      .select('id, status, subtotal, discount_amount, tax_amount')
      .eq('id', sourceOrderId)
      .single();

    const { data: target } = await db
      .from('pos_orders')
      .select('id, status, subtotal, discount_amount, tax_amount, merged_from_orders')
      .eq('id', target_order_id)
      .single();

    if (!source || !target) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const blockedStatuses = ['completed', 'cancelled', 'voided', 'merged'];
    if (blockedStatuses.includes(source.status as string)) {
      return Response.json({ success: false, error: 'Source order cannot be merged' }, { status: 400 });
    }
    if (blockedStatuses.includes(target.status as string)) {
      return Response.json({ success: false, error: 'Target order cannot receive merge' }, { status: 400 });
    }

    // 3. Move items from source to target
    const { error: moveErr } = await db
      .from('pos_order_items')
      .update({ order_id: target_order_id })
      .eq('order_id', sourceOrderId);

    if (moveErr) throw moveErr;

    // 4. Recalculate target totals (sum from its items)
    const { data: itemsAgg } = await db
      .from('pos_order_items')
      .select('subtotal, total_amount')
      .eq('order_id', target_order_id);

    const newSubtotal = (itemsAgg || []).reduce((s, it) => s + (it.subtotal || 0), 0);
    const newTotal = (itemsAgg || []).reduce((s, it) => s + (it.total_amount || 0), 0);

    // 5. Update target order
    const { error: updTargetErr } = await db
      .from('pos_orders')
      .update({
        subtotal: newSubtotal,
        total_amount: newTotal,
        discount_amount: (target.discount_amount || 0) + (source.discount_amount || 0),
        tax_amount: (target.tax_amount || 0) + (source.tax_amount || 0),
        merged_from_orders: [
          ...(target.merged_from_orders || []),
          sourceOrderId,
        ],
        updated_at: new Date().toISOString(),
      })
      .eq('id', target_order_id);

    if (updTargetErr) throw updTargetErr;

    // 6. Mark source as merged
    await db
      .from('pos_orders')
      .update({
        status: 'merged',
        merged_to_order_id: target_order_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceOrderId);

    // 7. Cancel pending splits on source
    await db
      .from('pos_order_splits')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('order_id', sourceOrderId)
      .eq('status', 'pending');

    return Response.json({
      success: true,
      data: {
        source_order_id: sourceOrderId,
        target_order_id: target_order_id,
        message: 'Orders merged successfully',
      },
    });
  } catch (error: unknown) {
    console.error('Merge error:', error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : 'Merge failed' }, { status: 500 });
  }
}
