import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/pos/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'today';

    // Calculate date range based on period
    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      const dayOfWeek = startDate.getDay();
      const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }

    const endDate = new Date();

    // Get revenue stats
    const { data: revenueData } = await supabase
      .from('pos_orders')
      .select('total_amount')
      .eq('status', 'completed')
      .gte('ordered_at', startDate.toISOString())
      .lte('ordered_at', endDate.toISOString());

    const todayRevenue = revenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

    // Get order count
    const { count: todayOrders } = await supabase
      .from('pos_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('ordered_at', startDate.toISOString())
      .lte('ordered_at', endDate.toISOString());

    // Get average order value
    const averageOrderValue = todayOrders && todayOrders > 0 ? todayRevenue / todayOrders : 0;

    // Get active cashiers (cashiers with orders today)
    const { data: cashierData } = await supabase
      .from('pos_orders')
      .select('cashier_id')
      .gte('ordered_at', startDate.toISOString())
      .lte('ordered_at', endDate.toISOString());

    const activeCashiers = cashierData ? new Set(cashierData.map(o => o.cashier_id)).size : 0;

    // Get top products
    const { data: topProducts } = await supabase
      .from('pos_order_items')
      .select(`
        product_id,
        product_name,
        quantity,
        total_amount
      `)
      .order('quantity', { ascending: false })
      .limit(5);

    // Get low stock products (if inventory tracking enabled)
    const { data: lowStock } = await supabase
      .from('pos_products')
      .select('id, name, base_price')
      .eq('is_active', true)
      .eq('inventory_tracking', true)
      .lte('base_price', 0); // Placeholder - need actual stock check

    // Get recent orders
    const { data: recentOrders } = await supabase
      .from('pos_orders')
      .select(`
        *,
        customer:pos_customers(name),
        cashier:hrd_employees(full_name)
      `)
      .order('ordered_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          todayRevenue,
          todayOrders: todayOrders || 0,
          averageOrderValue,
          activeCashiers,
          revenueChange: 12.5, // Would calculate from previous period
          ordersChange: 8.3
        },
        topProducts: topProducts || [],
        lowStock: lowStock || [],
        recentOrders: recentOrders || []
      }
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
