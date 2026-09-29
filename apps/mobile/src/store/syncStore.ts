// ============================================================================
// Offline-First Sync Zustand Store (Phase 8)
// ============================================================================

import { create } from 'zustand';

export type NetworkSyncStatus = 'online' | 'offline' | 'syncing';

export interface PendingAction {
  id: string;
  type: 'send_message' | 'create_memory' | 'save_journal';
  payload: Record<string, unknown>;
  created_at: string;
}

interface SyncState {
  status: NetworkSyncStatus;
  pendingQueue: PendingAction[];
  lastSyncedAt: string | null;

  setStatus: (status: NetworkSyncStatus) => void;
  enqueueAction: (action: Omit<PendingAction, 'id' | 'created_at'>) => void;
  removeAction: (id: string) => void;
  clearQueue: () => void;
  setLastSyncedAt: (time: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'online',
  pendingQueue: [],
  lastSyncedAt: new Date().toISOString(),

  setStatus: (status) => set({ status }),

  enqueueAction: (action) =>
    set((state) => ({
      pendingQueue: [
        ...state.pendingQueue,
        {
          ...action,
          id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString(),
        },
      ],
    })),

  removeAction: (id) =>
    set((state) => ({
      pendingQueue: state.pendingQueue.filter((a) => a.id !== id),
    })),

  clearQueue: () => set({ pendingQueue: [] }),

  setLastSyncedAt: (time) => set({ lastSyncedAt: time }),
}));
