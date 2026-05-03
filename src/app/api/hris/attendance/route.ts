import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const clockInSchema = z.object({
  employee_id: z.string().uuid(),
  date: z.string().optional(), // defaults to today
  clock_in_location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional(),
    address: z.string().optional(),
    ip_address: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

const clockOutSchema = z.object({
  attendance_id: z.string().uuid(),
  clock_out_location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional(),
    address: z.string().optional(),
    ip_address: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/hris/attendance
 * List attendance records with filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employee_id');
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    let query = supabase
      .from('attendance')
      .select(`
        *,
        employee:employees(
          id,
          full_name,
          nip,
          photo_url,
          department:departments(name),
          job_title:positions(title)
        )
      `, { count: 'exact' });

    // Apply filters
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    if (date) {
      query = query.eq('date', date);
    }
    
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('date', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching attendance:', error);
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: error.message },
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
    console.error('Error in attendance GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hris/attendance
 * Clock-in or Clock-out
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

    // Determine action: clock-in or clock-out
    const { action, employee_id, date, clock_in_location, clock_out_location, notes } = body;

    if (action === 'clock-in') {
      // Validate clock-in data
      const validated = clockInSchema.parse(body);
      
      // Get current user's employee ID if not provided
      const empId = employee_id || await getCurrentEmployeeId(supabase, user.id);
      if (!empId) {
        return NextResponse.json(
          { error: 'Employee not found for this user' },
          { status: 404 }
        );
      }

      // Check if already clocked in today
      const today = date || new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', empId)
        .eq('date', today)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'Already clocked in today', attendance_id: existing.id },
          { status: 400 }
        );
      }

      // Create attendance record
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          employee_id: empId,
          date: today,
          clock_in: new Date().toISOString(),
          clock_in_location: validated.clock_in_location || null,
          notes: validated.notes || null,
          status: 'present',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating attendance:', error);
        return NextResponse.json(
          { error: 'Failed to clock in', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Clock-in successful',
        data,
      });
    }

    if (action === 'clock-out') {
      // Validate clock-out data
      const validated = clockOutSchema.parse(body);

      // Get attendance record
      const { data: attendance, error: fetchError } = await supabase
        .from('attendance')
        .select('*')
        .eq('id', validated.attendance_id)
        .single();

      if (fetchError || !attendance) {
        return NextResponse.json(
          { error: 'Attendance record not found' },
          { status: 404 }
        );
      }

      // Update clock-out
      const { data, error } = await supabase
        .from('attendance')
        .update({
          clock_out: new Date().toISOString(),
          clock_out_location: validated.clock_out_location || null,
          notes: validated.notes ? `${attendance.notes || ''}\n${validated.notes}`.trim() : attendance.notes,
          // work_hours will be auto-calculated by trigger
        })
        .eq('id', validated.attendance_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating attendance:', error);
        return NextResponse.json(
          { error: 'Failed to clock out', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Clock-out successful',
        data,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "clock-in" or "clock-out"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in attendance POST:', error);
    
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

// Helper function to get employee ID from user ID
async function getCurrentEmployeeId(supabase: any, userId: string) {
  const { data } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .single();
  
  return data?.id || null;
}
