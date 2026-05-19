import { useMemo, useState } from 'react';
import { X, MoveRight, Table2, Utensils, ShoppingBag, Truck, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { moveOrderTable } from '@/lib/pos-api';
import type { Order } from '@/lib/pos-api';

interface MoveTableModalProps {
  open: boolean;
  order: Order | null;
  allOrders: Order[];
  onClose: () => void;
  onSuccess?: () => void;
}

const ORDER_TYPES = [
  { key: 'dine_in', label: 'Dine-in', icon: Utensils },
  { key: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'self_order', label: 'Self-order', icon: Monitor },
];

const MAX_TABLES = 20;

export function MoveTableModal({ open, order, allOrders, onClose, onSuccess }: MoveTableModalProps) {
  const [newType, setNewType] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const occupiedTables = useMemo(() => {
    const set = new Set<string>();
    for (const o of allOrders) {
      if (o.id !== order?.id && o.table_id && !['completed', 'cancelled', 'voided', 'merged'].includes(o.status || '')) {
        set.add(o.table_id);
      }
    }
    return set;
  }, [allOrders, order?.id]);

  const reset = () => {
    setNewType('');
    setSelectedTable(null);
    setError('');
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const effectiveType = newType || order?.order_type || '';
  const showTables = effectiveType === 'dine_in';

  const handleSubmit = async () => {
    if (!order) return;
    const tableId = showTables ? selectedTable : null;
    const typeToSend = newType || undefined;

    try {
      setBusy(true);
      setError('');
      const res = await moveOrderTable(order.id, tableId, typeToSend);
      if (res.success) {
        reset();
        onSuccess?.();
        onClose();
      } else {
        setError(res.error || 'Gagal memindahkan order');
      }
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoveRight className="w-5 h-5 text-pink-600" /> Pindah / Ubah Order
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="font-medium">Order:</span> {order.order_number}</p>
            <p><span className="font-medium">Saat ini:</span> {order.order_type} {order.table_id ? `• ${order.table_id}` : ''}</p>
          </div>
        )}

        <div className="space-y-4 mt-2">
          {/* Order Type */}
          <div>
            <label className="text-sm font-medium text-gray-700">Jenis Order</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {ORDER_TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => {
                    setNewType(t.key);
                    if (t.key !== 'dine_in') setSelectedTable(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border-2 transition-all ${
                    effectiveType === t.key
                      ? 'border-pink-600 bg-pink-50 text-pink-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tables */}
          {showTables && (
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Table2 className="w-4 h-4" /> Pilih Meja
              </label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {Array.from({ length: MAX_TABLES }, (_, i) => {
                  const tableName = `Meja ${i + 1}`;
                  const isOccupied = occupiedTables.has(tableName);
                  const isSelected = selectedTable === tableName;
                  const isCurrent = order?.table_id === tableName;
                  return (
                    <button
                      key={tableName}
                      disabled={isOccupied && !isCurrent}
                      onClick={() => setSelectedTable(isSelected ? null : tableName)}
                      className={`py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                        isSelected
                          ? 'border-pink-600 bg-pink-600 text-white'
                          : isCurrent
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : isOccupied
                          ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                          : 'border-gray-200 text-gray-700 hover:border-pink-400'
                      }`}
                    >
                      {i + 1}
                      {isCurrent && <span className="block text-[9px] opacity-75">sekarang</span>}
                      {isOccupied && !isCurrent && <span className="block text-[9px] opacity-75">terpakai</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-pink-600 bg-pink-600 rounded-sm inline-block"/> Dipilih</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-blue-400 bg-blue-50 rounded-sm inline-block"/> Saat ini</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-red-200 bg-red-50 rounded-sm inline-block"/> Terpakai</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={busy}>Batal</Button>
          <Button
            className="flex-1 bg-pink-600 hover:bg-pink-700"
            onClick={handleSubmit}
            disabled={busy || !effectiveType || (showTables && !selectedTable)}
          >
            {busy ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
