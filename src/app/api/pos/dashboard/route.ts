import { NextRequest, NextResponse } from 'next/server';
import { createPgClient } from "@/lib/pg/create-client";
import { getPosSession } from '@/lib/api/auth';

// GET /api/pos/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const db = createPgClient();
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
    const { data: revenueData } = await db
      .from('pos_orders')
      .select('total_amount')
      .eq('status', 'completed')
      .gte('ordered_at', startDate.toISOString())
      .lte('ordered_at', endDate.toISOString());

    const todayRevenue = revenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

    // Get order count
    const { count: todayOrders } = await db
      .from('pos_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('ordered_at', startDate.toISOString())
      .lte('ordered_at', endDate.toISOString());

    // Get average order value
    const averageOrderValue = todayOrders && todayOrders > 0 ? todayRevenue / todayOrders : 0;

    // Get active cashiers (cashiers with orders today)
    const { data: cashierData } = await db
      .from('pos_orders')
      .select('cashier_id')
      .gte('ordered_at', startDate.toISOString())
      .lte('ordered_at', endDate.toISOString());

    const activeCashiers = cashierData ? new Set(cashierData.map(o => o.cashier_id)).size : 0;

    // Get previous period dates for change calculation
    const periodDuration = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodDuration);
    const prevEnd = new Date(startDate.getTime() - 1);

    // Previous period revenue
    const { data: prevRevenueData } = await db
      .from('pos_orders')
      .select('total_amount')
      .eq('status', 'completed')
      .gte('ordered_at', prevStart.toISOString())
      .lte('ordered_at', prevEnd.toISOString());

    const prevRevenue = prevRevenueData?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
    const revenueChange = prevRevenue > 0 ? ((todayRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Previous period orders
    const { count: prevOrders } = await db
      .from('pos_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('ordered_at', prevStart.toISOString())
      .lte('ordered_at', prevEnd.toISOString());

    const prevOrdersCount = prevOrders || 0;
    const ordersChange = prevOrdersCount > 0 ? (((todayOrders || 0) - prevOrdersCount) / prevOrdersCount) * 100 : 0;

    // Get top products (aggregate by product_id)
    const { data: topProductsRaw } = await db
      .from('pos_order_items')
      .select('product_id, product_name, quantity, total_amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const productMap = new Map<string, { name: string; sold: number; revenue: number }>();
    topProductsRaw?.forEach((item: any) => {
      const pid = item.product_id;
      const existing = productMap.get(pid);
      if (existing) {
        existing.sold += item.quantity || 0;
        existing.revenue += Number(item.total_amount) || 0;
      } else {
        productMap.set(pid, {
          name: item.product_name || 'Unknown',
          sold: item.quantity || 0,
          revenue: Number(item.total_amount) || 0,
        });
      }
    });
    const topProducts = Array.from(productMap.entries())
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    // Get low stock products (using inventory_quantity if available, fallback to null stock)
    const { data: lowStockRaw } = await db
      .from('pos_products')
      .select('id, name, inventory_quantity, inventory_min_stock')
      .eq('is_active', true)
      .eq('is_available', true);

    const lowStock = (lowStockRaw || [])
      .filter((p: any) => Number(p.inventory_min_stock) > 0 && Number(p.inventory_quantity || 0) <= Number(p.inventory_min_stock))
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        current: Number(p.inventory_quantity || 0),
        min: Number(p.inventory_min_stock || 0),
        unit: 'unit',
      }))
      .slice(0, 3);

    // Get recent orders
    const { data: recentOrdersRaw } = await db
      .from('pos_orders')
      .select(`
        id,
        order_number,
        total_amount,
        status,
        payment_status,
        ordered_at,
        customer:pos_customers(name),
        cashier:hrd_employees(full_name)
      `)
      .order('ordered_at', { ascending: false })
      .limit(5);

    const recentOrders = (recentOrdersRaw || []).map((o: any) => ({
      id: o.order_number || o.id,
      orderId: o.id,
      cashier: o.cashier?.full_name || o.cashier_id?.slice(0, 8) || 'System',
      total: Number(o.total_amount) || 0,
      status: o.status || 'pending',
      payment_status: o.payment_status || 'unpaid',
      time: new Date(o.ordered_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          todayRevenue,
          todayOrders: todayOrders || 0,
          averageOrderValue: Math.round(averageOrderValue),
          activeCashiers,
          revenueChange: Math.round(revenueChange * 10) / 10,
          ordersChange: Math.round(ordersChange * 10) / 10,
        },
        topProducts,
        lowStock,
        recentOrders,
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
