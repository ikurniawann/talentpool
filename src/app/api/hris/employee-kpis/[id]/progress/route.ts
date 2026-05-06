import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/hris/employee-kpis/:id/progress
 * Get progress updates for a specific employee KPI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: employeeKpiId } = params;

    // Get progress updates with updater info
    const { data, error } = await supabase
      .from('kpi_progress_updates')
      .select(`
        *,
        updater:employees!updated_by(
          full_name
        )
      `)
      .eq('employee_kpi_id', employeeKpiId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching progress:', error);
      return NextResponse.json(
        { error: 'Failed to fetch progress updates', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/hris/employee-kpis/[id]/progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hris/employee-kpis/:id/progress
 * Add new progress update for employee KPI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: employeeKpiId } = params;
    const body = await request.json();
    const { actual_value, notes, evidence_url } = body;

    // Validate required fields
    if (!actual_value || actual_value < 0) {
      return NextResponse.json(
        { error: 'Actual value is required and must be positive' },
        { status: 400 }
      );
    }

    // Get current employee ID
    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Insert progress update
    const { data, error } = await supabase
      .from('kpi_progress_updates')
      .insert({
        employee_kpi_id: employeeKpiId,
        actual_value,
        notes: notes || null,
        evidence_url: evidence_url || null,
        updated_by: currentEmployee?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding progress:', error);
      return NextResponse.json(
        { error: 'Failed to add progress update', details: error.message },
        { status: 500 }
      );
    }

    // Update employee_kpis with latest actual_value and calculate achievement
    const { data: kpiData } = await supabase
      .from('employee_kpis')
      .select('target, unit')
      .eq('id', employeeKpiId)
      .single();

    if (kpiData && kpiData.target) {
      const achievement_percentage = (actual_value / kpiData.target) * 100;
      
      await supabase
        .from('employee_kpis')
        .update({
          actual_value,
          achievement_percentage: Math.min(achievement_percentage, 999.99), // Cap at 999.99%
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeKpiId);
    }

    return NextResponse.json({ data, message: 'Progress updated successfully' });
  } catch (error) {
    console.error('Error in POST /api/hris/employee-kpis/[id]/progress:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Internal server error', details: msg },
      { status: 500 }
    );
  }
}
