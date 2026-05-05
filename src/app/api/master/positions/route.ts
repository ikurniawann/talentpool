import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('positions')
    .select('id, title, department, level, is_active, created_at')
    .order('title');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();
  const { title, department = 'Operations', level = 'Staff', is_active = true } = body;

  if (!title) {
    return NextResponse.json({ error: 'Nama jabatan wajib diisi' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('positions')
    .insert({ title, department: department || 'Operations', level: level || 'Staff', is_active })
    .select('id, title, department, level, is_active, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, message: 'Jabatan berhasil ditambahkan' }, { status: 201 });
}
