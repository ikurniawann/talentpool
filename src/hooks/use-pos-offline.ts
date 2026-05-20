'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  queueOfflineOrder,
  getPendingQueue,
  updateQueueItem,
  removeFromQueue,
  type OfflineOrderRequest,
} from '@/lib/pos-db';
import { createOrder, createSplitOrder } from '@/lib/pos-api';

export function usePosOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  const refreshCount = useCallback(async () => {
    const items = await getPendingQueue();
    setPendingCount(items.length);
    return items;
  }, []);

  // Enqueue a single order or split order payload
  const enqueue = useCallback(async (payload: any, type: 'order' | 'split') => {
    const id = await queueOfflineOrder({ ...payload, _offlineType: type });
    await refreshCount();
    return id;
  }, [refreshCount]);

  // Sync all pending items (call when online)
  const syncQueue = useCallback(async () => {
    if (syncInProgress.current) return { synced: 0, failed: 0 };
    syncInProgress.current = true;
    setIsSyncing(true);

    let synced = 0;
    let failed = 0;
    const pending = await getPendingQueue();

    for (const item of pending) {
      try {
        await updateQueueItem({ ...item, status: 'syncing' });
        const type = item.orderPayload._offlineType || 'order';
        let res: any;

        if (type === 'split') {
          res = await createSplitOrder(item.orderPayload);
        } else {
          res = await createOrder(item.orderPayload);
        }

        if (res.success) {
          await removeFromQueue(item.queueId!);
          synced++;
        } else {
          await updateQueueItem({
            ...item,
            status: 'failed',
            errorMessage: res.error || 'Sync failed',
            retryCount: item.retryCount + 1,
          });
          failed++;
        }
      } catch (e: any) {
        await updateQueueItem({
          ...item,
          status: 'failed',
          errorMessage: e.message || 'Network error',
          retryCount: item.retryCount + 1,
        });
        failed++;
      }
    }

    await refreshCount();
    setIsSyncing(false);
    syncInProgress.current = false;
    return { synced, failed };
  }, [refreshCount]);

  // Fetch failed items to retry
  const getFailedItems = useCallback(async () => {
    const all = await getPendingQueue(); // actually gets by status, we need all non-completed
    return all.filter((i) => i.status === 'failed');
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  return { pendingCount, isSyncing, enqueue, syncQueue, getFailedItems, refreshCount };
}
