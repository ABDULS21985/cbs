import api from '@/lib/api';
import type { LoginRequest, LoginResponse, MfaVerifyRequest, RefreshResponse, ForgotPasswordRequest, ResetPasswordRequest } from '@/types/auth';
import type { User } from '@/types/auth';

const AUTH_BASE = '/api/auth';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    // In dev/demo mode, simulate auth since backend may not have /auth endpoints
    if (import.meta.env.VITE_ENABLE_MOCK_API === 'true' || !import.meta.env.VITE_API_BASE_URL) {
      return simulateLogin(data);
    }
    const res = await api.post<LoginResponse>(`${AUTH_BASE}/token`, data);
    return res.data;
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    if (import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      return simulateRefresh();
    }
    const res = await api.post<RefreshResponse>(`${AUTH_BASE}/refresh`, { refreshToken });
    return res.data;
  },

  verifyMfa: async (data: MfaVerifyRequest): Promise<LoginResponse> => {
    if (import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      return simulateMfaVerify(data);
    }
    const res = await api.post<LoginResponse>(`${AUTH_BASE}/mfa/verify`, data);
    return res.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    if (import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      await new Promise((r) => setTimeout(r, 1000));
      return;
    }
    await api.post(`${AUTH_BASE}/forgot-password`, data);
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    if (import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      await new Promise((r) => setTimeout(r, 1000));
      return;
    }
    await api.post(`${AUTH_BASE}/reset-password`, data);
  },

  getMe: async (): Promise<User> => {
    if (import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      return MOCK_USER;
    }
    const res = await api.get<User>(`${AUTH_BASE}/me`);
    return res.data;
  },

  logout: async (): Promise<void> => {
    try { await api.post(`${AUTH_BASE}/logout`); } catch { /* ignore */ }
  },
};

// ---- Demo/Dev simulators ----

const MOCK_USER: User = {
  id: '1',
  username: 'admin',
  fullName: 'Dr. Aisha Katanga',
  email: 'aisha.katanga@DigiCore.com',
  roles: ['CBS_ADMIN', 'CBS_OFFICER'],
  permissions: ['*'],
  branchId: 1,
  branchName: 'Head Office',
  lastLogin: new Date().toISOString(),
};

function simulateLogin(data: LoginRequest): Promise<LoginResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (data.username === 'admin' && data.password === 'admin') {
        resolve({
          accessToken: 'mock-jwt-' + Date.now(),
          refreshToken: 'mock-refresh-' + Date.now(),
          mfaRequired: false,
          user: MOCK_USER,
          expiresIn: 1800,
        });
      } else if (data.username === 'mfa') {
        resolve({
          accessToken: '',
          refreshToken: '',
          mfaRequired: true,
          mfaSessionToken: 'mock-mfa-session-' + Date.now(),
          expiresIn: 300,
        });
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 800);
  });
}

function simulateRefresh(): Promise<RefreshResponse> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({
      accessToken: 'mock-jwt-refreshed-' + Date.now(),
      refreshToken: 'mock-refresh-' + Date.now(),
      expiresIn: 1800,
    }), 300);
  });
}

function simulateMfaVerify(data: MfaVerifyRequest): Promise<LoginResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (data.otpCode === '123456') {
        resolve({
          accessToken: 'mock-jwt-mfa-' + Date.now(),
          refreshToken: 'mock-refresh-' + Date.now(),
          mfaRequired: false,
          user: MOCK_USER,
          expiresIn: 1800,
        });
      } else {
        reject(new Error('Invalid OTP code'));
      }
    }, 500);
  });
}
