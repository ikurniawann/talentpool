'use client';

import { useState } from 'react';
import { Clock, Lock, Unlock, AlertTriangle, CheckCircle2, Banknote } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { PosShift } from '@/lib/pos-api';

interface ShiftModalProps {
  open: boolean;
  shift: PosShift | null;
  onClose: () => void;
  onOpenShift: (openingCash: number, notes?: string) => Promise<any>;
  onCloseShift: (closingCash: number, notes?: string) => Promise<any>;
  formatCurrency: (n: number) => string;
}

export function ShiftModal({
  open, shift, onClose, onOpenShift, onCloseShift, formatCurrency,
}: ShiftModalProps) {
  const [mode, setMode] = useState<'idle' | 'opening' | 'closing' | 'confirmClose'>('idle');
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const handleOpen = async () => {
    const val = parseInt(openingCash.replace(/\D/g, '') || '0', 10);
    if (val < 0) return;
    setBusy(true);
    const res = await onOpenShift(val, notes);
    setBusy(false);
    if (res.success) {
      setOpeningCash('');
      setNotes('');
      setMode('idle');
      onClose();
    } else {
      alert(res.error || 'Gagal membuka shift');
    }
  };

  const handleClose = async () => {
    const val = parseInt(closingCash.replace(/\D/g, '') || '0', 10);
    if (val < 0) return;
    setBusy(true);
    const res = await onCloseShift(val, notes);
    setBusy(false);
    if (res.success) {
      setClosingCash('');
      setNotes('');
      setSummary(res.summary || null);
      setMode('confirmClose');
    } else {
      alert(res.error || 'Gagal menutup shift');
    }
  };

  const reset = () => {
    setMode('idle');
    setSummary(null);
    setOpeningCash('');
    setClosingCash('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {shift ? (
              <><Unlock className="w-5 h-5 text-green-600" /> Tutup Shift</>
            ) : (
              <><Lock className="w-5 h-5 text-amber-600" /> Buka Shift</>
            )}
          </DialogTitle>
        </DialogHeader>

        {!shift && mode !== 'confirmClose' && (
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Anda belum memiliki shift aktif. Silakan buka shift baru untuk mulai menerima order.
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Modal Awal (Rp)</label>
              <Input
                type="number"
                min={0}
                placeholder="500000"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Catatan (opsional)</label>
              <Input
                placeholder="Shift pagi, kasir utama..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10"
              />
            </div>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              onClick={handleOpen}
              disabled={busy || !openingCash}
            >
              {busy ? 'Membuka...' : 'Buka Shift'}
            </Button>
          </div>
        )}

        {shift && mode !== 'confirmClose' && (
          <div className="space-y-4 py-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 space-y-1">
              <div className="flex justify-between">
                <span>Shift:</span>
                <span className="font-mono font-bold">{shift.shift_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Buka:</span>
                <span>{new Date(shift.opened_at).toLocaleTimeString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Modal Awal:</span>
                <span className="font-bold">{formatCurrency(shift.opening_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Order:</span>
                <span className="font-bold">{shift.total_orders} pesanan</span>
              </div>
              <div className="flex justify-between">
                <span>Total Penjualan:</span>
                <span className="font-bold">{formatCurrency(shift.total_sales)}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Uang Fisik Akhir (Rp)</label>
              <Input
                type="number"
                min={0}
                placeholder="Hitung uang di laci..."
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Catatan Tutup Shift (opsional)</label>
              <Input
                placeholder="Shift selesai normal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10"
              />
            </div>

            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={handleClose}
              disabled={busy || !closingCash}
            >
              {busy ? 'Menutup...' : 'Tutup Shift'}
            </Button>
          </div>
        )}

        {mode === 'confirmClose' && summary && (
          <div className="space-y-4 py-2">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-bold text-gray-900">Ringkasan Shift</p>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Order</span>
                <span>{summary.total_orders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Penjualan</span>
                <span className="font-bold">{formatCurrency(summary.total_sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Modal Awal</span>
                <span>{formatCurrency(summary.opening_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cash yang Diharapkan</span>
                <span>{formatCurrency(summary.expected_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cash Fisik</span>
                <span>{formatCurrency(summary.closing_cash)}</span>
              </div>
              <div className={`flex justify-between font-bold ${summary.variance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span>Selisih (Variansi)</span>
                <span>{formatCurrency(summary.variance)}</span>
              </div>
            </div>
            <Button className="w-full" onClick={() => { reset(); onClose(); }}>Selesai</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
