import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock the auth API module before importing the store
// ---------------------------------------------------------------------------
vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    login: vi.fn(),
    verifyMfa: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/features/auth/api/authApi';

// ---------------------------------------------------------------------------
// Typed mocks
// ---------------------------------------------------------------------------
const mockAuthApi = authApi as {
  login: ReturnType<typeof vi.fn>;
  verifyMfa: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  getMe: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const MOCK_USER = {
  id: 1,
  username: 'jane.doe',
  fullName: 'Jane Doe',
  email: 'jane.doe@cbs.bank',
  roles: ['CBS_OFFICER'],
  permissions: [],
  branchId: 2,
  branchName: 'Lagos Branch',
  lastLogin: '2024-01-20T08:00:00Z',
};

const MOCK_TOKEN_RESPONSE = {
  accessToken: 'access-abc123',
  refreshToken: 'refresh-xyz789',
  expiresIn: 3600,
  user: MOCK_USER,
};

const BLANK_STATE = {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getState() {
  return useAuthStore.getState();
}

function resetStore() {
  sessionStorage.clear();
  localStorage.clear();
  useAuthStore.setState(BLANK_STATE);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('authStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetStore();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe('initial state', () => {
    it('starts with user as null', () => {
      expect(getState().user).toBeNull();
    });

    it('starts unauthenticated', () => {
      expect(getState().isAuthenticated).toBe(false);
    });

    it('starts with no access token', () => {
      expect(getState().accessToken).toBeNull();
    });

    it('starts with mfaRequired false', () => {
      expect(getState().mfaRequired).toBe(false);
    });

    it('starts with isLoading false', () => {
      expect(getState().isLoading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // login()
  // -------------------------------------------------------------------------
  describe('login()', () => {
    it('sets isAuthenticated, accessToken, and user on successful login', async () => {
      mockAuthApi.login.mockResolvedValue(MOCK_TOKEN_RESPONSE);

      await act(async () => {
        await getState().login('jane.doe', 'password123');
      });

      const state = getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('access-abc123');
      expect(state.user).toEqual(MOCK_USER);
    });

    it('sets refreshTokenValue on successful login', async () => {
      mockAuthApi.login.mockResolvedValue(MOCK_TOKEN_RESPONSE);

      await act(async () => {
        await getState().login('jane.doe', 'password123');
      });

      expect(getState().refreshTokenValue).toBe('refresh-xyz789');
    });

    it('calls authApi.login with the provided credentials', async () => {
      mockAuthApi.login.mockResolvedValue(MOCK_TOKEN_RESPONSE);

      await act(async () => {
        await getState().login('jane.doe', 'secret');
      });

      expect(mockAuthApi.login).toHaveBeenCalledWith({ username: 'jane.doe', password: 'secret' });
    });

    it('sets mfaRequired=true when server indicates MFA is needed', async () => {
      mockAuthApi.login.mockResolvedValue({
        mfaRequired: true,
        mfaSessionToken: 'mfa-session-tok',
      });

      await act(async () => {
        await getState().login('jane.doe', 'password');
      });

      const state = getState();
      expect(state.mfaRequired).toBe(true);
      expect(state.mfaSessionToken).toBe('mfa-session-tok');
      expect(state.isAuthenticated).toBe(false);
    });

    it('does not authenticate when MFA is required', async () => {
      mockAuthApi.login.mockResolvedValue({ mfaRequired: true, mfaSessionToken: 'tok' });

      await act(async () => {
        await getState().login('jane.doe', 'password');
      });

      expect(getState().isAuthenticated).toBe(false);
      expect(getState().accessToken).toBeNull();
    });

    it('resets isLoading to false after successful login', async () => {
      mockAuthApi.login.mockResolvedValue(MOCK_TOKEN_RESPONSE);

      await act(async () => {
        await getState().login('jane.doe', 'password');
      });

      expect(getState().isLoading).toBe(false);
    });

    it('resets isLoading to false after failed login', async () => {
      mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));

      await act(async () => {
        try {
          await getState().login('jane.doe', 'wrongpass');
        } catch {
          // expected
        }
      });

      expect(getState().isLoading).toBe(false);
    });

    it('throws or rejects on login failure', async () => {
      mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        act(async () => {
          await getState().login('jane.doe', 'wrong');
        })
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // verifyMfa()
  // -------------------------------------------------------------------------
  describe('verifyMfa()', () => {
    beforeEach(() => {
      useAuthStore.setState({
        ...BLANK_STATE,
        mfaRequired: true,
        mfaSessionToken: 'mfa-session-tok',
      });
    });

    it('authenticates successfully after valid OTP', async () => {
      mockAuthApi.verifyMfa.mockResolvedValue(MOCK_TOKEN_RESPONSE);

      await act(async () => {
        await getState().verifyMfa('123456');
      });

      const state = getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('access-abc123');
      expect(state.user).toEqual(MOCK_USER);
    });

    it('clears mfaRequired after successful verification', async () => {
      mockAuthApi.verifyMfa.mockResolvedValue(MOCK_TOKEN_RESPONSE);

      await act(async () => {
        await getState().verifyMfa('123456');
      });

      expect(getState().mfaRequired).toBe(false);
    });

    it('calls authApi.verifyMfa with OTP and session token', async () => {
      mockAuthApi.verifyMfa.mockResolvedValue(MOCK_TOKEN_RESPONSE);

      await act(async () => {
        await getState().verifyMfa('654321');
      });

      expect(mockAuthApi.verifyMfa).toHaveBeenCalledWith(
        expect.objectContaining({ otpCode: '654321', sessionToken: 'mfa-session-tok' })
      );
    });

    it('throws on invalid OTP', async () => {
      mockAuthApi.verifyMfa.mockRejectedValue(new Error('Invalid OTP'));

      await expect(
        act(async () => {
          await getState().verifyMfa('000000');
        })
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // refreshToken()
  // -------------------------------------------------------------------------
  describe('refreshToken()', () => {
    beforeEach(() => {
      useAuthStore.setState({
        ...BLANK_STATE,
        isAuthenticated: true,
        accessToken: 'old-token',
        refreshTokenValue: 'refresh-tok',
        user: MOCK_USER,
      });
    });

    it('updates accessToken with new value from API', async () => {
      mockAuthApi.refresh.mockResolvedValue({
        ...MOCK_TOKEN_RESPONSE,
        accessToken: 'new-access-token',
      });

      await act(async () => {
        await getState().refreshToken();
      });

      expect(getState().accessToken).toBe('new-access-token');
    });

    it('calls authApi.refreshToken with stored refresh token', async () => {
      mockAuthApi.refresh.mockResolvedValue(MOCK_TOKEN_RESPONSE);

      await act(async () => {
        await getState().refreshToken();
      });

      expect(mockAuthApi.refresh).toHaveBeenCalledWith('refresh-tok');
    });

    it('throws when refresh fails (logout handled by axios interceptor)', async () => {
      mockAuthApi.refresh.mockRejectedValue(new Error('Token expired'));

      await expect(
        act(async () => {
          await getState().refreshToken();
        })
      ).rejects.toThrow('Token expired');
    });
  });

  // -------------------------------------------------------------------------
  // logout()
  // -------------------------------------------------------------------------
  describe('logout()', () => {
    beforeEach(() => {
      useAuthStore.setState({
        ...BLANK_STATE,
        isAuthenticated: true,
        accessToken: 'access-abc123',
        refreshTokenValue: 'refresh-xyz789',
        user: MOCK_USER,
        tokenExpiresAt: '2099-01-01T00:00:00Z',
      });
    });

    it('clears user after logout', async () => {
      await act(async () => {
        await getState().logout();
      });

      expect(getState().user).toBeNull();
    });

    it('clears accessToken after logout', async () => {
      await act(async () => {
        await getState().logout();
      });

      expect(getState().accessToken).toBeNull();
    });

    it('sets isAuthenticated to false after logout', async () => {
      await act(async () => {
        await getState().logout();
      });

      expect(getState().isAuthenticated).toBe(false);
    });

    it('clears refreshTokenValue after logout', async () => {
      await act(async () => {
        await getState().logout();
      });

      expect(getState().refreshTokenValue).toBeNull();
    });

    it('resets mfaRequired after logout', async () => {
      useAuthStore.setState({ mfaRequired: true });

      await act(async () => {
        await getState().logout();
      });

      expect(getState().mfaRequired).toBe(false);
    });

    it('calls authApi.logout', async () => {
      mockAuthApi.logout.mockResolvedValue(undefined);

      await act(async () => {
        await getState().logout();
      });

      expect(mockAuthApi.logout).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // setUser()
  // -------------------------------------------------------------------------
  describe('setUser()', () => {
    it('updates the user in state', () => {
      const newUser = { ...MOCK_USER, fullName: 'Updated Name' };

      act(() => {
        getState().setUser(newUser);
      });

      expect(getState().user).toEqual(newUser);
    });

    it('does not affect isAuthenticated when updating user', () => {
      useAuthStore.setState({ isAuthenticated: true });
      const newUser = { ...MOCK_USER, email: 'new@cbs.bank' };

      act(() => {
        getState().setUser(newUser);
      });

      expect(getState().isAuthenticated).toBe(true);
    });

    it('allows setting user to null', () => {
      useAuthStore.setState({ user: MOCK_USER });

      act(() => {
        getState().setUser(null);
      });

      expect(getState().user).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // initialize()
  // -------------------------------------------------------------------------
  describe('initialize()', () => {
    it('restores a valid session from sessionStorage', async () => {
      sessionStorage.setItem('cbs-auth-session', JSON.stringify({
        accessToken: 'persisted-token',
        refreshTokenValue: 'persisted-refresh',
        tokenExpiresAt: Date.now() + 5 * 60 * 1000,
        user: MOCK_USER,
      }));

      await act(async () => {
        await getState().initialize();
      });

      expect(getState().accessToken).toBe('persisted-token');
      expect(getState().refreshTokenValue).toBe('persisted-refresh');
      expect(getState().isAuthenticated).toBe(true);
      expect(getState().hasInitialized).toBe(true);
    });

    it('refreshes an expired persisted session during initialize', async () => {
      sessionStorage.setItem('cbs-auth-session', JSON.stringify({
        accessToken: 'expired-token',
        refreshTokenValue: 'persisted-refresh',
        tokenExpiresAt: Date.now() - 1_000,
        user: MOCK_USER,
      }));

      mockAuthApi.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });

      await act(async () => {
        await getState().initialize();
      });

      expect(mockAuthApi.refresh).toHaveBeenCalledWith('persisted-refresh');
      expect(getState().accessToken).toBe('new-access-token');
      expect(getState().refreshTokenValue).toBe('new-refresh-token');
      expect(getState().isAuthenticated).toBe(true);
    });

    it('completes without throwing when no persisted session exists', async () => {
      await expect(
        act(async () => {
          await getState().initialize();
        })
      ).resolves.not.toThrow();
    });
  });
});
