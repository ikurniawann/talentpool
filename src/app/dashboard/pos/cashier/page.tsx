'use client';

import { useState, useCallback } from 'react';
import { 
  Search, Plus, Minus, Trash2, CreditCard, Banknote, Wallet,
  Package, X, Undo2, User, Star, Coins, Check, Utensils,
  ShoppingBag, Truck, Monitor, Table, Sparkles, MinusCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const mockProducts = [
  { id: 1, name: 'Nasi Goreng Special', price: 50000, category: 'Makanan', hasVariants: true, hasModifiers: true },
  { id: 2, name: 'Ayam Bakar Madu', price: 55000, category: 'Makanan', hasVariants: true, hasModifiers: false },
  { id: 3, name: 'Mie Goreng Jawa', price: 45000, category: 'Makanan', hasVariants: false, hasModifiers: true },
  { id: 4, name: 'Es Teh Manis', price: 5000, category: 'Minuman', hasVariants: true, hasModifiers: true },
  { id: 5, name: 'Kopi Susu Gula Aren', price: 18000, category: 'Minuman', hasVariants: true, hasModifiers: true },
  { id: 6, name: 'Jus Alpukat', price: 15000, category: 'Minuman', hasVariants: false, hasModifiers: true },
  { id: 7, name: 'Kentang Goreng', price: 12000, category: 'Snack', hasVariants: false, hasModifiers: true },
  { id: 8, name: 'Roti Bakar', price: 20000, category: 'Snack', hasVariants: true, hasModifiers: true },
];

const mockVariants: Record<number, Array<{ id: string; name: string; priceAdj: number; type: string }>> = {
  1: [
    { id: 'v1-s', name: 'Small', priceAdj: -10000, type: 'size' },
    { id: 'v1-m', name: 'Medium', priceAdj: 0, type: 'size' },
    { id: 'v1-l', name: 'Large', priceAdj: 15000, type: 'size' },
    { id: 'v1-h', name: 'Hot', priceAdj: 0, type: 'temp' },
    { id: 'v1-i', name: 'Ice', priceAdj: 2000, type: 'temp' },
  ],
  2: [
    { id: 'v2-p', name: 'Paha', priceAdj: 0, type: 'part' },
    { id: 'v2-d', name: 'Dada', priceAdj: 5000, type: 'part' },
    { id: 'v2-s', name: 'Sayap', priceAdj: -5000, type: 'part' },
  ],
  4: [
    { id: 'v4-h', name: 'Hot', priceAdj: 0, type: 'temp' },
    { id: 'v4-i', name: 'Ice', priceAdj: 1000, type: 'temp' },
  ],
  5: [
    { id: 'v5-h', name: 'Hot', priceAdj: 0, type: 'temp' },
    { id: 'v5-i', name: 'Ice', priceAdj: 2000, type: 'temp' },
  ],
  8: [
    { id: 'v8-s', name: 'Small', priceAdj: -5000, type: 'size' },
    { id: 'v8-m', name: 'Medium', priceAdj: 0, type: 'size' },
    { id: 'v8-l', name: 'Large', priceAdj: 8000, type: 'size' },
  ],
};

const mockModifierGroups: Record<number, Array<{ id: string; name: string; required: boolean; maxSelect: number; modifiers: Array<{ id: string; name: string; priceAdj: number }> }>> = {
  1: [
    { id: 'mg1-s', name: 'Sugar Level', required: true, maxSelect: 1, modifiers: [
      { id: 'm1-0', name: 'No Sugar', priceAdj: 0 },
      { id: 'm1-50', name: 'Half Sweet (50%)', priceAdj: 0 },
      { id: 'm1-100', name: 'Full Sweet (100%)', priceAdj: 0 },
    ]},
    { id: 'mg1-t', name: 'Toppings', required: false, maxSelect: 3, modifiers: [
      { id: 'm1-t1', name: 'Extra Egg', priceAdj: 5000 },
      { id: 'm1-t2', name: 'Extra Chicken', priceAdj: 10000 },
      { id: 'm1-t3', name: 'Extra Rice', priceAdj: 5000 },
    ]},
  ],
  4: [
    { id: 'mg4-s', name: 'Sugar Level', required: true, maxSelect: 1, modifiers: [
      { id: 'm4-0', name: 'No Sugar', priceAdj: 0 },
      { id: 'm4-50', name: 'Less Sweet', priceAdj: 0 },
      { id: 'm4-100', name: 'Normal', priceAdj: 0 },
    ]},
  ],
  5: [
    { id: 'mg5-s', name: 'Sugar Level', required: true, maxSelect: 1, modifiers: [
      { id: 'm5-0', name: 'No Sugar', priceAdj: 0 },
      { id: 'm5-50', name: 'Half Sweet', priceAdj: 0 },
      { id: 'm5-100', name: 'Full Sweet', priceAdj: 0 },
    ]},
  ],
  6: [
    { id: 'mg6-t', name: 'Toppings', required: false, maxSelect: 5, modifiers: [
      { id: 'm6-t1', name: 'Chocolate', priceAdj: 3000 },
      { id: 'm6-t2', name: 'Caramel', priceAdj: 3000 },
      { id: 'm6-t3', name: 'Whipped Cream', priceAdj: 5000 },
    ]},
  ],
  8: [
    { id: 'mg8-s', name: 'Sugar Level', required: true, maxSelect: 1, modifiers: [
      { id: 'm8-s1', name: 'No Sugar', priceAdj: 0 },
      { id: 'm8-s2', name: 'Less Sweet', priceAdj: 0 },
      { id: 'm8-s3', name: 'Normal Sweet', priceAdj: 0 },
    ]},
  ],
};

const mockCustomers = [
  { id: 'c1', name: 'Ahmad Wijaya', phone: '081234567890', tier: 'Gold', xp: 12500, arkCoin: 250000 },
  { id: 'c2', name: 'Siti Rahayu', phone: '081234567891', tier: 'Silver', xp: 8500, arkCoin: 85000 },
  { id: 'c3', name: 'Budi Santoso', phone: '081234567892', tier: 'Platinum', xp: 45000, arkCoin: 1500000 },
];

const tables = [
  { id: 't1', name: 'Meja 1', status: 'available' },
  { id: 't2', name: 'Meja 2', status: 'occupied' },
  { id: 't3', name: 'Meja 3', status: 'available' },
  { id: 't4', name: 'Meja 4', status: 'reserved' },
  { id: 't5', name: 'Meja 5', status: 'available' },
  { id: 't6', name: 'Meja 6', status: 'available' },
];

const categories = ['Semua', 'Makanan', 'Minuman', 'Snack'];

type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'self_order';
type PaymentMethod = 'cash' | 'qris' | 'debit' | 'split';
type CartItem = {
  id: string; productId: number; name: string; basePrice: number; quantity: number;
  variants: Array<{ name: string; priceAdj: number }>;
  modifiers: Array<{ name: string; priceAdj: number }>;
  notes: string; unitPrice: number; totalPrice: number;
};
type SplitPayment = { id: string; method: PaymentMethod; amount: number };

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function CashierPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<typeof mockCustomers[0] | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customizingItem, setCustomizingItem] = useState<typeof mockProducts[0] | null>(null);
  const [customQuantity, setCustomQuantity] = useState(1);
  const [customVariants, setCustomVariants] = useState<Record<string, string>>({});
  const [customModifiers, setCustomModifiers] = useState<Record<string, string[]>>({});
  const [customNotes, setCustomNotes] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [showTipInput, setShowTipInput] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [digitalReceipt, setDigitalReceipt] = useState(true);
  const [undoItem, setUndoItem] = useState<CartItem | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  const filteredProducts = mockProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredCustomers = mockCustomers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch));

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = subtotal * 0.1;
  const tip = showTipInput && tipAmount ? parseInt(tipAmount) || 0 : 0;
  const total = subtotal + tax + tip;
  const xpPreview = selectedCustomer ? Math.floor(total / 1000) * 10 : 0;

  const openCustomization = (product: typeof mockProducts[0]) => {
    setCustomizingItem(product);
    setCustomQuantity(1);
    setCustomVariants({});
    setCustomModifiers({});
    setCustomNotes('');
    const groups = mockModifierGroups[product.id] || [];
    const preSelect: Record<string, string[]> = {};
    groups.forEach(g => { if (g.required && g.modifiers.length > 0) preSelect[g.id] = [g.modifiers[0].id]; });
    setCustomModifiers(preSelect);
  };

  const calculateCustomPrice = useCallback(() => {
    if (!customizingItem) return 0;
    let price = customizingItem.price;
    Object.entries(customVariants).forEach(([, variantId]) => {
      const variants = mockVariants[customizingItem.id] || [];
      const variant = variants.find(v => v.id === variantId);
      if (variant) price += variant.priceAdj;
    });
    Object.entries(customModifiers).forEach(([, modifierIds]) => {
      const groups = mockModifierGroups[customizingItem.id] || [];
      modifierIds.forEach(modId => {
        groups.forEach(g => {
          const mod = g.modifiers.find(m => m.id === modId);
          if (mod) price += mod.priceAdj;
        });
      });
    });
    return price;
  }, [customizingItem, customVariants, customModifiers]);

  const addToCart = () => {
    if (!customizingItem) return;
    const variants = Object.entries(customVariants).map(([, variantId]) => {
      const allVariants = mockVariants[customizingItem.id] || [];
      const v = allVariants.find(v => v.id === variantId);
      return v ? { name: v.name, priceAdj: v.priceAdj } : null;
    }).filter(Boolean) as Array<{ name: string; priceAdj: number }>;
    const modifiers = Object.entries(customModifiers).flatMap(([, modifierIds]) => {
      const groups = mockModifierGroups[customizingItem.id] || [];
      return modifierIds.map(modId => {
        for (const g of groups) {
          const mod = g.modifiers.find(m => m.id === modId);
          if (mod) return { name: mod.name, priceAdj: mod.priceAdj };
        }
        return null;
      }).filter(Boolean);
    }).filter(Boolean) as Array<{ name: string; priceAdj: number }>;
    const unitPrice = calculateCustomPrice();
    const newItem: CartItem = {
      id: generateId(), productId: customizingItem.id, name: customizingItem.name,
      basePrice: customizingItem.price, quantity: customQuantity, variants, modifiers,
      notes: customNotes, unitPrice, totalPrice: unitPrice * customQuantity,
    };
    setCart(prev => [...prev, newItem]);
    setCustomizingItem(null);
  };

  const updateQuantity = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty, totalPrice: item.unitPrice * newQty } : item));
  };

  const removeFromCart = (id: string) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    setUndoItem(item);
    setShowUndoToast(true);
    setCart(prev => prev.filter(i => i.id !== id));
    setTimeout(() => { setShowUndoToast(false); setTimeout(() => setUndoItem(null), 300); }, 3000);
  };

  const undoRemove = () => {
    if (undoItem) { setCart(prev => [...prev, undoItem]); setUndoItem(null); setShowUndoToast(false); }
  };

  const getTotalSplitPaid = () => splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingSplit = total - getTotalSplitPaid();

  const addSplitPayment = () => {
    setSplitPayments(prev => [...prev, { id: generateId(), method: 'cash', amount: remainingSplit > 0 ? remainingSplit : 0 }]);
  };

  const updateSplitPayment = (id: string, field: 'method' | 'amount', value: string | number) => {
    setSplitPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: field === 'amount' ? Number(value) : value } : p));
  };

  const removeSplitPayment = (id: string) => {
    setSplitPayments(prev => prev.filter(p => p.id !== id));
  };

  const isPaymentValid = () => {
    if (paymentMethod === 'cash') return parseInt(cashReceived) >= total;
    if (paymentMethod === 'split') return getTotalSplitPaid() >= total;
    return true;
  };

  const completeOrder = () => {
    if (!isPaymentValid()) return;
    const orderTypeNames = { dine_in: 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery', self_order: 'Self-order' };
    alert(`Order berhasil!\n\nTipe: ${orderTypeNames[orderType]}\n${selectedTable ? `Meja: ${tables.find(t => t.id === selectedTable)?.name}\n` : ''}${selectedCustomer ? `Pelanggan: ${selectedCustomer.name}\n` : ''}Total: ${formatCurrency(total)}\n\nStruk akan ${digitalReceipt ? 'dikirim ke email' : 'dicetak'}.`);
    setCart([]); setSelectedTable(null); setSelectedCustomer(null); setPaymentMethod('cash'); setCashReceived(''); setSplitPayments([]); setTipAmount(''); setShowPaymentModal(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-4">
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Order Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-gray-900">Tipe Pesanan</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setOrderType('dine_in')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${orderType === 'dine_in' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <Utensils className="w-4 h-4" /> Dine-in
            </button>
            <button onClick={() => { setOrderType('takeaway'); setSelectedTable(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${orderType === 'takeaway' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <ShoppingBag className="w-4 h-4" /> Takeaway
            </button>
            <button onClick={() => { setOrderType('delivery'); setSelectedTable(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${orderType === 'delivery' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <Truck className="w-4 h-4" /> Delivery
            </button>
            <button onClick={() => { setOrderType('self_order'); setSelectedTable(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${orderType === 'self_order' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <Monitor className="w-4 h-4" /> Self-order
            </button>
          </div>
          
          {orderType === 'dine_in' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Table className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-900">Pilih Meja</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {tables.map(table => (
                  <button key={table.id} onClick={() => setSelectedTable(table.id)} disabled={table.status === 'occupied'} className={`py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all ${selectedTable === table.id ? 'border-pink-600 bg-pink-600 text-white' : table.status === 'occupied' ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-200 text-gray-700 hover:border-pink-400'}`}>
                    {table.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer Button */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">Pelanggan</span>
          </div>
          
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-sm">{selectedCustomer.name.charAt(0)}</div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{selectedCustomer.name}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${selectedCustomer.tier === 'Platinum' ? 'bg-gray-900 text-white' : selectedCustomer.tier === 'Gold' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{selectedCustomer.tier}</span>
                    <span className="text-gray-500">{selectedCustomer.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-gray-600"><Coins className="w-3 h-3" /><span className="font-medium">{formatCurrency(selectedCustomer.arkCoin)}</span></div>
                  <div className="flex items-center gap-1 text-xs text-pink-600"><Star className="w-3 h-3" /><span className="font-medium">{selectedCustomer.xp} XP</span></div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCustomerModal(true)} className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-pink-400 hover:text-pink-600 transition-all flex items-center justify-center gap-2">
              <User className="w-4 h-4" /> Pilih Pelanggan
            </button>
          )}
          
          {selectedCustomer && xpPreview > 0 && (
            <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700 font-medium">+{xpPreview} XP akan earned dari pesanan ini</span>
            </div>
          )}
        </div>

        {/* Products */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 overflow-hidden flex flex-col">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Cari produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" />
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{cat}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button key={product.id} onClick={() => openCustomization(product)} className="bg-gray-50 p-3 rounded-xl border border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all text-left">
                  <div className="h-16 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex gap-1 mb-2">
                    {product.hasVariants && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded font-medium">V</span>}
                    {product.hasModifiers && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded font-medium">M</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">{product.name}</h3>
                  <div className="text-pink-600 font-bold text-sm">{formatCurrency(product.price)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Cart */}
      <div className="w-full lg:w-96 bg-white rounded-xl border border-gray-200 flex flex-col max-h-[60vh] lg:max-h-none">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Pesanan</h2>
            <span className="text-sm text-gray-500">{cart.length} item</span>
          </div>
          <div className="flex gap-2 mt-2">
            {orderType !== 'dine_in' && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">{orderType === 'takeaway' ? 'Takeaway' : orderType === 'delivery' ? 'Delivery' : 'Self-order'}</span>}
            {selectedTable && <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full font-medium">{tables.find(t => t.id === selectedTable)?.name}</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada item</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                      {item.variants.length > 0 && <div className="text-xs text-gray-500 mt-0.5">{item.variants.map(v => v.name).join(', ')}</div>}
                      {item.modifiers.length > 0 && <div className="text-xs text-green-600 mt-0.5">+ {item.modifiers.map(m => m.name).join(', ')}</div>}
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {item.notes && <div className="text-xs text-gray-500 italic mb-2">📝 {item.notes}</div>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"><Minus className="w-3 h-3" /></button>
                      <input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)} className="w-10 text-center text-sm font-medium border border-gray-300 rounded-lg py-1" min="1" />
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"><Plus className="w-3 h-3" /></button>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{formatCurrency(item.totalPrice)}</div>
                      <div className="text-xs text-gray-400">{formatCurrency(item.unitPrice)}/item</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2 bg-gray-50">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Pajak (10%)</span><span className="font-medium text-gray-900">{formatCurrency(tax)}</span></div>
          {tip > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Tip</span><span className="font-medium text-green-600">+{formatCurrency(tip)}</span></div>}
          {selectedCustomer && xpPreview > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">XP Earned</span><span className="font-medium text-pink-600">+{xpPreview} XP</span></div>}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300"><span className="text-gray-900">Total</span><span className="text-pink-600">{formatCurrency(total)}</span></div>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0} className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">Bayar ({cart.length} item)</button>
        </div>
      </div>

      {/* Undo Toast */}
      {showUndoToast && undoItem && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4">
          <span className="text-sm">Item dihapus</span>
          <button onClick={undoRemove} className="flex items-center gap-1 text-sm text-pink-400 hover:text-pink-300 font-medium"><Undo2 className="w-4 h-4" />Undo</button>
        </div>
      )}

      {/* Customer Selection Modal */}
      <Dialog open={showCustomerModal} onOpenChange={(open) => !open && setShowCustomerModal(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pilih Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="Cari pelanggan..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} autoFocus className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); setShowCustomerModal(false); }} className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm"><User className="w-5 h-5" /></div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Walk-in Customer</div>
                  <div className="text-xs text-gray-500">Tanpa membership</div>
                </div>
              </button>
              {filteredCustomers.map(customer => (
                <button key={customer.id} onClick={() => { setSelectedCustomer(customer); setCustomerSearch(''); setShowCustomerModal(false); }} className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 hover:bg-pink-50 hover:border-pink-200 transition-all flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">{customer.name.charAt(0)}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{customer.name}</div>
                    <div className="text-xs text-gray-500">{customer.phone}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${customer.tier === 'Platinum' ? 'bg-gray-900 text-white' : customer.tier === 'Gold' ? 'bg-yellow-500 text-white' : customer.tier === 'Silver' ? 'bg-gray-400 text-white' : 'bg-orange-200 text-orange-700'}`}>{customer.tier}</span>
                    <div className="text-xs text-gray-500 mt-1">{formatCurrency(customer.arkCoin)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customization Modal */}
      <Dialog open={customizingItem !== null} onOpenChange={(open) => !open && setCustomizingItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{customizingItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Jumlah</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))} className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-300 flex items-center justify-center hover:bg-gray-200"><Minus className="w-5 h-5" /></button>
                <input type="number" value={customQuantity} onChange={(e) => setCustomQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 text-center text-lg font-bold border border-gray-300 rounded-lg py-2" min="1" />
                <button onClick={() => setCustomQuantity(customQuantity + 1)} className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-300 flex items-center justify-center hover:bg-gray-200"><Plus className="w-5 h-5" /></button>
              </div>
            </div>

            {mockVariants[customizingItem?.id || 0] && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Varian</label>
                <div className="space-y-3">
                  {['size', 'temp', 'part'].map(type => {
                    const typeVariants = mockVariants[customizingItem?.id || 0]?.filter(v => v.type === type) || [];
                    if (typeVariants.length === 0) return null;
                    return (
                      <div key={type}>
                        <div className="text-xs text-gray-500 uppercase mb-2">{type === 'size' ? 'Ukuran' : type === 'temp' ? 'Temperatur' : 'Bagian'}</div>
                        <div className="flex flex-wrap gap-2">
                          {typeVariants.map(variant => (
                            <button key={variant.id} onClick={() => setCustomVariants(prev => ({ ...prev, [type]: variant.id }))} className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${customVariants[type] === variant.id ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                              {variant.name} {variant.priceAdj !== 0 && <span className="text-xs opacity-70">({variant.priceAdj > 0 ? '+' : ''}{formatCurrency(variant.priceAdj)})</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {mockModifierGroups[customizingItem?.id || 0] && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Kustomisasi</label>
                <div className="space-y-3">
                  {mockModifierGroups[customizingItem?.id || 0].map(group => (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900 text-sm">{group.name}</span>
                        <span className="text-xs text-gray-500">{group.required ? 'Wajib' : `Max ${group.maxSelect}`}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.modifiers.map(modifier => {
                          const isSelected = customModifiers[group.id]?.includes(modifier.id) || false;
                          const currentCount = customModifiers[group.id]?.length || 0;
                          const canSelect = !isSelected && currentCount < group.maxSelect;
                          return (
                            <button key={modifier.id} onClick={() => { if (isSelected) setCustomModifiers(prev => ({ ...prev, [group.id]: prev[group.id].filter(id => id !== modifier.id) })); else if (canSelect) setCustomModifiers(prev => ({ ...prev, [group.id]: [...(prev[group.id] || []), modifier.id] })); }} disabled={!isSelected && !canSelect} className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${isSelected ? 'border-pink-600 bg-pink-50 text-pink-700' : canSelect ? 'border-gray-200 text-gray-700 hover:border-gray-300' : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'}`}>
                              {modifier.name} {modifier.priceAdj !== 0 && <span className="text-xs opacity-70">+{formatCurrency(modifier.priceAdj)}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Catatan Spesial</label>
              <input value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} placeholder="Contoh: Tanpa bawang, pedas sekali..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" />
            </div>

            <div className="p-4 bg-gray-900 rounded-lg">
              <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Harga per item</span><span className="text-lg font-bold text-white">{formatCurrency(calculateCustomPrice())}</span></div>
              <div className="flex justify-between items-center mt-1"><span className="text-gray-400 text-sm">Total</span><span className="text-2xl font-bold text-white">{formatCurrency(calculateCustomPrice() * customQuantity)}</span></div>
            </div>
          </div>
          <div className="flex-shrink-0 border-t pt-4 mt-4">
            <div className="flex gap-3">
              <button onClick={() => setCustomizingItem(null)} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors">Batal</button>
              <button onClick={addToCart} className="flex-1 px-4 py-2 text-white bg-pink-600 rounded-lg font-medium hover:bg-pink-700 transition-colors flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Tambah</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => !open && setShowPaymentModal(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
            <div className="flex gap-2 mt-2">
              {orderType === 'dine_in' && selectedTable && <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full font-medium">{tables.find(t => t.id === selectedTable)?.name}</span>}
              {selectedCustomer && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium flex items-center gap-1"><User className="w-3 h-3" />{selectedCustomer.name}</span>}
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center py-4 bg-gray-900 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Total Pembayaran</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(total)}</div>
            </div>

            <div className="flex border-b border-gray-200">
              {[{ id: 'cash', label: 'Tunai', icon: Banknote }, { id: 'qris', label: 'QRIS', icon: Wallet }, { id: 'debit', label: 'Debit', icon: CreditCard }, { id: 'split', label: 'Split', icon: Coins }].map(method => (
                <button key={method.id} onClick={() => setPaymentMethod(method.id as PaymentMethod)} className={`flex-1 py-2 text-sm font-semibold border-b-2 ${paymentMethod === method.id ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500'}`}>
                  <method.icon className="w-4 h-4 mx-auto mb-1" />
                  {method.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Uang Diterima</label>
                  <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} placeholder="0" autoFocus className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[50000, 100000, 200000, 500000].map(amount => (
                    <button key={amount} onClick={() => setCashReceived(String(amount))} className="py-2 bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-200">{formatCurrency(amount)}</button>
                  ))}
                </div>
                {parseInt(cashReceived || '0') >= total && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200 flex justify-between"><span className="text-gray-700 font-medium">Kembalian</span><span className="text-lg font-bold text-green-600">{formatCurrency(parseInt(cashReceived) - total)}</span></div>
                )}
              </div>
            )}

            {paymentMethod === 'qris' && (
              <div className="text-center py-8">
                <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-gray-300"><span className="text-gray-400 text-sm">QR Code</span></div>
                <p className="text-sm text-gray-500">Scan QRIS untuk membayar</p>
              </div>
            )}

            {paymentMethod === 'debit' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Nomor Kartu</label>
                <input placeholder="**** **** **** ****" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" />
              </div>
            )}

            {paymentMethod === 'split' && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex justify-between"><span className="text-gray-700 font-medium">Sisa Bayar</span><span className="font-bold text-blue-600">{formatCurrency(remainingSplit)}</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-pink-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (getTotalSplitPaid() / total) * 100)}%` }} /></div>
                {splitPayments.map((split) => (
                  <div key={split.id} className="flex gap-2 items-center">
                    <select value={split.method} onChange={(e) => updateSplitPayment(split.id, 'method', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="cash">Tunai</option><option value="qris">QRIS</option><option value="debit">Debit</option><option value="wallet">Wallet</option>
                    </select>
                    <input type="number" value={split.amount} onChange={(e) => updateSplitPayment(split.id, 'amount', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Jumlah" />
                    <button onClick={() => removeSplitPayment(split.id)} className="p-2 text-gray-400 hover:text-red-600"><MinusCircle className="w-5 h-5" /></button>
                  </div>
                ))}
                <button onClick={addSplitPayment} disabled={remainingSplit <= 0} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-pink-400 hover:text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Tambah Pembayaran</button>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-900">Tip</span>
              <button onClick={() => setShowTipInput(!showTipInput)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${showTipInput ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{showTipInput ? 'Sembunyikan' : 'Tambah'}</button>
            </div>
            {showTipInput && <input type="number" value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} placeholder="Jumlah tip" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" />}

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Struk Digital</span>
              <button onClick={() => setDigitalReceipt(!digitalReceipt)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${digitalReceipt ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{digitalReceipt ? 'Aktif' : 'Nonaktif'}</button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors">Batal</button>
            <button onClick={completeOrder} disabled={!isPaymentValid()} className="flex-1 px-4 py-2 text-white bg-pink-600 rounded-lg font-medium hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"><Check className="w-4 h-4" />Bayar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
