import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';

// Mock authApi to avoid axios interceptor side effects (401 → refresh loop)
const mockLogin = vi.fn();
const mockVerifyMfa = vi.fn();
const mockRefresh = vi.fn();
const mockLogout = vi.fn();

vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    login: (...args: unknown[]) => mockLogin(...args),
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

  // T6-AUTH-01: Login with valid credentials → JWT issued → stored in memory
  describe('T6-AUTH-01: Valid login flow', () => {
    it('should authenticate and store JWT in Zustand (memory) on valid credentials', async () => {
      mockLogin.mockResolvedValueOnce({
        accessToken: 'jwt-access-token-xyz',
        refreshToken: 'jwt-refresh-token-abc',
        mfaRequired: false,
        expiresIn: 3600,
        user: validUser,
      });

      await useAuthStore.getState().login('admin', 'correct');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('jwt-access-token-xyz');
      expect(state.refreshTokenValue).toBe('jwt-refresh-token-abc');
      expect(state.user).toBeTruthy();
      expect(state.user?.username).toBe('admin');
      expect(state.user?.roles).toContain('CBS_ADMIN');
      expect(state.tokenExpiresAt).toBeGreaterThan(Date.now());
    });

    it('should NOT store JWT in localStorage', async () => {
      mockLogin.mockResolvedValueOnce({
        accessToken: 'jwt-access-token-xyz',
        refreshToken: 'jwt-refresh-token-abc',
        mfaRequired: false,
        expiresIn: 3600,
        user: validUser,
      });

      await useAuthStore.getState().login('admin', 'correct');

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        const value = localStorage.getItem(key)!;
        expect(value).not.toContain('jwt-access-token');
        expect(value).not.toContain('jwt-refresh-token');
      }
    });

    it('should NOT store JWT in sessionStorage', async () => {
      mockLogin.mockResolvedValueOnce({
        accessToken: 'jwt-access-token-xyz',
        refreshToken: 'jwt-refresh-token-abc',
        mfaRequired: false,
        expiresIn: 3600,
        user: validUser,
      });

      await useAuthStore.getState().login('admin', 'correct');

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)!;
        const value = sessionStorage.getItem(key)!;
        expect(value).not.toContain('jwt-access-token');
        expect(value).not.toContain('jwt-refresh-token');
      }
    });

    it('should calculate tokenExpiresAt from expiresIn', async () => {
      const before = Date.now();

      mockLogin.mockResolvedValueOnce({
        accessToken: 'jwt-token',
        refreshToken: 'jwt-refresh',
        mfaRequired: false,
        expiresIn: 3600,
        user: validUser,
      });

      await useAuthStore.getState().login('admin', 'correct');

      const after = Date.now();
      const expiresAt = useAuthStore.getState().tokenExpiresAt!;
      expect(expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000);
      expect(expiresAt).toBeLessThanOrEqual(after + 3600 * 1000);
    });
  });

  // T6-AUTH-02: Login with invalid credentials
  describe('T6-AUTH-02: Invalid credentials', () => {
    it('should throw error and leave store unauthenticated', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid username or password.'));

      await expect(useAuthStore.getState().login('wrong', 'wrong')).rejects.toThrow(
        'Invalid username or password.',
      );

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  // T6-AUTH-03: Login with locked account
  describe('T6-AUTH-03: Locked account', () => {
    it('should return account locked error', async () => {
      mockLogin.mockRejectedValueOnce(
        new Error('Account is locked. Contact your administrator.'),
      );

      await expect(useAuthStore.getState().login('locked_user', 'pass')).rejects.toThrow(
        'Account is locked',
      );

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
    });
  });

  // T6-AUTH-04 / T6-AUTH-05: MFA challenge
  describe('T6-AUTH-04/05: MFA challenge flow', () => {
    it('should set mfaRequired=true when backend requires MFA', async () => {
      mockLogin.mockResolvedValueOnce({
        accessToken: '',
        refreshToken: '',
        mfaRequired: true,
        mfaSessionToken: 'mfa-session-token-123',
        expiresIn: 0,
        user: null,
      });

      await useAuthStore.getState().login('mfa_user', 'correct');

      const state = useAuthStore.getState();
      expect(state.mfaRequired).toBe(true);
      expect(state.mfaSessionToken).toBe('mfa-session-token-123');
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
    });

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

  // T6-AUTH-11: Browser close → token gone (Zustand in-memory = not persisted)
  describe('T6-AUTH-11: Token not persisted across sessions', () => {
    it('should use Zustand without persist middleware (in-memory only)', () => {
      useAuthStore.setState({
        accessToken: 'some-token',
        isAuthenticated: true,
      });

      expect(localStorage.getItem('auth')).toBeNull();
      expect(localStorage.getItem('auth-storage')).toBeNull();
      expect(sessionStorage.getItem('auth')).toBeNull();
      expect(sessionStorage.getItem('auth-storage')).toBeNull();
    });
  });

  // Loading state management
  describe('Loading state management', () => {
    it('should set isLoading=false after successful login', async () => {
      mockLogin.mockResolvedValueOnce({
        accessToken: 'token',
        refreshToken: 'refresh',
        mfaRequired: false,
        expiresIn: 3600,
        user: validUser,
      });

      await useAuthStore.getState().login('admin', 'correct');
      expect(useAuthStore.getState().isLoading).toBe(false);
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
    it('should pass username and password to authApi.login', async () => {
      mockLogin.mockResolvedValueOnce({
        accessToken: 'token',
        refreshToken: 'refresh',
        mfaRequired: false,
        expiresIn: 3600,
        user: validUser,
      });

      await useAuthStore.getState().login('testuser', 'testpass');

      expect(mockLogin).toHaveBeenCalledWith({ username: 'testuser', password: 'testpass' });
    });
  });
});
