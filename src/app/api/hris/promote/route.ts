// ============================================================
// API Route: Promote Candidate to Employee
// POST: Promote kandidat dari Talent Pool menjadi Employee
// Menggunakan function: promote_candidate_to_employee()
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerPgClient } from "@/lib/pg/create-client";
import { Employee, PromotionRequest, ApiResponse } from '@/types/hris';

// ============================================================
// POST /api/hris/promote
// Body: { candidate_id, join_date?, employment_status?, department_id?, reporting_to? }
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const db = await createServerPgClient();
    const body: PromotionRequest = await request.json();

    // Validate required fields
    if (!body.candidate_id) {
      return NextResponse.json(
        { error: 'candidate_id wajib diisi' },
        { status: 400 }
      );
    }

    // Get candidate data first to verify status
    const { data: candidate, error: candidateError } = await db
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

    // Try to use database function first
    let employeeId: string | null = null;
    
    try {
      const { data, error: rpcError } = await db.rpc('promote_candidate_to_employee', {
        p_candidate_id: body.candidate_id,
        p_join_date: body.join_date || new Date().toISOString().split('T')[0],
        p_employment_status: body.employment_status || 'probation',
        p_department_id: body.department_id || null,
        p_reporting_to: body.reporting_to || null
      });

      if (!rpcError && data) {
        employeeId = data as string;
      }
    } catch (rpcFallbackError) {
      console.log('RPC function not available, using manual fallback');
    }

    // Fallback: Manual promote if function failed or not available
    if (!employeeId) {
      console.log('Using manual promote fallback...');
      
      // Generate NIP
      const year = new Date().getFullYear();
      let nip = '';
      let exists = true;
      let seq = 1;
      
      while (exists && seq < 99999) {
        nip = `EMP-${year}-${String(seq).padStart(5, '0')}`;
        const { data: existing } = await db
          .from('employees')
          .select('id')
          .eq('nip', nip)
          .single();
        exists = !!existing;
        seq++;
      }
      
      // Insert employee manually
      const { data: newEmployee, error: insertError } = await db
        .from('employees')
        .insert({
          nip,
          full_name: candidate.full_name,
          email: candidate.email,
          phone: candidate.phone || '',
          join_date: body.join_date || new Date().toISOString().split('T')[0],
          employment_status: body.employment_status || 'probation',
          department_id: body.department_id || null,
          job_title_id: candidate.position?.id || null,
          reporting_to: body.reporting_to || null,
          is_active: true,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Manual insert error:', insertError);
        return NextResponse.json(
          { error: 'Gagal membuat karyawan', details: insertError.message },
          { status: 500 }
        );
      }
      
      employeeId = newEmployee?.id || null;
      
      // Update candidate
      if (employeeId) {
        await db
          .from('candidates')
          .update({ promoted_to_employee_id: employeeId })
          .eq('id', candidate.id);
      }
    }
    const { data: employee, error: employeeError } = await db
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
