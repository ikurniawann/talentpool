// ============================================================
// API Route: Payroll Run by ID
// GET: Get payroll run detail with details
// PUT: Update payroll run (process/approve/pay)
// DELETE: Delete payroll run
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerPgClient } from "@/lib/pg/create-client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================
// GET /api/hris/payroll/[id]
// ============================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const db = await createServerPgClient();
    const { id } = await params;

    const { data, error } = await db
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
        ),
        payroll_details:payroll_details (
          id,
          employee_id,
          net_salary,
          gross_salary,
          total_deductions,
          pph21_deduction,
          status,
          employee:employees (
            id,
            full_name,
            nip,
            department_id,
            department:departments (
              name
            )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Payroll run tidak ditemukan' },
          { status: 404 }
        );
      }
      console.error('Error fetching payroll run:', error);
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
// PUT /api/hris/payroll/[id]
// Update payroll run status (process, approve, pay)
// ============================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const db = await createServerPgClient();
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    // Get current user
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get employee record for current user
    const { data: currentUser } = await db
      .from('employees')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    // Build update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Set status timestamps based on status change
    if (status) {
      updateData.status = status;
      
      if (status === 'processing' && !updateData.processed_at) {
        updateData.processed_by = currentUser?.id;
        updateData.processed_at = new Date().toISOString();
      } else if (status === 'completed' && !updateData.approved_at) {
        updateData.approved_by = currentUser?.id;
        updateData.approved_at = new Date().toISOString();
      } else if (status === 'paid' && !updateData.paid_at) {
        updateData.paid_at = new Date().toISOString();
      }
    }

    const { data, error } = await db
      .from('payroll_runs')
      .update(updateData)
      .eq('id', id)
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
      .single();

    if (error) {
      console.error('Error updating payroll run:', error);
      return NextResponse.json(
        { error: 'Gagal update payroll run', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Payroll run berhasil diupdate'
    });

  } catch (error) {
    console.error('Error in payroll API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/hris/payroll/[id]
// Delete payroll run
// ============================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const db = await createServerPgClient();
    const { id } = await params;

    // Check if payroll run exists
    const { data: existing } = await db
      .from('payroll_runs')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Payroll run tidak ditemukan' },
        { status: 404 }
      );
    }

    // First, delete all payroll details (to avoid FK constraint issues)
    await db
      .from('payroll_details')
      .delete()
      .eq('payroll_run_id', id);

    // Then delete the payroll run
    const { error } = await db
      .from('payroll_runs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting payroll run:', error);
      return NextResponse.json(
        { error: 'Gagal menghapus payroll run', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Payroll run berhasil dihapus'
    });

  } catch (error) {
    console.error('Error in payroll DELETE API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
