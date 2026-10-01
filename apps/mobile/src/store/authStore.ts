import { getAuthClient, getValidAccessToken } from '../services/authSession';
import { create } from 'zustand';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { safeStorage } from '../utils/safeStorage';
import { User } from '@orbit/shared';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isBiometricsSupported: boolean;
  isBiometricsEnrolled: boolean;
  isBiometricLocked: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  setBiometricLock: (locked: boolean) => void;
  clearError: () => void;
}

const SECURE_TOKEN_KEY = 'orbit_auth_token';
const SECURE_USER_KEY = 'orbit_auth_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isBiometricsSupported: false,
  isBiometricsEnrolled: false,
  isBiometricLocked: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      const doInit = async () => {
        let hasHardware = false;
        let isEnrolled = false;

        // Local biometrics only supported on physical devices
        if (Platform.OS !== 'web') {
          try {
            hasHardware = await LocalAuthentication.hasHardwareAsync();
            isEnrolled = await LocalAuthentication.isEnrolledAsync();
          } catch {
            // ignore biometrics error
          }
        }

        // Read stored session safely across web and native
        const legacyToken = await safeStorage.getItem(SECURE_TOKEN_KEY);
        let storedToken: string | null = null;
        try { storedToken = await getValidAccessToken(legacyToken); } catch {
          await safeStorage.deleteItem(SECURE_TOKEN_KEY);
          await safeStorage.deleteItem(SECURE_USER_KEY);
          set({ error: 'Your Orbit session expired. Please sign in again.' });
        }
        const storedUser = await safeStorage.getItem(SECURE_USER_KEY);

        if (storedToken && storedUser) {
          try {
            const user = JSON.parse(storedUser);
            set({
              token: storedToken,
              user,
              isAuthenticated: true,
              isBiometricsSupported: hasHardware,
              isBiometricsEnrolled: isEnrolled,
              isBiometricLocked: isEnrolled && Platform.OS !== 'web',
              isLoading: false,
            });
            return;
          } catch {
            // ignore parse failure
          }
        }

        set({
          isBiometricsSupported: hasHardware,
          isBiometricsEnrolled: isEnrolled,
          isLoading: false,
        });
      };

      // Ensure initialization never hangs the UI
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1500));
      await Promise.race([doInit(), timeout]);
      set((state) => ({ isLoading: false }));
    } catch {
      set({ isLoading: false });
    }
  },

  loginWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error('Sign-in is not configured. Ask the app owner to configure Supabase.');
      const auth = getAuthClient();
      const { data, error } = await auth.auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) throw new Error(error?.message || 'Sign-in failed');
      const mockUser: User = {
        id: data.user.id, email: data.user.email || email,
        full_name: data.user.user_metadata?.full_name || email.split('@')[0], avatar_url: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', locale: 'en-US',
        created_at: data.user.created_at, updated_at: new Date().toISOString(),
      };
      const token = data.session.access_token;

      await safeStorage.setItem(SECURE_TOKEN_KEY, token);
      await safeStorage.setItem(SECURE_USER_KEY, JSON.stringify(mockUser));

      set({
        user: mockUser,
        token,
        isAuthenticated: true,
        isBiometricLocked: false,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error('Sign-up is not configured.');
      const auth = getAuthClient();
      const { data, error } = await auth.auth.signUp({ email, password });
      if (error || !data.user) throw new Error(error?.message || 'Sign-up failed');
      set({ isLoading: false });
      if (data.session) await get().loginWithEmail(email, password);
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Sign-up failed', isLoading: false });
      return false;
    }
  },

  loginAsGuest: async () => {
    if (process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      set({ error: 'Guest access is available only in explicitly enabled demo mode.', isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    const guestUser: User = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'guest@orbit.ai',
      full_name: 'Guest Explorer',
      avatar_url: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      locale: 'en-US',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const token = 'dev-token';

    await safeStorage.setItem(SECURE_TOKEN_KEY, token);
    await safeStorage.setItem(SECURE_USER_KEY, JSON.stringify(guestUser));

    set({
      user: guestUser,
      token,
      isAuthenticated: true,
      isBiometricLocked: false,
      isLoading: false,
    });
  },

  logout: async () => {
    try { await getAuthClient().auth.signOut(); } catch { /* clear local state regardless */ }
    await safeStorage.deleteItem(SECURE_TOKEN_KEY);
    await safeStorage.deleteItem(SECURE_USER_KEY);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isBiometricLocked: false,
    });
  },

  unlockWithBiometrics: async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Orbit Personal Agent',
        fallbackLabel: 'Use Device Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        set({ isBiometricLocked: false });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  setBiometricLock: (locked: boolean) => set({ isBiometricLocked: locked }),
  clearError: () => set({ error: null }),
}));
