'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDashboardStats } from '@/lib/pos-api';

interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  averageOrderValue: number;
  activeCashiers: number;
  revenueChange: number;
  ordersChange: number;
}

interface TopProduct {
  id: string;
  name: string;
  sold: number;
  revenue: number;
}

interface LowStockItem {
  id: string;
  name: string;
  current: number;
  min: number;
  unit: string;
}

interface RecentOrder {
  id: string;
  cashier: string;
  total: number;
  status: string;
  payment_status?: string;
  time: string;
}

export default function POSDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const res = await getDashboardStats(selectedPeriod);
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Gagal memuat data dashboard');
        }
        if (cancelled) return;
        const d = res.data;
        setStats(d.stats || null);
        setTopProducts(d.topProducts || []);
        setLowStock(d.lowStock || []);
        setRecentOrders(d.recentOrders || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Gagal memuat data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [selectedPeriod]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatChange = (value: number) => {
    const abs = Math.abs(value || 0);
    const rounded = Math.round(abs * 10) / 10;
    return `${value >= 0 ? '+' : '-'}${rounded}%`;
  };

  const orderStatusLabel = (status: string, paymentStatus?: string) => {
    if (status === 'completed') return { label: 'Selesai', color: 'bg-green-100 text-green-700' };
    if (status === 'voided') return { label: 'Void', color: 'bg-red-100 text-red-700' };
    if (paymentStatus === 'paid') return { label: 'Dibayar', color: 'bg-blue-100 text-blue-700' };
    if (paymentStatus === 'partial') return { label: 'Partial', color: 'bg-purple-100 text-purple-700' };
    return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard POS</h1>
          <p className="text-sm text-gray-500">Overview penjualan dan operasional</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {(['today', 'week', 'month'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period === 'today' ? 'Hari Ini' : period === 'week' ? 'Minggu Ini' : 'Bulan Ini'}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat data dashboard...</span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-pink-600" />
                  </div>
                  {(stats?.revenueChange || 0) >= 0 ? (
                    <div className="flex items-center text-pink-600 text-sm font-medium">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      {formatChange(stats?.revenueChange || 0)}
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600 text-sm font-medium">
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                      {formatChange(stats?.revenueChange || 0)}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.todayRevenue || 0)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Pendapatan {selectedPeriod === 'today' ? 'Hari Ini' : selectedPeriod === 'week' ? 'Minggu Ini' : 'Bulan Ini'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                  {(stats?.ordersChange || 0) >= 0 ? (
                    <div className="flex items-center text-pink-600 text-sm font-medium">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      {formatChange(stats?.ordersChange || 0)}
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600 text-sm font-medium">
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                      {formatChange(stats?.ordersChange || 0)}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.todayOrders || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">Total Pesanan</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.averageOrderValue || 0)}
                </div>
                <div className="text-sm text-gray-500 mt-1">Rata-rata per Order</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.activeCashiers || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">Kasir Aktif</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Produk Terlaris</CardTitle>
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topProducts.length > 0 ? (
                    topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </div>
                          <span className="text-gray-700 font-medium text-sm truncate">{product.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-gray-900">{product.sold} terjual</div>
                          <div className="text-xs text-gray-500">{formatCurrency(product.revenue)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-gray-400">
                      Belum ada data penjualan
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alerts */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Stok Menipis</CardTitle>
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowStock.length > 0 ? (
                    lowStock.map((item) => {
                      const percentage = item.min > 0 ? (item.current / item.min) * 100 : 0;
                      return (
                        <div key={item.id} className="py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-700 font-medium">{item.name}</span>
                            <span className="text-sm text-gray-500">
                              {item.current} / {item.min} {item.unit}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                percentage < 50 ? 'bg-red-500' : percentage < 80 ? 'bg-orange-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-sm text-gray-400">
                      Semua stok aman
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Pesanan Terbaru</CardTitle>
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                      <th className="pb-3 font-medium">Order ID</th>
                      <th className="pb-3 font-medium">Kasir</th>
                      <th className="pb-3 font-medium">Total</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length > 0 ? (
                      recentOrders.map((order) => {
                        const statusInfo = orderStatusLabel(order.status, order.payment_status);
                        return (
                          <tr key={order.id} className="border-b border-gray-50 last:border-0">
                            <td className="py-3 text-sm font-medium text-gray-900">{order.id}</td>
                            <td className="py-3 text-sm text-gray-700">{order.cashier}</td>
                            <td className="py-3 text-sm font-semibold text-gray-900">
                              {formatCurrency(order.total)}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="py-3 text-sm text-gray-500">{order.time}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-sm text-gray-400">
                          Belum ada pesanan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
