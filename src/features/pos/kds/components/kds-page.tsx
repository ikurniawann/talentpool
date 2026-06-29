'use client';

import { useState, useCallback } from 'react';
import {
  ChefHat, Volume2, VolumeX, RefreshCw, Monitor, Coffee, UtensilsCrossed, IceCreamBowl,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKds } from "../queries";
import { KDSOrderCard } from '@/components/pos/KDSOrderCard';

const STATIONS = [
  { key: 'all', label: 'Semua', icon: Monitor },
  { key: 'kitchen', label: 'Kitchen', icon: ChefHat },
  { key: 'bar', label: 'Bar', icon: Coffee },
  { key: 'bakery', label: 'Bakery', icon: UtensilsCrossed },
  { key: 'dessert', label: 'Dessert', icon: IceCreamBowl },
];

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
}

export function KdsPage() {
  const [station, setStation] = useState('all');
  const [dateScope, setDateScope] = useState<'today' | 'all'>('today');
  const todayRange = dateScope === 'today' ? getTodayRange() : { dateFrom: undefined, dateTo: undefined };
  const { orders, loading, error, soundEnabled, setSoundEnabled, refresh, updateStatus } = useKds({
    station: station === 'all' ? undefined : station,
    dateFrom: todayRange.dateFrom,
    dateTo: todayRange.dateTo,
    pollInterval: 3000,
  });

  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: string) => {
      const result = await updateStatus(orderId, newStatus);
      if (!result?.success) {
        alert(result?.error || 'Gagal update status order');
        return;
      }
      await refresh();
    },
    [updateStatus, refresh]
  );

  // Group by status for visual ordering
  const grouped = orders.reduce(
    (acc, o) => {
      acc[o.status] = acc[o.status] || [];
      acc[o.status].push(o);
      return acc;
    },
    {} as Record<string, typeof orders>
  );

  const displayOrder = ['ready', 'preparing', 'confirmed', 'pending'];
  const displayedOrders = displayOrder.flatMap((s) => grouped[s] || []);

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-orange-500" />
          <h1 className="text-lg font-bold tracking-tight">KDS — Kitchen Display</h1>
          <span className="text-xs text-gray-500 font-mono">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </span>
          {loading && (
            <RefreshCw className="w-3.5 h-3.5 text-gray-500 animate-spin" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Station filter */}
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            {STATIONS.map((s) => {
              const Icon = s.icon;
              const active = station === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setStation(s.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    active ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="flex bg-gray-800 rounded-lg p-0.5">
            {[
              { key: 'today', label: 'Hari ini' },
              { key: 'all', label: 'Semua' },
            ].map((scope) => {
              const active = dateScope === scope.key;
              return (
                <button
                  key={scope.key}
                  onClick={() => setDateScope(scope.key as 'today' | 'all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    active ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {scope.label}
                </button>
              );
            })}
          </div>

          {/* Sound toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSoundEnabled((v) => !v)}
            className="text-gray-400 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* Refresh manual */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => void refresh()}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/30 border-b border-red-800 px-4 py-2 text-xs text-red-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      {/* Main grid */}
      <main className="flex-1 overflow-y-auto p-4">
        {displayedOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <ChefHat className="w-16 h-16 mb-4 text-gray-700" />
            <p className="text-lg font-medium">Tidak ada order aktif</p>
            <p className="text-sm mt-1">Pesanan baru akan muncul otomatis</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {displayedOrders.map((order, idx) => (
              <KDSOrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                index={idx}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer bar */}
      <footer className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center justify-between text-[10px] text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Pending: {grouped['pending']?.length || 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Confirmed: {grouped['confirmed']?.length || 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Preparing: {grouped['preparing']?.length || 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Ready: {grouped['ready']?.length || 0}
          </span>
        </div>
        <div className="font-mono">Arkiv POS KDS</div>
      </footer>
    </div>
  );
}
