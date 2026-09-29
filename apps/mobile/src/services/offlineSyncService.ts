// ============================================================================
// Offline-First Sync Service (Phase 8)
// ============================================================================

import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, apiClient } from '../api/client';
import { useSyncStore, PendingAction } from '../store/syncStore';

const STORAGE_KEY = 'orbit_offline_pending_queue';
let healthCheckTimer: any = null;

export const offlineSyncService = {
  // Initialize sync manager: load queued actions and start heartbeat
  async initialize(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored) {
        const queue: PendingAction[] = JSON.parse(stored);
        for (const action of queue) {
          useSyncStore.getState().enqueueAction(action);
        }
      }
    } catch {
      // Memory fallback if SecureStore not supported
    }

    await this.checkConnectivity();
    this.startHeartbeat();
  },

  // Save current queue to persistent storage
  async persistQueue(): Promise<void> {
    try {
      const queue = useSyncStore.getState().pendingQueue;
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // ignore
    }
  },

  // Ping backend /health to check real online status
  async checkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const prevStatus = useSyncStore.getState().status;
        useSyncStore.getState().setStatus('online');
        useSyncStore.getState().setLastSyncedAt(new Date().toISOString());

        // If transitioning back from offline, flush pending queue
        if (prevStatus === 'offline' && useSyncStore.getState().pendingQueue.length > 0) {
          await this.flushQueue();
        }
        return true;
      } else {
        useSyncStore.getState().setStatus('offline');
        return false;
      }
    } catch {
      useSyncStore.getState().setStatus('offline');
      return false;
    }
  },

  // Process and replay queued offline actions
  async flushQueue(token?: string | null): Promise<void> {
    const queue = useSyncStore.getState().pendingQueue;
    if (queue.length === 0) return;

    useSyncStore.getState().setStatus('syncing');

    for (const item of [...queue]) {
      try {
        if (item.type === 'save_journal') {
          await apiClient.saveJournal(item.payload as any, token);
        } else if (item.type === 'create_memory') {
          await apiClient.createMemory(item.payload as any, token);
        }
        useSyncStore.getState().removeAction(item.id);
      } catch (err) {
        console.warn(`[Offline Sync Failed for action ${item.id}]:`, err);
        break; // Retry later
      }
    }

    await this.persistQueue();
    useSyncStore.getState().setStatus('online');
    useSyncStore.getState().setLastSyncedAt(new Date().toISOString());
  },

  // Periodic heartbeat monitor every 20 seconds
  startHeartbeat(intervalMs = 20000): void {
    if (healthCheckTimer) clearInterval(healthCheckTimer);
    healthCheckTimer = setInterval(() => {
      this.checkConnectivity();
    }, intervalMs);
  },

  stopHeartbeat(): void {
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }
  },
};
