import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for leave request
const leaveRequestSchema = z.object({
  employee_id: z.string().uuid().optional(),
  leave_type: z.enum(['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'emergency', 'pilgrimage', 'menstrual']),
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  attachment_url: z.string().url().optional(),
});

/**
 * GET /api/hris/leaves
 * List leave requests with filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    const leaveType = searchParams.get('leave_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    let query = supabase
      .from('leaves')
      .select(`
        *,
        employee:employees(
          id,
          full_name,
          nip,
          photo_url,
          department:departments(name),
          job_title:positions(title)
        ),
        approver:employees!leaves_approved_by_fkey(
          id,
          full_name,
          nip
        )
      `, { count: 'exact' });

    // Apply filters
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (leaveType) {
      query = query.eq('leave_type', leaveType);
    }
    
    if (startDate && endDate) {
      query = query.gte('start_date', startDate).lte('end_date', endDate);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching leaves:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leave requests', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in leaves GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hris/leaves
 * Create new leave request
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
    const validated = leaveRequestSchema.parse(body);

    // Get employee ID (from request or current user)
    const empId = validated.employee_id || await getCurrentEmployeeId(supabase, user.id);
    if (!empId) {
      return NextResponse.json(
        { error: 'Employee not found for this user' },
        { status: 404 }
      );
    }

    // Check if employee exists and is active
    const { data: employee } = await supabase
      .from('employees')
      .select('id, full_name, employment_status, is_active')
      .eq('id', empId)
      .single();

    if (!employee || !employee.is_active) {
      return NextResponse.json(
        { error: 'Employee not found or inactive' },
        { status: 404 }
      );
    }

    // Calculate total days (business days only)
    const totalDays = calculateBusinessDays(validated.start_date, validated.end_date);

    // For annual leave, check quota
    if (validated.leave_type === 'annual') {
      const { data: balance } = await supabase
        .from('leave_balances')
        .select('annual_leave_remaining')
        .eq('employee_id', empId)
        .eq('year', new Date(validated.start_date).getFullYear())
        .single();

      if (balance && balance.annual_leave_remaining < totalDays) {
        return NextResponse.json(
          { 
            error: 'Insufficient annual leave balance',
            remaining: balance.annual_leave_remaining,
            requested: totalDays,
          },
          { status: 400 }
        );
      }
    }

    // Create leave request
    const { data, error } = await supabase
      .from('leaves')
      .insert({
        employee_id: empId,
        leave_type: validated.leave_type,
        start_date: validated.start_date,
        end_date: validated.end_date,
        total_days: totalDays,
        reason: validated.reason,
        attachment_url: validated.attachment_url || null,
        status: 'pending',
      })
      .select(`
        *,
        employee:employees(
          id,
          full_name,
          nip,
          department:departments(name)
        )
      `)
      .single();

    if (error) {
      console.error('Error creating leave request:', error);
      return NextResponse.json(
        { error: 'Failed to create leave request', details: error.message },
        { status: 500 }
      );
    }

    // TODO: Send notification to manager (WhatsApp/Email)

    return NextResponse.json({
      message: 'Leave request submitted successfully',
      data,
    });
  } catch (error) {
    console.error('Error in leaves POST:', error);
    
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

// Helper function to calculate business days (exclude weekends)
function calculateBusinessDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
      days++;
    }
  }
  
  return Math.max(1, days);
}

// Helper function to get employee ID from user ID
async function getCurrentEmployeeId(supabase: any, userId: string) {
  const { data } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .single();
  
  return data?.id || null;
}
