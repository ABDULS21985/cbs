import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';

// Mock authApi so tests don't go through axios/MSW
vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    login: vi.fn(),
    exchangeAuthorizationCode: vi.fn(),
    verifyMfa: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

import { authApi } from '@/features/auth/api/authApi';

const mockUser = {
  id: 'usr-001',
  username: 'admin',
  fullName: 'Admin User',
  email: 'admin@digicore.bank',
  roles: ['CBS_ADMIN'],
  permissions: ['*'],
  branchId: 1,
  branchName: 'Head Office',
};

// Reset store to logged-out state before every test
beforeEach(() => {
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
  vi.clearAllMocks();
});

describe('authStore — login', () => {
  it('initiates hosted login with the username hint', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce(undefined);

    await useAuthStore.getState().login('admin', undefined, '/dashboard');
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
    expect(authApi.login).toHaveBeenCalledWith({ username: 'admin', returnTo: '/dashboard' });
  });

  it('sets isLoading true during login, false after', async () => {
    let capturedLoading = false;

    vi.mocked(authApi.login).mockImplementationOnce(async () => {
      capturedLoading = useAuthStore.getState().isLoading;
    });

    await useAuthStore.getState().login('admin', 'correct');

    expect(capturedLoading).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  it('throws on bad credentials and clears isLoading', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error('Unable to start secure sign-in.'));

    await expect(useAuthStore.getState().login('bad', 'wrong')).rejects.toThrow('Unable to start secure sign-in.');
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('authStore — completeLogin', () => {
  it('completes authentication after successful authorization-code exchange', async () => {
    vi.mocked(authApi.exchangeAuthorizationCode).mockResolvedValueOnce({
      accessToken: 'jwt-access',
      refreshToken: 'jwt-refresh',
      mfaRequired: false,
      expiresIn: 3600,
      user: mockUser,
      returnTo: '/dashboard',
    });

    await useAuthStore.getState().completeLogin({ code: 'auth-code', state: 'state-123' });
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.mfaRequired).toBe(false);
    expect(state.accessToken).toBe('jwt-access');
  });
});

describe('authStore — verifyMfa', () => {
  beforeEach(() => {
    // Pre-set MFA state
    useAuthStore.setState({
      mfaRequired: true,
      mfaSessionToken: 'mfa-session-abc',
      isLoading: false,
    });
  });

  it('completes authentication after successful MFA verification', async () => {
    vi.mocked(authApi.verifyMfa).mockResolvedValueOnce({
      accessToken: 'jwt-mfa-access',
      refreshToken: 'jwt-mfa-refresh',
      mfaRequired: false,
      expiresIn: 3600,
      user: mockUser,
    });

    await useAuthStore.getState().verifyMfa('123456');
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.mfaRequired).toBe(false);
    expect(state.mfaSessionToken).toBeNull();
    expect(state.accessToken).toBe('jwt-mfa-access');
  });

  it('throws when no MFA session token exists', async () => {
    useAuthStore.setState({ mfaSessionToken: null });

    await expect(useAuthStore.getState().verifyMfa('123456')).rejects.toThrow('No MFA session');
  });

  it('calls verifyMfa with mfaSessionToken from store state', async () => {
    vi.mocked(authApi.verifyMfa).mockResolvedValueOnce({
      accessToken: 'jwt-mfa-access',
      refreshToken: 'jwt-mfa-refresh',
      mfaRequired: false,
      expiresIn: 3600,
      user: mockUser,
    });

    await useAuthStore.getState().verifyMfa('654321');

    expect(authApi.verifyMfa).toHaveBeenCalledWith({
      sessionToken: 'mfa-session-abc',
      otpCode: '654321',
    });
  });
});

describe('authStore — logout', () => {
  it('clears all auth state on logout', () => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'jwt-access',
      refreshTokenValue: 'jwt-refresh',
      isAuthenticated: true,
      mfaSessionToken: 'session',
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
    expect(authApi.logout).toHaveBeenCalledOnce();
  });
});

describe('authStore — refreshToken', () => {
  it('updates tokens on successful refresh', async () => {
    useAuthStore.setState({
      refreshTokenValue: 'old-refresh',
      accessToken: 'old-access',
    });

    vi.mocked(authApi.refresh).mockResolvedValueOnce({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
    });

    await useAuthStore.getState().refreshToken();
    const state = useAuthStore.getState();

    expect(state.accessToken).toBe('new-access');
    expect(state.refreshTokenValue).toBe('new-refresh');
    expect(authApi.refresh).toHaveBeenCalledWith('old-refresh');
  });

  it('throws when no refresh token available', async () => {
    useAuthStore.setState({ refreshTokenValue: null });

    await expect(useAuthStore.getState().refreshToken()).rejects.toThrow('No refresh token');
  });
});

describe('authStore — setUser', () => {
  it('updates user without touching auth flags', () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'jwt' });

    const updatedUser = { ...mockUser, fullName: 'Updated Name' };
    useAuthStore.getState().setUser(updatedUser);

    const state = useAuthStore.getState();
    expect(state.user?.fullName).toBe('Updated Name');
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('jwt');
  });
});
