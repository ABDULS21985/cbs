import axios from 'axios';
import { apiGet, apiPost } from '@/lib/api';
import type { LoginRequest, LoginResponse, MfaVerifyRequest, RefreshResponse, ForgotPasswordRequest, ResetPasswordRequest } from '@/types/auth';
import type { User } from '@/types/auth';

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_PATH || '/api/auth';

async function withAuthErrorHandling<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error('Live authentication is not configured. Connect the frontend to a real auth adapter or identity provider.');
    }
    throw error instanceof Error ? error : new Error('Authentication request failed.');
  }
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return withAuthErrorHandling(() => apiPost<LoginResponse>(`${AUTH_BASE}/token`, data));
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    return withAuthErrorHandling(() => apiPost<RefreshResponse>(`${AUTH_BASE}/refresh`, { refreshToken }));
  },

  verifyMfa: async (data: MfaVerifyRequest): Promise<LoginResponse> => {
    return withAuthErrorHandling(() => apiPost<LoginResponse>(`${AUTH_BASE}/mfa/verify`, data));
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    await withAuthErrorHandling(() => apiPost<void>(`${AUTH_BASE}/forgot-password`, data));
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    await withAuthErrorHandling(() => apiPost<void>(`${AUTH_BASE}/reset-password`, data));
  },

  getMe: async (): Promise<User> => {
    return withAuthErrorHandling(() => apiGet<User>(`${AUTH_BASE}/me`));
  },

  logout: async (): Promise<void> => {
    try {
      await withAuthErrorHandling(() => apiPost<void>(`${AUTH_BASE}/logout`));
    } catch {
      // Ignore logout cleanup failures.
    }
  },
};
