import { create } from 'zustand';
import { ThemeMode } from '../theme';
import { NotificationSettings, SYSTEM_DEFAULTS } from '@kairo/shared';
import { apiClient } from '../api/client';
import { useAuthStore } from './authStore';

interface SettingsState {
  themeMode: ThemeMode;
  biometricsEnabled: boolean;
  hapticsEnabled: boolean;
  notificationSettings: NotificationSettings;
  isLoading: boolean;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  loadServerSettings: () => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  themeMode: 'dark',
  biometricsEnabled: true,
  hapticsEnabled: true,
  notificationSettings: {
    user_id: '',
    push_token: null,
    quiet_hours_start: SYSTEM_DEFAULTS.QUIET_HOURS_START,
    quiet_hours_end: SYSTEM_DEFAULTS.QUIET_HOURS_END,
    morning_brief_time: SYSTEM_DEFAULTS.MORNING_BRIEF_TIME,
    evening_review_time: SYSTEM_DEFAULTS.EVENING_REVIEW_TIME,
    proactive_nudges_enabled: SYSTEM_DEFAULTS.PROACTIVE_NUDGES_ENABLED,
    smart_reminders_enabled: SYSTEM_DEFAULTS.SMART_REMINDERS_ENABLED,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  isLoading: false,

  setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),
  setBiometricsEnabled: (enabled: boolean) => set({ biometricsEnabled: enabled }),
  setHapticsEnabled: (enabled: boolean) => set({ hapticsEnabled: enabled }),

  loadServerSettings: async () => {
    set({ isLoading: true });
    try {
      const token = useAuthStore.getState().token;
      const res = await apiClient.getProfile(token);
      if (res.settings) {
        set({ notificationSettings: res.settings, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  updateNotificationSettings: async (updated: Partial<NotificationSettings>) => {
    try {
      const token = useAuthStore.getState().token;
      const newSettings = await apiClient.updateSettings(updated, token);
      set({ notificationSettings: newSettings });
    } catch (err) {
      console.error('[Settings Update Error]:', err);
    }
  },
}));
