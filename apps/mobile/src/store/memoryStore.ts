import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { Memory, MemoryCategory } from '@kairo/shared';
import { apiClient } from '../api/client';
import { useAuthStore } from './authStore';

interface MemoryState {
  memories: Memory[];
  selectedCategory: string;
  searchQuery: string;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  loadMemories: () => Promise<void>;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  addMemory: (content: string, category: MemoryCategory, importance: number, isPinned?: boolean) => Promise<boolean>;
  editMemory: (id: string, updates: { content?: string; importance_score?: number; is_pinned?: boolean }) => Promise<boolean>;
  togglePin: (id: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  selectedCategory: 'all',
  searchQuery: '',
  isLoading: false,
  isSubmitting: false,
  error: null,

  loadMemories: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const { selectedCategory, searchQuery } = get();
      const list = await apiClient.listMemories(selectedCategory, searchQuery, token);
      set({ memories: list, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setCategory: (category: string) => {
    set({ selectedCategory: category });
    get().loadMemories();
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  addMemory: async (content: string, category: MemoryCategory, importance: number, isPinned: boolean = false) => {
    set({ isSubmitting: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const newMemory = await apiClient.createMemory(
        {
          content,
          category,
          importance_score: importance,
          is_pinned: isPinned,
        },
        token
      );

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      set((state) => ({
        memories: [newMemory, ...state.memories],
        isSubmitting: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, isSubmitting: false });
      return false;
    }
  },

  editMemory: async (id: string, updates: { content?: string; importance_score?: number; is_pinned?: boolean }) => {
    set({ isSubmitting: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const updated = await apiClient.updateMemory(id, updates, token);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      set((state) => ({
        memories: state.memories.map((m) => (m.id === id ? updated : m)),
        isSubmitting: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, isSubmitting: false });
      return false;
    }
  },

  togglePin: async (id: string) => {
    const memory = get().memories.find((m) => m.id === id);
    if (!memory) return;

    const newPinned = !memory.is_pinned;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    // Optimistic update
    set((state) => ({
      memories: state.memories.map((m) => (m.id === id ? { ...m, is_pinned: newPinned } : m)),
    }));

    try {
      const token = useAuthStore.getState().token;
      await apiClient.updateMemory(id, { is_pinned: newPinned }, token);
    } catch (err: any) {
      // Revert on error
      set((state) => ({
        memories: state.memories.map((m) => (m.id === id ? { ...m, is_pinned: !newPinned } : m)),
        error: err.message,
      }));
    }
  },

  deleteMemory: async (id: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    // Optimistic removal
    const previous = get().memories;
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    }));

    try {
      const token = useAuthStore.getState().token;
      await apiClient.deleteMemory(id, token);
      return true;
    } catch (err: any) {
      set({ memories: previous, error: err.message });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
