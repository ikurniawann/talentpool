import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const isActive = searchParams.get('is_active');
    const search = searchParams.get('search');
    const mappingType = searchParams.get('mapping_type');
    const mappingId = searchParams.get('mapping_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('kpi_templates')
      .select('*', { count: 'exact' });

    if (category) query = query.eq('category', category);
    if (isActive !== null && isActive !== '') query = query.eq('is_active', isActive === 'true');
    if (search) query = query.ilike('name', `%${search}%`);

    if (mappingType && mappingId) {
      const { data: mappings } = await supabase
        .from('kpi_template_mappings')
        .select('template_id')
        .eq('mapping_type', mappingType)
        .eq('mapping_id', mappingId);
      const ids = (mappings || []).map((m: any) => m.template_id);
      if (ids.length > 0) {
        query = query.in('id', ids);
      } else {
        return NextResponse.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('category').order('name');

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data: data || [],
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const body = await request.json();
    const { mappings, ...templateData } = body;

    const { data: template, error } = await supabase
      .from('kpi_templates')
      .insert({ ...templateData, is_predefined: false })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (mappings && mappings.length > 0) {
      const mappingRows = mappings.map((m: any) => ({ template_id: template.id, mapping_type: m.mapping_type, mapping_id: m.mapping_id }));
      await supabase.from('kpi_template_mappings').insert(mappingRows);
    }

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
