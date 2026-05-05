import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const supabase = createAdminClient();
  const { id } = await params;
  const body = await request.json();
  const { title, department, level, is_active } = body;

  if (!title) {
    return NextResponse.json({ error: 'Nama jabatan wajib diisi' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('positions')
    .update({ title, department: department || 'Operations', level: level || 'Staff', is_active })
    .eq('id', id)
    .select('id, title, department, level, is_active, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, message: 'Jabatan berhasil diupdate' });
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const supabase = createAdminClient();
  const { id } = await params;

  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('job_title_id', id);

  if (count && count > 0) {
    return NextResponse.json({ error: `Tidak dapat dihapus, masih ada ${count} karyawan dengan jabatan ini` }, { status: 400 });
  }

  const { error } = await supabase.from('positions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Jabatan berhasil dihapus' });
}
