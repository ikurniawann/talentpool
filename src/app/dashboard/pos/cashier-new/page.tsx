'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Plus, Minus, Trash2, X, Utensils, ShoppingBag, Truck, Monitor,
  Table as TableIcon, User, Check, Coins, Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProducts, getCustomers, createOrder, getCustomerFavoriteProducts, type Product, type Customer } from '@/lib/pos-api';

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
  selectedModifiers: Record<string, string[]>; // groupId -> modifierIds
  quantity: number;
  notes: string;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const formatArk = (value: number) => `${(value / 1000).toFixed(0)} ARK`;

export default function CashierPageNew() {
  // API state
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
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
  
  // Customization state
  const [customization, setCustomization] = useState<CustomizationState>({
    isOpen: false,
    product: null,
    selectedVariant: null,
    selectedModifiers: {},
    quantity: 1,
    notes: ''
  });

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [productsRes, customersRes] = await Promise.all([
          getProducts(),
          getCustomers()
        ]);
        
        setProducts(productsRes.data || []);
        setCustomers(customersRes.data || []);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Helper to get discount by tier
  const getDiscountByTier = (tier: string): number => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 15;
      case 'gold': return 10;
      case 'silver': return 5;
      default: return 0;
    }
  };

  // Map customers with discount
  const customersWithDiscount = customers.map(c => ({
    ...c,
    discount: getDiscountByTier(c.membership_tier)
  }));

  // Filter products
  const categories = ['Semua', ...Array.from(new Set(products.map(p => p.category?.name || 'Uncategorized')))];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryName = p.category?.name || 'Uncategorized';
    const matchesCategory = selectedCategory === 'Semua' || categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredCustomers = customersWithDiscount.filter(c => 
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
  );

  // Get customer favorites based on transaction history
  const [customerFavorites, setCustomerFavorites] = useState<Product[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  
  // Fetch customer favorites when customer is selected
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!selectedCustomer) {
        setCustomerFavorites([]);
        return;
      }
      
      try {
        setLoadingFavorites(true);
        const favorites = await getCustomerFavoriteProducts(selectedCustomer.id, products);
        setCustomerFavorites(favorites);
      } catch (err) {
        console.error('Failed to fetch favorites:', err);
        setCustomerFavorites([]);
      } finally {
        setLoadingFavorites(false);
      }
    };
    
    fetchFavorites();
  }, [selectedCustomer]);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = selectedCustomer ? Math.floor(subtotal * selectedCustomer.discount! / 100) : 0;
  const afterDiscount = subtotal - discountAmount;
  const tax = includeTax ? afterDiscount * 0.1 : 0;
  const total = afterDiscount + tax;
  
  // Max ARK that can be used (min of: customer balance, total amount)
  const maxArkUsable = selectedCustomer ? Math.min(selectedCustomer.ark_coin_balance, total) : 0;
  const arkToUseCapped = Math.min(arkToUse, maxArkUsable);
  const totalAfterArk = total - arkToUseCapped;

  // Open customization modal
  const openCustomization = (product: Product) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const hasModifiers = product.modifiers && product.modifiers.length > 0;
    
    if (!hasVariants && !hasModifiers) {
      // No customization needed, add directly to cart
      addToCartDirect(product, 1);
      return;
    }
    
    // Pre-select first variant if exists
    const defaultVariant = hasVariants ? product.variants[0].id : null;
    
    // Pre-select first modifier for each required group
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
  
  // Add to cart directly (no customization)
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
        quantity: quantity,
        variantName: undefined,
        modifierNames: undefined
      }];
    });
  };
  
  // Confirm customization and add to cart
  const confirmCustomization = () => {
    if (!customization.product) return;
    
    const product = customization.product;
    const variant = product.variants?.find(v => v.id === customization.selectedVariant);
    const variantPriceAdj = variant?.price_adjustment || 0;
    
    // Calculate modifier price adjustments
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
    
    // Close modal
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

  // Create order
  const handleCreateOrder = async () => {
    console.log('=== HANDLE CREATE ORDER CALLED ===');
    console.log('Cart:', cart);
    console.log('Cart length:', cart.length);
    console.log('Payment method:', paymentMethod);
    console.log('Is valid?', isPaymentValid());
    
    if (!cart || cart.length === 0) {
      alert('❌ Cart kosong! Tambahkan products dulu.');
      return;
    }
    
    if (!isPaymentValid()) {
      alert('❌ Payment tidak valid! Check cart dan payment method.');
      return;
    }
    
    try {
      // Recalculate to ensure correct values
      const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const cartDiscount = selectedCustomer ? Math.floor(cartSubtotal * selectedCustomer.discount! / 100) : 0;
      const cartAfterDiscount = cartSubtotal - cartDiscount;
      const cartTax = includeTax ? cartAfterDiscount * 0.1 : 0;
      const arkValueInRp = paymentMethod === 'ark_coin' ? (arkToUseCapped * 1000) : 0; // Convert ARK to Rupiah
      const arkToUseFinal = paymentMethod === 'ark_coin' ? arkToUseCapped : 0;
      const cartTotal = cartAfterDiscount + cartTax - arkValueInRp;
      
      console.log('=== CALCULATION DEBUG ===');
      console.log('Cart:', cart);
      console.log('Subtotal:', cartSubtotal);
      console.log('Discount:', cartDiscount, '(', selectedCustomer?.discount, '% )');
      console.log('After Discount:', cartAfterDiscount);
      console.log('Tax:', cartTax, '(includeTax:', includeTax, ')');
      console.log('ARK Used:', arkToUseFinal);
      console.log('TOTAL:', cartTotal);
      
      console.log('Creating order...', {
        orderType,
        customerId: selectedCustomer?.id,
        cashierId: 'cashier-1',
        cartLength: cart.length,
        subtotal: cartSubtotal,
        total: cartTotal,
        paymentMethod,
        arkToUse: arkToUseFinal
      });
      
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

      console.log('Order items:', orderItems);

      // Build payload with default cashier UUID
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
        ark_coins_used: Number(arkToUseFinal)
      };
      
      console.log('Payload with cashier_id:', payload);
      
      console.log('Payload:', payload);

      const response = await createOrder(payload);

      if (response.success) {
        alert(`✅ Order berhasil!\n\nOrder ID: ${response.data.id}\nTotal: ${formatCurrency(total)}`);
        // Reset
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
      console.error('Order creation failed:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const isPaymentValid = () => {
    if (cart.length === 0) return false;
    if (paymentMethod === 'ark_coin') {
      return arkToUseCapped >= totalAfterArk && totalAfterArk <= 0;
    }
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0;
      return received >= totalAfterArk;
    }
    return true;
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-4">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex items-center gap-4">
            <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium text-gray-900">Loading...</span>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-xl p-4 z-50">
          <div className="flex items-center gap-2 text-red-700">
            <X className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* LEFT PANEL - Products */}
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
          <>
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
            
            {/* Customer Favorites */}
            {(customerFavorites.length > 0 || loadingFavorites) && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-700">
                    Favorit {selectedCustomer.name?.split(' ')[0]}
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
              </div>
            )}
          </>
        )}

        {/* Categories + Products Grid */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 overflow-hidden flex flex-col">
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <button 
                  key={product.id} 
                  onClick={() => openCustomization(product)} 
                  className="bg-gray-50 p-2 rounded-xl border border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all text-left"
                >
                  <div className="h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden p-1">
                    <img 
                      src={product.image_url || '/products/placeholder.png'} 
                      alt={product.name} 
                      className="w-full h-full object-cover rounded" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/products/placeholder.png';
                      }}
                    />
                  </div>
                  <div className="flex gap-1 mb-1">
                    {(product.variants && product.variants.length > 0) && (
                      <span className="px-1 py-0.5 bg-gray-200 text-gray-700 text-xs rounded font-medium">V</span>
                    )}
                    {(product.modifiers && product.modifiers.length > 0) && (
                      <span className="px-1 py-0.5 bg-gray-200 text-gray-700 text-xs rounded font-medium">M</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xs line-clamp-2 mb-0.5">{product.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-pink-600 font-bold text-xs">{formatCurrency(product.base_price)}</span>
                    <span className="text-amber-600 font-medium text-[10px]">{formatArk(product.base_price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Cart */}
      <div className="w-full lg:w-96 bg-white rounded-xl border border-gray-200 flex flex-col max-h-[60vh] lg:max-h-none">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Pesanan</h2>
            <span className="text-sm text-gray-500">{cart.reduce((sum, i) => sum + i.quantity, 0)} item</span>
          </div>
          
          {/* Order Type & Table Badges */}
          <div className="flex flex-wrap gap-2">
            {orderType === 'dine_in' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
                <Utensils className="w-3 h-3" />
                Dine-in
              </span>
            )}
            {orderType === 'takeaway' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                <ShoppingBag className="w-3 h-3" />
                Takeaway
              </span>
            )}
            {orderType === 'delivery' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                <Truck className="w-3 h-3" />
                Delivery
              </span>
            )}
            {orderType === 'self_order' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                <Monitor className="w-3 h-3" />
                Self-order
              </span>
            )}
            {selectedTable && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
                <TableIcon className="w-3 h-3" />
                {selectedTable}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada item</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{item.name}</div>
                  
                  {/* Variant & Modifiers */}
                  {(item.variantName || (item.modifierNames && item.modifierNames.length > 0)) && (
                    <div className="flex flex-wrap gap-1 mt-1 mb-1">
                      {item.variantName && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-pink-100 text-pink-700 text-xs font-medium rounded">
                          {item.variantName}
                        </span>
                      )}
                      {item.modifierNames && item.modifierNames.map((mod, idx) => (
                        <span key={idx} className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                          {mod}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Notes */}
                  {item.notes && (
                    <div className="text-xs text-gray-500 italic mt-1">📝 {item.notes}</div>
                  )}
                  
                  <div className="text-xs text-gray-500">{formatCurrency(item.price)}</div>
                  <div className="text-xs text-amber-600 font-medium">{formatArk(item.price)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => removeFromCart(item.id)} className="ml-1 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="p-4 border-t border-gray-200 space-y-2 bg-gray-50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <div className="text-right">
              <div className="font-medium text-gray-900">{formatCurrency(subtotal)}</div>
              <div className="text-xs text-amber-600 font-medium">{formatArk(subtotal)}</div>
            </div>
          </div>
          {discountAmount > 0 && selectedCustomer && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Diskon ({selectedCustomer.discount}%)</span>
              <span className="font-medium text-green-600">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <button onClick={() => setIncludeTax(!includeTax)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${includeTax ? 'bg-pink-600 border-pink-600' : 'border-gray-300'}`}>
                {includeTax && <Check className="w-3 h-3 text-white" />}
              </div>
              <span>Pajak (10%)</span>
            </button>
            <div className="text-right">
              <div className="font-medium text-gray-900">{formatCurrency(tax)}</div>
              <div className="text-xs text-amber-600 font-medium">{formatArk(tax)}</div>
            </div>
          </div>
          {paymentMethod === 'ark_coin' && arkToUseCapped > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-600">ARK Coin</span>
              <span className="font-medium text-amber-600">-{formatArk(arkToUseCapped)}</span>
            </div>
          )}
          {paymentMethod === 'ark_coin' ? (
            <div className="text-center pt-3 border-t border-gray-300">
              <div className="text-lg font-bold text-gray-900 mb-1">Total Pembayaran</div>
              <div className="text-4xl font-bold text-amber-600">{formatArk(totalAfterArk)}</div>
              <div className="text-xs text-gray-500 mt-1">≈ {formatCurrency(totalAfterArk * 1000)}</div>
            </div>
          ) : (
            <div className="flex justify-between items-end pt-3 border-t border-gray-300">
              <div>
                <div className="text-lg font-bold text-gray-900">Total</div>
                <div className="text-xs text-amber-600 font-medium">{formatArk(totalAfterArk)}</div>
              </div>
              <div className="text-2xl font-bold text-pink-600">{formatCurrency(totalAfterArk)}</div>
            </div>
          )}
        </div>

        {/* Pay Button */}
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={() => setShowPaymentModal(true)} 
            disabled={cart.length === 0} 
            className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Bayar {formatCurrency(total)}
          </button>
        </div>
      </div>

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
                <div className="text-sm font-semibold text-gray-900">Walk-in Customer</div>
                <div className="text-xs text-gray-500">Tanpa membership</div>
              </div>
            </button>
            
            {filteredCustomers.map(customer => (
              <button 
                key={customer.id} 
                onClick={() => selectCustomer(customer)} 
                className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 hover:bg-pink-50 hover:border-pink-200 transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">
                  {customer.name?.charAt(0) || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{customer.name || 'Customer'}</div>
                  <div className="text-xs text-gray-500">{customer.phone}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full font-medium capitalize">
                      {customer.membership_tier}
                    </span>
                    {customer.discount && customer.discount > 0 && (
                      <span className="text-xs text-green-600 font-medium">Diskon {customer.discount}%</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-500">{customer.visit_count}x visits</div>
                  <div className="text-xs font-medium text-amber-600">{formatArk(customer.ark_coin_balance)}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => !open && setShowPaymentModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center p-4 bg-pink-50 rounded-xl">
              <div className="text-sm text-gray-600">Total Pembayaran</div>
              <div className="flex items-baseline justify-center gap-2 mt-1">
                <div className="text-3xl font-bold text-pink-600">{formatCurrency(total)}</div>
                <div className="text-lg text-amber-600 font-medium">{formatArk(total)}</div>
              </div>
              {selectedCustomer && selectedCustomer.ark_coin_balance > 0 && (
                <div className="mt-2 text-xs text-amber-600 font-medium">
                  Saldo ARK: {formatArk(selectedCustomer.ark_coin_balance)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPaymentMethod('cash')} className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${paymentMethod === 'cash' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  💵 Tunai
                </button>
                <button onClick={() => setPaymentMethod('qris')} className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${paymentMethod === 'qris' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  📱 QRIS
                </button>
                <button onClick={() => setPaymentMethod('credit_card')} className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${paymentMethod === 'credit_card' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  💳 Kartu
                </button>
                <button 
                  onClick={() => {
                    setPaymentMethod('ark_coin');
                    setArkToUse(Math.min(selectedCustomer?.ark_coin_balance || 0, total));
                  }} 
                  disabled={!selectedCustomer || selectedCustomer.ark_coin_balance <= 0}
                  className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${paymentMethod === 'ark_coin' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  🪙 ARK Coin
                </button>
              </div>
            </div>

            {paymentMethod === 'ark_coin' && selectedCustomer && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm text-amber-800">
                    <div className="font-semibold mb-1">Gunakan ARK Coin</div>
                    <div className="flex justify-between text-xs">
                      <span>Saldo tersedia:</span>
                      <span className="font-medium">{formatArk(selectedCustomer.ark_coin_balance)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>Total tagihan:</span>
                      <span className="font-medium">{formatArk(total)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah ARK yang digunakan (1 ARK = Rp 1.000)</label>
                  <input 
                    type="number" 
                    value={Math.floor(arkToUse / 1000)} 
                    onChange={(e) => setArkToUse(parseInt(e.target.value) * 1000 || 0)} 
                    max={Math.floor(maxArkUsable / 1000)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" 
                  />
                  <div className="text-xs text-gray-500 mt-1">Max: {formatArk(maxArkUsable)}</div>
                </div>
                {arkToUseCapped > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-600">Dibayar dengan ARK:</span>
                      <span className="font-medium text-amber-600">-{formatArk(arkToUseCapped)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 mt-2 border-t border-green-200">
                      <span className="text-gray-900">Sisa:</span>
                      <span className="font-medium text-green-600">{formatCurrency(totalAfterArk)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Uang Diterima</label>
                <input 
                  type="number" 
                  value={cashReceived} 
                  onChange={(e) => setCashReceived(e.target.value)} 
                  placeholder="0" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500" 
                />
                {parseFloat(cashReceived) >= totalAfterArk && (
                  <div className="mt-2 text-sm text-green-600 font-medium">
                    Kembalian: {formatCurrency(parseFloat(cashReceived) - totalAfterArk)}
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                Batal
              </button>
              <button 
                onClick={handleCreateOrder} 
                disabled={!isPaymentValid()} 
                className="flex-1 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Bayar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customization Modal */}
      <Dialog open={customization.isOpen} onOpenChange={(open) => !open && setCustomization(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize {customization.product?.name}</DialogTitle>
          </DialogHeader>
          
          {customization.product && (
            <div className="space-y-6 py-4">
              {/* Variants */}
              {customization.product.variants && customization.product.variants.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Pilih Varian</label>
                  <div className="space-y-2">
                    {customization.product.variants.map(variant => (
                      <button
                        key={variant.id}
                        onClick={() => setCustomization(prev => ({ ...prev, selectedVariant: variant.id }))}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          customization.selectedVariant === variant.id
                            ? 'border-pink-600 bg-pink-50 text-pink-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{variant.name}</div>
                            <div className="text-xs text-gray-500">{variant.group_name}</div>
                          </div>
                          {variant.price_adjustment !== 0 && (
                            <div className={`text-sm font-semibold ${variant.price_adjustment > 0 ? 'text-pink-600' : 'text-green-600'}`}>
                              {variant.price_adjustment > 0 ? '+' : ''}{formatCurrency(variant.price_adjustment)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Modifiers */}
              {customization.product.modifiers && customization.product.modifiers.map((group) => (
                <div key={group.modifier_group.name}>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    {group.modifier_group.name}
                    {group.modifier_group.min_selection > 0 && (
                      <span className="text-gray-500 font-normal ml-1">(Wajib pilih)</span>
                    )}
                  </label>
                  <div className="space-y-2">
                    {group.modifier_group.modifiers.map(modifier => {
                      const isSelected = (customization.selectedModifiers[group.modifier_group.name] || []).includes(modifier.id);
                      return (
                        <button
                          key={modifier.id}
                          onClick={() => {
                            setCustomization(prev => {
                              const current = prev.selectedModifiers[group.modifier_group.name] || [];
                              const updated = isSelected
                                ? current.filter(id => id !== modifier.id)
                                : [...current, modifier.id];
                              return {
                                ...prev,
                                selectedModifiers: {
                                  ...prev.selectedModifiers,
                                  [group.modifier_group.name]: updated
                                }
                              };
                            });
                          }}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'border-pink-600 bg-pink-50 text-pink-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                isSelected ? 'border-pink-600 bg-pink-600' : 'border-gray-300'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm font-medium">{modifier.name}</span>
                            </div>
                            {modifier.price_adjustment !== 0 && (
                              <div className={`text-sm font-semibold ${modifier.price_adjustment > 0 ? 'text-pink-600' : 'text-green-600'}`}>
                                {modifier.price_adjustment > 0 ? '+' : ''}{formatCurrency(modifier.price_adjustment)}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Jumlah</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCustomization(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold w-12 text-center">{customization.quantity}</span>
                  <button
                    onClick={() => setCustomization(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Catatan (opsional)</label>
                <textarea
                  value={customization.notes}
                  onChange={(e) => setCustomization(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Contoh: Jangan pedas, kurang manis..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                />
              </div>
              
              {/* Price Summary */}
              <div className="p-4 bg-gradient-to-r from-pink-50 to-amber-50 rounded-xl border border-pink-100">
                {/* Selected Options Summary */}
                <div className="mb-3 pb-3 border-b border-pink-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Pilihan Anda:</div>
                  <div className="flex flex-wrap gap-2">
                    {customization.selectedVariant && (() => {
                      const variant = customization.product.variants?.find(v => v.id === customization.selectedVariant);
                      if (!variant) return null;
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
                          <Check className="w-3 h-3" />
                          {variant.name}
                        </span>
                      );
                    })()}
                    
                    {customization.product.modifiers && Object.entries(customization.selectedModifiers).map(([groupName, modifierIds]) => {
                      if (!modifierIds || modifierIds.length === 0) return null;
                      const group = customization.product!.modifiers?.find(g => g.modifier_group.name === groupName);
                      if (!group) return null;
                      
                      return modifierIds.map(modId => {
                        const mod = group.modifier_group.modifiers.find(m => m.id === modId);
                        if (!mod) return null;
                        return (
                          <span key={modId} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                            <Check className="w-3 h-3" />
                            {mod.name}
                          </span>
                        );
                      });
                    })}
                    
                    {!customization.selectedVariant && (!customization.product.modifiers || Object.values(customization.selectedModifiers).every(ids => !ids || ids.length === 0)) && (
                      <span className="text-xs text-gray-500 italic">Tidak ada pilihan khusus</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Harga Dasar</span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatCurrency(customization.product.base_price)}</div>
                      <div className="text-xs text-amber-600">{formatArk(customization.product.base_price)}</div>
                    </div>
                  </div>
                  
                  {customization.selectedVariant && (() => {
                    const variant = customization.product.variants?.find(v => v.id === customization.selectedVariant);
                    if (!variant || variant.price_adjustment === 0) return null;
                    return (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Varian ({variant.name})</span>
                        <div className="text-right">
                          <div className={`font-medium ${variant.price_adjustment > 0 ? 'text-pink-600' : 'text-green-600'}`}>
                            {variant.price_adjustment > 0 ? '+' : ''}{formatCurrency(variant.price_adjustment)}
                          </div>
                          <div className="text-xs text-amber-600">{variant.price_adjustment !== 0 ? formatArk(Math.abs(variant.price_adjustment)) : '-'}</div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {(() => {
                    let totalModifierAdj = 0;
                    if (customization.product.modifiers) {
                      customization.product.modifiers.forEach(group => {
                        const selectedIds = customization.selectedModifiers[group.modifier_group.name] || [];
                        selectedIds.forEach(modId => {
                          const mod = group.modifier_group.modifiers.find(m => m.id === modId);
                          if (mod) totalModifierAdj += mod.price_adjustment;
                        });
                      });
                    }
                    if (totalModifierAdj === 0) return null;
                    return (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modifiers</span>
                        <div className="text-right">
                          <div className={`font-medium ${totalModifierAdj > 0 ? 'text-pink-600' : 'text-green-600'}`}>
                            {totalModifierAdj > 0 ? '+' : ''}{formatCurrency(totalModifierAdj)}
                          </div>
                          <div className="text-xs text-amber-600">{formatArk(Math.abs(totalModifierAdj))}</div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="pt-2 mt-2 border-t border-pink-200">
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
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setCustomization({
                    isOpen: false,
                    product: null,
                    selectedVariant: null,
                    selectedModifiers: {},
                    quantity: 1,
                    notes: ''
                  })}
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
