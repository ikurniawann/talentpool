'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface KDSOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  variant_info?: string;
  modifier_info?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface KDSOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  order_type: string;
  table_id?: string;
  notes?: string;
  special_requests?: string;
  ordered_at: string;
  confirmed_at?: string;
  pos_order_items: KDSOrderItem[];
  wait_seconds: number;
  wait_minutes: number;
  is_overdue: boolean;
  is_urgent: boolean;
}

interface UseKDSOptions {
  status?: string[];
  station?: string;
  branchId?: string;
  limit?: number;
  pollInterval?: number;
}

export function useKDS(options: UseKDSOptions = {}) {
  const {
    status = ['pending', 'confirmed', 'preparing', 'ready'],
    station,
    branchId,
    limit = 50,
    pollInterval = 3000,
  } = options;

  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevOrderIds = useRef<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('status', status.join(','));
      if (station) params.set('station', station);
      if (branchId) params.set('branch_id', branchId);
      params.set('limit', String(limit));

      const res = await fetch(`/api/pos/kds?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Gagal fetch KDS');
        return;
      }

      const fetched: KDSOrder[] = data.data || [];

      if (soundEnabled && prevOrderIds.current.size > 0) {
        const newOrders = fetched.filter((o) => !prevOrderIds.current.has(o.id));
        if (newOrders.length > 0) {
          playNotificationSound();
        }
      }

      prevOrderIds.current = new Set(fetched.map((o) => o.id));
      setOrders(fetched);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [status, station, branchId, limit, soundEnabled]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, pollInterval);
    return () => clearInterval(interval);
  }, [fetchOrders, pollInterval]);

  const updateStatus = useCallback(async (orderId: string, newStatus: string, reason?: string) => {
    try {
      const res = await fetch(`/api/pos/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      const data = await res.json();

      if (data.success) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
        setTimeout(fetchOrders, 500);
      }

      return data;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    soundEnabled,
    setSoundEnabled,
    refresh: fetchOrders,
    updateStatus,
  };
}

function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch {
    // Audio not supported
  }
}
