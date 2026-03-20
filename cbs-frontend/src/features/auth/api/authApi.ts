import axios from 'axios';
import type {
  AuthorizationCodeCallbackRequest,
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
const AUTHORIZE_URL = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`;
const TOKEN_URL = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
const USERINFO_URL = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`;
const LOGOUT_URL = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`;
const RESET_CREDENTIALS_URL = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/login-actions/reset-credentials`;
const PKCE_STORAGE_KEY = 'cbs-auth-pkce';

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

type PkceTransaction = {
  codeVerifier: string;
  state: string;
  returnTo: string;
};

function getRedirectUri(): string {
  const configured = import.meta.env.VITE_KEYCLOAK_REDIRECT_URI;
  if (configured) {
    return configured;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:3000/auth/callback';
  }

  return `${window.location.origin}/auth/callback`;
}

function getPkceStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('PKCE flow is only available in the browser.');
  }

  return window.sessionStorage;
}

function writePkceTransaction(transaction: PkceTransaction) {
  getPkceStorage().setItem(PKCE_STORAGE_KEY, JSON.stringify(transaction));
}

function readPkceTransaction(): PkceTransaction | null {
  const raw = getPkceStorage().getItem(PKCE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PkceTransaction;
  } catch {
    getPkceStorage().removeItem(PKCE_STORAGE_KEY);
    return null;
  }
}

function clearPkceTransaction() {
  try {
    getPkceStorage().removeItem(PKCE_STORAGE_KEY);
  } catch {
    // Ignore missing browser storage
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function generateCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

function redirectBrowser(url: string) {
  window.location.assign(url);
}

function buildResetCredentialsUrl(loginHint?: string): string {
  const resetUrl = new URL(RESET_CREDENTIALS_URL);
  resetUrl.searchParams.set('client_id', KEYCLOAK_CLIENT);
  resetUrl.searchParams.set('redirect_uri', getRedirectUri());
  if (loginHint) {
    resetUrl.searchParams.set('login_hint', loginHint);
  }
  return resetUrl.toString();
}

export const authApi = {
  login: async (data: LoginRequest): Promise<void> => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = crypto.randomUUID();
    const returnTo = data.returnTo || '/dashboard';

    writePkceTransaction({
      codeVerifier,
      state,
      returnTo,
    });

    const authorizeUrl = new URL(AUTHORIZE_URL);
    authorizeUrl.searchParams.set('client_id', KEYCLOAK_CLIENT);
    authorizeUrl.searchParams.set('redirect_uri', getRedirectUri());
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'openid profile email offline_access');
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('state', state);
    if (data.username) {
      authorizeUrl.searchParams.set('login_hint', data.username);
    }

    redirectBrowser(authorizeUrl.toString());
  },

  exchangeAuthorizationCode: async ({ code, state }: AuthorizationCodeCallbackRequest): Promise<LoginResponse & { returnTo: string }> => {
    const transaction = readPkceTransaction();
    if (!transaction) {
      throw new Error('Sign-in session not found. Start login again.');
    }

    if (transaction.state !== state) {
      clearPkceTransaction();
      throw new Error('Sign-in validation failed. Start login again.');
    }

    try {
      const res = await keycloakPost(TOKEN_URL, {
        grant_type: 'authorization_code',
        client_id: KEYCLOAK_CLIENT,
        code,
        code_verifier: transaction.codeVerifier,
        redirect_uri: getRedirectUri(),
      });

      const tokenData = res.data;
      const user = await authApi.getMe(tokenData.access_token);

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        mfaRequired: false,
        expiresIn: tokenData.expires_in,
        user,
        returnTo: transaction.returnTo || '/dashboard',
      };
    } finally {
      clearPkceTransaction();
    }
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
    throw new Error('Multi-factor authentication is handled by the hosted sign-in flow. Restart login.');
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    redirectBrowser(buildResetCredentialsUrl(data.email));
  },

  resetPassword: async (_data: ResetPasswordRequest): Promise<void> => {
    redirectBrowser(buildResetCredentialsUrl());
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
