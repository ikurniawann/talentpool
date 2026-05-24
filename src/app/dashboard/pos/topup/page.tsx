'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Banknote, Check, Coins, CreditCard, Loader2, QrCode, Search, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type PaymentMethod = 'qris' | 'credit_card' | 'cash';
type TopupStatus = 'idle' | 'enter_amount' | 'payment' | 'processing' | 'success';

interface Customer {
  id: string;
  name?: string | null;
  phone: string;
  membership_tier?: string | null;
  ark_coin_balance: number;
}

interface TopupResult {
  transaction?: {
    id: string;
    payment_method?: string;
    created_at?: string;
  };
  balance_before: number;
  balance_after: number;
  ark_coins: number;
  qr_code_url?: string | null;
}

const ARK_RATE = 1000;
const presetValues = [50000, 100000, 200000, 500000, 1000000];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const formatArk = (value: number) => `${((value || 0) / ARK_RATE).toLocaleString('id-ID')} ARK`;

function tierStyle(tier?: string | null) {
  const value = String(tier || 'bronze').toLowerCase();
  if (value === 'platinum') return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
  if (value === 'gold') return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
  if (value === 'silver') return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
  return 'bg-blue-100 text-blue-700';
}

export default function TopupPage() {
  const [step, setStep] = useState<TopupStatus>('idle');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [topupRp, setTopupRp] = useState(0);
  const [customRp, setCustomRp] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('qris');
  const [showReceipt, setShowReceipt] = useState(false);
  const [result, setResult] = useState<TopupResult | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((item) =>
      `${item.name || ''} ${item.phone}`.toLowerCase().includes(query)
    );
  }, [customers, customerSearch]);

  const projectedBalance = customer ? Number(customer.ark_coin_balance || 0) + topupRp : 0;

  async function loadCustomers(search = '') {
    setLoadingCustomers(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/pos/customers${params.toString() ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Gagal memuat pelanggan');
      setCustomers((json.data || []) as Customer[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pelanggan');
    } finally {
      setLoadingCustomers(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function openCustomerList() {
    setShowCustomerList(true);
    if (customers.length === 0) await loadCustomers();
  }

  function selectCustomer(item: Customer) {
    setCustomer(item);
    setShowCustomerList(false);
    setStep('enter_amount');
    setTopupRp(0);
    setCustomRp('');
    setResult(null);
    setError('');
  }

  function selectPreset(value: number) {
    setTopupRp(value);
    setCustomRp('');
  }

  function handleCustom(value: string) {
    setCustomRp(value);
    setTopupRp(Number.parseInt(value, 10) || 0);
  }

  function goBack() {
    setError('');
    if (step === 'enter_amount') {
      setStep('idle');
      setCustomer(null);
    } else if (step === 'payment') {
      setStep('enter_amount');
    }
  }

  async function pay() {
    if (!customer || topupRp < 10000) return;
    setStep('processing');
    setError('');

    try {
      const response = await fetch('/api/pos/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          amount: topupRp,
          payment_method: payment === 'credit_card' ? 'credit' : payment,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Topup gagal');

      const data = json.data as TopupResult;
      setResult(data);
      const updatedCustomer = { ...customer, ark_coin_balance: Number(data.balance_after || projectedBalance) };
      setCustomer(updatedCustomer);
      setCustomers((current) => current.map((item) => item.id === updatedCustomer.id ? updatedCustomer : item));
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Topup gagal');
      setStep('payment');
    }
  }

  function newTopup() {
    setTopupRp(0);
    setCustomRp('');
    setResult(null);
    setStep('enter_amount');
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 flex items-center gap-3">
        {step !== 'idle' && (
          <button onClick={goBack} className="rounded-lg p-1.5 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          <h1 className="text-lg font-bold text-gray-900">Topup ARK</h1>
        </div>
        <span className="ml-auto text-xs text-gray-500">1 ARK = Rp 1,000</span>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {step === 'idle' && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
              <Coins className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Topup ARK Coins</h2>
            <p className="mb-6 max-w-xs text-sm text-gray-500">Tambahkan saldo ARK Coins ke wallet pelanggan dari database POS.</p>

            <button
              onClick={openCustomerList}
              className="flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
            >
              <User className="h-4 w-4" />
              Cari Pelanggan
            </button>
          </div>
        )}

        {step === 'enter_amount' && customer && (
          <div className="space-y-4">
            <CustomerCard customer={customer} />

            <div>
              <div className="mb-2 text-xs font-medium text-gray-500">Pilih Nominal</div>
              <div className="flex flex-wrap gap-2">
                {presetValues.map((value) => (
                  <button
                    key={value}
                    onClick={() => selectPreset(value)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      topupRp === value ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-700 hover:border-pink-400'
                    }`}
                  >
                    {formatArk(value)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-gray-500">Atau input nominal Rupiah</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Rp</span>
                <input
                  type="number"
                  value={customRp}
                  onChange={(event) => handleCustom(event.target.value)}
                  placeholder="0"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  min="10000"
                />
              </div>
            </div>

            {topupRp > 0 && (
              <div className="rounded-xl bg-gray-900 p-4 text-white">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-400">ARK yang diterima</span>
                  <span className="text-xl font-bold">{formatArk(topupRp)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Saldo baru</span>
                  <span className="font-bold text-amber-400">{formatArk(projectedBalance)}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => topupRp >= 10000 && setStep('payment')}
              disabled={topupRp < 10000}
              className="w-full rounded-lg bg-pink-600 py-3 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Lanjut Bayar
            </button>
          </div>
        )}

        {step === 'payment' && customer && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-900 p-4 text-center text-white">
              <div className="mb-1 text-xs text-gray-400">Jumlah Topup</div>
              <div className="text-3xl font-bold">{formatArk(topupRp)}</div>
              <div className="mt-1 text-lg text-gray-400">{formatCurrency(topupRp)}</div>
            </div>

            <div className="space-y-2">
              {[
                { id: 'qris', icon: QrCode, label: 'QRIS', desc: 'Dicatat sebagai topup QRIS' },
                { id: 'credit_card', icon: CreditCard, label: 'Card', desc: 'Dicatat sebagai kartu' },
                { id: 'cash', icon: Banknote, label: 'Cash', desc: 'Uang tunai di kasir' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPayment(method.id as PaymentMethod)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                    payment === method.id ? 'border-pink-600 bg-pink-50' : 'border-gray-200 hover:border-pink-400'
                  }`}
                >
                  <method.icon className="h-5 w-5 text-gray-600" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900">{method.label}</div>
                    <div className="text-xs text-gray-500">{method.desc}</div>
                  </div>
                  {payment === method.id && <Check className="h-4 w-4 text-pink-600" />}
                </button>
              ))}
            </div>

            <button onClick={pay} className="w-full rounded-lg bg-pink-600 py-3 text-sm font-semibold text-white hover:bg-pink-700">
              Bayar {formatCurrency(topupRp)}
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex h-full flex-col items-center justify-center">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-pink-600" />
            <div className="text-base font-semibold text-gray-900">Memproses topup...</div>
          </div>
        )}

        {step === 'success' && customer && result && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Topup Berhasil</h2>
            <p className="mb-4 text-sm text-gray-500">{formatArk(topupRp)} telah ditambahkan</p>

            <div className="mb-4 w-full rounded-xl border border-gray-200 bg-gray-50 p-4">
              <Line label="Pelanggan" value={customer.name || customer.phone} />
              <Line label="Nominal" value={formatCurrency(topupRp)} />
              <Line label="ARK diterima" value={formatArk(topupRp)} />
              <Line label="Saldo baru" value={formatArk(result.balance_after)} strong />
            </div>

            <div className="flex w-full gap-2">
              <button onClick={() => setShowReceipt(true)} className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
                Lihat Struk
              </button>
              <button onClick={newTopup} className="flex-1 rounded-lg bg-pink-600 py-2.5 text-sm font-medium text-white hover:bg-pink-700">
                Topup Lagi
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showCustomerList} onOpenChange={(open) => !open && setShowCustomerList(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Pilih Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama atau telepon..."
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                autoFocus
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {loadingCustomers ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat pelanggan...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">Pelanggan tidak ditemukan</div>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectCustomer(item)}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-pink-50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100">
                      <span className="text-sm font-bold text-pink-600">{(item.name || item.phone).charAt(0)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">{item.name || 'Tanpa Nama'}</div>
                      <div className="text-xs text-gray-500">{item.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-600">{formatArk(item.ark_coin_balance)}</div>
                      <div className={`mt-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${tierStyle(item.membership_tier)}`}>
                        {item.membership_tier || 'bronze'}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceipt} onOpenChange={(open) => !open && setShowReceipt(false)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-semibold">Struk Topup</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3 text-sm">
            <div className="border-b border-gray-200 pb-3 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-xs text-gray-500">Berhasil</div>
              <div className="text-xl font-bold text-gray-900">{formatArk(topupRp)}</div>
            </div>
            <Line label="Pelanggan" value={customer?.name || customer?.phone || '-'} />
            <Line label="Nominal" value={formatCurrency(topupRp)} />
            <Line label="Metode" value={payment.toUpperCase()} />
            <Line label="Saldo Sebelum" value={formatArk(result?.balance_before || 0)} />
            <Line label="Saldo Baru" value={formatArk(result?.balance_after || 0)} strong />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100">
          <span className="font-bold text-pink-600">{(customer.name || customer.phone).charAt(0)}</span>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">{customer.name || 'Tanpa Nama'}</div>
          <div className="mt-0.5 text-xs text-gray-500">{customer.phone}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1">
          <Coins className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-sm font-bold text-amber-600">{formatArk(customer.ark_coin_balance)}</span>
        </div>
        <div className="text-xs text-gray-500">saldo</div>
      </div>
    </div>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="mb-2 flex items-center justify-between last:mb-0">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? 'font-bold text-amber-600' : 'font-medium text-gray-900'}>{value}</span>
    </div>
  );
}
