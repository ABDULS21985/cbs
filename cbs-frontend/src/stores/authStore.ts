import { create } from 'zustand';
import type { User } from '@/types/auth';
import { authApi } from '@/features/auth/api/authApi';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshTokenValue: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaRequired: boolean;
  mfaSessionToken: string | null;
  tokenExpiresAt: number | null;

  login: (username: string, password: string) => Promise<void>;
  verifyMfa: (otp: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshTokenValue: null,
  isAuthenticated: false,
  isLoading: false,
  mfaRequired: false,
  mfaSessionToken: null,
  tokenExpiresAt: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login({ username, password });

      if (res.mfaRequired) {
        set({
          mfaRequired: true,
          mfaSessionToken: res.mfaSessionToken || null,
          isLoading: false,
        });
        return;
      }

      set({
        accessToken: res.accessToken,
        refreshTokenValue: res.refreshToken,
        user: res.user || null,
        isAuthenticated: true,
        mfaRequired: false,
        mfaSessionToken: null,
        tokenExpiresAt: Date.now() + res.expiresIn * 1000,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verifyMfa: async (otp: string) => {
    const { mfaSessionToken } = get();
    if (!mfaSessionToken) throw new Error('No MFA session');

    set({ isLoading: true });
    try {
      const res = await authApi.verifyMfa({ sessionToken: mfaSessionToken, otpCode: otp });
      set({
        accessToken: res.accessToken,
        refreshTokenValue: res.refreshToken,
        user: res.user || null,
        isAuthenticated: true,
        mfaRequired: false,
        mfaSessionToken: null,
        tokenExpiresAt: Date.now() + res.expiresIn * 1000,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  refreshToken: async () => {
    const { refreshTokenValue } = get();
    if (!refreshTokenValue) throw new Error('No refresh token');

    const res = await authApi.refresh(refreshTokenValue);
    set({
      accessToken: res.accessToken,
      refreshTokenValue: res.refreshToken,
      tokenExpiresAt: Date.now() + res.expiresIn * 1000,
    });
  },

  logout: () => {
    authApi.logout();
    set({
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      mfaRequired: false,
      mfaSessionToken: null,
      tokenExpiresAt: null,
    });
  },

  setUser: (user: User) => set({ user }),

  initialize: async () => {
    // Session bootstrap stays explicit until a real cookie/session bootstrap endpoint is wired.
  },
}));
