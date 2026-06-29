import { NextRequest, NextResponse } from 'next/server';
import { createPgClient } from "@/lib/pg/create-client";
import { createServerPgClient } from "@/lib/pg/create-client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = createPgClient();
    const { id } = await params;
    const { data: kpi, error } = await db
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
      .eq('id', id)
      .single();

    if (error || !kpi) return NextResponse.json({ error: 'KPI not found' }, { status: 404 });

    const { data: progressUpdates } = await db
      .from('kpi_progress_updates')
      .select(`*, updater:employees!updated_by(id, full_name)`)
      .eq('employee_kpi_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ data: { ...kpi, progress_updates: progressUpdates || [] } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authClient = await createServerPgClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createPgClient();
    const body = await request.json();

    if (body.actual_value !== undefined && body.target !== undefined && body.target > 0) {
      body.achievement_percentage = Math.min(((body.actual_value / body.target) * 100), 999.99);
    }

    const { data, error } = await db
      .from('employee_kpis')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
