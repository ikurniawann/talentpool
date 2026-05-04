// ============================================================
// API Route: Approve/Reject Loan
// POST: Approve or reject loan request
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================
// POST /api/hris/loans/[id]/approve
// ============================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();
    const { approved, rejection_reason } = body;

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

    // Get loan
    const { data: loan } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .single();

    if (!loan) {
      return NextResponse.json(
        { error: 'Pinjaman tidak ditemukan' },
        { status: 404 }
      );
    }

    if (loan.status !== 'pending') {
      return NextResponse.json(
        { error: 'Pinjaman sudah diproses' },
        { status: 400 }
      );
    }

    // Update loan based on approval decision
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (approved) {
      updateData.status = 'approved';
      updateData.approved_by = currentUser?.id;
      updateData.approved_at = new Date().toISOString();
      
      // Calculate first installment (next month)
      const now = new Date();
      updateData.first_installment_month = now.getMonth() + 1;
      updateData.first_installment_year = now.getFullYear();
    } else {
      updateData.status = 'rejected';
      updateData.rejected_by = currentUser?.id;
      updateData.rejected_at = new Date().toISOString();
      updateData.rejection_reason = rejection_reason || 'Tidak disetujui';
    }

    const { data, error } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees (
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
      console.error('Error updating loan:', error);
      return NextResponse.json(
        { error: 'Gagal update pinjaman', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: approved ? 'Pinjaman disetujui' : 'Pinjaman ditolak'
    });

  } catch (error) {
    console.error('Error in loan approval API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
