'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, ChefHat, Truck, Search, Filter, Eye, User, CreditCard, Coins, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getOrders } from '@/lib/pos-api';
import type { Order } from '@/lib/pos-api';

const formatCurrency = (value: number) => {
  // Ensure value is positive and format with Rp prefix
  const absValue = Math.abs(value);
  return 'Rp ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absValue);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    case 'preparing':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200"><ChefHat className="w-3 h-3 mr-1" /> Preparing</Badge>;
    case 'ready':
      return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200"><CheckCircle className="w-3 h-3 mr-1" /> Ready</Badge>;
    case 'completed':
      return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
    case 'cancelled':
      return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'dine_in':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Dine-in</Badge>;
    case 'takeaway':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Takeaway</Badge>;
    case 'delivery':
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><Truck className="w-3 h-3 mr-1" /> Delivery</Badge>;
    case 'self_order':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Self-order</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
};

const getPaymentBadge = (method: string) => {
  switch (method) {
    case 'cash':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CreditCard className="w-3 h-3 mr-1" /> Tunai</Badge>;
    case 'qris':
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">QRIS</Badge>;
    case 'credit_card':
    case 'credit':
      return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200"><CreditCard className="w-3 h-3 mr-1" /> Kartu</Badge>;
    case 'ark_coin':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Coins className="w-3 h-3 mr-1" /> ARK</Badge>;
    default:
      return <Badge variant="outline">{method}</Badge>;
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await getOrders({ limit: 100 });
      if (response.success) {
        setOrders(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.cashier_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Riwayat Transaksi</h1>
          <p className="text-sm text-gray-500">Lihat semua pesanan dan detail transaksi</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Pendapatan</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Semua</div>
            <div className="text-2xl font-bold">{statusCounts.all}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Preparing</div>
            <div className="text-2xl font-bold text-blue-600">{statusCounts.preparing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Ready</div>
            <div className="text-2xl font-bold text-purple-600">{statusCounts.ready}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari No. Order / Customer / Cashier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
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
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daftar Pesanan</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Tidak ada pesanan</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">No. Order</th>
                    <th className="pb-3 font-medium">Tanggal</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Items</th>
                    <th className="pb-3 font-medium">Payment</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-mono text-sm font-medium">{order.order_number}</td>
                      <td className="py-3 text-sm text-gray-600">{formatDate(order.ordered_at!)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{order.customer?.name || 'Walk-in'}</span>
                        </div>
                      </td>
                      <td className="py-3">{getTypeBadge(order.order_type!)}</td>
                      <td className="py-3 text-sm">{order.items?.length || 0} items</td>
                      <td className="py-3">{getPaymentBadge(order.payment_method!)}</td>
                      <td className="py-3 font-semibold text-gray-900">{formatCurrency(order.total_amount || 0)}</td>
                      <td className="py-3">{getStatusBadge(order.status!)}</td>
                      <td className="py-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <Eye className="w-4 h-4 mr-1" /> Detail
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Detail Pesanan</DialogTitle>
                            </DialogHeader>
                            {selectedOrder && <OrderDetail order={selectedOrder} />}
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrderDetail({ order }: { order: Order }) {
  // Debug: show raw values
  console.log('=== ORDER DEBUG ===');
  console.log('Order:', order);
  console.log('Subtotal:', order.subtotal);
  console.log('Discount:', order.discount_amount);
  console.log('Tax:', order.tax_amount);
  console.log('Total:', order.total_amount);
  console.log('ARK Used:', order.ark_coins_used);
  console.log('Payment Method:', order.payment_method);
  
  return (
    <div className="space-y-6">
      {/* Order Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <div className="text-sm text-gray-500">No. Order</div>
          <div className="font-mono font-semibold break-all">{order.order_number}</div>
        </div>
        <div className="md:col-span-1">
          <div className="text-sm text-gray-500">Tanggal</div>
          <div className="text-sm font-medium">{formatDate(order.ordered_at!)}</div>
        </div>
        <div className="md:col-span-1">
          <div className="text-sm text-gray-500">Status</div>
          <div>{getStatusBadge(order.status!)}</div>
        </div>
        <div className="md:col-span-1">
          <div className="text-sm text-gray-500">Payment</div>
          <div>{getPaymentBadge(order.payment_method!)}</div>
        </div>
      </div>

      {/* Customer Info */}
      {order.customer && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Nama:</span>
                <span className="ml-2 font-medium">{order.customer.name}</span>
              </div>
              {order.customer.phone && (
                <div>
                  <span className="text-gray-500">Telepon:</span>
                  <span className="ml-2 font-medium">{order.customer.phone}</span>
                </div>
              )}
              {order.customer.membership_tier && (
                <div>
                  <span className="text-gray-500">Tier:</span>
                  <span className="ml-2 capitalize font-medium">{order.customer.membership_tier}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start py-2 border-b last:border-0">
                <div className="flex-1">
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-sm text-gray-500">
                    {item.quantity}x @ {formatCurrency(item.unit_price)}
                  </div>
                  {item.variants && item.variants.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {item.variants.map((v, i) => (
                        <Badge key={i} variant="secondary" className="bg-pink-100 text-pink-700 text-xs">
                          {v.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {item.modifiers.map((m, i) => (
                        <Badge key={i} variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right font-semibold">
                  {formatCurrency(item.total_amount)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ringkasan Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(order.subtotal || 0)}</span>
            </div>
            {order.discount_amount! > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount_amount || 0)}</span>
              </div>
            )}
            {order.tax_amount! > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tax (PPN)</span>
                <span>{formatCurrency(order.tax_amount || 0)}</span>
              </div>
            )}
            {order.ark_coins_used! > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>ARK Coins Used</span>
                <span>-{order.ark_coins_used} ARK</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-green-600">{formatCurrency(order.total_amount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paid</span>
              <span className="font-medium">{formatCurrency(order.amount_paid || 0)}</span>
            </div>
            {order.change_amount! > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Change</span>
                <span className="font-medium">{formatCurrency(order.change_amount || 0)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Catatan</div>
            <div className="text-sm mt-1">{order.notes}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
