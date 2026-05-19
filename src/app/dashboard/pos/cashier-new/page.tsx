'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Utensils, ShoppingBag, Truck, Monitor, Table as TableIcon,
  User, X, Sparkles, Printer, CheckCircle, AlertCircle, Clock,
} from 'lucide-react';
import { getCustomerFavoriteProducts, type Product, openBill } from '@/lib/pos-api';
import { Button } from '@/components/ui/button';
import { usePosCart } from '@/hooks/use-pos-cart';
import { usePosProducts } from '@/hooks/use-pos-products';
import { usePosCustomers } from '@/hooks/use-pos-customers';
import { usePosCheckout } from '@/hooks/use-pos-checkout';
import { usePosShift } from '@/hooks/use-pos-shift';
import { ShiftModal } from '@/components/pos/ShiftModal';

const CASHIER_ID = '00000000-0000-0000-0000-000000000001';
import { CartPanel } from '@/components/pos/CartPanel';
import { CustomizationModal, type SelectedCustomization } from '@/components/pos/CustomizationModal';
import { PaymentModal, type PaymentMethod } from '@/components/pos/PaymentModal';
import { NFCModal } from '@/components/pos/NFCModal';
import { CustomerSearchModal } from '@/components/pos/CustomerSearchModal';
import { printThermalReceipt, type ReceiptPayload } from '@/components/pos/PrintReceipt';
import type { SplitConfig } from '@/components/pos/SplitBillModal';
import { SplitBillModal } from '@/components/pos/SplitBillModal';
import { SplitPaymentScreen } from '@/components/pos/SplitPaymentScreen';
import { createSplitOrder } from '@/lib/pos-api';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/* ─── helpers ─────────────────────────────────────────────────────── */
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const formatArk = (value: number) => `${(value / 1000).toLocaleString('id-ID')} ARK`;

const ARK_RATE = 1000;
const MAX_TABLES = 6;

