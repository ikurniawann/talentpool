// ============================================================
// API Route: Promote Candidate to Employee
// POST: Promote kandidat dari Talent Pool menjadi Employee
// Menggunakan function: promote_candidate_to_employee()
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Employee, PromotionRequest, ApiResponse } from '@/types';

// ============================================================
// POST /api/hris/promote
// Body: { candidate_id, join_date?, employment_status?, department_id?, reporting_to? }
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: PromotionRequest = await request.json();

    // Validate required fields
    if (!body.candidate_id) {
      return NextResponse.json(
        { error: 'candidate_id wajib diisi' },
        { status: 400 }
      );
    }

    // Get candidate data first to verify status
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select(`
        *,
        position:positions (id, title, department),
        brand:brands (id, name)
      `)
      .eq('id', body.candidate_id)
      .single();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: 'Kandidat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if candidate already promoted
    if (candidate.promoted_to_employee_id) {
      return NextResponse.json(
        { error: 'Kandidat sudah dipromosikan menjadi employee' },
        { status: 400 }
      );
    }

    // Check candidate status
    if (!['hired', 'talent_pool'].includes(candidate.status)) {
      return NextResponse.json(
        { 
          error: `Status kandidat harus "hired" atau "talent_pool" untuk dipromosikan. Status saat ini: ${candidate.status}`,
          suggestion: 'Ubah status kandidat menjadi "hired" terlebih dahulu'
        },
        { status: 400 }
      );
    }

    // Call database function to promote candidate
    const { data, error } = await supabase.rpc('promote_candidate_to_employee', {
      p_candidate_id: body.candidate_id,
      p_join_date: body.join_date || new Date().toISOString().split('T')[0],
      p_employment_status: body.employment_status || 'probation',
      p_department_id: body.department_id || null,
      p_reporting_to: body.reporting_to || null
    });

    if (error) {
      console.error('Error promoting candidate:', error);
      
      // Handle specific error messages
      if (error.message?.includes('Candidate not found')) {
        return NextResponse.json(
          { error: 'Kandidat tidak ditemukan' },
          { status: 404 }
        );
      }
      
      if (error.message?.includes('status must be')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Gagal mempromosikan kandidat', details: error.message },
        { status: 500 }
      );
    }

    // Get the newly created employee data
    const employeeId = data as string;
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        department:departments (id, name, code),
        job_title:positions (id, title)
      `)
      .eq('id', employeeId)
      .single();

    if (employeeError) {
      console.error('Error fetching created employee:', employeeError);
    }

    return NextResponse.json({
      data: employee as Employee,
      employee_id: employeeId,
      nip: employee?.nip,
      message: `Berhasil mempromosikan ${candidate.full_name} menjadi karyawan`,
      candidate: {
        id: candidate.id,
        full_name: candidate.full_name,
        promoted_to_employee_id: employeeId
      }
    } as ApiResponse<Employee> & { employee_id: string; nip?: string; candidate?: any });

  } catch (error) {
    console.error('Error in promote API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
