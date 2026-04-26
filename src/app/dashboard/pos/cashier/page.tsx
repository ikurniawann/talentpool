'use client';

import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Wallet,
  Printer,
  Send,
  Package
} from 'lucide-react';

// Mock data
const mockProducts = [
  { id: 1, name: 'Nasi Goreng Special', price: 50000, category: 'Makanan', image: null },
  { id: 2, name: 'Ayam Bakar Madu', price: 55000, category: 'Makanan', image: null },
  { id: 3, name: 'Mie Goreng Jawa', price: 45000, category: 'Makanan', image: null },
  { id: 4, name: 'Es Teh Manis', price: 5000, category: 'Minuman', image: null },
  { id: 5, name: 'Kopi Susu Gula Aren', price: 18000, category: 'Minuman', image: null },
  { id: 6, name: 'Jus Alpukat', price: 15000, category: 'Minuman', image: null },
  { id: 7, name: 'Kentang Goreng', price: 12000, category: 'Snack', image: null },
  { id: 8, name: 'Roti Bakar', price: 20000, category: 'Snack', image: null },
];

const categories = ['Semua', 'Makanan', 'Minuman', 'Snack'];

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};

export default function CashierPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debit'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: typeof mockProducts[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;
  const change = cashReceived ? parseInt(cashReceived) - total : 0;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  };

  const completeOrder = () => {
    // In real app: send to API
    alert('Order berhasil! Struk akan dicetak.');
    setCart([]);
    setCashReceived('');
    setShowPaymentModal(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* Left: Products */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kasir</h1>
          <p className="text-gray-500 text-sm">Pilih produk untuk menambahkan ke pesanan</p>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-300 transition-all text-left group"
            >
              <div className="h-20 sm:h-24 bg-gray-100 rounded-lg mb-3 flex items-center justify-center group-hover:bg-pink-50 transition-colors">
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 group-hover:text-pink-600" />
              </div>
              <h3 className="font-medium text-gray-900 text-xs sm:text-sm mb-1 line-clamp-2">
                {product.name}
              </h3>
              <div className="text-pink-600 font-bold text-xs sm:text-base">
                {formatCurrency(product.price)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col max-h-[50vh] lg:max-h-none">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Pesanan</h2>
          <p className="text-sm text-gray-500">{cart.length} item</p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Belum ada item</p>
              <p className="text-sm">Klik produk untuk menambahkan</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-sm">{item.name}</h3>
                  <div className="text-pink-600 font-semibold text-sm">
                    {formatCurrency(item.price)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Pajak (10%)</span>
            <span className="font-medium">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-pink-600">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Bayar ({cart.length} item)
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Pembayaran</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Total */}
              <div className="text-center py-4 bg-pink-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Pembayaran</div>
                <div className="text-3xl font-bold text-pink-600">
                  {formatCurrency(total)}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                      paymentMethod === 'cash'
                        ? 'border-green-600 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Banknote className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-pink-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">Tunai</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                      paymentMethod === 'qris'
                        ? 'border-green-600 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Wallet className={`w-6 h-6 ${paymentMethod === 'qris' ? 'text-pink-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">QRIS</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('debit')}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                      paymentMethod === 'debit'
                        ? 'border-green-600 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className={`w-6 h-6 ${paymentMethod === 'debit' ? 'text-pink-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">Debit</span>
                  </button>
                </div>
              </div>

              {/* Cash Input */}
              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uang Diterima
                  </label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full px-4 py-3 text-lg border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                    autoFocus
                  />
                  {change >= 0 && (
                    <div className="mt-2 text-sm text-pink-600 font-medium">
                      Kembalian: {formatCurrency(change)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={completeOrder}
                disabled={paymentMethod === 'cash' && (!cashReceived || parseInt(cashReceived) < total)}
                className="flex-1 px-4 py-2 text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Proses & Cetak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
