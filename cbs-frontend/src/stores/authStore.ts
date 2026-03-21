import { create } from 'zustand';
import type { AuthorizationCodeCallbackRequest, User } from '@/types/auth';
import { authApi } from '@/features/auth/api/authApi';

const AUTH_SESSION_STORAGE_KEY = 'cbs-auth-session';
const REFRESH_BUFFER_MS = 60_000;

type PersistedAuthSession = {
  user: User | null;
  accessToken: string | null;
  refreshTokenValue: string | null;
  tokenExpiresAt: number | null;
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshTokenValue: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasInitialized: boolean;
  mfaRequired: boolean;
  mfaSessionToken: string | null;
  tokenExpiresAt: number | null;

  login: (username?: string, password?: string, returnTo?: string) => Promise<void>;
  devLogin: (role?: 'admin' | 'officer' | 'teller') => void;
  completeLogin: (callback: AuthorizationCodeCallbackRequest) => Promise<string>;
  verifyMfa: (otp: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  initialize: () => Promise<void>;
}

const unauthenticatedState = {
  user: null,
  accessToken: null,
  refreshTokenValue: null,
  isAuthenticated: false,
  isLoading: false,
  hasInitialized: false,
  mfaRequired: false,
  mfaSessionToken: null,
  tokenExpiresAt: null,
};

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function persistSession(session: PersistedAuthSession | null) {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  if (!session?.accessToken || !session.refreshTokenValue) {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return;
  }

  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function readPersistedSession(): PersistedAuthSession | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedAuthSession>;
    return {
      user: parsed.user ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshTokenValue: parsed.refreshTokenValue ?? null,
      tokenExpiresAt: typeof parsed.tokenExpiresAt === 'number' ? parsed.tokenExpiresAt : null,
    };
  } catch {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  }
}

function buildAuthenticatedState(session: PersistedAuthSession, overrides?: Partial<AuthState>) {
  return {
    user: session.user,
    accessToken: session.accessToken,
    refreshTokenValue: session.refreshTokenValue,
    isAuthenticated: Boolean(session.accessToken),
    isLoading: false,
    hasInitialized: true,
    mfaRequired: false,
    mfaSessionToken: null,
    tokenExpiresAt: session.tokenExpiresAt,
    ...overrides,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...unauthenticatedState,

  devLogin: (role: 'admin' | 'officer' | 'teller' = 'admin') => {
    const devUsers: Record<string, User> = {
      admin:   { id: 'dev-admin-001',   username: 'admin',   fullName: 'Dev Admin',   email: 'admin@cbs.local',   roles: ['CBS_ADMIN'],   permissions: ['*'] },
      officer: { id: 'dev-officer-001', username: 'officer', fullName: 'Dev Officer', email: 'officer@cbs.local', roles: ['CBS_OFFICER'], permissions: [] },
      teller:  { id: 'dev-teller-001',  username: 'teller',  fullName: 'Dev Teller',  email: 'teller@cbs.local',  roles: ['TELLER'],     permissions: [] },
    };
    const user = devUsers[role];
    const session: PersistedAuthSession = {
      user,
      accessToken: `dev-${role}-token`,
      refreshTokenValue: `dev-${role}-refresh`,
      tokenExpiresAt: Date.now() + 86400000 * 365,
    };
    persistSession(session);
    set(buildAuthenticatedState(session));
  },

  login: async (username?: string, _password?: string, returnTo?: string) => {
    set({ isLoading: true });
    try {
      await authApi.login({ username, returnTo });
    } catch (error) {
      set({ isLoading: false, hasInitialized: true });
      throw error;
    }
  },

  completeLogin: async ({ code, state }: AuthorizationCodeCallbackRequest) => {
    set({ isLoading: true });
    try {
      const res = await authApi.exchangeAuthorizationCode({ code, state });
      const session: PersistedAuthSession = {
        accessToken: res.accessToken,
        refreshTokenValue: res.refreshToken,
        user: res.user || null,
        tokenExpiresAt: Date.now() + res.expiresIn * 1000,
      };

      persistSession(session);
      set(buildAuthenticatedState(session, {
        accessToken: res.accessToken,
        refreshTokenValue: res.refreshToken,
        user: res.user || null,
        tokenExpiresAt: Date.now() + res.expiresIn * 1000,
      }));
      return res.returnTo || '/dashboard';
    } catch (error) {
      persistSession(null);
      set({ ...unauthenticatedState, hasInitialized: true });
      throw error;
    }
  },

  verifyMfa: async (otp: string) => {
    const { mfaSessionToken } = get();
    if (!mfaSessionToken) throw new Error('No MFA session');

    set({ isLoading: true });
    try {
      const res = await authApi.verifyMfa({ sessionToken: mfaSessionToken, otpCode: otp });
      const session: PersistedAuthSession = {
        accessToken: res.accessToken,
        refreshTokenValue: res.refreshToken,
        user: res.user || null,
        tokenExpiresAt: Date.now() + res.expiresIn * 1000,
      };

      persistSession(session);
      set(buildAuthenticatedState(session, {
        accessToken: res.accessToken,
        refreshTokenValue: res.refreshToken,
        user: res.user || null,
        tokenExpiresAt: Date.now() + res.expiresIn * 1000,
      }));
    } catch (error) {
      set({ isLoading: false, hasInitialized: true });
      throw error;
    }
  },

  refreshToken: async () => {
    const { refreshTokenValue } = get();
    if (!refreshTokenValue) throw new Error('No refresh token');

    const res = await authApi.refresh(refreshTokenValue);
    const user = get().user ?? await authApi.getMe(res.accessToken);
    const session: PersistedAuthSession = {
      accessToken: res.accessToken,
      refreshTokenValue: res.refreshToken,
      user,
      tokenExpiresAt: Date.now() + res.expiresIn * 1000,
    };

    persistSession(session);
    set(buildAuthenticatedState(session, {
      accessToken: res.accessToken,
      refreshTokenValue: res.refreshToken,
      tokenExpiresAt: Date.now() + res.expiresIn * 1000,
    }));
  },

  logout: () => {
    authApi.logout(get().refreshTokenValue);
    persistSession(null);
    set({ ...unauthenticatedState, hasInitialized: true });
  },

  setUser: (user: User) => set({ user }),

  initialize: async () => {
    if (get().hasInitialized || get().isLoading) {
      return;
    }

    set({ isLoading: true });
    const persisted = readPersistedSession();

    if (!persisted?.accessToken || !persisted.refreshTokenValue) {
      persistSession(null);
      set({ ...unauthenticatedState, hasInitialized: true });
      return;
    }

    try {
      const shouldRefresh =
        !persisted.tokenExpiresAt || persisted.tokenExpiresAt <= Date.now() + REFRESH_BUFFER_MS;

      if (shouldRefresh) {
        const refreshed = await authApi.refresh(persisted.refreshTokenValue);
        const session: PersistedAuthSession = {
          accessToken: refreshed.accessToken,
          refreshTokenValue: refreshed.refreshToken,
          user: persisted.user,
          tokenExpiresAt: Date.now() + refreshed.expiresIn * 1000,
        };

        if (!session.user && session.accessToken) {
          session.user = await authApi.getMe(session.accessToken);
        }

        persistSession(session);
        set(buildAuthenticatedState(session));
        return;
      }

      if (!persisted.user && persisted.accessToken) {
        persisted.user = await authApi.getMe(persisted.accessToken);
      }

      persistSession(persisted);
      set(buildAuthenticatedState(persisted));
    } catch {
      persistSession(null);
      set({ ...unauthenticatedState, hasInitialized: true });
    }
  },
}));
