import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { getPosSession } from '@/lib/api/auth';

// GET /api/pos/orders/{id}/splits
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('pos_get_order_splits', { p_order_id: id });

    if (error) {
      console.error('Error fetching splits:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error fetching splits:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
