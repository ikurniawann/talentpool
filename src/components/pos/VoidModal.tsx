import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { voidOrder } from '@/lib/pos-api';
import type { Order } from '@/lib/pos-api';

interface VoidModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function VoidModal({ open, order, onClose, onSuccess }: VoidModalProps) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setPin('');
    setReason('');
    setError('');
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!order) return;
    if (!pin.trim() || !reason.trim()) {
      setError('PIN supervisor dan alasan wajib diisi');
      return;
    }
    try {
      setBusy(true);
      setError('');
      const res = await voidOrder(order.id, reason.trim(), pin.trim());
      if (res.success) {
        reset();
        onSuccess?.();
        onClose();
      } else {
        setError(res.error || 'Gagal melakukan void');
      }
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" /> Void Order
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="font-medium">Order:</span> {order.order_number}</p>
            <p><span className="font-medium">Total:</span> Rp {order.total_amount?.toLocaleString('id-ID')}</p>
            <p><span className="font-medium">Meja:</span> {order.table_id || '-'}</p>
          </div>
        )}

        <div className="space-y-3 mt-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Alasan Void</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Pilih alasan...</option>
              <option value=" salah_pesan">Salah Pesan</option>
              <option value="cancel">Customer cancel</option>
              <option value="double_order">Double order</option>
              <option value="item_habis">Item habis</option>
              <option value="lainnya">Lainnya</option>
            </select>
            {reason === 'lainnya' && (
              <textarea
                value={reason === 'lainnya' ? '' : reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tulis alasan lain..."
                className="w-full mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={2}
              />
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">PIN Supervisor</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Masukkan 4-6 digit PIN"
              className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 tracking-widest"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={busy}>
            Batal
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleSubmit}
            disabled={busy || !pin.trim() || !reason.trim()}
          >
            {busy ? 'Memproses...' : 'Void Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
