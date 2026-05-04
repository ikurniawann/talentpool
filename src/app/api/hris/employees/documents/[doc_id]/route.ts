// ============================================================
// API Route: Employee Document by ID
// DELETE: Remove document record
// PATCH: Update document metadata
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ doc_id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { doc_id } = await params;

    const { error } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', doc_id);

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json({ error: 'Gagal menghapus dokumen' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Dokumen berhasil dihapus' });
  } catch (error) {
    console.error('Error in document DELETE:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { doc_id } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('employee_documents')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', doc_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return NextResponse.json({ error: 'Gagal mengupdate dokumen' }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Dokumen berhasil diupdate' });
  } catch (error) {
    console.error('Error in document PATCH:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
