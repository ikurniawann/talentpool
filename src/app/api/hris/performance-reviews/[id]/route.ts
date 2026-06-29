import { NextRequest, NextResponse } from 'next/server';
import { createPgClient } from "@/lib/pg/create-client";
import { createServerPgClient } from "@/lib/pg/create-client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = createPgClient();
    const { id } = await params;
    const { data, error } = await db
      .from('performance_reviews')
      .select(`
        *,
        employee:employees!employee_id(id, full_name, nip, department:departments(name), position:positions(name)),
        reviewer:employees!reviewer_id(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authClient = await createServerPgClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createPgClient();
    const body = await request.json();

    const { data, error } = await db
      .from('performance_reviews')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
