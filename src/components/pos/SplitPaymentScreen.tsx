'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, CheckCircle, Clock, XCircle, CreditCard, Coins, User, Printer,
} from 'lucide-react';
import type { SplitDetail, Customer } from '@/lib/pos-api';
import { getOrderSplits, paySplit } from '@/lib/pos-api';
import { PaymentModal } from './PaymentModal';
import { printThermalReceipt, type ReceiptPayload } from './PrintReceipt';

interface SplitPaymentScreenProps {
  orderId: string;
  orderNumber?: string;
  orderType?: string;
  table?: string | null;
  items?: any[];
  notes?: string;
  total: number;
  taxAmount: number;
  discountAmount: number;
  customerName?: string;
  onBack: () => void;
  onComplete: () => void;
  formatCurrency: (n: number) => string;
  formatArk: (n: number) => string;
}

export function SplitPaymentScreen({
  orderId,
  orderNumber,
  orderType,
  table,
  items,
  notes,
  total,
  taxAmount,
  discountAmount,
  customerName,
  onBack,
  onComplete,
  formatCurrency,
  formatArk,
}: SplitPaymentScreenProps) {
  const [splits, setSplits] = useState<SplitDetail[]>([]);
  const [summary, setSummary] = useState({ total_paid: 0, total_remaining: total, split_count: 0, paid_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingSplit, setPayingSplit] = useState<SplitDetail | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [resultPayload, setResultPayload] = useState<ReceiptPayload | null>(null);

  const fetchSplits = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getOrderSplits(orderId);
      if (res.success && res.data) {
        setSplits(res.data.splits || []);
        setSummary({
          total_paid: res.data.total_paid || 0,
          total_remaining: res.data.total_remaining || 0,
          split_count: res.data.split_count || 0,
          paid_count: res.data.paid_count || 0,
        });
      } else {
        setError('Gagal memuat split');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchSplits();
  }, [fetchSplits]);

  const handlePay = useCallback(async (payload: {
    method: string;
    amount_paid: number;
    ark_coins_used: number;
  }) => {
    if (!payingSplit) return;
    try {
      const res = await paySplit(orderId, payingSplit.id, {
        payment_method: payload.method,
        amount_paid: payload.amount_paid,
        ark_coins_used: payload.ark_coins_used,
      });

      if (res.success) {
        // show success modal
        const receipt: ReceiptPayload = {
          orderId,
          orderNumber,
          orderType: orderType || 'dine_in',
          table: table ?? null,
          items: items || [],
          notes: notes || '',
          total: payingSplit.total_amount,
          change: res.data?.change || 0,
          paymentMethod: payload.method,
          customerName: payingSplit.customer_id ? undefined : customerName,
          discountAmount: payingSplit.discount_amount,
          taxAmount: payingSplit.tax_amount,
        };
        setResultPayload(receipt);
        setShowPayment(false);
        setPayingSplit(null);
        // refresh list
        await fetchSplits();

        // If all paid, auto complete
        if (res.data?.paid_splits >= res.data?.total_splits) {
          setTimeout(() => onComplete(), 1500);
        }
      } else {
        setError(res.data?.error || 'Pembayaran gagal');
      }
    } catch (e: any) {
      setError(e.message || 'Pembayaran gagal');
    }
  }, [payingSplit, orderId, orderNumber, orderType, table, items, notes, customerName, fetchSplits, onComplete]);

  const handlePrint = useCallback((label: 'KITCHEN' | 'BAR' | 'CUSTOMER') => {
    if (!resultPayload) return;
    printThermalReceipt(resultPayload, label);
  }, [resultPayload]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pembayaran Split</h2>
          <p className="text-sm text-gray-500">Order #{orderNumber ? orderNumber.slice(-8).toUpperCase() : orderId.slice(-8).toUpperCase()} · {customerName || 'Tanpa Member'}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500">Total Tagihan</p>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(total)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500">Sudah Dibayar</p>
          <p className="text-sm font-bold text-green-600">{formatCurrency(summary.total_paid)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500">Sisa</p>
          <p className="text-sm font-bold text-pink-600">{formatCurrency(summary.total_remaining)}</p>
        </div>
      </div>

      {/* Splits list */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-xl">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : splits.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Tidak ada split ditemukan.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {splits.map((split) => (
              <div key={split.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 font-bold text-sm flex items-center justify-center flex-shrink-0 border border-pink-200">
                  {split.split_index}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{split.label || `Split ${split.split_index}`}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {split.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Lunas
                      </span>
                    ) : split.status === 'cancelled' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Dibatalkan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Belum Dibayar
                      </span>
                    )}
                    {split.payment_method && (
                      <span className="text-xs text-gray-500">
                        {split.payment_method === 'ark_coin' ? <><Coins className="w-3 h-3 inline mr-0.5" /> ARK</> : <><CreditCard className="w-3 h-3 inline mr-0.5" /> {split.payment_method?.toUpperCase()}</>}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(split.total_amount)}</p>
                  {split.status === 'paid' && split.ark_coins_used > 0 && (
                    <p className="text-[10px] text-amber-600">{formatArk(split.ark_coins_used)}</p>
                  )}
                </div>
                {split.status === 'pending' && (
                  <button
                    onClick={() => { setPayingSplit(split); setShowPayment(true); }}
                    className="px-3 py-2 bg-pink-600 text-white text-xs font-semibold rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    Bayar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment modal */}
      <PaymentModal
        open={showPayment && !!payingSplit}
        total={payingSplit?.total_amount || 0}
        totalAfterArk={payingSplit?.total_amount || 0}
        selectedCustomer={null}
        onClose={() => { setShowPayment(false); setPayingSplit(null); }}
        onConfirm={({ method, cashReceived, arkToUse }) => {
          handlePay({
            method,
            amount_paid: parseFloat(cashReceived) || payingSplit!.total_amount,
            ark_coins_used: arkToUse,
          });
        }}
        formatCurrency={formatCurrency}
        formatArk={formatArk}
        onTapNFC={() => { /* NFC for split: Phase 2 */ }}
      />

      {/* Success receipt */}
      {resultPayload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-5">
            <div className="text-center">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold text-gray-900 mt-3">Split Berhasil Dibayar!</h2>
              <p className="text-sm text-gray-500 mt-1">Split #{payingSplit?.label || ''}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold">{formatCurrency(resultPayload.total)}</span>
              </div>
              {resultPayload.change > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Kembalian</span>
                  <span className="font-bold text-green-600">{formatCurrency(resultPayload.change)}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handlePrint('CUSTOMER')}
                className="flex items-center justify-center gap-1.5 py-2.5 border-2 border-purple-400 text-purple-600 rounded-lg text-xs font-semibold hover:bg-purple-50"
              >
                <Printer className="w-3 h-3" /> Struk
              </button>
            </div>
            <button
              onClick={() => setResultPayload(null)}
              className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700"
            >
              Lanjut
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
