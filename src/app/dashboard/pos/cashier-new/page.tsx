'use client';

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, Utensils, ShoppingBag, Table as TableIcon,
  User, X, Sparkles, Printer, CheckCircle, AlertCircle,
} from 'lucide-react';
import {
  getCustomerFavoriteProducts,
  getPOSTables,
  type Customer,
  type Product,
  type PosTable,
  openBill,
  saveCustomer,
} from '@/lib/pos-api';
import { usePosCart } from '@/hooks/use-pos-cart';
import { usePosProducts } from '@/hooks/use-pos-products';
import { usePosCustomers, type CustomerWithDiscount } from '@/hooks/use-pos-customers';
import { usePosCheckout } from '@/hooks/use-pos-checkout';
import { usePosShift } from '@/hooks/use-pos-shift';
import { usePosOnline } from '@/hooks/use-pos-online';
import { usePosOfflineQueue } from '@/hooks/use-pos-offline';
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

const getTableDisplayName = (table?: PosTable | null) =>
  table?.label || table?.table_number || table?.name || table?.qr_code || 'Meja';

const getCustomerDiscount = (tier?: string) => {
  const normalizedTier = tier?.toLowerCase();
  if (normalizedTier === 'platinum') return 15;
  if (normalizedTier === 'gold') return 10;
  if (normalizedTier === 'silver') return 5;
  return 0;
};

const withCustomerDiscount = (customer: Customer): CustomerWithDiscount => ({
  ...customer,
  discount: getCustomerDiscount(customer.membership_tier),
});

