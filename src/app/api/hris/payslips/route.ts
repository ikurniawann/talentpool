// ============================================================
// API Route: Payslips
// GET: List payslips (payroll details)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerPgClient } from "@/lib/pg/create-client";
import { ApiError, requireApiRole } from '@/lib/api/auth';

// Payslips are sensitive financial PII — restrict listing to HR/finance.
const PAYSLIP_VIEW_ROLES = ['super_admin', 'hrd', 'finance_staff'] as const;

// ============================================================
// GET /api/hris/payslips
// ============================================================

export async function GET(request: NextRequest) {
  try {
    await requireApiRole([...PAYSLIP_VIEW_ROLES]);
    const db = await createServerPgClient();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const payrollRunId = searchParams.get('payroll_run_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let query = db
      .from('payroll_details')
      .select(`
        *,
        employee:employees (
          id,
          full_name,
          nip,
          photo_url,
          position:positions (
            title
          ),
          department:departments (
            name
          )
        ),
        payroll_run:payroll_runs (
          id,
          run_name,
          period_month,
          period_year,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (payrollRunId) {
      query = query.eq('payroll_run_id', payrollRunId);
    }

    if (year) {
      query = query.eq('period_year', parseInt(year));
    }

    if (month) {
      query = query.eq('period_month', parseInt(month));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payslips:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil data payslip' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error('Error in payslips API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
