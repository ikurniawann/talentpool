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
  Printer,
  Package,
  X,
  Undo2,
  User,
  Star,
  Coins,
  ChevronDown,
  ChevronUp,
  Check,
  Utensils,
  ShoppingBag,
  Truck,
  Monitor,
  Table,
  Sparkles,
  MinusCircle,
  PlusCircle
} from 'lucide-react';

// ============== MOCK DATA ==============
const mockProducts = [
  { id: 1, name: 'Nasi Goreng Special', price: 50000, category: 'Makanan', image: null, hasVariants: true, hasModifiers: true },
  { id: 2, name: 'Ayam Bakar Madu', price: 55000, category: 'Makanan', image: null, hasVariants: true, hasModifiers: false },
  { id: 3, name: 'Mie Goreng Jawa', price: 45000, category: 'Makanan', image: null, hasVariants: false, hasModifiers: true },
  { id: 4, name: 'Es Teh Manis', price: 5000, category: 'Minuman', image: null, hasVariants: true, hasModifiers: true },
  { id: 5, name: 'Kopi Susu Gula Aren', price: 18000, category: 'Minuman', image: null, hasVariants: true, hasModifiers: true },
  { id: 6, name: 'Jus Alpukat', price: 15000, category: 'Minuman', image: null, hasVariants: false, hasModifiers: true },
  { id: 7, name: 'Kentang Goreng', price: 12000, category: 'Snack', image: null, hasVariants: false, hasModifiers: true },
  { id: 8, name: 'Roti Bakar', price: 20000, category: 'Snack', image: null, hasVariants: true, hasModifiers: true },
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
    { id: 'v4-r', name: 'Regular', priceAdj: 0, type: 'temp' },
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
    { id: 'mg4-i', name: 'Ice Level', required: false, maxSelect: 1, modifiers: [
      { id: 'm4-i1', name: 'Less Ice', priceAdj: 0 },
      { id: 'm4-i2', name: 'Normal Ice', priceAdj: 0 },
      { id: 'm4-i3', name: 'Extra Ice', priceAdj: 1000 },
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
  7: [
    { id: 'mg7-s', name: 'Seasoning', required: false, maxSelect: 2, modifiers: [
      { id: 'm7-s1', name: 'Extra Salt', priceAdj: 0 },
      { id: 'm7-s2', name: 'Cheese Sauce', priceAdj: 5000 },
    ]},
  ],
  8: [
    { id: 'mg8-s', name: 'Sugar Level', required: true, maxSelect: 1, modifiers: [
      { id: 'm8-s1', name: 'No Sugar', priceAdj: 0 },
      { id: 'm8-s2', name: 'Less Sweet', priceAdj: 0 },
      { id: 'm8-s3', name: 'Normal Sweet', priceAdj: 0 },
    ]},
    { id: 'mg8-t', name: 'Toppings', required: false, maxSelect: 3, modifiers: [
      { id: 'm8-t1', name: 'Butter', priceAdj: 3000 },
      { id: 'm8-t2', name: 'Chocolate Spread', priceAdj: 5000 },
      { id: 'm8-t3', name: 'Cheese', priceAdj: 5000 },
    ]},
  ],
};

const mockCustomers = [
  { id: 'c1', name: 'Ahmad Wijaya', phone: '081234567890', tier: 'Gold', xp: 12500, xpNext: 20000, arkCoin: 250000 },
  { id: 'c2', name: 'Siti Rahayu', phone: '081234567891', tier: 'Silver', xp: 8500, xpNext: 15000, arkCoin: 85000 },
  { id: 'c3', name: 'Budi Santoso', phone: '081234567892', tier: 'Platinum', xp: 45000, xpNext: 50000, arkCoin: 1500000 },
];

const tables = [
  { id: 't1', name: 'Meja 1', capacity: 4, status: 'available' },
  { id: 't2', name: 'Meja 2', capacity: 2, status: 'occupied' },
  { id: 't3', name: 'Meja 3', capacity: 6, status: 'available' },
  { id: 't4', name: 'Meja 4', capacity: 4, status: 'reserved' },
  { id: 't5', name: 'Meja 5', capacity: 2, status: 'available' },
  { id: 't6', name: 'Meja 6', capacity: 8, status: 'available' },
];

const categories = ['Semua', 'Makanan', 'Minuman', 'Snack'];

// ============== TYPES ==============
type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'self_order';

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

type SplitPayment = {
  id: string;
  method: 'cash' | 'qris' | 'debit' | 'wallet';
  amount: number;
};

// ============== HELPERS ==============
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debit' | 'split'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [showTipInput, setShowTipInput] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [digitalReceipt, setDigitalReceipt] = useState(true);
  
  // Undo toast
  const [undoItem, setUndoItem] = useState<CartItem | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Filter products
  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter customers
  const filteredCustomers = mockCustomers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = subtotal * 0.1;
  const tip = showTipInput && tipAmount ? parseInt(tipAmount) || 0 : 0;
  const total = subtotal + tax + tip;

  // Open customization modal
  const openCustomization = (product: typeof mockProducts[0]) => {
    setCustomizingItem(product);
    setCustomQuantity(1);
    setCustomVariants({});
    setCustomModifiers({});
    setCustomNotes('');
    
    // Pre-select required modifier groups first option
    const groups = mockModifierGroups[product.id] || [];
    const preSelect: Record<string, string[]> = {};
    groups.forEach(g => {
      if (g.required && g.modifiers.length > 0) {
        preSelect[g.id] = [g.modifiers[0].id];
      }
    });
    setCustomModifiers(preSelect);
  };

  // Close customization modal
  const closeCustomization = () => {
    setCustomizingItem(null);
  };

  // Calculate item price in customization
  const calculateCustomPrice = useCallback(() => {
    if (!customizingItem) return 0;
    let price = customizingItem.price;
    
    // Add variant adjustments
    Object.entries(customVariants).forEach(([, variantId]) => {
      const variants = mockVariants[customizingItem.id] || [];
      const variant = variants.find(v => v.id === variantId);
      if (variant) price += variant.priceAdj;
    });
    
    // Add modifier adjustments
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

  // Add to cart
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
    closeCustomization();
  };

  // Update quantity inline
  const updateQuantity = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setCart(prev => prev.map(item => 
      item.id === id 
        ? { ...item, quantity: newQty, totalPrice: item.unitPrice * newQty }
        : item
    ));
  };

  // Remove from cart with undo
  const removeFromCart = (id: string) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    
    setUndoItem(item);
    setShowUndoToast(true);
    setCart(prev => prev.filter(i => i.id !== id));
    
    setTimeout(() => {
      setShowUndoToast(false);
      setTimeout(() => setUndoItem(null), 300);
    }, 3000);
  };

  // Undo remove
  const undoRemove = () => {
    if (undoItem) {
      setCart(prev => [...prev, undoItem]);
      setUndoItem(null);
      setShowUndoToast(false);
    }
  };

  // Get total paid in split
  const getTotalSplitPaid = () => {
    return splitPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  const remainingSplit = total - getTotalSplitPaid();

  // Add split payment row
  const addSplitPayment = () => {
    setSplitPayments(prev => [...prev, {
      id: generateId(),
      method: 'cash',
      amount: remainingSplit > 0 ? remainingSplit : 0,
    }]);
  };

  // Update split payment
  const updateSplitPayment = (id: string, field: 'method' | 'amount', value: string | number) => {
    setSplitPayments(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: field === 'amount' ? Number(value) : value } : p
    ));
  };

  // Remove split payment
  const removeSplitPayment = (id: string) => {
    setSplitPayments(prev => prev.filter(p => p.id !== id));
  };

  // Check payment validity
  const isPaymentValid = () => {
    if (paymentMethod === 'cash') {
      return parseInt(cashReceived) >= total;
    }
    if (paymentMethod === 'split') {
      return getTotalSplitPaid() >= total;
    }
    return true;
  };

  // Complete order
  const completeOrder = () => {
    if (!isPaymentValid()) return;
    
    const orderTypeNames = {
      dine_in: 'Dine-in',
      takeaway: 'Takeaway',
      delivery: 'Delivery',
      self_order: 'Self-order',
    };
    
    alert(`Order berhasil!\n\nTipe: ${orderTypeNames[orderType]}\n${selectedTable ? `Meja: ${tables.find(t => t.id === selectedTable)?.name}\n` : ''}${selectedCustomer ? `Pelanggan: ${selectedCustomer.name}\n` : ''}Total: ${formatCurrency(total)}\n\nStruk akan ${digitalReceipt ? 'dikirim ke email' : 'dicetak'}.`);
    
    // Reset
    setCart([]);
    setSelectedTable(null);
    setSelectedCustomer(null);
    setPaymentMethod('cash');
    setCashReceived('');
    setSplitPayments([]);
    setTipAmount('');
    setShowPaymentModal(false);
  };

  // XP calculation preview
  const xpPreview = selectedCustomer ? Math.floor(total / 1000) * 10 : 0;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* LEFT: Products Panel */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {/* Header with Order Type */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kasir</h1>
          
          {/* Order Type Selector */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            <OrderTypeButton 
              active={orderType === 'dine_in'} 
              onClick={() => setOrderType('dine_in')}
              icon={<Utensils className="w-4 h-4" />}
              label="Dine-in"
            />
            <OrderTypeButton 
              active={orderType === 'takeaway'} 
              onClick={() => { setOrderType('takeaway'); setSelectedTable(null); }}
              icon={<ShoppingBag className="w-4 h-4" />}
              label="Takeaway"
            />
            <OrderTypeButton 
              active={orderType === 'delivery'} 
              onClick={() => { setOrderType('delivery'); setSelectedTable(null); }}
              icon={<Truck className="w-4 h-4" />}
              label="Delivery"
            />
            <OrderTypeButton 
              active={orderType === 'self_order'} 
              onClick={() => { setOrderType('self_order'); setSelectedTable(null); }}
              icon={<Monitor className="w-4 h-4" />}
              label="Self-order"
            />
          </div>

          {/* Table Selection for Dine-in */}
          {orderType === 'dine_in' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Table className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Pilih Meja</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {tables.map(table => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table.id)}
                    disabled={table.status === 'occupied'}
                    className={`
                      p-2 rounded-lg text-xs font-medium transition-all
                      ${selectedTable === table.id 
                        ? 'bg-pink-600 text-white' 
                        : table.status === 'occupied'
                          ? 'bg-red-100 text-red-400 cursor-not-allowed'
                          : table.status === 'reserved'
                            ? 'bg-yellow-100 text-yellow-600 cursor-not-allowed'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-pink-400'
                      }
                    `}
                  >
                    {table.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer Selector */}
        <div className="mb-6 relative">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Pelanggan</span>
          </div>
          
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{selectedCustomer.name}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className={`px-1.5 py-0.5 rounded-full ${
                      selectedCustomer.tier === 'Platinum' ? 'bg-purple-100 text-purple-700' :
                      selectedCustomer.tier === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
                      selectedCustomer.tier === 'Silver' ? 'bg-gray-100 text-gray-600' :
                      'bg-orange-100 text-orange-700'
                    }`}>{selectedCustomer.tier}</span>
                    <span>{selectedCustomer.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-2">
                  <div className="flex items-center gap-1 text-xs text-purple-600">
                    <Coins className="w-3 h-3" />
                    {formatCurrency(selectedCustomer.arkCoin)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-pink-600">
                    <Star className="w-3 h-3" />
                    {selectedCustomer.xp} XP
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari pelanggan atau ketik 'Walk-in'..."
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                />
              </div>
              
              {showCustomerDropdown && customerSearch && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Walk-in Customer
                  </button>
                  {filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => { setSelectedCustomer(customer); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                      className="w-full px-4 py-2 text-left hover:bg-pink-50 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">
                        {customer.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.phone}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        customer.tier === 'Platinum' ? 'bg-purple-100 text-purple-700' :
                        customer.tier === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{customer.tier}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* XP Preview */}
          {selectedCustomer && xpPreview > 0 && (
            <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700">+{xpPreview} XP akanearned dari pesanan ini</span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
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
              onClick={() => openCustomization(product)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-300 transition-all text-left group relative"
            >
              {(product.hasVariants || product.hasModifiers) && (
                <div className="absolute top-2 right-2">
                  <div className="flex gap-1">
                    {product.hasVariants && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">V</span>
                    )}
                    {product.hasModifiers && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded">M</span>
                    )}
                  </div>
                </div>
              )}
              <div className="h-16 sm:h-20 bg-gray-100 rounded-lg mb-3 flex items-center justify-center group-hover:bg-pink-50 transition-colors">
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

      {/* RIGHT: Smart Cart */}
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col max-h-[50vh] lg:max-h-none">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pesanan</h2>
              <p className="text-sm text-gray-500">{cart.length} item</p>
            </div>
            {orderType !== 'dine_in' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                {orderType === 'takeaway' ? 'Takeaway' : orderType === 'delivery' ? 'Delivery' : 'Self-order'}
              </span>
            )}
            {selectedTable && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                {tables.find(t => t.id === selectedTable)?.name}
              </span>
            )}
          </div>
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
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">{item.name}</h3>
                    {item.variants.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {item.variants.map(v => v.name).join(', ')}
                      </div>
                    )}
                    {item.modifiers.length > 0 && (
                      <div className="text-xs text-green-600">
                        + {item.modifiers.map(m => m.name).join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Item Notes */}
                {item.notes && (
                  <div className="text-xs text-gray-500 italic mb-2 pl-0">
                    📝 {item.notes}
                  </div>
                )}
                
                {/* Quantity & Price */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                      className="w-12 text-center text-sm font-medium border border-gray-200 rounded-lg py-1"
                      min="1"
                    />
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.totalPrice)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatCurrency(item.unitPrice)}/item
                    </div>
                  </div>
                </div>
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
          {tip > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tip</span>
              <span className="font-medium text-green-600">+{formatCurrency(tip)}</span>
            </div>
          )}
          {selectedCustomer && xpPreview > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">XP Earned</span>
              <span className="font-medium text-purple-600">+{xpPreview} XP</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-pink-600">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            Bayar ({cart.length} item)
          </button>
        </div>
      </div>

      {/* Undo Toast */}
      {showUndoToast && undoItem && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4 animate-pulse">
          <span className="text-sm">Item dihapus</span>
          <button
            onClick={undoRemove}
            className="flex items-center gap-1 text-sm text-pink-400 hover:text-pink-300 font-medium"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
        </div>
      )}

      {/* Customization Modal */}
      {customizingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{customizingItem.name}</h2>
                <p className="text-sm text-gray-500">Konfigurasi pesanan</p>
              </div>
              <button onClick={closeCustomization} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center text-xl font-bold border border-gray-200 rounded-lg py-2"
                    min="1"
                  />
                  <button
                    onClick={() => setCustomQuantity(customQuantity + 1)}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Variants */}
              {mockVariants[customizingItem.id] && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Varian</label>
                  <div className="space-y-3">
                    {/* Group variants by type */}
                    {['size', 'temp', 'part'].map(type => {
                      const typeVariants = mockVariants[customizingItem.id]?.filter(v => v.type === type) || [];
                      if (typeVariants.length === 0) return null;
                      
                      return (
                        <div key={type}>
                          <div className="text-xs text-gray-500 uppercase mb-2">
                            {type === 'size' ? 'Ukuran' : type === 'temp' ? 'Temperatur' : 'Bagian'}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {typeVariants.map(variant => (
                              <button
                                key={variant.id}
                                onClick={() => setCustomVariants(prev => ({ ...prev, [type]: variant.id }))}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  customVariants[type] === variant.id
                                    ? 'bg-pink-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {variant.name}
                                {variant.priceAdj !== 0 && (
                                  <span className={`ml-1 text-xs ${customVariants[type] === variant.id ? 'text-pink-200' : 'text-gray-400'}`}>
                                    ({variant.priceAdj > 0 ? '+' : ''}{formatCurrency(variant.priceAdj)})
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              {mockModifierGroups[customizingItem.id] && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kustomisasi</label>
                  <div className="space-y-4">
                    {mockModifierGroups[customizingItem.id].map(group => (
                      <div key={group.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900">{group.name}</span>
                          <span className="text-xs text-gray-500">
                            {group.required ? '(Wajib)' : `(Max ${group.maxSelect})`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.modifiers.map(modifier => {
                            const isSelected = customModifiers[group.id]?.includes(modifier.id) || false;
                            const currentCount = customModifiers[group.id]?.length || 0;
                            const canSelect = !isSelected && currentCount < group.maxSelect;
                            
                            return (
                              <button
                                key={modifier.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setCustomModifiers(prev => ({
                                      ...prev,
                                      [group.id]: (prev[group.id] || []).filter(id => id !== modifier.id)
                                    }));
                                  } else if (canSelect) {
                                    setCustomModifiers(prev => ({
                                      ...prev,
                                      [group.id]: [...(prev[group.id] || []), modifier.id]
                                    }));
                                  }
                                }}
                                disabled={!isSelected && !canSelect}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                  isSelected
                                    ? 'bg-green-600 text-white'
                                    : canSelect
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                }`}
                              >
                                {modifier.name}
                                {modifier.priceAdj !== 0 && (
                                  <span className={`ml-1 text-xs ${isSelected ? 'text-green-200' : 'text-gray-400'}`}>
                                    +{formatCurrency(modifier.priceAdj)}
                                  </span>
                                )}
                              </button>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan Spesial
                </label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Contoh: Tanpa bawang, pedas sekali..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                  rows={2}
                />
              </div>

              {/* Running Total */}
              <div className="p-4 bg-pink-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Harga per item</span>
                  <span className="text-xl font-bold text-pink-600">
                    {formatCurrency(calculateCustomPrice())}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-500">Total</span>
                  <span className="text-2xl font-bold text-pink-600">
                    {formatCurrency(calculateCustomPrice() * customQuantity)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={closeCustomization}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={addToCart}
                className="flex-1 px-4 py-2 text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Pembayaran</h2>
              <div className="flex gap-2 mt-2">
                {orderType === 'dine_in' && selectedTable && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    {tables.find(t => t.id === selectedTable)?.name}
                  </span>
                )}
                {selectedCustomer && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedCustomer.name}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Total Display */}
              <div className="text-center py-4 bg-pink-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Pembayaran</div>
                <div className="text-3xl font-bold text-pink-600">
                  {formatCurrency(total)}
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div className="flex border-b border-gray-200">
                {[
                  { id: 'cash', label: 'Tunai', icon: Banknote },
                  { id: 'qris', label: 'QRIS', icon: Wallet },
                  { id: 'debit', label: 'Debit', icon: CreditCard },
                  { id: 'split', label: 'Split', icon: Coins },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as typeof paymentMethod)}
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1 ${
                      paymentMethod === method.id
                        ? 'border-pink-600 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <method.icon className="w-4 h-4" />
                    {method.label}
                  </button>
                ))}
              </div>

              {/* Cash Input */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Uang Diterima
                    </label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full px-4 py-3 text-lg border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                  {/* Quick Denominations */}
                  <div className="flex gap-2">
                    {[50000, 100000, 200000, 500000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setCashReceived(String(amount))}
                        className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                  {parseInt(cashReceived || '0') >= total && (
                    <div className="p-3 bg-green-50 rounded-lg flex justify-between">
                      <span className="text-gray-700">Kembalian</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(parseInt(cashReceived) - total)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* QRIS */}
              {paymentMethod === 'qris' && (
                <div className="text-center py-8">
                  <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <span className="text-gray-400">QR Code Placeholder</span>
                  </div>
                  <p className="text-sm text-gray-500">Scan QRIS untuk membayar</p>
                </div>
              )}

              {/* Debit */}
              {paymentMethod === 'debit' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor Kartu
                    </label>
                    <input
                      type="text"
                      placeholder="**** **** **** ****"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>
              )}

              {/* Split Payment */}
              {paymentMethod === 'split' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg flex justify-between">
                    <span className="text-gray-700">Sisa Bayar</span>
                    <span className="font-bold text-blue-600">{formatCurrency(remainingSplit)}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-pink-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (getTotalSplitPaid() / total) * 100)}%` }}
                    />
                  </div>
                  
                  {/* Split Rows */}
                  {splitPayments.map((split, idx) => (
                    <div key={split.id} className="flex gap-2 items-center">
                      <select
                        value={split.method}
                        onChange={(e) => updateSplitPayment(split.id, 'method', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="cash">Tunai</option>
                        <option value="qris">QRIS</option>
                        <option value="debit">Debit</option>
                        <option value="wallet">Wallet</option>
                      </select>
                      <input
                        type="number"
                        value={split.amount}
                        onChange={(e) => updateSplitPayment(split.id, 'amount', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="Jumlah"
                      />
                      <button
                        onClick={() => removeSplitPayment(split.id)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <MinusCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={addSplitPayment}
                    disabled={remainingSplit <= 0}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-pink-400 hover:text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tambah Pembayaran
                  </button>
                </div>
              )}

              {/* Tip Toggle */}
              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => setShowTipInput(!showTipInput)}
                  className="flex items-center justify-between w-full text-sm"
                >
                  <span className="text-gray-700">Tambahkan Tip</span>
                  {showTipInput ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {showTipInput && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="number"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="Jumlah tip"
                    />
                  </div>
                )}
              </div>

              {/* Digital Receipt */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Struk Digital</span>
                <button
                  onClick={() => setDigitalReceipt(!digitalReceipt)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    digitalReceipt ? 'bg-pink-600' : 'bg-gray-200'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    digitalReceipt ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={completeOrder}
                disabled={!isPaymentValid()}
                className="flex-1 px-4 py-2 text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Bayar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Order Type Button Component
function OrderTypeButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-pink-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
