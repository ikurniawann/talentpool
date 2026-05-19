'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentShift, openShift, closeShift, type PosShift } from '@/lib/pos-api';

export function usePosShift(cashierId: string) {
  const [shift, setShift] = useState<PosShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrent = useCallback(async () => {
    if (!cashierId) {
      setShift(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getCurrentShift(cashierId);
    if (res.success && res.data) {
      setShift(res.data);
      setError(null);
    } else {
      setShift(null);
      if (res.error && !res.error.includes('active shift')) {
        setError(res.error);
      } else {
        setError(null);
      }
    }
    setLoading(false);
  }, [cashierId]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const doOpen = useCallback(
    async (openingCash: number, notes?: string) => {
      const res = await openShift({ cashier_id: cashierId, opening_cash: openingCash, notes });
      if (res.success && res.data) {
        setShift(res.data);
        setError(null);
      }
      return res;
    },
    [cashierId]
  );

  const doClose = useCallback(
    async (closingCash: number, notes?: string) => {
      if (!shift) return { success: false, error: 'No active shift' };
      const res = await closeShift(shift.id, { closing_cash: closingCash, notes });
      if (res.success) {
        setShift(null);
        setError(null);
      }
      return res;
    },
    [shift]
  );

  return {
    shift,
    isActive: !!shift,
    loading,
    error,
    refresh: fetchCurrent,
    openShift: doOpen,
    closeShift: doClose,
  };
}
