import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();
    const { data: kpi, error } = await supabase
      .from('employee_kpis')
      .select(`
        *,
        employee:employees!employee_id(
          id, 
          full_name, 
          nip, 
          photo_url,
          department:departments(name),
          position:positions(title)
        ),
        template:kpi_templates(id, name, category, measurement_formula),
        assigner:employees!assigned_by(id, full_name)
      `)
      .eq('id', params.id)
      .single();

    if (error || !kpi) return NextResponse.json({ error: 'KPI not found' }, { status: 404 });

    const { data: progressUpdates } = await supabase
      .from('kpi_progress_updates')
      .select(`*, updater:employees!updated_by(id, full_name)`)
      .eq('employee_kpi_id', params.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ data: { ...kpi, progress_updates: progressUpdates || [] } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const body = await request.json();

    if (body.actual_value !== undefined && body.target !== undefined && body.target > 0) {
      body.achievement_percentage = Math.min(((body.actual_value / body.target) * 100), 999.99);
    }

    const { data, error } = await supabase
      .from('employee_kpis')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
