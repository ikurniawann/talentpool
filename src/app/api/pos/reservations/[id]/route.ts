import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { getPosSession } from '@/lib/api/auth';

type ReservationUpdateData = {
  status?: string;
  notes?: string;
  special_requests?: string;
  seated_at?: string;
  completed_at?: string;
  cancelled_at?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

// PATCH /api/pos/reservations/:id - Update reservation status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { id: reservationId } = await params;
    const body = await request.json();
    const { status, notes, special_requests } = body;

    const updateData: ReservationUpdateData = {};
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    if (special_requests) updateData.special_requests = special_requests;

    // Add timestamps based on status
    if (status === 'seated') {
      updateData.seated_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'no_show' || status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('pos_reservations')
      .update(updateData)
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw error;

    // If seated, update table status
    if (status === 'seated' && data.table_id) {
      await supabase
        .from('pos_tables')
        .update({ status: 'occupied', current_order_id: null })
        .eq('id', data.table_id);
    }

    // If completed or cancelled, free up the table
    if ((status === 'completed' || status === 'no_show' || status === 'cancelled') && data.table_id) {
      await supabase
        .from('pos_tables')
        .update({ status: 'available', current_order_id: null })
        .eq('id', data.table_id);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
