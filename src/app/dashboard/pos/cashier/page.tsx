'use client';

import { useState, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Wallet,
  Package,
  X,
  Undo2,
  User,
  Star,
  Coins,
  PlusCircle,
  MinusCircle,
  Check,
  Utensils,
  ShoppingBag,
  Truck,
  Monitor,
  Table,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';

// ============== MOCK DATA ==============
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
      { id: 'm1-25', name: 'Less Sugar (25%)', priceAdj: 0 },
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
      { id: 'm5-25', name: 'Less Sugar', priceAdj: 0 },
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

// ============== TYPES ==============
type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'self_order';
type PaymentMethod = 'cash' | 'qris' | 'debit' | 'split';
type CartItem = {
  id: string;
  productId: number;
  name: string;
  basePrice: number;
  quantity: number;
  variants: Array<{ name: string; priceAdj: number }>;
  modifiers: Array<{ name: string; priceAdj: number }>;
  notes: string;
  unitPrice: number;
  totalPrice: number;
};
type SplitPayment = { id: string; method: PaymentMethod; amount: number };

// ============== HELPERS ==============
const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
const generateId = () => Math.random().toString(36).substr(2, 9);

// ============== MAIN COMPONENT ==============
export default function CashierPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<typeof mockCustomers[0] | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Customization Modal
  const [customizingItem, setCustomizingItem] = useState<typeof mockProducts[0] | null>(null);
  const [customQuantity, setCustomQuantity] = useState(1);
  const [customVariants, setCustomVariants] = useState<Record<string, string>>({});
  const [customModifiers, setCustomModifiers] = useState<Record<string, string[]>>({});
  const [customNotes, setCustomNotes] = useState('');
  
  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [showTipInput, setShowTipInput] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [digitalReceipt, setDigitalReceipt] = useState(true);
  
  // Undo toast
  const [undoItem, setUndoItem] = useState<CartItem | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredCustomers = mockCustomers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
  );

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
      id: generateId(),
      productId: customizingItem.id,
      name: customizingItem.name,
      basePrice: customizingItem.price,
      quantity: customQuantity,
      variants,
      modifiers,
      notes: customNotes,
      unitPrice,
      totalPrice: unitPrice * customQuantity,
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
      {/* LEFT: Products Panel */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Order Type Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button variant={orderType === 'dine_in' ? 'default' : 'outline'} size="sm" onClick={() => setOrderType('dine_in')}>
                <Utensils className="w-4 h-4 mr-1" /> Dine-in
              </Button>
              <Button variant={orderType === 'takeaway' ? 'default' : 'outline'} size="sm" onClick={() => { setOrderType('takeaway'); setSelectedTable(null); }}>
                <ShoppingBag className="w-4 h-4 mr-1" /> Takeaway
              </Button>
              <Button variant={orderType === 'delivery' ? 'default' : 'outline'} size="sm" onClick={() => { setOrderType('delivery'); setSelectedTable(null); }}>
                <Truck className="w-4 h-4 mr-1" /> Delivery
              </Button>
              <Button variant={orderType === 'self_order' ? 'default' : 'outline'} size="sm" onClick={() => { setOrderType('self_order'); setSelectedTable(null); }}>
                <Monitor className="w-4 h-4 mr-1" /> Self-order
              </Button>
            </div>
            
            {orderType === 'dine_in' && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Table className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Pilih Meja</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {tables.map(table => (
                    <Button key={table.id} variant={selectedTable === table.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedTable(table.id)} disabled={table.status === 'occupied'} className={table.status === 'occupied' ? 'opacity-50' : ''}>
                      {table.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Pelanggan</span>
            </div>
            
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">{selectedCustomer.name.charAt(0)}</div>
                  <div>
                    <div className="font-medium text-gray-900">{selectedCustomer.name}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded-full ${selectedCustomer.tier === 'Platinum' ? 'bg-purple-100 text-purple-700' : selectedCustomer.tier === 'Gold' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{selectedCustomer.tier}</span>
                      <span className="text-gray-500">{selectedCustomer.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-purple-600"><Coins className="w-3 h-3" />{formatCurrency(selectedCustomer.arkCoin)}</div>
                    <div className="flex items-center gap-1 text-xs text-pink-600"><Star className="w-3 h-3" />{selectedCustomer.xp} XP</div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setSelectedCustomer(null)}><X className="w-4 h-4" /></Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Cari pelanggan..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} onFocus={() => setShowCustomerDropdown(true)} className="pl-10" />
                </div>
                {showCustomerDropdown && customerSearch && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); setShowCustomerDropdown(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2"><User className="w-4 h-4" /> Walk-in Customer</button>
                    {filteredCustomers.map(customer => (
                      <button key={customer.id} onClick={() => { setSelectedCustomer(customer); setCustomerSearch(''); setShowCustomerDropdown(false); }} className="w-full px-4 py-2 text-left hover:bg-pink-50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">{customer.name.charAt(0)}</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-xs text-gray-500">{customer.phone}</div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${customer.tier === 'Platinum' ? 'bg-purple-100 text-purple-700' : customer.tier === 'Gold' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{customer.tier}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {selectedCustomer && xpPreview > 0 && (
              <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700">+{xpPreview} XP akan earned dari pesanan ini</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search & Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Cari produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat)}>{cat}</Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="cursor-pointer hover:border-pink-400 transition-colors" onClick={() => openCustomization(product)}>
              <CardContent className="p-3">
                <div className="h-16 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <div className="flex gap-1 mb-2">
                  {product.hasVariants && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">V</span>}
                  {product.hasModifiers && <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded">M</span>}
                </div>
                <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">{product.name}</h3>
                <div className="text-pink-600 font-bold text-sm">{formatCurrency(product.price)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* RIGHT: Smart Cart */}
      <Card className="w-full lg:w-96 flex flex-col max-h-[60vh] lg:max-h-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Pesanan</CardTitle>
            <span className="text-sm text-gray-500">{cart.length} item</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {orderType !== 'dine_in' && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{orderType === 'takeaway' ? 'Takeaway' : orderType === 'delivery' ? 'Delivery' : 'Self-order'}</span>}
            {selectedTable && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{tables.find(t => t.id === selectedTable)?.name}</span>}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada item</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">{item.name}</h3>
                      {item.variants.length > 0 && <div className="text-xs text-gray-500">{item.variants.map(v => v.name).join(', ')}</div>}
                      {item.modifiers.length > 0 && <div className="text-xs text-green-600">+ {item.modifiers.map(m => m.name).join(', ')}</div>}
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => removeFromCart(item.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                  {item.notes && <div className="text-xs text-gray-500 italic mb-2">📝 {item.notes}</div>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon-sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                      <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)} className="w-12 text-center" min="1" />
                      <Button variant="outline" size="icon-sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</div>
                      <div className="text-xs text-gray-400">{formatCurrency(item.unitPrice)}/item</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Pajak (10%)</span><span className="font-medium">{formatCurrency(tax)}</span></div>
          {tip > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Tip</span><span className="font-medium text-green-600">+{formatCurrency(tip)}</span></div>}
          {selectedCustomer && xpPreview > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">XP Earned</span><span className="font-medium text-purple-600">+{xpPreview} XP</span></div>}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200"><span className="text-gray-900">Total</span><span className="text-pink-600">{formatCurrency(total)}</span></div>
        </div>
        <div className="p-4 border-t border-gray-100">
          <Button onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0} className="w-full bg-pink-600 hover:bg-pink-700">Bayar ({cart.length} item)</Button>
        </div>
      </Card>

      {/* Undo Toast */}
      {showUndoToast && undoItem && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4">
          <span className="text-sm">Item dihapus</span>
          <Button variant="ghost" size="sm" onClick={undoRemove} className="text-pink-400 hover:text-pink-300"><Undo2 className="w-4 h-4 mr-1" />Undo</Button>
        </div>
      )}

      {/* Customization Modal */}
      <Dialog open={customizingItem !== null} onOpenChange={(open) => !open && setCustomizingItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{customizingItem?.name}</DialogTitle>
            <p className="text-sm text-gray-500">Konfigurasi pesanan</p>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}><Minus className="w-5 h-5" /></Button>
                <Input type="number" value={customQuantity} onChange={(e) => setCustomQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 text-center" min="1" />
                <Button variant="outline" size="icon" onClick={() => setCustomQuantity(customQuantity + 1)}><Plus className="w-5 h-5" /></Button>
              </div>
            </div>

            {/* Variants */}
            {mockVariants[customizingItem?.id || 0] && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Varian</label>
                <div className="space-y-3">
                  {['size', 'temp', 'part'].map(type => {
                    const typeVariants = mockVariants[customizingItem?.id || 0]?.filter(v => v.type === type) || [];
                    if (typeVariants.length === 0) return null;
                    return (
                      <div key={type}>
                        <div className="text-xs text-gray-500 uppercase mb-2">{type === 'size' ? 'Ukuran' : type === 'temp' ? 'Temperatur' : 'Bagian'}</div>
                        <div className="flex flex-wrap gap-2">
                          {typeVariants.map(variant => (
                            <Button key={variant.id} variant={customVariants[type] === variant.id ? 'default' : 'outline'} size="sm" onClick={() => setCustomVariants(prev => ({ ...prev, [type]: variant.id }))}>
                              {variant.name} {variant.priceAdj !== 0 && <span className="text-xs opacity-70">({variant.priceAdj > 0 ? '+' : ''}{formatCurrency(variant.priceAdj)})</span>}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modifiers */}
            {mockModifierGroups[customizingItem?.id || 0] && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kustomisasi</label>
                <div className="space-y-3">
                  {mockModifierGroups[customizingItem?.id || 0].map(group => (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-gray-900">{group.name}</span>
                        <span className="text-xs text-gray-500">{group.required ? '(Wajib)' : `(Max ${group.maxSelect})`}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.modifiers.map(modifier => {
                          const isSelected = customModifiers[group.id]?.includes(modifier.id) || false;
                          const currentCount = customModifiers[group.id]?.length || 0;
                          const canSelect = !isSelected && currentCount < group.maxSelect;
                          return (
                            <Button key={modifier.id} variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => {
                              if (isSelected) setCustomModifiers(prev => ({ ...prev, [group.id]: prev[group.id].filter(id => id !== modifier.id) }));
                              else if (canSelect) setCustomModifiers(prev => ({ ...prev, [group.id]: [...(prev[group.id] || []), modifier.id] }));
                            }} disabled={!isSelected && !canSelect} className={isSelected ? 'bg-green-600 hover:bg-green-700' : ''}>
                              {modifier.name} {modifier.priceAdj !== 0 && <span className="text-xs opacity-70">+{formatCurrency(modifier.priceAdj)}</span>}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catatan Spesial</label>
              <Input value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} placeholder="Contoh: Tanpa bawang, pedas sekali..." />
            </div>

            {/* Running Total */}
            <div className="p-4 bg-pink-50 rounded-lg">
              <div className="flex justify-between items-center"><span className="text-gray-700">Harga per item</span><span className="text-xl font-bold text-pink-600">{formatCurrency(calculateCustomPrice())}</span></div>
              <div className="flex justify-between items-center mt-1"><span className="text-gray-500">Total</span><span className="text-2xl font-bold text-pink-600">{formatCurrency(calculateCustomPrice() * customQuantity)}</span></div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomizingItem(null)}>Batal</Button>
            <Button onClick={addToCart} className="bg-pink-600 hover:bg-pink-700"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => !open && setShowPaymentModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
            <div className="flex gap-2 mt-2">
              {orderType === 'dine_in' && selectedTable && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{tables.find(t => t.id === selectedTable)?.name}</span>}
              {selectedCustomer && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1"><User className="w-3 h-3" />{selectedCustomer.name}</span>}
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Total */}
            <div className="text-center py-4 bg-pink-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Total Pembayaran</div>
              <div className="text-3xl font-bold text-pink-600">{formatCurrency(total)}</div>
            </div>

            {/* Payment Method Tabs */}
            <div className="flex border-b border-gray-200">
              {[{ id: 'cash', label: 'Tunai', icon: Banknote }, { id: 'qris', label: 'QRIS', icon: Wallet }, { id: 'debit', label: 'Debit', icon: CreditCard }, { id: 'split', label: 'Split', icon: Coins }].map(method => (
                <button key={method.id} onClick={() => setPaymentMethod(method.id as PaymentMethod)} className={`flex-1 py-2 text-sm font-medium border-b-2 ${paymentMethod === method.id ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500'}`}>
                  <method.icon className="w-4 h-4 mx-auto mb-1" />
                  {method.label}
                </button>
              ))}
            </div>

            {/* Cash Input */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Uang Diterima</label>
                  <Input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} placeholder="0" autoFocus />
                </div>
                <div className="flex gap-2">
                  {[50000, 100000, 200000, 500000].map(amount => (
                    <Button key={amount} variant="outline" size="sm" onClick={() => setCashReceived(String(amount))} className="flex-1">{formatCurrency(amount)}</Button>
                  ))}
                </div>
                {parseInt(cashReceived || '0') >= total && (
                  <div className="p-3 bg-green-50 rounded-lg flex justify-between"><span className="text-gray-700">Kembalian</span><span className="text-lg font-bold text-green-600">{formatCurrency(parseInt(cashReceived) - total)}</span></div>
                )}
              </div>
            )}

            {/* QRIS */}
            {paymentMethod === 'qris' && (
              <div className="text-center py-8">
                <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center"><span className="text-gray-400">QR Code</span></div>
                <p className="text-sm text-gray-500">Scan QRIS untuk membayar</p>
              </div>
            )}

            {/* Debit */}
            {paymentMethod === 'debit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Kartu</label>
                <Input placeholder="**** **** **** ****" />
              </div>
            )}

            {/* Split */}
            {paymentMethod === 'split' && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg flex justify-between"><span className="text-gray-700">Sisa Bayar</span><span className="font-bold text-blue-600">{formatCurrency(remainingSplit)}</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-pink-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (getTotalSplitPaid() / total) * 100)}%` }} /></div>
                {splitPayments.map((split) => (
                  <div key={split.id} className="flex gap-2 items-center">
                    <select value={split.method} onChange={(e) => updateSplitPayment(split.id, 'method', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                      <option value="cash">Tunai</option><option value="qris">QRIS</option><option value="debit">Debit</option><option value="wallet">Wallet</option>
                    </select>
                    <Input type="number" value={split.amount} onChange={(e) => updateSplitPayment(split.id, 'amount', e.target.value)} className="flex-1" placeholder="Jumlah" />
                    <Button variant="ghost" size="icon-sm" onClick={() => removeSplitPayment(split.id)}><MinusCircle className="w-5 h-5 text-red-500" /></Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addSplitPayment} disabled={remainingSplit <= 0} className="w-full"><PlusCircle className="w-4 h-4 mr-2" />Tambah Pembayaran</Button>
              </div>
            )}

            {/* Tip Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-700">Tambahkan Tip</span>
              <Button variant="outline" size="sm" onClick={() => setShowTipInput(!showTipInput)}>{showTipInput ? 'Sembunyikan' : 'Tambah'}</Button>
            </div>
            {showTipInput && <Input type="number" value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} placeholder="Jumlah tip" />}

            {/* Digital Receipt */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Struk Digital</span>
              <Button variant={digitalReceipt ? 'default' : 'outline'} size="sm" onClick={() => setDigitalReceipt(!digitalReceipt)} className={digitalReceipt ? 'bg-pink-600' : ''}>{digitalReceipt ? 'Aktif' : 'Nonaktif'}</Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Batal</Button>
            <Button onClick={completeOrder} disabled={!isPaymentValid()} className="bg-pink-600 hover:bg-pink-700"><Check className="w-4 h-4 mr-2" />Bayar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
