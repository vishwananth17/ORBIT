// ============================================================================
// Daily Journal & Insights Analytics Zustand Store (Phase 7)
// ============================================================================

import { create } from 'zustand';
import { JournalEntry, CreateJournalEntryInput, JournalAnalytics } from '@orbit/shared';
import { apiClient } from '../api/client';

interface JournalState {
  todayEntry: JournalEntry | null;
  history: JournalEntry[];
  analytics: JournalAnalytics | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadTodayJournal: (token?: string | null) => Promise<void>;
  saveJournal: (input: CreateJournalEntryInput, token?: string | null) => Promise<JournalEntry>;
  loadHistory: (limit?: number, token?: string | null) => Promise<void>;
  loadAnalytics: (days?: number, token?: string | null) => Promise<void>;
}

export const useJournalStore = create<JournalState>((set) => ({
  todayEntry: null,
  history: [],
  analytics: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadTodayJournal: async (token?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.getTodayJournal(token);
      set({ todayEntry: res.entry, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  saveJournal: async (input: CreateJournalEntryInput, token?: string | null) => {
    set({ isSaving: true, error: null });
    try {
      const res = await apiClient.saveJournal(input, token);
      set((state) => ({
        todayEntry: res.entry,
        history: [res.entry, ...state.history.filter((e) => e.id !== res.entry.id)],
        isSaving: false,
      }));
      return res.entry;
    } catch (err: any) {
      set({ error: err.message, isSaving: false });
      throw err;
    }
  },

  loadHistory: async (limit = 14, token?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.getJournalHistory(limit, token);
      set({ history: res.entries, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  loadAnalytics: async (days = 7, token?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.getJournalAnalytics(days, token);
      set({ analytics: res.analytics, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
