import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();
    const { data: template, error } = await supabase
      .from('kpi_templates')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const { data: mappings } = await supabase
      .from('kpi_template_mappings')
      .select('*')
      .eq('template_id', params.id);

    return NextResponse.json({ data: { ...template, mappings: mappings || [] } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const body = await request.json();
    const { mappings, ...templateData } = body;

    const { data: template, error } = await supabase
      .from('kpi_templates')
      .update({ ...templateData, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (mappings !== undefined) {
      await supabase.from('kpi_template_mappings').delete().eq('template_id', params.id);
      if (mappings.length > 0) {
        const mappingRows = mappings.map((m: any) => ({ template_id: params.id, mapping_type: m.mapping_type, mapping_id: m.mapping_id }));
        await supabase.from('kpi_template_mappings').insert(mappingRows);
      }
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('kpi_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: 'Template deactivated' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
