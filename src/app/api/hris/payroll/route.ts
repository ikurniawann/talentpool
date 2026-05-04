// ============================================================
// API Route: Payroll Runs
// GET: List payroll runs
// POST: Create new payroll run
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================
// GET /api/hris/payroll
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    let query = supabase
      .from('payroll_runs')
      .select(`
        *,
        processed_by:employees!processed_by (
          id,
          full_name,
          nip
        ),
        approved_by:employees!approved_by (
          id,
          full_name,
          nip
        )
      `)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (year) {
      query = query.eq('period_year', parseInt(year));
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payroll runs:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil data payroll' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Error in payroll API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/hris/payroll
// Create new payroll run
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { period_month, period_year, run_name } = body;

    // Validate required fields
    if (!period_month || !period_year) {
      return NextResponse.json(
        { error: 'Bulan dan tahun periode wajib diisi' },
        { status: 400 }
      );
    }

    // Check if period already exists
    const { data: existing } = await supabase
      .from('payroll_runs')
      .select('id')
      .eq('period_month', period_month)
      .eq('period_year', period_year)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Payroll untuk periode ini sudah ada' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get employee record for current user
    const { data: currentUser } = await supabase
      .from('employees')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    // Create payroll run
    const { data, error } = await supabase
      .from('payroll_runs')
      .insert({
        run_name: run_name || `Payroll ${getMonthName(period_month)} ${period_year}`,
        period_month,
        period_year,
        status: 'draft',
        processed_by: currentUser?.id,
      })
      .select(`
        *,
        processed_by:employees!processed_by (
          id,
          full_name,
          nip
        )
      `)
      .single();

    if (error) {
      console.error('Error creating payroll run:', error);
      return NextResponse.json(
        { error: 'Gagal membuat payroll run', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Payroll run berhasil dibuat'
    });

  } catch (error) {
    console.error('Error in payroll API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

function getMonthName(month: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month - 1] || '';
}
