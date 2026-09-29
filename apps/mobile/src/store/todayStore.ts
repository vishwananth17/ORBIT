// ============================================================================
// Today & Proactivity Zustand Store
// ============================================================================

import { create } from 'zustand';
import { DailyBrief, ProactiveNudge, NotificationSettings, NotificationSettingsUpdate, BriefType } from '@kairo/shared';
import { apiClient } from '../api/client';

interface TodayState {
  todayDate: string;
  morningBrief: DailyBrief | null;
  eveningReview: DailyBrief | null;
  nudges: ProactiveNudge[];
  settings: NotificationSettings | null;
  isLoading: boolean;
  isGenerating: boolean;
  isPlayingAudio: boolean;
  error: string | null;

  loadToday: (token?: string | null) => Promise<void>;
  generateBrief: (type: BriefType, token?: string | null) => Promise<void>;
  togglePlayAudio: () => void;
  markRead: (id: string, token?: string | null) => Promise<void>;
  dismissNudge: (id: string, token?: string | null) => Promise<void>;
  loadSettings: (token?: string | null) => Promise<void>;
  updateSettings: (update: NotificationSettingsUpdate, token?: string | null) => Promise<void>;
}

export const useTodayStore = create<TodayState>((set, get) => ({
  todayDate: new Date().toISOString().split('T')[0],
  morningBrief: null,
  eveningReview: null,
  nudges: [],
  settings: null,
  isLoading: false,
  isGenerating: false,
  isPlayingAudio: false,
  error: null,

  loadToday: async (token?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const [briefData, nudgesData] = await Promise.all([
        apiClient.getTodayBrief(token),
        apiClient.getProactiveNudges(token).catch(() => ({ nudges: [] })),
      ]);

      set({
        todayDate: briefData.date,
        morningBrief: briefData.morning_brief,
        eveningReview: briefData.evening_review,
        nudges: nudgesData.nudges,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  generateBrief: async (type: BriefType, token?: string | null) => {
    set({ isGenerating: true, error: null });
    try {
      const brief = await apiClient.generateBrief(type, token);
      if (type === 'morning_brief') {
        set({ morningBrief: brief, isGenerating: false });
      } else {
        set({ eveningReview: brief, isGenerating: false });
      }
    } catch (err: any) {
      set({ error: err.message, isGenerating: false });
    }
  },

  togglePlayAudio: () => {
    set((state) => ({ isPlayingAudio: !state.isPlayingAudio }));
  },

  markRead: async (id: string, token?: string | null) => {
    try {
      const updated = await apiClient.markBriefRead(id, token);
      set((state) => ({
        morningBrief: state.morningBrief?.id === id ? updated : state.morningBrief,
        eveningReview: state.eveningReview?.id === id ? updated : state.eveningReview,
      }));
    } catch (err: any) {
      console.warn('Failed to mark brief as read:', err.message);
    }
  },

  dismissNudge: async (id: string, token?: string | null) => {
    try {
      await apiClient.dismissProactiveNudge(id, token);
      set((state) => ({
        nudges: state.nudges.filter((n) => n.id !== id),
      }));
    } catch (err: any) {
      console.warn('Failed to dismiss nudge:', err.message);
    }
  },

  loadSettings: async (token?: string | null) => {
    try {
      const settings = await apiClient.getNotificationSettings(token);
      set({ settings });
    } catch (err: any) {
      console.warn('Failed to load notification settings:', err.message);
    }
  },

  updateSettings: async (update: NotificationSettingsUpdate, token?: string | null) => {
    try {
      const settings = await apiClient.updateNotificationSettings(update, token);
      set({ settings });
    } catch (err: any) {
      console.warn('Failed to update notification settings:', err.message);
      throw err;
    }
  },
}));
