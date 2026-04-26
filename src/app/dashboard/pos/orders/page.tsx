'use client';

import { useState } from 'react';
import { Clock, CheckCircle, XCircle, ChefHat, Truck, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const mockOrders = [
  { id: 'ORD-2024-001', cashier: 'Siti', type: 'dine_in', table: 'Meja 3', customer: 'Walk-in', items: 4, total: 125000, status: 'completed', time: '10:45' },
  { id: 'ORD-2024-002', cashier: 'Ahmad', type: 'takeaway', table: null, customer: 'Ahmad Wijaya', items: 2, total: 73000, status: 'completed', time: '10:42' },
  { id: 'ORD-2024-003', cashier: 'Siti', type: 'delivery', table: null, customer: 'Budi Santoso', items: 3, total: 95000, status: 'preparing', time: '10:40' },
  { id: 'ORD-2024-004', cashier: 'Budi', type: 'dine_in', table: 'Meja 1', customer: 'Walk-in', items: 6, total: 210000, status: 'pending', time: '10:38' },
  { id: 'ORD-2024-005', cashier: 'Ahmad', type: 'self_order', table: null, customer: 'Walk-in', items: 1, total: 18000, status: 'completed', time: '10:35' },
  { id: 'ORD-2024-006', cashier: 'Siti', type: 'dine_in', table: 'Meja 5', customer: 'Siti Rahayu', items: 4, total: 145000, status: 'ready', time: '10:32' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
    case 'preparing':
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"><ChefHat className="w-3 h-3" /> Preparing</span>;
    case 'ready':
      return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Ready</span>;
    case 'completed':
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>;
    case 'cancelled':
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelled</span>;
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
  }
};

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'dine_in':
      return <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">Dine-in</span>;
    case 'takeaway':
      return <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">Takeaway</span>;
    case 'delivery':
      return <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs flex items-center gap-1"><Truck className="w-3 h-3" /> Delivery</span>;
    case 'self_order':
      return <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">Self-order</span>;
    default:
      return <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs">{type}</span>;
  }
};

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || order.cashier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: mockOrders.length,
    pending: mockOrders.filter(o => o.status === 'pending').length,
    preparing: mockOrders.filter(o => o.status === 'preparing').length,
    ready: mockOrders.filter(o => o.status === 'ready').length,
    completed: mockOrders.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pesanan</h1>
          <p className="text-sm text-gray-500">Kelola danlacak pesanan</p>
        </div>
      </div>

      {/* Status Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'preparing', 'ready', 'completed'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? `Semua (${statusCounts.all})` : 
                 status === 'pending' ? `Pending (${statusCounts.pending})` :
                 status === 'preparing' ? `Preparing (${statusCounts.preparing})` :
                 status === 'ready' ? `Ready (${statusCounts.ready})` :
                 `Completed (${statusCounts.completed})`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Cari pesanan atau kasir..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="p-4 font-medium">Order ID</th>
                  <th className="p-4 font-medium">Tipe</th>
                  <th className="p-4 font-medium">Meja</th>
                  <th className="p-4 font-medium">Pelanggan</th>
                  <th className="p-4 font-medium">Kasir</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Total</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="p-4">
                      <span className="font-medium text-gray-900 text-sm">{order.id}</span>
                    </td>
                    <td className="p-4">
                      {getTypeBadge(order.type)}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-700">{order.table || '-'}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-700">{order.customer}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-700">{order.cashier}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-700">{order.items} item</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-gray-900">{formatCurrency(order.total)}</span>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-500">{order.time}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Tidak ada pesanan ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
