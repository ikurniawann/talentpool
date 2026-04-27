import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/pos/reservations - List reservations with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const tableId = searchParams.get('table_id');

    let query = supabase
      .from('pos_reservations')
      .select(`
        *,
        table:pos_tables(table_number),
        customer:pos_customers(name, phone)
      `)
      .order('reservation_date', { ascending: true })
      .order('time_slot', { ascending: true });

    if (date) {
      query = query.eq('reservation_date', date);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (tableId) {
      query = query.eq('table_id', tableId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/pos/reservations - Create new reservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      table_id,
      customer_id,
      customer_name,
      customer_phone,
      reservation_date,
      time_slot,
      duration_minutes = 120,
      pax_count,
      special_requests,
      deposit_amount = 0,
      notes
    } = body;

    // Validate required fields
    if (!reservation_date || !time_slot || !pax_count) {
      return NextResponse.json(
        { success: false, error: 'Date, time slot, and party size are required' },
        { status: 400 }
      );
    }

    // Check table availability
    if (table_id) {
      const { data: conflictingReservation } = await supabase
        .from('pos_reservations')
        .select('id')
        .eq('table_id', table_id)
        .eq('reservation_date', reservation_date)
        .eq('time_slot', time_slot)
        .neq('status', 'cancelled')
        .single();

      if (conflictingReservation) {
        return NextResponse.json(
          { success: false, error: 'Table is already reserved for this time slot' },
          { status: 409 }
        );
      }
    }

    // Insert reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('pos_reservations')
      .insert({
        table_id: table_id || null,
        customer_id: customer_id || null,
        customer_name,
        customer_phone,
        reservation_date,
        time_slot,
        duration_minutes,
        pax_count,
        special_requests,
        deposit_amount,
        status: 'confirmed',
        notes
      })
      .select(`
        *,
        table:pos_tables(table_number),
        customer:pos_customers(name, phone)
      `)
      .single();

    if (reservationError) throw reservationError;

    return NextResponse.json({ success: true, data: reservation }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/pos/reservations/:id - Update reservation status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { status, notes, special_requests } = body;
    const reservationId = params.id;

    const updateData: any = {};
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
  } catch (error: any) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
