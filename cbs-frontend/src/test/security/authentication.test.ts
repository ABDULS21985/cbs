import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';

// Mock authApi to avoid axios interceptor side effects (401 → refresh loop)
const mockLogin = vi.fn();
const mockExchangeAuthorizationCode = vi.fn();
const mockVerifyMfa = vi.fn();
const mockRefresh = vi.fn();
const mockLogout = vi.fn();

vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    login: (...args: unknown[]) => mockLogin(...args),
    exchangeAuthorizationCode: (...args: unknown[]) => mockExchangeAuthorizationCode(...args),
    verifyMfa: (...args: unknown[]) => mockVerifyMfa(...args),
    refresh: (...args: unknown[]) => mockRefresh(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
    getMe: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function resetStore() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshTokenValue: null,
    isAuthenticated: false,
    isLoading: false,
    hasInitialized: false,
    mfaRequired: false,
    mfaSessionToken: null,
    tokenExpiresAt: null,
  });
}

const validUser = {
  id: 'usr-001',
  username: 'admin',
  fullName: 'Admin User',
  email: 'admin@digicore.bank',
  roles: ['CBS_ADMIN'],
  permissions: ['*'],
  branchId: 1,
  branchName: 'Head Office',
};

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Authentication Tests', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  // T6-AUTH-01: Hosted login initiation with Authorization Code + PKCE
  describe('T6-AUTH-01: Hosted login flow', () => {
    it('should initiate hosted sign-in and leave the store unauthenticated until callback completes', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      await useAuthStore.getState().login('admin', undefined, '/dashboard');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.refreshTokenValue).toBeNull();
      expect(mockLogin).toHaveBeenCalledWith({ username: 'admin', returnTo: '/dashboard' });
    });

    it('should NOT store JWT in localStorage', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      await useAuthStore.getState().login('admin', undefined, '/dashboard');

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        const value = localStorage.getItem(key)!;
        expect(value).not.toContain('jwt-access-token');
        expect(value).not.toContain('jwt-refresh-token');
      }
    });

    it('should NOT store token values in sessionStorage during login initiation', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      await useAuthStore.getState().login('admin', undefined, '/dashboard');

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)!;
        const value = sessionStorage.getItem(key)!;
        expect(value).not.toContain('jwt-access-token');
        expect(value).not.toContain('jwt-refresh-token');
      }
    });
  });

  // T6-AUTH-02: Authorization callback completion
  describe('T6-AUTH-02: Authorization callback flow', () => {
    it('should exchange the authorization code and authenticate the session', async () => {
      mockExchangeAuthorizationCode.mockResolvedValueOnce({
        accessToken: 'jwt-token',
        refreshToken: 'jwt-refresh',
        mfaRequired: false,
        expiresIn: 3600,
        user: validUser,
        returnTo: '/dashboard',
      });

      await useAuthStore.getState().completeLogin({ code: 'auth-code', state: 'state-123' });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('jwt-token');
      expect(state.refreshTokenValue).toBe('jwt-refresh');
      expect(state.user?.username).toBe('admin');
      expect(state.tokenExpiresAt).toBeGreaterThan(Date.now());
    });

    it('should return to unauthenticated state if callback exchange fails', async () => {
      mockExchangeAuthorizationCode.mockRejectedValueOnce(new Error('Sign-in validation failed.'));

      await expect(
        useAuthStore.getState().completeLogin({ code: 'bad-code', state: 'bad-state' }),
      ).rejects.toThrow('Sign-in validation failed.');

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // T6-AUTH-03 / T6-AUTH-04: Hosted login initiation failure
  describe('T6-AUTH-03/04: Hosted login initiation failure', () => {
    it('should throw if secure sign-in cannot be started', async () => {
      mockLogin.mockRejectedValueOnce(
        new Error('Unable to start secure sign-in.'),
      );

      await expect(useAuthStore.getState().login('admin')).rejects.toThrow(
        'Unable to start secure sign-in.',
      );

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
    });
  });

  // T6-AUTH-05: Legacy MFA challenge state handling
  describe('T6-AUTH-05: MFA challenge flow', () => {
    it('should authenticate after successful MFA verification', async () => {
      useAuthStore.setState({
        mfaRequired: true,
        mfaSessionToken: 'mfa-session-token-123',
      });

      mockVerifyMfa.mockResolvedValueOnce({
        accessToken: 'jwt-after-mfa',
        refreshToken: 'jwt-refresh-after-mfa',
        mfaRequired: false,
        expiresIn: 3600,
        user: validUser,
      });

      await useAuthStore.getState().verifyMfa('123456');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('jwt-after-mfa');
      expect(state.mfaRequired).toBe(false);
      expect(state.mfaSessionToken).toBeNull();
    });

    it('should throw on invalid MFA code', async () => {
      useAuthStore.setState({
        mfaRequired: true,
        mfaSessionToken: 'mfa-session-token-123',
      });

      mockVerifyMfa.mockRejectedValueOnce(new Error('Invalid OTP code.'));

      await expect(useAuthStore.getState().verifyMfa('000000')).rejects.toThrow('Invalid OTP');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should throw if no MFA session token exists', async () => {
      await expect(useAuthStore.getState().verifyMfa('123456')).rejects.toThrow('No MFA session');
    });
  });

  // T6-AUTH-07 / T6-AUTH-08: Token refresh
  describe('T6-AUTH-07/08: Token refresh flow', () => {
    it('should refresh token and update store on success', async () => {
      useAuthStore.setState({
        isAuthenticated: true,
        accessToken: 'old-token',
        refreshTokenValue: 'valid-refresh',
        tokenExpiresAt: Date.now() + 60_000,
      });

      mockRefresh.mockResolvedValueOnce({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });

      await useAuthStore.getState().refreshToken();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('new-access-token');
      expect(state.refreshTokenValue).toBe('new-refresh-token');
      expect(state.tokenExpiresAt).toBeGreaterThan(Date.now());
    });

    it('should throw when no refresh token is available', async () => {
      useAuthStore.setState({ refreshTokenValue: null });
      await expect(useAuthStore.getState().refreshToken()).rejects.toThrow('No refresh token');
    });

    it('should throw when refresh endpoint returns error', async () => {
      useAuthStore.setState({ refreshTokenValue: 'expired-refresh' });

      mockRefresh.mockRejectedValueOnce(new Error('Invalid refresh token'));

      await expect(useAuthStore.getState().refreshToken()).rejects.toThrow();
    });
  });

  // T6-AUTH-10: Logout
  describe('T6-AUTH-10: Logout flow', () => {
    it('should clear all tokens and auth state on logout', () => {
      useAuthStore.setState({
        user: validUser as any,
        accessToken: 'jwt-token',
        refreshTokenValue: 'refresh-token',
        isAuthenticated: true,
        mfaRequired: false,
        mfaSessionToken: null,
        tokenExpiresAt: Date.now() + 3600_000,
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshTokenValue).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.mfaRequired).toBe(false);
      expect(state.mfaSessionToken).toBeNull();
      expect(state.tokenExpiresAt).toBeNull();
    });

    it('should call authApi.logout() for server-side cleanup', () => {
      useAuthStore.setState({
        user: validUser as any,
        accessToken: 'jwt-token',
        refreshTokenValue: 'refresh-token',
        isAuthenticated: true,
      });

      useAuthStore.getState().logout();

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  // T6-AUTH-11: Token persistence is explicit and scoped to the current tab
  describe('T6-AUTH-11: Token persistence model', () => {
    it('should not use generic localStorage/sessionStorage auth persistence keys', () => {
      expect(localStorage.getItem('auth')).toBeNull();
      expect(localStorage.getItem('auth-storage')).toBeNull();
      expect(sessionStorage.getItem('auth')).toBeNull();
      expect(sessionStorage.getItem('auth-storage')).toBeNull();
    });
  });

  // Loading state management
  describe('Loading state management', () => {
    it('should keep isLoading=true after hosted login is initiated', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      await useAuthStore.getState().login('admin');
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('should set isLoading=false after login failure', async () => {
      mockLogin.mockRejectedValueOnce(new Error('fail'));

      await expect(useAuthStore.getState().login('x', 'y')).rejects.toThrow();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading=false after MFA verification failure', async () => {
      useAuthStore.setState({ mfaSessionToken: 'session-123' });
      mockVerifyMfa.mockRejectedValueOnce(new Error('Invalid OTP'));

      await expect(useAuthStore.getState().verifyMfa('000')).rejects.toThrow();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // Login call validation
  describe('Login API call validation', () => {
    it('should pass username and returnTo to authApi.login', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      await useAuthStore.getState().login('testuser', undefined, '/customers');

      expect(mockLogin).toHaveBeenCalledWith({ username: 'testuser', returnTo: '/customers' });
    });
  });
});
