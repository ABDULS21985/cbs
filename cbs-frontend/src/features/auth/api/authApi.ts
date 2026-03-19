import axios from 'axios';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  MfaVerifyRequest,
  RefreshResponse,
  ResetPasswordRequest,
} from '@/types/auth';
import type { User } from '@/types/auth';

// Keycloak OpenID Connect endpoints
const KEYCLOAK_BASE = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'cbs';
const KEYCLOAK_CLIENT = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'cbs-app';
const TOKEN_URL = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
const USERINFO_URL = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`;
const LOGOUT_URL = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`;

// Direct Keycloak calls (not through the API proxy — Keycloak is a separate service)
const keycloakPost = async (url: string, params: Record<string, string>) => {
  const body = new URLSearchParams(params);
  return axios.post(url, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};

function decodeJwtPayload(token: string): Record<string, any> {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await keycloakPost(TOKEN_URL, {
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT,
      username: data.username,
      password: data.password,
    });

    const tokenData = res.data;
    const claims = decodeJwtPayload(tokenData.access_token);
    const roles = claims.realm_access?.roles?.filter(
      (r: string) => r.startsWith('CBS_') || r.startsWith('BRANCH_') || ['TELLER', 'TREASURY', 'COMPLIANCE', 'AUDITOR'].includes(r)
    ) || [];

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      mfaRequired: false,
      expiresIn: tokenData.expires_in,
      user: {
        id: claims.sub || '',
        username: claims.preferred_username || data.username,
        fullName: claims.name || `${claims.given_name || ''} ${claims.family_name || ''}`.trim() || data.username,
        email: claims.email || '',
        roles,
        permissions: roles.includes('CBS_ADMIN') ? ['*'] : [],
        lastLogin: new Date().toISOString(),
      },
    };
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const res = await keycloakPost(TOKEN_URL, {
      grant_type: 'refresh_token',
      client_id: KEYCLOAK_CLIENT,
      refresh_token: refreshToken,
    });
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresIn: res.data.expires_in,
    };
  },

  verifyMfa: async (_data: MfaVerifyRequest): Promise<LoginResponse> => {
    // Keycloak handles MFA as part of the login flow
    // This is a placeholder — real MFA would use Keycloak's authentication flow API
    throw new Error('MFA verification should be handled through Keycloak authentication flow');
  },

  forgotPassword: async (_data: ForgotPasswordRequest): Promise<void> => {
    // Password reset is handled by Keycloak's built-in flow
    // Redirect user to: ${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/login-actions/reset-credentials
    throw new Error('Password reset is handled by Keycloak. Use the Keycloak login page.');
  },

  resetPassword: async (_data: ResetPasswordRequest): Promise<void> => {
    throw new Error('Password reset is handled by Keycloak.');
  },

  getMe: async (token: string | null): Promise<User> => {
    if (!token) throw new Error('Not authenticated');

    const res = await axios.get(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const claims = decodeJwtPayload(token);
    const roles = claims.realm_access?.roles?.filter(
      (r: string) => r.startsWith('CBS_') || r.startsWith('BRANCH_') || ['TELLER', 'TREASURY', 'COMPLIANCE', 'AUDITOR'].includes(r)
    ) || [];

    return {
      id: res.data.sub,
      username: res.data.preferred_username,
      fullName: res.data.name || res.data.preferred_username,
      email: res.data.email || '',
      roles,
      permissions: roles.includes('CBS_ADMIN') ? ['*'] : [],
    };
  },

  logout: async (refreshToken: string | null): Promise<void> => {
    try {
      if (refreshToken) {
        await keycloakPost(LOGOUT_URL, {
          client_id: KEYCLOAK_CLIENT,
          refresh_token: refreshToken,
        });
      }
    } catch {
      // Ignore — local state will be cleared regardless
    }
  },
};
