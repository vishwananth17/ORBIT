import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { User } from '@kairo/shared';

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
      // 1. Check biometric hardware
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // 2. Read stored session
      const storedToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(SECURE_USER_KEY);

      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser);
        set({
          token: storedToken,
          user,
          isAuthenticated: true,
          isBiometricsSupported: hasHardware,
          isBiometricsEnrolled: isEnrolled,
          isBiometricLocked: isEnrolled, // Lock on cold start if biometric enrolled
          isLoading: false,
        });
      } else {
        set({
          isBiometricsSupported: hasHardware,
          isBiometricsEnrolled: isEnrolled,
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  loginWithEmail: async (email: string, _password: string) => {
    set({ isLoading: true, error: null });
    try {
      // In production, exchange via Supabase supabase.auth.signInWithPassword
      const mockUser: User = {
        id: '00000000-0000-0000-0000-000000000001',
        email,
        full_name: email.split('@')[0],
        avatar_url: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        locale: 'en-US',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const token = 'dev-token';

      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);
      await SecureStore.setItemAsync(SECURE_USER_KEY, JSON.stringify(mockUser));

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

  loginAsGuest: async () => {
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

    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);
    await SecureStore.setItemAsync(SECURE_USER_KEY, JSON.stringify(guestUser));

    set({
      user: guestUser,
      token,
      isAuthenticated: true,
      isBiometricLocked: false,
      isLoading: false,
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(SECURE_USER_KEY).catch(() => {});
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
