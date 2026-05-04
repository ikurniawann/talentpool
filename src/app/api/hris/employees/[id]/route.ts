// ============================================================
// API Route: Employee by ID
// GET: Get employee detail
// PUT: Update employee
// DELETE: Soft delete employee
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Employee, EmployeeUpdateData, ApiResponse } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================
// GET /api/hris/employees/[id]
// ============================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        department:departments (
          id,
          name,
          code,
          description
        ),
        section:sections (
          id,
          name,
          code,
          color
        ),
        job_title:positions (
          id,
          title,
          department,
          level
        ),
        manager:employees!reporting_to (
          id,
          full_name,
          nip
        ),
        direct_reports:employees!reporting_to (
          id,
          full_name,
          nip
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Karyawan tidak ditemukan' },
          { status: 404 }
        );
      }
      console.error('Error fetching employee:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil data karyawan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data as Employee
    } as ApiResponse<Employee>);

  } catch (error) {
    console.error('Error in employee API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/hris/employees/[id]
// ============================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body: EmployeeUpdateData = await request.json();

    // Check if employee exists
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if email already exists (excluding current employee)
    if (body.email) {
      const { data: existingEmail } = await supabase
        .from('employees')
        .select('id')
        .eq('email', body.email)
        .neq('id', id)
        .single();

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email sudah digunakan' },
          { status: 400 }
        );
      }
    }

    // Check if NIP already exists (excluding current employee)
    if (body.nip) {
      const { data: existingNip } = await supabase
        .from('employees')
        .select('id')
        .eq('nip', body.nip)
        .neq('id', id)
        .single();

      if (existingNip) {
        return NextResponse.json(
          { error: 'NIP sudah digunakan' },
          { status: 400 }
        );
      }
    }

    // Update employee — keep phone as '' if null to satisfy NOT NULL constraint
    const updateData: EmployeeUpdateData = {
      ...body,
      phone: body.phone || '',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select('*, department:departments(id, name, code), section:sections(id, name), job_title:positions(id, title), manager:employees!reporting_to(id, full_name, nip)')
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      return NextResponse.json(
        { error: 'Gagal update data karyawan', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data as Employee,
      message: 'Data karyawan berhasil diupdate'
    } as ApiResponse<Employee>);

  } catch (error) {
    console.error('Error in employee API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/hris/employees/[id]
// Soft delete: set is_active = false
// ============================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check if employee exists
    const { data: existing } = await supabase
      .from('employees')
      .select('id, is_active')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Soft delete: set is_active = false
    const { data, error } = await supabase
      .from('employees')
      .update({ 
        is_active: false,
        end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, full_name, nip, is_active')
      .single();

    if (error) {
      console.error('Error deleting employee:', error);
      return NextResponse.json(
        { error: 'Gagal menghapus data karyawan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data as Employee,
      message: 'Karyawan berhasil dihapus (non-aktif)'
    } as ApiResponse<Employee>);

  } catch (error) {
    console.error('Error in employee API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
