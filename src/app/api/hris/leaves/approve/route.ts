import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for approval
const approvalSchema = z.object({
  leave_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  rejection_reason: z.string().optional(),
});

/**
 * POST /api/hris/leaves/approve
 * Approve or reject leave request (Manager only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request
    const validated = approvalSchema.parse(body);

    // Check if user is manager or HRD
    const isManager = await checkIsManager(supabase, user.id);
    if (!isManager) {
      return NextResponse.json(
        { error: 'Forbidden: Only managers can approve leave requests' },
        { status: 403 }
      );
    }

    // Get leave request
    const { data: leave, error: fetchError } = await supabase
      .from('leaves')
      .select(`
        *,
        employee:employees(
          id,
          full_name,
          email,
          department:departments(id, name),
          job_title:positions(id, title)
        )
      `)
      .eq('id', validated.leave_id)
      .single();

    if (fetchError || !leave) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (leave.status !== 'pending') {
      return NextResponse.json(
        { error: `Leave request already ${leave.status}`, current_status: leave.status },
        { status: 400 }
      );
    }

    // Validate rejection requires reason
    if (validated.action === 'reject' && !validated.rejection_reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Update leave status
    const updateData: any = {
      status: validated.action === 'approve' ? 'approved' : 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    if (validated.action === 'reject') {
      updateData.rejection_reason = validated.rejection_reason;
    }

    const { data, error } = await supabase
      .from('leaves')
      .update(updateData)
      .eq('id', validated.leave_id)
      .select(`
        *,
        employee:employees(
          id,
          full_name,
          email,
          department:departments(name)
        ),
        approver:employees!leaves_approved_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error updating leave status:', error);
      return NextResponse.json(
        { error: 'Failed to process leave request', details: error.message },
        { status: 500 }
      );
    }

    // If approved and it's annual leave, update leave balance
    if (validated.action === 'approve' && leave.leave_type === 'annual') {
      await updateLeaveBalance(supabase, leave.employee_id, leave.total_days, new Date(leave.start_date).getFullYear());
    }

    // TODO: Send notification to employee (WhatsApp/Email)
    // - Approved: "Your leave request has been approved"
    // - Rejected: "Your leave request has been rejected. Reason: ..."

    return NextResponse.json({
      message: `Leave request ${validated.action}d successfully`,
      action: validated.action,
      data,
    });
  } catch (error) {
    console.error('Error in leave approval:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to update leave balance
async function updateLeaveBalance(
  supabase: any,
  employeeId: string,
  daysUsed: number,
  year: number
) {
  // Try to get existing balance
  const { data: balance } = await supabase
    .from('leave_balances')
    .select('id, annual_leave_used')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .single();

  if (balance) {
    // Update existing balance
    await supabase
      .from('leave_balances')
      .update({
        annual_leave_used: (balance.annual_leave_used || 0) + daysUsed,
      })
      .eq('id', balance.id);
  } else {
    // Create new balance record (shouldn't happen normally, but just in case)
    await supabase
      .from('leave_balances')
      .insert({
        employee_id: employeeId,
        year: year,
        annual_leave_total: 12,
        annual_leave_used: daysUsed,
      });
  }
}

// Helper functions
async function checkIsManager(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  return data?.role === 'hiring_manager' || data?.role === 'hrd' || false;
}
