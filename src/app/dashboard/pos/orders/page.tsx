'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, ChefHat, Truck, Search, Filter, Eye, User, CreditCard, Coins, Calendar, DollarSign, ScanQrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getOrders, updateOrderStatus, getCustomers } from '@/lib/pos-api';
import type { Order, Customer } from '@/lib/pos-api';

const ARK_RATE = 1000; // 1 ARK = Rp 1.000
const formatArk = (value: number) => `${value.toLocaleString('id-ID')} ARK`;

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [printReceipt, setPrintReceipt] = useState(true);
  const [arkCoinCustomer, setArkCoinCustomer] = useState<Customer | null>(null);
  const [arkToUse, setArkToUse] = useState<number>(0);
  const [scanningArk, setScanningArk] = useState(false);

  const printReceiptPreview = (order: Order) => {
    printReceiptWindow(order, order.payment_method || 'CASH', order.ark_coins_used || 0);
  };

  const printReceiptWindow = (order: Order, paymentMethod: string, arkUsed: number = 0) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${order.order_number}</title>
            <style>
              body { font-family: monospace; width: 58mm; padding: 10px; margin: 0; }
              .header { text-align: center; margin-bottom: 10px; }
              .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
              .row { display: flex; justify-content: space-between; margin: 3px 0; }
              .total { font-weight: bold; font-size: 1.2em; }
              @media print { @page { margin: 0; } body { -webkit-print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h3>TalentPool POS</h3>
              <p>${order.order_number}</p>
              <p>${new Date(order.ordered_at!).toLocaleString('id-ID')}</p>
            </div>
            <div class="divider"></div>
            ${order.items?.map((item: any) => `
              <div class="row">
                <span>${item.product_name} x${item.quantity}</span>
                <span>Rp ${item.total_amount.toLocaleString('id-ID')}</span>
              </div>
            `).join('') || ''}
            <div class="divider"></div>
            <div class="row total">
              <span>Total</span>
              <span>Rp ${order.total_amount?.toLocaleString('id-ID')}</span>
            </div>
            <div class="row">
              <span>Payment</span>
              <span>${paymentMethod.toUpperCase()}${arkUsed > 0 ? ` (${arkUsed} ARK)` : ''}</span>
            </div>
            <div class="divider"></div>
            <p style="text-align: center; font-size: 0.8em;">Terima kasih!</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

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

  const handlePayment = async () => {
    if (!selectedOrder) return;
    
    // Validate payment based on method
    if (paymentMethod === 'cash') {
      const paid = parseFloat(amountPaid) || 0;
      if (paid < selectedOrder.total_amount!) {
        alert('❌ Uang pembayaran kurang!');
        return;
      }
    } else if (paymentMethod === 'ark_coin') {
      if (!arkCoinCustomer) {
        alert('❌ Tap kartu ARK Coin dulu!');
        return;
      }
      const totalInArk = selectedOrder.total_amount! / ARK_RATE;
      if (arkCoinCustomer.ark_coin_balance < totalInArk) {
        alert('❌ Saldo ARK Coin tidak mencukupi!');
        return;
      }
    }
    
    try {
      let arkUsed = 0;
      let amountPaidValue = 0;
      
      if (paymentMethod === 'ark_coin' && arkCoinCustomer) {
        const totalInArk = selectedOrder.total_amount! / ARK_RATE;
        arkUsed = Math.min(arkCoinCustomer.ark_coin_balance, totalInArk);
        amountPaidValue = arkUsed * ARK_RATE; // konversi ARK → Rupiah untuk amount_paid
      } else if (paymentMethod === 'cash') {
        amountPaidValue = parseFloat(amountPaid) || selectedOrder.total_amount!;
      } else {
        amountPaidValue = selectedOrder.total_amount!;
      }
      
      const response = await updateOrderStatus(selectedOrder.id, 'completed', {
        payment_status: 'paid',
        payment_method: paymentMethod === 'ark_coin' ? 'ark_coin' : paymentMethod,
        amount_paid: amountPaidValue,
        ark_coins_used: arkUsed
      });
      
      if (response.success) {
        // Print receipt if checked
        if (printReceipt) {
          printReceiptWindow(selectedOrder, paymentMethod, arkUsed);
        }
        
        alert(`✅ Pembayaran berhasil!\n\nOrder ${selectedOrder.order_number} telah lunas.${arkUsed > 0 ? `\nARK Coin digunakan: ${arkUsed}` : ''}`);
        setShowPaymentModal(false);
        setSelectedOrder(null);
        setAmountPaid('');
        setPrintReceipt(true);
        setArkCoinCustomer(null);
        setArkToUse(0);
        loadOrders(); // Reload orders
      } else {
        alert(`❌ Error: ${response.error || 'Failed to update order'}`);
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleTapArkCard = async () => {
    setScanningArk(true);
    try {
      // Simulate tapping card - in production, this would read from RFID/NFC reader
      // For now, show customer search modal
      const customerPhone = prompt('Masukkan nomor telepon pelanggan (atau tap kartu):');
      if (!customerPhone) {
        setScanningArk(false);
        return;
      }
      
      const customers = await getCustomers({ phone: customerPhone });
      if (customers.success && customers.data && customers.data.length > 0) {
        const customer = customers.data[0];
        setArkCoinCustomer(customer);
        
        if (customer.ark_coin_balance <= 0) {
          alert('⚠️ Saldo ARK Coin pelanggan kosong!');
        } else if (customer.ark_coin_balance < (selectedOrder?.total_amount || 0) / ARK_RATE) {
          alert(`⚠️ Saldo ARK Coin tidak cukup.\nSaldo: ${formatArk(customer.ark_coin_balance)}\nTotal: ${formatArk((selectedOrder?.total_amount || 0) / ARK_RATE)}`);
        }
      } else {
        alert('❌ Pelanggan tidak ditemukan!');
      }
    } catch (error: any) {
      console.error('Error tapping ARK card:', error);
      alert('❌ Gagal membaca kartu: ' + error.message);
    } finally {
      setScanningArk(false);
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
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowPaymentModal(true);
                              }}
                              className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <DollarSign className="w-4 h-4 mr-1" /> Bayar
                            </button>
                          )}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal for Pending Orders */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => {
        if (!open) {
          setShowPaymentModal(false);
          setAmountPaid('');
          setArkCoinCustomer(null);
          setArkToUse(0);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bayar Order Pending</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              {/* Order Info */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-sm font-semibold text-amber-800">{selectedOrder.order_number}</div>
                <div className="text-xs text-amber-700 mt-1">Total: {formatCurrency(selectedOrder.total_amount || 0)}</div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${paymentMethod === 'cash' ? 'border-pink-600 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="text-sm font-semibold">Cash</div>
                    <div className="text-xs text-gray-500">Uang tunai</div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${paymentMethod === 'qris' ? 'border-pink-600 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="text-sm font-semibold">QRIS</div>
                    <div className="text-xs text-gray-500">Scan QR</div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${paymentMethod === 'credit_card' ? 'border-pink-600 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="text-sm font-semibold">Credit Card</div>
                    <div className="text-xs text-gray-500">Kartu kredit</div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('ark_coin')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${paymentMethod === 'ark_coin' ? 'border-pink-600 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="text-sm font-semibold">ARK Coin</div>
                    <div className="text-xs text-gray-500">Crypto</div>
                  </button>
                </div>
              </div>

              {/* ARK Coin Tap Card */}
              {paymentMethod === 'ark_coin' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleTapArkCard}
                    disabled={scanningArk}
                    className={`w-full py-4 rounded-lg border-2 transition-all flex items-center justify-center gap-3 ${
                      scanningArk
                        ? 'border-gray-300 bg-gray-100'
                        : arkCoinCustomer
                        ? 'border-green-600 bg-green-50 hover:bg-green-100'
                        : 'border-amber-600 bg-amber-50 hover:bg-amber-100'
                    }`}
                  >
                    {scanningArk ? (
                      <>
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium">Scanning...</span>
                      </>
                    ) : arkCoinCustomer ? (
                      <>
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div className="text-left">
                          <div className="font-semibold text-green-800">{arkCoinCustomer.name || 'Member'}</div>
                          <div className="text-xs text-green-700">Saldo: {formatArk(arkCoinCustomer.ark_coin_balance)}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <ScanQrCode className="w-6 h-6 text-amber-600" />
                        <div className="text-left">
                          <div className="font-semibold text-amber-800">Tap Kartu Member</div>
                          <div className="text-xs text-amber-700">Sentuh kartu untuk membaca saldo</div>
                        </div>
                      </>
                    )}
                  </button>

                  {arkCoinCustomer && arkCoinCustomer.ark_coin_balance > 0 && (
                    <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Saldo ARK</span>
                        <span className="font-semibold text-amber-600">{formatArk(arkCoinCustomer.ark_coin_balance)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total tagihan</span>
                        <span className="font-semibold text-gray-900">{formatArk(selectedOrder!.total_amount! / ARK_RATE)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sisa saldo</span>
                        <span className="font-semibold text-gray-700">
                          {formatArk(Math.max(0, arkCoinCustomer.ark_coin_balance - selectedOrder!.total_amount! / ARK_RATE))}
                        </span>
                      </div>
                      <div className={`text-sm font-medium ${arkCoinCustomer.ark_coin_balance >= selectedOrder!.total_amount! / ARK_RATE ? 'text-green-600' : 'text-red-500'}`}>
                        {arkCoinCustomer.ark_coin_balance >= selectedOrder!.total_amount! / ARK_RATE
                          ? '✓ Saldo cukup untuk membayar penuh'
                          : `Saldo kurang ${formatArk(selectedOrder!.total_amount! / ARK_RATE - arkCoinCustomer.ark_coin_balance)}`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cash Input */}
              {paymentMethod === 'cash' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Jumlah Uang Diterima</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <div className="text-sm text-gray-500">
                    Kembalian: {formatCurrency((parseFloat(amountPaid) || 0) - (selectedOrder.total_amount || 0))}
                  </div>
                </div>
              )}

              {/* Print Receipt Checkbox */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="printReceipt"
                  checked={printReceipt}
                  onChange={(e) => setPrintReceipt(e.target.checked)}
                  className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <label htmlFor="printReceipt" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  🖨️ Auto Print Struk
                  <span className="text-xs text-gray-500">(Setelah bayar)</span>
                </label>
              </div>

              {/* Preview Print Button */}
              <button
                type="button"
                onClick={() => printReceiptPreview(selectedOrder!)}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                🖨️ Preview & Print Struk
              </button>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setAmountPaid('');
                  }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  onClick={handlePayment}
                  className="flex-1 py-2.5 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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

      {/* Print Button */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={() => printReceiptPreview(order)}
          className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
        >
          🖨️ Print Struk
        </button>
      </div>
    </div>
  );
}
