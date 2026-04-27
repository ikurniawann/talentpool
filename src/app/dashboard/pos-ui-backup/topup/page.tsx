'use client';

import { useState } from 'react';
import { 
  Coins, CreditCard, Banknote, Search, User, X,
  Check, ArrowLeft, QrCode, Sparkles, Plus, Minus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type CustomerType = 'regular' | 'premium' | 'owner' | 'vip';
type Tier = 'silver' | 'gold' | 'platinum';
type PaymentMethod = 'qris' | 'credit_card' | 'cash';
type TopupStatus = 'idle' | 'select_customer' | 'enter_amount' | 'payment' | 'processing' | 'success';

interface Customer {
  id: string;
  name: string;
  phone: string;
  customerType: CustomerType;
  tier: Tier | null;
  arkCoin: number;
}

const mockCustomers: Customer[] = [
  { id: 'c1', name: 'Ahmad Wijaya', phone: '081234567890', customerType: 'regular', tier: 'Gold', arkCoin: 250000 },
  { id: 'c2', name: 'Siti Rahayu', phone: '081234567891', customerType: 'regular', tier: 'Silver', arkCoin: 85000 },
  { id: 'c3', name: 'Budi Santoso', phone: '081234567892', customerType: 'vip', tier: null, arkCoin: 1500000 },
  { id: 'c4', name: 'Warung Kopi Nusantara', phone: '081234567893', customerType: 'premium', tier: null, arkCoin: 5000000 },
  { id: 'c5', name: 'H. Abdullah Trading', phone: '081234567894', customerType: 'owner', tier: null, arkCoin: 8500000 },
];

const ARK_RATE = 1000;

const presetValues = [50000, 100000, 200000, 500000, 1000000];

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const badgeStyle = (type: CustomerType) => {
  switch (type) {
    case 'premium': return 'bg-purple-100 text-purple-700';
    case 'owner': return 'bg-gray-900 text-white';
    case 'vip': return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white';
    default: return 'bg-blue-100 text-blue-700';
  }
};

const tierStyle = (tier: Tier | null) => {
  if (!tier) return '';
  switch (tier) {
    case 'platinum': return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
    case 'gold': return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
    case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
    default: return '';
  }
};

export default function TopupPage() {
  const [step, setStep] = useState<TopupStatus>('idle');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [topupRp, setTopupRp] = useState(0);
  const [customRp, setCustomRp] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('qris');
  const [showReceipt, setShowReceipt] = useState(false);

  const filtered = mockCustomers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
  );

  const arkAmount = topupRp / ARK_RATE;
  const newBalance = customer ? customer.arkCoin + topupRp : 0;

  const selectCustomer = (c: Customer) => {
    setCustomer(c);
    setShowCustomerList(false);
    setStep('enter_amount');
    setTopupRp(0);
    setCustomRp('');
  };

  const selectPreset = (val: number) => {
    setTopupRp(val);
    setCustomRp('');
  };

  const handleCustom = (val: string) => {
    setCustomRp(val);
    setTopupRp(parseInt(val) || 0);
  };

  const goBack = () => {
    if (step === 'enter_amount') { setStep('idle'); setCustomer(null); }
    else if (step === 'payment') setStep('enter_amount');
  };

  const proceed = () => {
    if (topupRp >= 10000) setStep('payment');
  };

  const pay = () => {
    setStep('processing');
    setTimeout(() => setStep('success'), 1500);
  };

  const newTopup = () => {
    if (customer) setCustomer({ ...customer, arkCoin: newBalance });
    setTopupRp(0);
    setCustomRp('');
    setStep('enter_amount');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {step !== 'idle' && (
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-500" />
          <h1 className="text-lg font-bold text-gray-900">Topup ARK</h1>
        </div>
        <span className="text-xs text-gray-500 ml-auto">1 ARK = Rp 1,000</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <Coins className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Topup ARK Coins</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">Tambahkan ARK Coins ke wallet pelanggan</p>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowCustomerList(true)}
                className="px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 flex items-center gap-2"
              >
                <User className="w-4 h-4" /> Cari Pelanggan
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 flex items-center gap-2">
                <QrCode className="w-4 h-4" /> Scan NFC
              </button>
            </div>
          </div>
        )}

        {step === 'enter_amount' && customer && (
          <div className="space-y-4">
            {/* Customer Card */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <span className="text-pink-600 font-bold">{customer.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{customer.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${badgeStyle(customer.customerType)}`}>
                      {customer.customerType === 'regular' ? (customer.tier ? `${customer.tier}` : 'Member') : customer.customerType}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-bold text-amber-600">{(customer.arkCoin/1000).toLocaleString('id-ID')} ARK</span>
                </div>
                <div className="text-xs text-gray-500">saldo</div>
              </div>
            </div>

            {/* Preset Buttons */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Pilih Nominal</div>
              <div className="flex flex-wrap gap-2">
                {presetValues.map(val => (
                  <button
                    key={val}
                    onClick={() => selectPreset(val)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      topupRp === val 
                        ? 'border-pink-600 bg-pink-50 text-pink-700' 
                        : 'border-gray-200 text-gray-700 hover:border-pink-400'
                    }`}
                  >
                    {val/1000 >= 1000 ? `${val/1000000}jt` : `${val/1000}rb`} ARK
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Atau input nominal</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Rp</span>
                <input
                  type="number"
                  value={customRp}
                  onChange={(e) => handleCustom(e.target.value)}
                  placeholder="0"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  min="10000"
                />
              </div>
            </div>

            {/* Summary */}
            {topupRp > 0 && (
              <div className="p-4 bg-gray-900 rounded-xl text-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">ARK yang diterima</span>
                  <span className="text-xl font-bold">{arkAmount.toLocaleString('id-ID')} ARK</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Saldo baru</span>
                  <span className="text-amber-400 font-bold">{(newBalance/1000).toLocaleString('id-ID')} ARK</span>
                </div>
              </div>
            )}

            <button
              onClick={proceed}
              disabled={topupRp < 10000}
              className="w-full py-3 bg-pink-600 text-white text-sm font-semibold rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Lanjut Bayar
            </button>
          </div>
        )}

        {step === 'payment' && customer && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-gray-900 rounded-xl text-white text-center">
              <div className="text-xs text-gray-400 mb-1">Jumlah Topup</div>
              <div className="text-3xl font-bold">{arkAmount.toLocaleString('id-ID')} ARK</div>
              <div className="text-lg text-gray-400 mt-1">{formatCurrency(topupRp)}</div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-2">
              {[
                { id: 'qris', icon: QrCode, label: 'QRIS', desc: 'Scan kode QR' },
                { id: 'credit_card', icon: CreditCard, label: 'Card', desc: 'Visa/Mastercard' },
                { id: 'cash', icon: Banknote, label: 'Cash', desc: 'Uang tunai' },
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => setPayment(method.id as PaymentMethod)}
                  className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    payment === method.id 
                      ? 'border-pink-600 bg-pink-50' 
                      : 'border-gray-200 hover:border-pink-400'
                  }`}
                >
                  <method.icon className="w-5 h-5 text-gray-600" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900">{method.label}</div>
                    <div className="text-xs text-gray-500">{method.desc}</div>
                  </div>
                  {payment === method.id && <Check className="w-4 h-4 text-pink-600" />}
                </button>
              ))}
            </div>

            <button
              onClick={pay}
              className="w-full py-3 bg-pink-600 text-white text-sm font-semibold rounded-lg hover:bg-pink-700"
            >
              Bayar {formatCurrency(topupRp)}
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <Coins className="w-8 h-8 text-amber-500" />
            </div>
            <div className="text-base font-semibold text-gray-900">Memproses...</div>
          </div>
        )}

        {step === 'success' && customer && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Topup Berhasil!</h2>
            <p className="text-sm text-gray-500 mb-4">{arkAmount.toLocaleString('id-ID')} ARK telah ditambahkan</p>
            
            <div className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Pelanggan</span>
                <span className="text-sm font-medium text-gray-900">{customer.name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Jumlah</span>
                <span className="text-sm font-bold text-gray-900">{arkAmount.toLocaleString('id-ID')} ARK</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Saldo Baru</span>
                <span className="text-sm font-bold text-amber-600">{(newBalance/1000).toLocaleString('id-ID')} ARK</span>
              </div>
            </div>

            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowReceipt(true)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                Lihat Struk
              </button>
              <button
                onClick={newTopup}
                className="flex-1 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700"
              >
                Topup Lagi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer List Modal */}
      <Dialog open={showCustomerList} onOpenChange={(o) => !o && setShowCustomerList(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Pilih Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama atau telepon..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className="w-full p-3 text-left rounded-lg hover:bg-pink-50 flex items-center gap-3"
                >
                  <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center">
                    <span className="text-pink-600 font-bold text-sm">{c.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.phone}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-500" />
                    <span className="text-xs font-bold text-amber-600">{(c.arkCoin/1000).toLocaleString('id-ID')}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={(o) => !o && setShowReceipt(false)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-semibold">Struk Topup</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3 text-sm">
            <div className="text-center pb-3 border-b border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-xs text-gray-500">Berhasil</div>
              <div className="text-xl font-bold text-gray-900">{arkAmount.toLocaleString('id-ID')} ARK</div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pelanggan</span>
              <span className="font-medium">{customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jumlah</span>
              <span className="font-medium">{arkAmount.toLocaleString('id-ID')} ARK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nominal</span>
              <span className="font-medium">{formatCurrency(topupRp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Rate</span>
              <span className="font-medium">1 ARK = Rp 1,000</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between">
              <span className="text-gray-500">Saldo Baru</span>
              <span className="font-bold text-amber-600">{(newBalance/1000).toLocaleString('id-ID')} ARK</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
