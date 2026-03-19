import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermission, useHasRole, useCanAccess } from '../usePermission';
import { useAuthStore } from '@/stores/authStore';

const adminUser = { id: 1, username: 'admin', fullName: 'Admin', email: 'admin@cbs.bank', roles: ['CBS_ADMIN'], permissions: [], branchId: 1, branchName: 'HQ', lastLogin: '' };
const officerUser = { id: 2, username: 'officer', fullName: 'Officer', email: 'officer@cbs.bank', roles: ['CBS_OFFICER'], permissions: [], branchId: 1, branchName: 'Lagos', lastLogin: '' };
const tellerUser = { id: 3, username: 'teller', fullName: 'Teller', email: 'teller@cbs.bank', roles: ['TELLER'], permissions: [], branchId: 1, branchName: 'Lagos', lastLogin: '' };

function setUser(user: typeof adminUser | null) {
  useAuthStore.setState({ user: user as any, isAuthenticated: !!user, accessToken: user ? 'tok' : null });
}

describe('usePermission', () => {
  afterEach(() => setUser(null));

  it('returns false when no user is logged in', () => {
    setUser(null);
    const { result } = renderHook(() => usePermission('customers', 'view'));
    expect(result.current).toBe(false);
  });

  it('CBS_ADMIN has wildcard permission for any module+action', () => {
    setUser(adminUser);
    const { result } = renderHook(() => usePermission('customers', 'view'));
    expect(result.current).toBe(true);
  });

  it('CBS_ADMIN passes for treasury delete (not in any other role)', () => {
    setUser(adminUser);
    const { result } = renderHook(() => usePermission('treasury', 'delete'));
    expect(result.current).toBe(true);
  });

  it('CBS_OFFICER has customers:* permission', () => {
    setUser(officerUser);
    const { result } = renderHook(() => usePermission('customers', 'view'));
    expect(result.current).toBe(true);
  });

  it('CBS_OFFICER has payments:* permission', () => {
    setUser(officerUser);
    const { result } = renderHook(() => usePermission('payments', 'create'));
    expect(result.current).toBe(true);
  });

  it('TELLER does not have treasury permission', () => {
    setUser(tellerUser);
    const { result } = renderHook(() => usePermission('treasury', 'view'));
    expect(result.current).toBe(false);
  });

  it('TELLER has payments:view permission', () => {
    setUser(tellerUser);
    const { result } = renderHook(() => usePermission('payments', 'view'));
    expect(result.current).toBe(true);
  });
});

describe('useHasRole', () => {
  afterEach(() => setUser(null));

  it('returns false when no user', () => {
    setUser(null);
    const { result } = renderHook(() => useHasRole('CBS_ADMIN'));
    expect(result.current).toBe(false);
  });

  it('returns true when user has the exact role', () => {
    setUser(adminUser);
    const { result } = renderHook(() => useHasRole('CBS_ADMIN'));
    expect(result.current).toBe(true);
  });

  it('returns false when user does not have the role', () => {
    setUser(officerUser);
    const { result } = renderHook(() => useHasRole('CBS_ADMIN'));
    expect(result.current).toBe(false);
  });

  it('returns true when user has any of the provided roles (array)', () => {
    setUser(tellerUser);
    const { result } = renderHook(() => useHasRole(['CBS_ADMIN', 'TELLER']));
    expect(result.current).toBe(true);
  });

  it('returns false when user has none of the provided roles', () => {
    setUser(tellerUser);
    const { result } = renderHook(() => useHasRole(['CBS_ADMIN', 'TREASURY']));
    expect(result.current).toBe(false);
  });
});

describe('useCanAccess', () => {
  afterEach(() => setUser(null));

  it('returns false when no user', () => {
    setUser(null);
    const { result } = renderHook(() => useCanAccess('/customers'));
    expect(result.current).toBe(false);
  });

  it('returns true for dashboard (module=*)', () => {
    setUser(officerUser);
    const { result } = renderHook(() => useCanAccess('/dashboard'));
    expect(result.current).toBe(true);
  });

  it('returns true for unknown path (no module mapping)', () => {
    setUser(officerUser);
    const { result } = renderHook(() => useCanAccess('/unknown-path'));
    expect(result.current).toBe(true);
  });

  it('CBS_OFFICER can access /customers', () => {
    setUser(officerUser);
    const { result } = renderHook(() => useCanAccess('/customers'));
    expect(result.current).toBe(true);
  });

  it('TELLER cannot access /treasury', () => {
    setUser(tellerUser);
    const { result } = renderHook(() => useCanAccess('/treasury'));
    expect(result.current).toBe(false);
  });
});
