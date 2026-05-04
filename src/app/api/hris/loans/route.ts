// ============================================================
// API Route: Employee Loans
// GET: List loans
// POST: Create loan request
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================
// GET /api/hris/loans
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('loans')
      .select(`
        *,
        employee:employees (
          id,
          full_name,
          nip,
          photo_url
        ),
        approved_by:employees!approved_by (
          id,
          full_name,
          nip
        )
      `)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching loans:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil data pinjaman' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Error in loans API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/hris/loans
// Create loan request
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      employee_id,
      loan_type,
      principal_amount,
      interest_rate,
      tenor_months,
      purpose,
      notes,
    } = body;

    // Validate required fields
    if (!employee_id || !loan_type || !principal_amount || !tenor_months) {
      return NextResponse.json(
        { error: 'Employee ID, jenis pinjaman, jumlah, dan tenor wajib diisi' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const { data: employee } = await supabase
      .from('employees')
      .select('id, is_active')
      .eq('id', employee_id)
      .single();

    if (!employee) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (!employee.is_active) {
      return NextResponse.json(
        { error: 'Karyawan sudah tidak aktif' },
        { status: 400 }
      );
    }

    // Calculate monthly installment
    const monthlyInstallment = interest_rate 
      ? principal_amount * (1 + interest_rate / 100 * tenor_months) / tenor_months
      : principal_amount / tenor_months;

    // Create loan request
    const { data, error } = await supabase
      .from('loans')
      .insert({
        employee_id,
        loan_type,
        principal_amount,
        interest_rate: interest_rate || 0,
        tenor_months,
        monthly_installment: Math.round(monthlyInstallment),
        remaining_balance: principal_amount,
        purpose,
        notes,
        status: 'pending',
      })
      .select(`
        *,
        employee:employees (
          id,
          full_name,
          nip
        )
      `)
      .single();

    if (error) {
      console.error('Error creating loan:', error);
      return NextResponse.json(
        { error: 'Gagal membuat pengajuan pinjaman', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Pengajuan pinjaman berhasil dibuat, menunggu approval'
    });

  } catch (error) {
    console.error('Error in loans API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