/* ─── page ────────────────────────────────────────────────────────── */
function CashierPageNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentOrderId = searchParams.get('orderId');
  const loadedPaymentOrderRef = useRef<string | null>(null);
  const { products, categories, loading, error } = usePosProducts();
  const { customers, findCustomer, refetch: refetchCustomers } = usePosCustomers();
  const cart = usePosCart();
  const { checkout, submitting } = usePosCheckout();

  /* UI state */
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [activeProductSuggestion, setActiveProductSuggestion] = useState(0);
  const [tables, setTables] = useState<PosTable[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);

  /* Customization */
  const [custom, setCustom] = useState<SelectedCustomization | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  /* Payment */
  const [showPayment, setShowPayment] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [loadingPaymentOrder, setLoadingPaymentOrder] = useState(false);
  const [payingOrderNumber, setPayingOrderNumber] = useState<string | null>(null);
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

  /* Offline */
  const { isOnline } = usePosOnline();
  const { pendingCount, enqueue, syncQueue, refreshCount } = usePosOfflineQueue();
  const [showOfflineQueue, setShowOfflineQueue] = useState(false);
  const [lastResultType, setLastResultType] = useState<'standard' | 'offlined' | null>(null);

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

  const handleCreateCustomer = useCallback(async (payload: {
    name: string;
    phone: string;
    email?: string;
    enroll_member: boolean;
  }) => {
    const response = await saveCustomer({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      membership_tier: 'bronze',
      enroll_member: payload.enroll_member,
    });
    await refetchCustomers();
    return withCustomerDiscount(response.data);
  }, [refetchCustomers]);

  const tableById = useMemo(() => {
    return new Map(tables.map((table) => [table.id, table]));
  }, [tables]);

  const selectedTableDisplay = useMemo(() => {
    if (!cart.selectedTable) return null;
    const selected = tableById.get(cart.selectedTable);
    return selected ? getTableDisplayName(selected) : cart.selectedTable;
  }, [cart.selectedTable, tableById]);

  useEffect(() => {
    let mounted = true;
    setLoadingTables(true);
    setTableError(null);

    getPOSTables()
      .then((res) => {
        if (!mounted) return;
        setTables(res.data || []);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setTables([]);
        setTableError(err.message || 'Gagal memuat data meja');
      })
      .finally(() => {
        if (mounted) setLoadingTables(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* Load existing open bill when redirected from Orders */
  useEffect(() => {
    if (!paymentOrderId || loadedPaymentOrderRef.current === paymentOrderId) return;

    const loadPaymentOrder = async () => {
      try {
        setLoadingPaymentOrder(true);
        const res = await fetch(`/api/pos/orders/${paymentOrderId}`, { cache: 'no-store' });
        const json = await res.json();
        if (!json.success || !json.data) {
          alert(json.error || 'Gagal memuat pesanan');
          return;
        }

        const order = json.data;
        loadedPaymentOrderRef.current = paymentOrderId;
        cart.clearCart();
        cart.setOrderType(order.order_type || 'dine_in');
        cart.setTable(order.table_id || null);
        cart.setCustomer(order.customer_id || null);
        cart.setNotes(order.notes || '');

        (order.items || []).forEach((item: any) => {
          const qty = Number(item.quantity) || 1;
          const variants = Array.isArray(item.variants) ? item.variants : [];
          const modifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
          cart.addItem({
            id: item.id,
            productId: item.product_id,
            name: item.product_name,
            price: Number(item.total_amount || item.subtotal || item.unit_price || 0) / qty,
            quantity: qty,
            variantName: variants.map((v: any) => v?.name).filter(Boolean).join(', ') || undefined,
            modifierNames: modifiers.map((m: any) => m?.name).filter(Boolean),
            station: item.station,
          });
        });

        setPayingOrderNumber(order.order_number || null);
        setPaymentMethod('cash');
        setCashReceived(String(Number(order.total_amount || 0)));
      } catch (e: any) {
        alert(e.message || 'Gagal memuat pesanan');
      } finally {
        setLoadingPaymentOrder(false);
      }
    };

    loadPaymentOrder();
  }, [paymentOrderId, cart]);

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

  const productSuggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return products
      .filter((product) => {
        const name = product.name.toLowerCase();
        const sku = (product.sku || '').toLowerCase();
        return name.includes(query) || sku.includes(query);
      })
      .slice(0, 8);
  }, [products, searchTerm]);

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
        station: product.station,
      });
    }
  }, [cart]);

  const selectProductFromSearch = useCallback((product: Product) => {
    openCustomization(product);
    setSearchTerm('');
    setShowProductSuggestions(false);
    setActiveProductSuggestion(0);
  }, [openCustomization]);

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
      station: product.station,
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
    if (processingPayment) return;
    if (cart.items.length === 0) return;
    if (!hasShift) {
      alert('Silakan buka shift terlebih dahulu sebelum membuat order.');
      setShowShiftModal(true);
      return;
    }
    if (paymentMethod === 'ark_coin' && !selectedCustomer) { setShowNFC(true); return; }
    if (paymentMethod === 'cash' && (parseFloat(cashReceived) || 0) < totalAfterArk) return;

    setProcessingPayment(true);

    if (paymentOrderId) {
      const paymentMethodForApi = paymentMethod === 'credit_card' ? 'credit' : paymentMethod;
      const paidAmount = paymentMethod === 'cash' ? (parseFloat(cashReceived) || totalAfterArk) : totalAfterArk;
      const res = await fetch(`/api/pos/orders/${paymentOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          payment_status: 'paid',
          payment_method: paymentMethodForApi,
          amount_paid: paidAmount,
          ark_coins_used: paymentMethod === 'ark_coin' ? arkToUseCapped : 0,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Pembayaran gagal');
        setProcessingPayment(false);
        return;
      }

      const receipt: ReceiptPayload = {
        orderId: paymentOrderId,
        orderNumber: payingOrderNumber || data.data?.order_number || paymentOrderId,
        orderType: cart.orderType,
        table: selectedTableDisplay,
        items: [...cart.items],
        notes: cart.notes,
        total: totalAfterArk,
        change: paymentMethod === 'cash' ? (parseFloat(cashReceived) || 0) - totalAfterArk : 0,
        paymentMethod,
        customerName: selectedCustomer?.name,
        discountAmount,
        taxAmount,
      };
      setResultPayload(receipt);
      setShowPayment(false);
      setLastResultType('standard');
      cart.clearCart();
      setCashReceived('');
      setPaymentMethod('cash');
      setCurrentArkToUse(0);
      loadedPaymentOrderRef.current = null;
      router.replace('/dashboard/pos/cashier-new');
      setProcessingPayment(false);
      return;
    }

    if (!isOnline) {
      const cSubtotal = cart.subtotal;
      const cTotal = cart.total;
      const payload = {
        order_type: cart.orderType,
        customer_id: selectedCustomer?.id,
        cashier_id: CASHIER_ID,
        items: cart.items.map(item => ({
          product_id: item.productId,
          product_name: item.name,
          product_sku: item.productId,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity,
          total_amount: item.price * item.quantity,
        })),
        subtotal: cSubtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: cTotal,
        payment_method: paymentMethod === 'qris' ? 'qris' : paymentMethod === 'credit_card' ? 'credit' : paymentMethod === 'ark_coin' ? 'ark_coin' : 'cash',
        amount_paid: paymentMethod === 'cash' ? (parseFloat(cashReceived) || cTotal) : cTotal,
        include_tax: cart.includeTax,
        membership_discount_pct: membershipDiscount,
        notes: cart.notes,
        ark_coins_used: paymentMethod === 'ark_coin' ? arkToUseCapped : 0,
        shift_id: shift?.id || undefined,
      };
      await enqueue(payload, 'order');
      const receipt: ReceiptPayload = {
        orderId: 'OFFLINE-' + Date.now().toString(36).toUpperCase(),
        orderNumber: 'OFFLINE-' + Date.now().toString(36).toUpperCase(),
        orderType: cart.orderType,
        table: selectedTableDisplay,
        items: [...cart.items],
        notes: cart.notes,
        total: cTotal,
        change: paymentMethod === 'cash' ? (parseFloat(cashReceived) || 0) - cTotal : 0,
        paymentMethod,
        customerName: selectedCustomer?.name,
        discountAmount,
        taxAmount,
      };
      setResultPayload(receipt);
      setShowPayment(false);
      setLastResultType('offlined');
      cart.clearCart();
      setCashReceived('');
      setPaymentMethod('cash');
      setCurrentArkToUse(0);
      await refreshCount();
      setProcessingPayment(false);
      return;
    }

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
        table: selectedTableDisplay,
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
      setLastResultType('standard');
      cart.clearCart();
      setCashReceived('');
      setPaymentMethod('cash');
      setCurrentArkToUse(0);
    } else {
      alert(res.error || 'Pembayaran gagal');
    }
    setProcessingPayment(false);
  }, [cart, paymentMethod, selectedCustomer, cashReceived, totalAfterArk, checkout, discountAmount, taxAmount, arkToUseCapped, isOnline, enqueue, membershipDiscount, shift, refreshCount, paymentOrderId, payingOrderNumber, router, processingPayment, selectedTableDisplay, hasShift]);

  /* Split Bill */
  const handleConfirmSplit = useCallback(async (config: SplitConfig) => {
    if (cart.items.length === 0) return;
    if (!hasShift) {
      alert('Silakan buka shift terlebih dahulu sebelum membuat order.');
      setShowShiftModal(true);
      return;
    }
    setShowSplitModal(false);

    if (!isOnline) {
      const payload = {
        order_type: cart.orderType,
        customer_id: selectedCustomer?.id,
        cashier_id: CASHIER_ID,
        server_id: undefined,
        table_id: cart.selectedTable || undefined,
        shift_id: shift?.id,
        items: cart.items.map(item => ({
          product_id: item.productId,
          product_name: item.name,
          product_sku: item.productId,
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
      };
      await enqueue(payload, 'split');
      const receipt: ReceiptPayload = {
        orderId: 'OFFLINE-SPLIT-' + Date.now().toString(36).toUpperCase(),
        orderNumber: 'OFFLINE-SPLIT-' + Date.now().toString(36).toUpperCase(),
        orderType: cart.orderType,
        table: selectedTableDisplay,
        items: [...cart.items],
        notes: cart.notes,
        total,
        change: 0,
        paymentMethod,
        customerName: selectedCustomer?.name,
        discountAmount,
        taxAmount,
      };
      setResultPayload(receipt);
      setLastResultType('offlined');
      cart.clearCart();
      await refreshCount();
      return;
    }

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
          product_sku: item.productId,
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
  }, [cart, selectedCustomer, discountAmount, taxAmount, total, membershipDiscount, isOnline, enqueue, paymentMethod, shift, refreshCount, selectedTableDisplay, hasShift]);

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
          product_sku: item.productId,
          variants: item.variantName ? [{ name: item.variantName, group: 'Size', price: item.variantPriceAdj || 0 }] : [],
          modifiers: item.modifierNames?.map((name, idx) => ({ name, group: `Option-${idx}` })) || [],
          quantity: Number(item.quantity),
          unit_price: Number(item.price - (item.variantPriceAdj || 0) - (item.modifierPriceAdj || 0)),
          variant_price_adjustment: item.variantPriceAdj || 0,
          modifier_price_adjustment: item.modifierPriceAdj || 0,
          subtotal: Number(item.price * item.quantity),
          total_amount: Number(item.price * item.quantity),
          station: item.station,
          kitchen_notes: item.notes,
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
        {/* Offline Status Bar */}
        {!isOnline && (
          <div className="flex items-center justify-between px-4 py-2 rounded-lg border border-stone-300 bg-stone-100 text-stone-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="font-medium">Mode Offline — Transaksi disimpan lokal</span>
            </div>
            <span className="text-xs opacity-75">{pendingCount} pending</span>
          </div>
        )}

        {/* Order Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                key: 'dine_in',
                label: 'Dine-in',
                icon: Utensils,
                activeClass: 'border-pink-600 bg-pink-600 text-white shadow-sm',
                idleClass: 'border-pink-200 bg-pink-50 text-pink-700 hover:border-pink-400 hover:bg-pink-100',
              },
              {
                key: 'takeaway',
                label: 'Takeaway',
                icon: ShoppingBag,
                activeClass: 'border-amber-500 bg-amber-500 text-white shadow-sm',
                idleClass: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100',
              },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => {
                  cart.setOrderType(t.key as any);
                  if (t.key === 'dine_in') setShowTableModal(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                  cart.orderType === t.key ? t.activeClass : t.idleClass
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustomerModal(true)}
              className={`flex min-w-[150px] items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                selectedCustomer
                  ? 'border-violet-500 bg-violet-500 text-white shadow-sm hover:bg-violet-600'
                  : 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-violet-100'
              }`}
            >
              <User className="w-4 h-4" />
              <span>
                {selectedCustomer?.name ? selectedCustomer.name.split(' ')[0] : 'Cari Pelanggan'}
              </span>
            </button>
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setShowProductSuggestions(true);
                  setActiveProductSuggestion(0);
                }}
                onFocus={() => setShowProductSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowProductSuggestions(false), 120);
                }}
                onKeyDown={(e) => {
                  if (!showProductSuggestions || productSuggestions.length === 0) return;

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveProductSuggestion((current) => Math.min(current + 1, productSuggestions.length - 1));
                    return;
                  }

                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveProductSuggestion((current) => Math.max(current - 1, 0));
                    return;
                  }

                  if (e.key === 'Enter') {
                    e.preventDefault();
                    selectProductFromSearch(productSuggestions[activeProductSuggestion] || productSuggestions[0]);
                    return;
                  }

                  if (e.key === 'Escape') {
                    setShowProductSuggestions(false);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all placeholder:text-gray-400"
              />
              {showProductSuggestions && searchTerm.trim() && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-2xl">
                  {productSuggestions.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-gray-500">Produk tidak ditemukan</div>
                  ) : (
                    productSuggestions.map((product, index) => {
                      const hasOptions = Boolean(product.variants?.length || product.modifiers?.length);

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectProductFromSearch(product)}
                          onMouseEnter={() => setActiveProductSuggestion(index)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                            index === activeProductSuggestion ? 'bg-pink-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-500">
                              {product.category?.name || 'Uncategorized'} · {formatCurrency(product.base_price)}
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                            hasOptions ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {hasOptions ? 'Varian' : 'Cart'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
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
        selectedTable={selectedTableDisplay}
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
        onCreateCustomer={handleCreateCustomer}
        onSelect={(c) => { cart.setCustomer(c?.id ?? null); setShowCustomerModal(false); setCustomerSearch(''); }}
        onClose={() => setShowCustomerModal(false)}
      />

      {/* ── Table Modal ── */}
      <Dialog open={showTableModal} onOpenChange={setShowTableModal}>
        <DialogContent className="!h-[88vh] !w-[calc(100vw-24px)] !max-w-none sm:!max-w-none !p-8">
          <div className="flex h-full flex-col space-y-4 py-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pilih Meja</h2>
              <p className="text-sm text-gray-500">Dine-in</p>
            </div>

            {loadingTables ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                Memuat meja...
              </div>
            ) : tableError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                {tableError}
              </div>
            ) : tables.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                Belum ada meja aktif.
              </div>
            ) : (
              <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
                {tables.map((table) => {
                  const isSelected = cart.selectedTable === table.id;
                  const isOccupied = table.status === 'occupied' && !isSelected;
                  const activeOrder = table.active_order?.order_number;

                  return (
                    <button
                      key={table.id}
                      type="button"
                      disabled={isOccupied}
                      onClick={() => {
                        cart.setTable(isSelected ? null : table.id);
                        setShowTableModal(false);
                      }}
                      className={`min-h-[92px] rounded-lg border-2 px-4 py-4 text-left transition-all ${
                        isSelected
                          ? 'border-pink-600 bg-pink-600 text-white shadow-sm'
                          : isOccupied
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 bg-white text-gray-800 hover:border-pink-400 hover:bg-pink-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold tracking-normal">{getTableDisplayName(table)}</span>
                        <TableIcon className="h-5 w-5 flex-shrink-0" />
                      </div>
                      <div className={`mt-3 text-xs font-semibold ${isSelected ? 'text-pink-100' : isOccupied ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isOccupied ? activeOrder || 'Terisi' : `${table.capacity} seat`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
        submitting={processingPayment || submitting}
        onConfirm={async ({ method, cashReceived, arkToUse }) => {
          setPaymentMethod(method);
          setCashReceived(cashReceived);
          setCurrentArkToUse(arkToUse);
          await handleCreateOrder();
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
              {lastResultType === 'offlined' ? (
                <>
                  <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Tersimpan Offline</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Order akan di-sync saat koneksi kembali.
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 space-y-2 text-left">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Order ID</span>
                      <span className="font-bold text-gray-900">{resultPayload.orderNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total</span>
                      <span className="font-bold text-gray-900">{formatCurrency(resultPayload.total)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handlePrint('KITCHEN')} className="flex items-center justify-center gap-1.5 py-2.5 border-2 border-orange-400 text-orange-600 rounded-lg text-sm font-semibold hover:bg-orange-50"><Printer className="w-4 h-4" /> Kitchen</button>
                <button onClick={() => handlePrint('BAR')} className="flex items-center justify-center gap-1.5 py-2.5 border-2 border-pink-400 text-pink-600 rounded-lg text-sm font-semibold hover:bg-pink-50"><Printer className="w-4 h-4" /> Bar</button>
                <button onClick={() => handlePrint('CUSTOMER')} className="flex items-center justify-center gap-1.5 py-2.5 border-2 border-purple-400 text-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-50"><Printer className="w-4 h-4" /> Struk</button>
              </div>
              <button onClick={() => setResultPayload(null)} className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700">Transaksi Baru</button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Offline Queue Modal ── */}
      <Dialog open={showOfflineQueue} onOpenChange={() => setShowOfflineQueue(false)}>
        <DialogContent className="max-w-sm">
          <div className="py-4 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 text-center">Antrian Offline</h2>
            <p className="text-sm text-gray-500 text-center">{pendingCount} order menunggu sync</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const { synced, failed } = await syncQueue();
                  alert(`Sync selesai: ${synced} berhasil, ${failed} gagal`);
                }}
                disabled={!isOnline || pendingCount === 0}
                className="flex-1 py-2.5 bg-pink-600 text-white rounded-lg text-sm font-semibold hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sync Sekarang
              </button>
              <button
                onClick={() => setShowOfflineQueue(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>
          </div>
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
            table={splitOrder.table_id ? getTableDisplayName(tableById.get(splitOrder.table_id)) : null}
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

export default function CashierPageNew() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Memuat kasir...</div>}>
      <CashierPageNewContent />
    </Suspense>
  );
}
