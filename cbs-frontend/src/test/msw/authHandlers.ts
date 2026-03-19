import { http, HttpResponse } from 'msw';

const AUTH_BASE = '/api/auth';

const validUser = {
  id: 'usr-001',
  username: 'admin',
  fullName: 'Admin User',
  email: 'admin@digicore.bank',
  roles: ['CBS_ADMIN'],
  permissions: ['*'],
  branchId: 1,
  branchName: 'Head Office',
  lastLogin: '2026-03-18T10:00:00Z',
};

export const authHandlers = [
  // Login - success
  http.post(`${AUTH_BASE}/token`, async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };

    if (body.username === 'locked_user') {
      return HttpResponse.json(
        { success: false, message: 'Account is locked. Contact your administrator.' },
        { status: 403 },
      );
    }

    if (body.username === 'mfa_user' && body.password === 'correct') {
      return HttpResponse.json({
        success: true,
        data: {
          accessToken: '',
          refreshToken: '',
          mfaRequired: true,
          mfaSessionToken: 'mfa-session-token-123',
          expiresIn: 0,
          user: null,
        },
      });
    }

    if (body.username === 'admin' && body.password === 'correct') {
      return HttpResponse.json({
        success: true,
        data: {
          accessToken: 'jwt-access-token-xyz',
          refreshToken: 'jwt-refresh-token-abc',
          mfaRequired: false,
          expiresIn: 3600,
          user: validUser,
        },
      });
    }

    return HttpResponse.json(
      { success: false, message: 'Invalid username or password.' },
      { status: 401 },
    );
  }),

  // MFA verify
  http.post(`${AUTH_BASE}/mfa/verify`, async ({ request }) => {
    const body = (await request.json()) as { sessionToken: string; otpCode: string };

    if (body.sessionToken === 'mfa-session-token-123' && body.otpCode === '123456') {
      return HttpResponse.json({
        success: true,
        data: {
          accessToken: 'jwt-access-token-after-mfa',
          refreshToken: 'jwt-refresh-token-after-mfa',
          mfaRequired: false,
          expiresIn: 3600,
          user: validUser,
        },
      });
    }

    return HttpResponse.json(
      { success: false, message: 'Invalid OTP code.' },
      { status: 401 },
    );
  }),

  // Token refresh
  http.post(`${AUTH_BASE}/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string };

    if (body.refreshToken === 'jwt-refresh-token-abc' || body.refreshToken === 'valid-refresh') {
      return HttpResponse.json({
        success: true,
        data: {
          accessToken: 'jwt-access-token-refreshed',
          refreshToken: 'jwt-refresh-token-new',
          expiresIn: 3600,
        },
      });
    }

    return HttpResponse.json(
      { success: false, message: 'Invalid refresh token.' },
      { status: 401 },
    );
  }),

  // Logout
  http.post(`${AUTH_BASE}/logout`, () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Get current user
  http.get(`${AUTH_BASE}/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({ success: true, data: validUser });
  }),
];
