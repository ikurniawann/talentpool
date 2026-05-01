import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';

// Initialize Supabase client (service role for admin access)
// GET /api/pos/products - List all active products
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query = supabase
      .from('pos_products')
      .select(`
        *,
        category:pos_categories(name),
        variants:pos_product_variants(*),
        modifiers:pos_product_modifiers(
          modifier_group:pos_modifier_groups(
            name,
            modifiers:pos_modifiers(*)
          )
        )
      `)
      .eq('is_active', true)
      .eq('is_available', true)
      .order('name');

    if (category) {
      query = query.eq('category_id', category);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/pos/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const {
      sku,
      name,
      description,
      category_id,
      base_price,
      cost_price,
      is_active = true,
      variants = [],
      modifierGroups = []
    } = body;

    // Validate required fields
    if (!sku || !name || !base_price) {
      return NextResponse.json(
        { success: false, error: 'SKU, name, and base_price are required' },
        { status: 400 }
      );
    }

    // Insert product
    const { data: product, error: productError } = await supabase
      .from('pos_products')
      .insert({
        sku,
        name,
        description,
        category_id,
        base_price,
        cost_price: cost_price || 0,
        is_active
      })
      .select()
      .single();

    if (productError) throw productError;

    // Insert variants if provided
    if (variants.length > 0) {
      const variantsData = variants.map((v: any) => ({
        product_id: product.id,
        name: v.name,
        group_name: v.group_name,
        price_adjustment: v.price_adjustment || 0,
        display_order: v.display_order || 0
      }));

      const { error: variantError } = await supabase
        .from('pos_product_variants')
        .insert(variantsData);

      if (variantError) throw variantError;
    }

    // Insert modifier groups and modifiers if provided
    for (const group of modifierGroups) {
      // Insert modifier group
      const { data: modifierGroup, error: groupError } = await supabase
        .from('pos_modifier_groups')
        .insert({
          name: group.name,
          min_selection: group.min_selection || 0,
          max_selection: group.max_selection || 1,
          display_order: group.display_order || 0
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Link product to modifier group
      const { error: linkError } = await supabase
        .from('pos_product_modifiers')
        .insert({
          product_id: product.id,
          modifier_group_id: modifierGroup.id
        });

      if (linkError) throw linkError;

      // Insert modifiers
      if (group.modifiers && group.modifiers.length > 0) {
        const modifiersData = group.modifiers.map((m: any) => ({
          group_id: modifierGroup.id,
          name: m.name,
          price_adjustment: m.price_adjustment || 0,
          display_order: m.display_order || 0
        }));

        const { error: modifierError } = await supabase
          .from('pos_modifiers')
          .insert(modifiersData);

        if (modifierError) throw modifierError;
      }
    }

    // Fetch complete product with relations
    const { data: completeProduct } = await supabase
      .from('pos_products')
      .select(`
        *,
        variants:pos_product_variants(*),
        modifiers:pos_product_modifiers(
          modifier_group:pos_modifier_groups(
            name,
            modifiers:pos_modifiers(*)
          )
        )
      `)
      .eq('id', product.id)
      .single();

    return NextResponse.json({ success: true, data: completeProduct });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
