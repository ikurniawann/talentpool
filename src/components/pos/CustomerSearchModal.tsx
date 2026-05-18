'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, User, X } from 'lucide-react';
import type { CustomerWithDiscount } from '@/hooks/use-pos-customers';

interface Props {
  open: boolean;
  customers: CustomerWithDiscount[];
  search: string;
  selectedCustomerId: string | null;
  onSearchChange: (v: string) => void;
  onSelect: (customer: CustomerWithDiscount | null) => void;
  onClose: () => void;
}

export function CustomerSearchModal({ open, customers, search, selectedCustomerId, onSearchChange, onSelect, onClose }: Props) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, search]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
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
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <button
            onClick={() => onSelect(null)}
            className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium">Guest / Tanpa Pelanggan</div>
              <div className="text-sm text-gray-500">Tidak mendapat diskon</div>
            </div>
          </button>
          <div className="space-y-2">
            {filtered.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelect(customer)}
                className={`w-full px-4 py-3 text-left rounded-lg border flex items-center gap-3 transition-colors ${
                  selectedCustomerId === customer.id
                    ? 'border-pink-600 bg-pink-50'
                    : 'border-gray-200 hover:bg-pink-50 hover:border-pink-300'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                  {customer.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{customer.name}</div>
                  <div className="text-sm text-gray-500">{customer.phone}</div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      customer.membership_tier === 'platinum'
                        ? 'bg-purple-100 text-purple-700'
                        : customer.membership_tier === 'gold'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
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
  );
}
