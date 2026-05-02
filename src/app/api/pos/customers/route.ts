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

// GET /api/pos/customers - List customers with search
export async function GET(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const phone = searchParams.get('phone');
    const tier = searchParams.get('tier');

    let query = supabase
      .from('pos_customers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (phone) {
      query = query.eq('phone', phone);
    }

    if (tier) {
      query = query.eq('membership_tier', tier);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/pos/customers - Create or update customer
export async function POST(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      phone,
      name,
      email,
      membership_tier = 'bronze',
      notes
    } = body;

    // Validate required fields
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Check if customer exists by phone
    const { data: existingCustomer } = await supabase
      .from('pos_customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (existingCustomer) {
      // Update existing customer
      const { data, error } = await supabase
        .from('pos_customers')
        .update({
          name: name || existingCustomer.name,
          email: email || existingCustomer.email,
          membership_tier,
          notes: notes || existingCustomer.notes
        })
        .eq('id', existingCustomer.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data, message: 'Customer updated' });
    } else {
      // Create new customer
      const { data, error } = await supabase
        .from('pos_customers')
        .insert({
          phone,
          name: name || '',
          email: email || null,
          membership_tier,
          notes: notes || null
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data, message: 'Customer created' }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error saving customer:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
