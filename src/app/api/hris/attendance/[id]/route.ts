import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/hris/attendance/:id
 * Get attendance detail by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        employee:employees!inner(
          id,
          full_name,
          nip,
          photo_url,
          email,
          department_id,
          job_title_id
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Attendance not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching attendance detail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hris/attendance/:id
 * Update attendance (validate, edit notes, etc.)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is HRD or manager
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isHRD = userData?.role === 'hrd';
    const isManager = userData?.role === 'hiring_manager' || isHRD;

    if (!isHRD && !isManager) {
      return NextResponse.json(
        { error: 'Forbidden: Only HRD or managers can update attendance' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: any = {};
    
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    
    if (body.validation_notes !== undefined) {
      updateData.validation_notes = body.validation_notes;
    }
    
    if (body.validated === true) {
      updateData.validated_by = user.id;
      updateData.validated_at = new Date().toISOString();
    }

    // Update attendance
    const { data, error } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating attendance:', error);
      return NextResponse.json(
        { error: 'Failed to update attendance', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Attendance updated successfully',
      data,
    });
  } catch (error) {
    console.error('Error in attendance PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/hris/attendance/:id
 * Delete attendance record (HRD only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is HRD
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'hrd') {
      return NextResponse.json(
        { error: 'Forbidden: Only HRD can delete attendance records' },
        { status: 403 }
      );
    }

    // Delete attendance
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting attendance:', error);
      return NextResponse.json(
        { error: 'Failed to delete attendance', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Attendance deleted successfully',
    });
  } catch (error) {
    console.error('Error in attendance DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
