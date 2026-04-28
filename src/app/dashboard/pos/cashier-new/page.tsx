'use client';

import { useState, useEffect } from 'react';
import { Search, Utensils, ShoppingBag, Truck, Monitor, Table as TableIcon, User, X, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProducts, getCustomers, createOrder, getCustomerFavoriteProducts, type Product, type Customer } from '@/lib/pos-api';
import { CartPanel } from '@/components/pos/CartPanel';

type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'self_order';
type PaymentMethod = 'cash' | 'qris' | 'credit_card' | 'ark_coin';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  variantName?: string;
  modifierNames?: string[];
}

interface CustomizationState {
  isOpen: boolean;
  product: Product | null;
  selectedVariant: string | null;
  selectedModifiers: Record<string, string[]>;
  quantity: number;
  notes: string;
}

const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log('[POS]', ...args);

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const formatArk = (value: number) => `${(value / 1000).toFixed(0)} ARK`;

export default function CashierPageNew() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [includeTax, setIncludeTax] = useState(false);
  const [notes, setNotes] = useState('');
  const [arkToUse, setArkToUse] = useState<number>(0);
  const [customerFavorites, setCustomerFavorites] = useState<Product[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [customization, setCustomization] = useState<CustomizationState>({
    isOpen: false,
    product: null,
    selectedVariant: null,
    selectedModifiers: {},
    quantity: 1,
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, customersRes] = await Promise.all([
          getProducts(),
          getCustomers()
        ]);
        setProducts(productsRes.data || []);
        setCustomers(customersRes.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerFavorites([]);
      return;
    }
    const fetchFavorites = async () => {
      try {
        setLoadingFavorites(true);
        const favorites = await getCustomerFavoriteProducts(selectedCustomer.id, products);
        setCustomerFavorites(favorites);
      } catch (err) {
        setCustomerFavorites([]);
      } finally {
        setLoadingFavorites(false);
      }
    };
    fetchFavorites();
  }, [selectedCustomer, products]);

  const getDiscountByTier = (tier: string): number => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 15;
      case 'gold': return 10;
      case 'silver': return 5;
      default: return 0;
    }
  };

  const customersWithDiscount = customers.map(c => ({
    ...c,
    discount: getDiscountByTier(c.membership_tier)
  }));

  const filteredCustomers = customersWithDiscount.filter(c => 
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
  );

  const categories = ['Semua', ...Array.from(new Set(products.map(p => p.category?.name || 'Uncategorized')))];

  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === 'Semua' || p.category?.name === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = selectedCustomer ? Math.floor(subtotal * selectedCustomer.discount! / 100) : 0;
  const afterDiscount = subtotal - discountAmount;
  const tax = includeTax ? afterDiscount * 0.1 : 0;
  const total = afterDiscount + tax;
  const maxArkUsable = selectedCustomer ? Math.min(selectedCustomer.ark_coin_balance, total) : 0;
  const arkToUseCapped = Math.min(arkToUse, maxArkUsable);
  const totalAfterArk = total - arkToUseCapped;

  const openCustomization = (product: Product) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const hasModifiers = product.modifiers && product.modifiers.length > 0;
    
    log('Opening customization for:', product.name, { hasVariants, hasModifiers });
    
    if (!hasVariants && !hasModifiers) {
      addToCartDirect(product, 1);
      return;
    }
    
    const defaultVariant = hasVariants ? product.variants[0].id : null;
    const defaultModifiers: Record<string, string[]> = {};
    if (hasModifiers) {
      product.modifiers.forEach(group => {
        if (group.modifier_group.modifiers.length > 0) {
          defaultModifiers[group.modifier_group.name] = [group.modifier_group.modifiers[0].id];
        }
      });
    }
    
    setCustomization({
      isOpen: true,
      product,
      selectedVariant: defaultVariant,
      selectedModifiers: defaultModifiers,
      quantity: 1,
      notes: ''
    });
  };

  const addToCartDirect = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.base_price,
        quantity,
        variantName: undefined,
        modifierNames: undefined
      }];
    });
  };

  const confirmCustomization = () => {
    if (!customization.product) return;
    
    const product = customization.product;
    const variant = product.variants?.find(v => v.id === customization.selectedVariant);
    const variantPriceAdj = variant?.price_adjustment || 0;
    
    let modifierPriceAdj = 0;
    const modifierNames: string[] = [];
    
    if (product.modifiers) {
      product.modifiers.forEach(group => {
        const selectedIds = customization.selectedModifiers[group.modifier_group.name] || [];
        selectedIds.forEach(modId => {
          const mod = group.modifier_group.modifiers.find(m => m.id === modId);
          if (mod) {
            modifierPriceAdj += mod.price_adjustment;
            modifierNames.push(mod.name);
          }
        });
      });
    }
    
    const finalPrice = product.base_price + variantPriceAdj + modifierPriceAdj;
    const variantName = variant?.name;
    
    setCart(prev => {
      const existing = prev.find(item => 
        item.id === product.id && 
        item.variantName === variantName &&
        JSON.stringify(item.modifierNames) === JSON.stringify(modifierNames)
      );
      
      if (existing) {
        return prev.map(item => 
          item.id === product.id && 
          item.variantName === variantName &&
          JSON.stringify(item.modifierNames) === JSON.stringify(modifierNames)
            ? { ...item, quantity: item.quantity + customization.quantity }
            : item
        );
      }
      
      return [...prev, {
        id: product.id,
        name: product.name,
        price: finalPrice,
        quantity: customization.quantity,
        variantName,
        modifierNames,
        notes: customization.notes
      }];
    });
    
    setCustomization({
      isOpen: false,
      product: null,
      selectedVariant: null,
      selectedModifiers: {},
      quantity: 1,
      notes: ''
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const selectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
    setCustomerSearch('');
  };

  const isPaymentValid = () => {
    if (cart.length === 0) return false;
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0;
      return received >= totalAfterArk;
    }
    return true;
  };

  const handleCreateOrder = async () => {
    if (!cart || cart.length === 0) {
      alert('❌ Cart kosong! Tambahkan products dulu.');
      return;
    }
    
    if (!isPaymentValid()) {
      alert('❌ Payment tidak valid!');
      return;
    }
    
    try {
      const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const cartDiscount = selectedCustomer ? Math.floor(cartSubtotal * selectedCustomer.discount! / 100) : 0;
      const cartAfterDiscount = cartSubtotal - cartDiscount;
      const cartTax = includeTax ? cartAfterDiscount * 0.1 : 0;
      const cartTotal = cartAfterDiscount + cartTax;
      
      const orderItems = cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        product_sku: `SKU-${item.id}`,
        variants: item.variantName ? [{ name: item.variantName, group: 'Size', price: 0 }] : [],
        modifiers: item.modifierNames?.map(name => ({ name, group: 'Options' })) || [],
        quantity: Number(item.quantity),
        unit_price: Number(item.price),
        subtotal: Number(item.price * item.quantity),
        total_amount: Number(item.price * item.quantity)
      }));

      const DEFAULT_CASHIER_ID = '00000000-0000-0000-0000-000000000001';
      
      const payload: any = {
        order_type: orderType,
        customer_id: selectedCustomer?.id,
        cashier_id: DEFAULT_CASHIER_ID,
        items: orderItems,
        subtotal: Number(cartSubtotal),
        discount_amount: Number(cartDiscount),
        tax_amount: Number(cartTax),
        service_charge_amount: 0,
        total_amount: Number(cartTotal),
        payment_method: paymentMethod === 'qris' ? 'qris' : paymentMethod === 'credit_card' ? 'credit' : paymentMethod === 'ark_coin' ? 'ark_coin' : 'cash',
        amount_paid: paymentMethod === 'cash' ? Number(parseFloat(cashReceived) || cartTotal) : Number(cartTotal),
        notes: notes || undefined,
        ark_coins_used: 0
      };
      
      const response = await createOrder(payload);

      if (response.success) {
        alert(`✅ Order berhasil!\n\nOrder ID: ${response.data.id}\nTotal: ${formatCurrency(total)}`);
        setCart([]);
        setSelectedTable(null);
        setSelectedCustomer(null);
        setPaymentMethod('cash');
        setCashReceived('');
        setNotes('');
        setShowPaymentModal(false);
      } else {
        alert(`❌ Error: ${response.error || 'Failed to create order'}`);
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-4">
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex items-center gap-4">
            <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-medium text-gray-900">Loading...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-xl p-4 z-50">
          <div className="flex items-center gap-2 text-red-700">
            <X className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

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
                <TableIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-900">Pilih Meja (Demo)</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button key={num} onClick={() => setSelectedTable(selectedTable === `Meja ${num}` ? null : `Meja ${num}`)} className={`py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all ${selectedTable === `Meja ${num}` ? 'border-pink-600 bg-pink-600 text-white' : 'border-gray-200 text-gray-700 hover:border-pink-400'}`}>
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer + Search */}
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCustomerModal(true)} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all min-w-[180px] ${
              selectedCustomer 
                ? 'bg-pink-50 border-pink-200 hover:bg-pink-100' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <User className={`w-4 h-4 ${selectedCustomer ? 'text-pink-600' : 'text-gray-500'}`} />
            <span className={`text-sm font-medium ${selectedCustomer ? 'text-pink-700' : 'text-gray-700'}`}>
              {selectedCustomer?.name ? selectedCustomer.name.split(' ')[0] : 'Cari Pelanggan'}
            </span>
          </button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Cari produk..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all placeholder:text-gray-400" 
            />
          </div>
        </div>

        {/* Selected Customer Info */}
        {selectedCustomer && (
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-amber-50 rounded-lg border border-pink-100">
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-xs flex-shrink-0">
              {selectedCustomer.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{selectedCustomer.name}</div>
              <div className="text-xs text-gray-600 flex items-center gap-2">
                <span className="capitalize">{selectedCustomer.membership_tier}</span>
                <span className="text-gray-300">•</span>
                <span className="text-green-600 font-medium">Diskon {selectedCustomer.discount}%</span>
                <span className="text-gray-300">•</span>
                <span className="text-amber-600 font-medium">{formatArk(selectedCustomer.ark_coin_balance)}</span>
              </div>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Customer Favorites */}
        {(customerFavorites.length > 0 || loadingFavorites) && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">
                Favorit {selectedCustomer?.name?.split(' ')[0]}
              </span>
              {loadingFavorites ? (
                <span className="text-xs text-amber-600">Loading...</span>
              ) : (
                <span className="text-xs text-amber-600">({customerFavorites.length} menu)</span>
              )}
            </div>
            {loadingFavorites ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {customerFavorites.map(product => (
                  <button
                    key={product.id}
                    onClick={() => openCustomization(product)}
                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={product.image_url || '/products/placeholder.png'} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">{product.name}</div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xs text-pink-600 font-semibold">{formatCurrency(product.base_price)}</span>
                        <span className="text-[10px] text-amber-600 font-medium">{formatArk(product.base_price)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => openCustomization(product)}
                className="flex flex-col bg-white rounded-xl border border-gray-200 hover:border-pink-400 hover:shadow-lg transition-all overflow-hidden group"
              >
                <div className="aspect-square w-full overflow-hidden bg-gray-100">
                  <img
                    src={product.image_url || '/products/placeholder.png'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2 flex flex-col gap-1">
                  <div className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">
                    {product.name}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-xs font-bold text-pink-600">
                      {formatCurrency(product.base_price)}
                    </div>
                    <div className="text-[10px] text-amber-600 font-medium">
                      {formatArk(product.base_price)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Cart */}
      <CartPanel
        cart={cart}
        orderType={orderType}
        selectedTable={selectedTable}
        subtotal={subtotal}
        discountAmount={discountAmount}
        selectedCustomer={selectedCustomer}
        includeTax={includeTax}
        tax={tax}
        arkToUseCapped={arkToUseCapped}
        paymentMethod={paymentMethod}
        totalAfterArk={totalAfterArk}
        total={total}
        formatCurrency={formatCurrency}
        formatArk={formatArk}
        setIncludeTax={setIncludeTax}
        setShowPaymentModal={() => setShowPaymentModal(true)}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
      />

      {/* Customer Modal */}
      <Dialog open={showCustomerModal} onOpenChange={(open) => !open && setShowCustomerModal(false)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pilih Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Cari pelanggan..." 
                value={customerSearch} 
                onChange={(e) => setCustomerSearch(e.target.value)} 
                autoFocus 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" 
              />
            </div>
            
            <button onClick={() => selectCustomer(null)} className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium">Guest / Tanpa Pelanggan</div>
                <div className="text-sm text-gray-500">Tidak mendapat diskon</div>
              </div>
            </button>
            
            <div className="space-y-2">
              {filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => selectCustomer(customer)}
                  className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 hover:bg-pink-50 hover:border-pink-300 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                    {customer.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      customer.membership_tier === 'platinum' ? 'bg-purple-100 text-purple-700' :
                      customer.membership_tier === 'gold' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {customer.membership_tier}
                    </span>
                    {customer.discount > 0 && (
                      <div className="text-xs text-green-600 font-medium mt-1">-{customer.discount}%</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => !open && setShowPaymentModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Metode Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${paymentMethod === 'cash' ? 'border-pink-600 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="text-lg font-semibold">Cash</div>
                <div className="text-xs text-gray-500">Bayar dengan uang tunai</div>
              </button>
              <button
                onClick={() => setPaymentMethod('qris')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${paymentMethod === 'qris' ? 'border-pink-600 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="text-lg font-semibold">QRIS</div>
                <div className="text-xs text-gray-500">Scan QR code</div>
              </button>
              <button
                onClick={() => setPaymentMethod('credit_card')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${paymentMethod === 'credit_card' ? 'border-pink-600 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="text-lg font-semibold">Credit Card</div>
                <div className="text-xs text-gray-500">Visa / Mastercard</div>
              </button>
              <button
                onClick={() => setPaymentMethod('ark_coin')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${paymentMethod === 'ark_coin' ? 'border-pink-600 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="text-lg font-semibold">ARK Coin</div>
                <div className="text-xs text-gray-500">{formatArk(selectedCustomer?.ark_coin_balance || 0)}</div>
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Jumlah Uang Diterima</label>
                <input
                  type="number"
                  placeholder="0"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <div className="text-sm text-gray-500">
                  Kembalian: {formatCurrency((parseFloat(cashReceived) || 0) - totalAfterArk)}
                </div>
              </div>
            )}

            {paymentMethod === 'ark_coin' && selectedCustomer && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Gunakan ARK Coin</label>
                <input
                  type="range"
                  min={0}
                  max={maxArkUsable}
                  value={arkToUse}
                  onChange={(e) => setArkToUse(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-500">
                  Menggunakan: {formatArk(arkToUse)} (Max: {formatArk(maxArkUsable)})
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-pink-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleCreateOrder}
              className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700"
            >
              Konfirmasi Pembayaran
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customization Modal */}
      <Dialog open={customization.isOpen} onOpenChange={(open) => !open && setCustomization({ ...customization, isOpen: false })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{customization.product?.name}</DialogTitle>
          </DialogHeader>
          {customization.product && (
            <div className="space-y-6 py-4">
              {/* Product Info */}
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={customization.product.image_url || '/products/placeholder.png'} alt={customization.product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-pink-600">{formatCurrency(customization.product.base_price)}</div>
                  <div className="text-sm text-amber-600 font-medium">{formatArk(customization.product.base_price)}</div>
                </div>
              </div>

              {/* Variant Selection */}
              {customization.product.variants && customization.product.variants.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-600" />
                    Pilih Varian
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {customization.product.variants.map((variant) => {
                      const isSelected = customization.selectedVariant === variant.id;
                      const priceText = variant.price_adjustment > 0 
                        ? `+${formatCurrency(variant.price_adjustment)}` 
                        : variant.price_adjustment < 0 
                        ? `${formatCurrency(variant.price_adjustment)}` 
                        : 'Same price';
                      
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setCustomization({ ...customization, selectedVariant: variant.id })}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected 
                              ? 'border-pink-600 bg-pink-50' 
                              : 'border-gray-200 hover:border-pink-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{variant.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{priceText}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modifier Selection */}
              {customization.product.modifiers && customization.product.modifiers.map((modifierGroup) => (
                <div key={modifierGroup.modifier_group.id} className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-pink-600" />
                    {modifierGroup.modifier_group.name}
                    {modifierGroup.modifier_group.is_required && (
                      <span className="text-xs text-red-500">*</span>
                    )}
                  </label>
                  <div className="space-y-2">
                    {modifierGroup.modifier_group.modifiers.map((modifier) => {
                      const groupName = modifierGroup.modifier_group.name;
                      const selectedIds = customization.selectedModifiers[groupName] || [];
                      const isSelected = selectedIds.includes(modifier.id);
                      const priceText = modifier.price_adjustment > 0 
                        ? `+${formatCurrency(modifier.price_adjustment)}` 
                        : modifier.price_adjustment < 0 
                        ? `${formatCurrency(modifier.price_adjustment)}` 
                        : '';
                      
                      return (
                        <button
                          key={modifier.id}
                          type="button"
                          onClick={() => {
                            const newSelected = isSelected
                              ? selectedIds.filter(id => id !== modifier.id)
                              : [...selectedIds, modifier.id];
                            setCustomization({ 
                              ...customization, 
                              selectedModifiers: { ...customization.selectedModifiers, [groupName]: newSelected }
                            });
                          }}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center justify-between ${
                            isSelected 
                              ? 'border-pink-600 bg-pink-50' 
                              : 'border-gray-200 hover:border-pink-300'
                          }`}
                        >
                          <span className="font-medium text-gray-900">{modifier.name}</span>
                          {priceText && (
                            <span className="text-sm text-amber-600 font-medium">{priceText}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Catatan Tambahan</label>
                <textarea
                  value={customization.notes}
                  onChange={(e) => setCustomization({ ...customization, notes: e.target.value })}
                  placeholder="Contoh: Jangan terlalu pedas, kurang manis, dll."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm font-medium text-gray-700">Jumlah</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCustomization({ ...customization, quantity: Math.max(1, customization.quantity - 1) })}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="text-lg font-medium w-8 text-center">{customization.quantity}</span>
                  <button
                    onClick={() => setCustomization({ ...customization, quantity: customization.quantity + 1 })}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="pt-4 mt-4 border-t border-pink-200">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-lg font-bold text-gray-900">Total</div>
                    <div className="text-xs text-gray-600">× {customization.quantity} item</div>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const variant = customization.product.variants?.find(v => v.id === customization.selectedVariant);
                      const variantAdj = variant?.price_adjustment || 0;
                      let modifierAdj = 0;
                      if (customization.product.modifiers) {
                        customization.product.modifiers.forEach(group => {
                          const selectedIds = customization.selectedModifiers[group.modifier_group.name] || [];
                          selectedIds.forEach(modId => {
                            const mod = group.modifier_group.modifiers.find(m => m.id === modId);
                            if (mod) modifierAdj += mod.price_adjustment;
                          });
                        });
                      }
                      const unitPrice = customization.product.base_price + variantAdj + modifierAdj;
                      const totalPrice = unitPrice * customization.quantity;
                      return (
                        <>
                          <div className="text-2xl font-bold text-pink-600">{formatCurrency(totalPrice)}</div>
                          <div className="text-sm text-amber-600 font-medium">{formatArk(totalPrice)}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setCustomization({ ...customization, isOpen: false })}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  onClick={confirmCustomization}
                  className="flex-1 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700"
                >
                  Tambah ke Pesanan
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
