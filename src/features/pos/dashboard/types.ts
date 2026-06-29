export type DashboardPeriod = "today" | "week" | "month";

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  averageOrderValue: number;
  activeCashiers: number;
  revenueChange: number;
  ordersChange: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sold: number;
  revenue: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  current: number;
  min: number;
  unit: string;
}

export interface RecentOrder {
  id: string;
  cashier: string;
  total: number;
  status: string;
  payment_status?: string;
  time: string;
}

export interface DashboardBundle {
  stats: DashboardStats | null;
  topProducts: TopProduct[];
  lowStock: LowStockItem[];
  recentOrders: RecentOrder[];
}