/* ─── page ────────────────────────────────────────────────────────── */
export default function CashierPageNew() {
  const { products, categories, loading, error } = usePosProducts();
  const { customers, findCustomer } = usePosCustomers();
  const cart = usePosCart();
  const { checkout, submitting } = usePosCheckout();

  /* UI state */
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  /* Customization */
  const [custom, setCustom] = useState<SelectedCustomization | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  /* Payment */
  const [showPayment, setShowPayment] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [currentArkToUse, setCurrentArkToUse] = useState(0);

  /* NFC */
  const [showNFC, setShowNFC] = useState(false);
  const [nfcInput, setNfcInput] = useState('');
  const [nfcSearching, setNfcSearching] = useState(false);
  const [nfcError, setNfcError] = useState('');

  /* Result */
  const [resultPayload, setResultPayload] = useState<ReceiptPayload | null>(null);

  /* Split Bill */
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [savingBill, setSavingBill] = useState(false);
  const [splitOrder, setSplitOrder] = useState<any | null>(null);
  const [showSplitPayment, setShowSplitPayment] = useState(false);

  /* Favorites */
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loadingFav, setLoadingFav] = useState(false);

  /* Shift */
  const { shift, isActive: hasShift, openShift, closeShift } = usePosShift(CASHIER_ID);
  const [showShiftModal, setShowShiftModal] = useState(false);

  const selectedCustomer = useMemo(() => {
    if (!cart.selectedCustomerId) return null;
    return findCustomer(cart.selectedCustomerId) || null;
  }, [cart.selectedCustomerId, findCustomer]);

  /* Favorites effect */
  useEffect(() => {
    if (!selectedCustomer || !products.length) { setFavorites([]); return; }
    setLoadingFav(true);
    getCustomerFavoriteProducts(selectedCustomer.id, products)
      .then((f) => setFavorites(f))
      .catch(() => setFavorites([]))
      .finally(() => setLoadingFav(false));
  }, [selectedCustomer, products]);

  /* Financials */
  const membershipDiscount = selectedCustomer ? selectedCustomer.discount : 0;
  const discountAmount = membershipDiscount > 0 ? Math.floor(cart.subtotal * membershipDiscount / 100) : 0;
  const afterDiscount = cart.subtotal - discountAmount;
  const taxAmount = cart.includeTax ? Math.round(afterDiscount * 0.1) : 0;
  const total = afterDiscount + taxAmount;
  const maxArkUsable = selectedCustomer ? Math.min(selectedCustomer.ark_coin_balance, total) : 0;
  const arkToUseCapped = Math.min(currentArkToUse, maxArkUsable);
  const totalAfterArk = total - arkToUseCapped;

  /* Product filter */
  const filteredProducts = useMemo(() => products.filter(p => {
    const okCat = selectedCategory === 'Semua' || (p.category?.name || 'Uncategorized') === selectedCategory;
    const okSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return okCat && okSearch;
  }), [products, selectedCategory, searchTerm]);

  /* ─── Actions ──────────────────────────────────────────────────── */
  const openCustomization = useCallback((product: Product) => {
    if ((product.variants && product.variants.length > 0) || (product.modifiers && product.modifiers.length > 0)) {
      const firstVariant = product.variants?.[0]?.id ?? null;
      const defaultModifiers: Record<string, string[]> = {};
      product.modifiers?.forEach(g => {
        if (g.modifier_group.modifiers.length > 0) {
          defaultModifiers[g.modifier_group.name] = [g.modifier_group.modifiers[0].id];
        }
      });
      setCustomizingProduct(product);
      setCustom({
        product,
        selectedVariant: firstVariant,
        selectedModifiers: defaultModifiers,
        quantity: 1,
        notes: '',
      });
    } else {
      cart.addItem({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: product.base_price,
        quantity: 1,
        imageUrl: product.image_url,
      });
    }
  }, [cart]);

  const handleConfirmCustomization = useCallback(() => {
    if (!custom || !customizingProduct) return;
    const product = customizingProduct;
    const variant = product.variants?.find(v => v.id === custom.selectedVariant);
    const variantName = variant?.name;
    const modifierNames: string[] = [];
    let modifierAdj = 0;
    product.modifiers?.forEach(g => {
      const ids = custom.selectedModifiers[g.modifier_group.name] || [];
      ids.forEach(id => {
        const mod = g.modifier_group.modifiers.find(m => m.id === id);
        if (mod) { modifierNames.push(mod.name); modifierAdj += (mod.price_adjustment || 0); }
      });
    });
    const finalPrice = product.base_price + (variant?.price_adjustment || 0) + modifierAdj;
    const compositeId = `${product.id}::${variantName ?? ''}::${modifierNames.join(',')}`;
    cart.addItem({
      id: compositeId,
      productId: product.id,
      name: product.name,
      price: finalPrice,
      quantity: custom.quantity,
      variantName,
      modifierNames,
      variantPriceAdj: variant?.price_adjustment || 0,
      modifierPriceAdj: modifierAdj,
      notes: custom.notes,
      imageUrl: product.image_url,
    });
    setCustom(null);
    setCustomizingProduct(null);
  }, [custom, customizingProduct, cart]);

  /* NFC */
  const processNFCCard = useCallback((cardData: string) => {
    const trimmed = cardData.trim();
    if (!trimmed) return;
    setNfcSearching(true);
    setNfcError('');
    const found = customers.find(c => c.id === trimmed || c.phone === trimmed);
    if (!found) {
      setNfcError('Kartu tidak ditemukan. Pastikan kartu sudah terdaftar sebagai member.');
      setNfcSearching(false);
      setNfcInput('');
      return;
    }
    if (found.ark_coin_balance < total) {
      setNfcError(`Saldo ARK tidak cukup. Saldo: ${formatArk(found.ark_coin_balance)}, Dibutuhkan: ${formatArk(total)}`);
      setNfcSearching(false);
      setNfcInput('');
      return;
    }
    cart.setCustomer(found.id);
    setShowNFC(false);
    setNfcSearching(false);
    setNfcInput('');
  }, [customers, total, cart]);

  /* Checkout */
  const handleCreateOrder = useCallback(async () => {
    if (cart.items.length === 0) return;
    if (!hasShift) {
      alert('Silakan buka shift terlebih dahulu sebelum membuat order.');
      setShowShiftModal(true);
      return;
    }
    if (paymentMethod === 'ark_coin' && !selectedCustomer) { setShowNFC(true); return; }
    if (paymentMethod === 'cash' && (parseFloat(cashReceived) || 0) < totalAfterArk) return;

    const res = await checkout({
      cart: cart.items,
      orderType: cart.orderType,
      selectedTable: cart.selectedTable,
      selectedCustomer,
      paymentMethod,
      cashReceived,
      includeTax: cart.includeTax,
      notes: cart.notes,
      arkToUse: paymentMethod === 'ark_coin' ? arkToUseCapped : 0,
      shiftId: shift?.id || null,
    });

    if (res.success) {
      const receipt: ReceiptPayload = {
        orderId: res.orderId,
        orderNumber: res.orderNumber,
        orderType: cart.orderType,
        table: cart.selectedTable,
        items: [...cart.items],
        notes: cart.notes,
        total: res.total,
        change: res.change,
        paymentMethod,
        customerName: selectedCustomer?.name,
        discountAmount,
        taxAmount,
      };
      setResultPayload(receipt);
      setShowPayment(false);
      cart.clearCart();
      setCashReceived('');
      setPaymentMethod('cash');
      setCurrentArkToUse(0);
    } else {
      // Show error in simple alert or toast
      alert(res.error || 'Pembayaran gagal');
    }
  }, [cart, paymentMethod, selectedCustomer, cashReceived, totalAfterArk, checkout, discountAmount, taxAmount, arkToUseCapped]);

  /* Split Bill */
  const handleConfirmSplit = useCallback(async (config: SplitConfig) => {
    if (cart.items.length === 0) return;
    if (!hasShift) {
      alert('Silakan buka shift terlebih dahulu sebelum membuat order.');
      setShowShiftModal(true);
      return;
    }
    setShowSplitModal(false);

    try {
      const res = await createSplitOrder({
        order_type: cart.orderType,
        customer_id: selectedCustomer?.id,
        cashier_id: CASHIER_ID,
        server_id: undefined,
        table_id: cart.selectedTable || undefined,
        shift_id: shift?.id,
        items: cart.items.map(item => ({
          product_id: item.productId,
          product_name: item.name,
          product_sku: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity,
          total_amount: item.price * item.quantity,
        })),
        subtotal: cart.subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: total,
        notes: cart.notes,
        include_tax: cart.includeTax,
        membership_discount_pct: membershipDiscount,
        splits: config.splits.map(s => ({
          label: s.label,
          subtotal: s.subtotal || 0,
          tax_amount: s.tax_amount || 0,
          discount_amount: s.discount_amount || 0,
          total_amount: s.total,
          customer_id: s.customerId,
          items: s.items,
        })),
      });

      if (res.success && res.data) {
        setSplitOrder(res.data);
        setShowSplitPayment(true);
        cart.clearCart();
      } else {
        alert(res.error || 'Gagal membuat split order');
      }
    } catch (e: any) {
      alert(e.message || 'Gagal membuat split order');
    }
  }, [cart, selectedCustomer, discountAmount, taxAmount, total, membershipDiscount]);

  const handleSplitComplete = useCallback(() => {
    setShowSplitPayment(false);
    setSplitOrder(null);
    setResultPayload(null);
  }, []);

  /* Open Bill */
  const handleOpenBill = useCallback(async () => {
    console.log('[OpenBill] clicked', { items: cart.items.length, hasShift });
    if (cart.items.length === 0) return;
    if (!hasShift) {
      alert('Silakan buka shift terlebih dahulu sebelum membuat order.');
      setShowShiftModal(true);
      return;
    }
    try {
      setSavingBill(true);
      console.log('[OpenBill] Calling openBill API...');
      const res = await openBill({
        order_type: cart.orderType as any,
        customer_id: selectedCustomer?.id,
        cashier_id: CASHIER_ID,
        server_id: undefined,
        table_id: cart.selectedTable || undefined,
        shift_id: shift?.id || undefined,
        items: cart.items.map(item => ({
          product_id: item.productId,
          product_name: item.name,
          product_sku: item.id,
          variants: item.variantName ? [{ name: item.variantName, group: 'Size', price: item.variantPriceAdj || 0 }] : [],
          modifiers: item.modifierNames?.map((name, idx) => ({ name, group: `Option-${idx}` })) || [],
          quantity: Number(item.quantity),
          unit_price: Number(item.price - (item.variantPriceAdj || 0) - (item.modifierPriceAdj || 0)),
          variant_price_adjustment: item.variantPriceAdj || 0,
          modifier_price_adjustment: item.modifierPriceAdj || 0,
          subtotal: Number(item.price * item.quantity),
          total_amount: Number(item.price * item.quantity),
        })),
        subtotal: cart.subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: total,
        notes: cart.notes,
        membership_discount_pct: selectedCustomer?.discount || 0,
      });

      console.log('[OpenBill] API response:', res);
      if (res.success && res.data) {
        alert(`Bill berhasil disimpan!\nOrder: ${res.data.order_number}`);
        cart.clearCart();
      } else {
        console.error('[OpenBill] API error:', res.error);
        alert(res.error || 'Gagal menyimpan bill');
      }
    } catch (e: any) {
      console.error('[OpenBill] Exception:', e);
      alert(e.message || 'Terjadi kesalahan saat menyimpan bill');
    } finally {
      setSavingBill(false);
    }
  }, [cart, selectedCustomer, discountAmount, taxAmount, total, hasShift, shift]);

  /* Print helpers */
  const handlePrint = useCallback((label: 'KITCHEN' | 'BAR' | 'CUSTOMER') => {
    if (!resultPayload) return;
    printThermalReceipt(resultPayload, label);
  }, [resultPayload]);

  /* ─── Render ───────────────────────────────────────────────────── */
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
        {/* Shift Status Bar */}
        <div className={`flex items-center justify-between px-4 py-2 rounded-lg border text-sm ${
          hasShift
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {hasShift ? (
              <>
                <span className="font-medium">Shift Aktif:</span>
                <span className="font-mono font-bold">{shift?.shift_number}</span>
                <span className="text-xs opacity-75">• {shift?.total_orders} order • {formatCurrency(shift?.total_sales || 0)}</span>
              </>
            ) : (
              <span>Belum ada shift aktif — silakan buka shift terlebih dahulu</span>
            )}
          </div>
          <Button
            size="sm"
            variant={hasShift ? "outline" : "default"}
            onClick={() => setShowShiftModal(true)}
            className="h-7 text-xs px-2"
          >
            {hasShift ? 'Tutup Shift' : 'Buka Shift'}
          </Button>
        </div>

        {/* Order Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'dine_in', label: 'Dine-in', icon: Utensils },
              { key: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
              { key: 'delivery', label: 'Delivery', icon: Truck },
              { key: 'self_order', label: 'Self-order', icon: Monitor },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => cart.setOrderType(t.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                  cart.orderType === t.key ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
          {cart.orderType === 'dine_in' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: MAX_TABLES }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    onClick={() => cart.setTable(cart.selectedTable === `Meja ${num}` ? null : `Meja ${num}`)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all ${
                      cart.selectedTable === `Meja ${num}`
                        ? 'border-pink-600 bg-pink-600 text-white'
                        : 'border-gray-200 text-gray-700 hover:border-pink-400'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search + Customer */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowCustomerModal(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all min-w-[180px] ${
              selectedCustomer ? 'bg-pink-50 border-pink-200 hover:bg-pink-100' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
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
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Selected Customer */}
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
            <button onClick={() => cart.setCustomer(null)} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">Favorit {selectedCustomer?.name?.split(' ')[0]}</span>
              <span className="text-xs text-amber-600">({favorites.length} menu)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {favorites.map(product => (
                <button key={product.id} onClick={() => openCustomization(product)} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
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

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredProducts.map(product => {
              const xp = product.xp ?? ((Math.abs(product.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 100) + 1);
              return (
                <button
                  key={product.id}
                  onClick={() => openCustomization(product)}
                  className="flex flex-col bg-white rounded-xl border border-gray-200 hover:border-pink-400 hover:shadow-lg transition-all overflow-hidden group"
                >
                  <div className="aspect-square w-full overflow-hidden bg-gray-100">
                    <img src={product.image_url || '/products/placeholder.png'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-2 flex flex-col gap-1">
                    <div className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">{product.name}</div>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xs font-bold text-pink-600">{formatCurrency(product.base_price)}</div>
                      <div className="text-[10px] text-amber-600 font-medium">{formatArk(product.base_price)}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        <span className="text-[10px] text-purple-600 font-semibold">+{xp} XP</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Cart */}
      <CartPanel
        cart={cart.items}
        orderType={cart.orderType}
        selectedTable={cart.selectedTable}
        subtotal={cart.subtotal}
        discountAmount={discountAmount}
        selectedCustomer={selectedCustomer}
        includeTax={cart.includeTax}
        tax={taxAmount}
        arkToUseCapped={arkToUseCapped}
        paymentMethod={paymentMethod}
        totalAfterArk={totalAfterArk}
        total={total}
        formatCurrency={formatCurrency}
        formatArk={formatArk}
        setIncludeTax={cart.setIncludeTax}
        setShowPaymentModal={() => setShowPayment(true)}
        onSplitBill={() => setShowSplitModal(true)}
        onOpenBill={handleOpenBill}
        isSavingBill={savingBill}
        updateQuantity={cart.updateQty}
        removeFromCart={cart.removeItem}
      />

      {/* ── Customer Modal ── */}
      <CustomerSearchModal
        open={showCustomerModal}
        customers={customers}
        search={customerSearch}
        selectedCustomerId={cart.selectedCustomerId}
        onSearchChange={setCustomerSearch}
        onSelect={(c) => { cart.setCustomer(c?.id ?? null); setShowCustomerModal(false); setCustomerSearch(''); }}
        onClose={() => setShowCustomerModal(false)}
      />

      {/* ── Customization Modal ── */}
      <CustomizationModal
        open={!!custom}
        product={customizingProduct}
        value={custom}
        onChange={setCustom}
        onConfirm={handleConfirmCustomization}
        onCancel={() => { setCustom(null); setCustomizingProduct(null); }}
        formatCurrency={formatCurrency}
        formatArk={formatArk}
      />

      {/* ── Payment Modal ── */}
      <PaymentModal
        open={showPayment}
        total={total}
        totalAfterArk={totalAfterArk}
        selectedCustomer={selectedCustomer}
        onClose={() => setShowPayment(false)}
        onConfirm={({ method, cashReceived, arkToUse }) => {
          setPaymentMethod(method);
          setCashReceived(cashReceived);
          setCurrentArkToUse(arkToUse);
          handleCreateOrder();
        }}
        formatCurrency={formatCurrency}
        formatArk={formatArk}
        onTapNFC={() => setShowNFC(true)}
      />

      {/* ── NFC Modal ── */}
      <NFCModal
        open={showNFC}
        input={nfcInput}
        searching={nfcSearching}
        error={nfcError}
        onInputChange={setNfcInput}
        onSubmit={() => processNFCCard(nfcInput)}
        onCancel={() => { setShowNFC(false); setNfcInput(''); setNfcError(''); }}
      />

      {/* ── Result Modal ── */}
      <Dialog open={!!resultPayload} onOpenChange={() => setResultPayload(null)}>
        <DialogContent className="max-w-sm">
          {resultPayload && (
            <div className="py-4 space-y-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pembayaran Berhasil!</h2>
                <p className="text-sm text-gray-500 mt-1">Order #{resultPayload.orderNumber?.slice(-8).toUpperCase() || resultPayload.orderId?.slice(-8).toUpperCase()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Bayar</span>
                  <span className="font-bold text-gray-900">{formatCurrency(resultPayload.total)}</span>
                </div>
                {resultPayload.change > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Kembalian</span>
                    <span className="font-bold text-green-600">{formatCurrency(resultPayload.change)}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handlePrint('KITCHEN')} className="flex items-center justify-center gap-1.5 py-2.5 border-2 border-orange-400 text-orange-600 rounded-lg text-sm font-semibold hover:bg-orange-50"><Printer className="w-4 h-4" /> Kitchen</button>
                <button onClick={() => handlePrint('BAR')} className="flex items-center justify-center gap-1.5 py-2.5 border-2 border-blue-400 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50"><Printer className="w-4 h-4" /> Bar</button>
                <button onClick={() => handlePrint('CUSTOMER')} className="flex items-center justify-center gap-1.5 py-2.5 border-2 border-purple-400 text-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-50"><Printer className="w-4 h-4" /> Struk</button>
              </div>
              <button onClick={() => setResultPayload(null)} className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700">Transaksi Baru</button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Shift Modal ── */}
      <ShiftModal
        open={showShiftModal}
        shift={shift}
        onClose={() => setShowShiftModal(false)}
        onOpenShift={openShift}
        onCloseShift={closeShift}
        formatCurrency={formatCurrency}
      />

      {/* ── Split Bill Modal ── */}
      <SplitBillModal
        open={showSplitModal}
        total={total}
        subtotal={cart.subtotal}
        taxAmount={taxAmount}
        discountAmount={discountAmount}
        cartItems={cart.items}
        onClose={() => setShowSplitModal(false)}
        onConfirm={handleConfirmSplit}
        formatCurrency={formatCurrency}
      />

      {/* ── Split Payment Screen (overlay) ── */}
      {showSplitPayment && splitOrder && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col p-4 lg:p-6">
          <SplitPaymentScreen
            orderId={splitOrder.id}
            orderNumber={splitOrder.order_number}
            orderType={splitOrder.order_type}
            table={splitOrder.table_id}
            items={splitOrder.items || []}
            notes={splitOrder.notes}
            total={total}
            taxAmount={taxAmount}
            discountAmount={discountAmount}
            customerName={selectedCustomer?.name}
            onBack={() => setShowSplitPayment(false)}
            onComplete={handleSplitComplete}
            formatCurrency={formatCurrency}
            formatArk={formatArk}
          />
        </div>
      )}
    </div>
  );
}
