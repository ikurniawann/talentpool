'use client';

import { useState } from 'react';
import { TrendingUp, Package, ShoppingCart, DollarSign, Users, Clock, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const mockStats = {
  todayRevenue: 2450000,
  todayOrders: 47,
  averageOrderValue: 52127,
  activeCashiers: 3,
  revenueChange: 12.5,
  ordersChange: 8.3,
};

const mockTopProducts = [
  { id: 1, name: 'Nasi Goreng Special', sold: 23, revenue: 1150000 },
  { id: 2, name: 'Ayam Bakar Madu', sold: 18, revenue: 900000 },
  { id: 3, name: 'Es Teh Manis', sold: 35, revenue: 175000 },
  { id: 4, name: 'Kopi Susu Gula Aren', sold: 28, revenue: 420000 },
  { id: 5, name: 'Mie Goreng Jawa', sold: 15, revenue: 675000 },
];

const mockLowStock = [
  { id: 1, name: 'Daging Ayam', current: 2.5, unit: 'kg', min: 5 },
  { id: 2, name: 'Susu UHT', current: 3, unit: 'liter', min: 10 },
  { id: 3, name: 'Telur', current: 15, unit: 'butir', min: 30 },
];

const mockRecentOrders = [
  { id: 'ORD-001', cashier: 'Siti', total: 75000, status: 'completed', time: '10:45' },
  { id: 'ORD-002', cashier: 'Ahmad', total: 120000, status: 'completed', time: '10:42' },
  { id: 'ORD-003', cashier: 'Siti', total: 45000, status: 'pending', time: '10:40' },
  { id: 'ORD-004', cashier: 'Budi', total: 95000, status: 'completed', time: '10:38' },
];

export default function POSBackupDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard POS</h1>
          <p className="text-sm text-gray-500">Overview penjualan dan operasional (UI Preview)</p>
        </div>
        <div className="flex gap-2">
          {['today', 'week', 'month'].map((period) => (
            <button
              key={period}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-pink-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedPeriod(period)}
            >
              {period === 'today' ? 'Hari Ini' : period === 'week' ? 'Minggu Ini' : 'Bulan Ini'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-pink-600" />
            </div>
            <div className="flex items-center text-pink-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +{mockStats.revenueChange}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(mockStats.todayRevenue)}</div>
          <div className="text-sm text-gray-500 mt-1">Pendapatan Hari Ini</div>
        </div>

        {/* Orders */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center text-pink-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +{mockStats.ordersChange}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{mockStats.todayOrders}</div>
          <div className="text-sm text-gray-500 mt-1">Total Pesanan</div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(mockStats.averageOrderValue)}</div>
          <div className="text-sm text-gray-500 mt-1">Rata-rata per Order</div>
        </div>

        {/* Active Cashiers */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{mockStats.activeCashiers}</div>
          <div className="text-sm text-gray-500 mt-1">Kasir Aktif</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Produk Terlaris</h2>
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {mockTopProducts.map((product, index) => (
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
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Stok Menipis</h2>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-3">
            {mockLowStock.map((item) => {
              const percentage = (item.current / item.min) * 100;
              return (
                <div key={item.id} className="py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-medium">{item.name}</span>
                    <span className="text-sm text-gray-500">{item.current} / {item.min} {item.unit}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${percentage < 50 ? 'bg-red-500' : percentage < 80 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pesanan Terbaru</h2>
          <Clock className="w-5 h-5 text-gray-400" />
        </div>
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
              {mockRecentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 text-sm font-medium text-gray-900">{order.id}</td>
                  <td className="py-3 text-sm text-gray-700">{order.cashier}</td>
                  <td className="py-3 text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.status === 'completed' ? 'Selesai' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-500">{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
