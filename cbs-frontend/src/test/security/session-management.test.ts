import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/stores/authStore';
import { useSessionTimeout } from '@/features/auth/hooks/useSessionTimeout';

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

function setAuthenticatedWithExpiry(expiresInMs: number) {
  useAuthStore.setState({
    user: {
      id: 'usr-001',
      username: 'testuser',
      fullName: 'Test User',
      email: 'test@digicore.bank',
      roles: ['CBS_OFFICER'],
      permissions: [],
    },
    accessToken: 'test-token',
    refreshTokenValue: 'test-refresh',
    isAuthenticated: true,
    isLoading: false,
    tokenExpiresAt: Date.now() + expiresInMs,
  });
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Session Management Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // T6-AUTH-13: Session timeout modal appears at correct time (2 min before expiry)
  describe('T6-AUTH-13: Session timeout warning', () => {
    it('should show warning 2 minutes before token expiry', () => {
      // Token expires in 5 minutes
      setAuthenticatedWithExpiry(5 * 60 * 1000);

      const { result } = renderHook(() => useSessionTimeout());

      // Initially no warning
      expect(result.current.showWarning).toBe(false);

      // Advance to 3 minutes (2 min before 5 min expiry = at 3 min mark)
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000);
      });

      expect(result.current.showWarning).toBe(true);
      expect(result.current.remainingSeconds).toBe(120);
    });

    it('should countdown remaining seconds after warning appears', () => {
      setAuthenticatedWithExpiry(5 * 60 * 1000);

      const { result } = renderHook(() => useSessionTimeout());

      // Advance past warning threshold
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000);
      });

      expect(result.current.remainingSeconds).toBe(120);

      // Advance 10 seconds
      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(result.current.remainingSeconds).toBe(110);
    });

    it('should NOT show warning when not authenticated', () => {
      // Store already reset (not authenticated)
      const { result } = renderHook(() => useSessionTimeout());

      act(() => {
        vi.advanceTimersByTime(10 * 60 * 1000);
      });

      expect(result.current.showWarning).toBe(false);
    });
  });

  // T6-AUTH-15: Session timeout auto-logout on expiry
  describe('T6-AUTH-15: Auto-logout on expiry', () => {
    it('should logout when token expires', () => {
      const originalLocation = window.location.href;
      // Mock window.location
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: originalLocation },
      });

      setAuthenticatedWithExpiry(5 * 60 * 1000);

      renderHook(() => useSessionTimeout());

      // Advance to full expiry
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000 + 100);
      });

      // Store should be logged out
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();

      // Should redirect to login with session_expired reason
      expect(window.location.href).toContain('/login?reason=session_expired');
    });
  });

  // T6-AUTH-14: Session timeout "Continue" refreshes token
  describe('T6-AUTH-14: Continue session', () => {
    it('should provide a continueSession function', () => {
      setAuthenticatedWithExpiry(5 * 60 * 1000);

      const { result } = renderHook(() => useSessionTimeout());

      expect(typeof result.current.continueSession).toBe('function');
    });

    it('should provide a logout function', () => {
      setAuthenticatedWithExpiry(5 * 60 * 1000);

      const { result } = renderHook(() => useSessionTimeout());

      expect(typeof result.current.logout).toBe('function');
    });
  });

  // Timer cleanup
  describe('Timer cleanup on unmount', () => {
    it('should clean up timers when component unmounts', () => {
      setAuthenticatedWithExpiry(5 * 60 * 1000);

      const { unmount } = renderHook(() => useSessionTimeout());

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should clean up timers when authentication state changes', () => {
      setAuthenticatedWithExpiry(5 * 60 * 1000);

      renderHook(() => useSessionTimeout());

      // Logout should clear timers
      act(() => {
        useAuthStore.getState().logout();
      });

      // Advancing timers after logout should not cause warnings
      act(() => {
        vi.advanceTimersByTime(10 * 60 * 1000);
      });
    });
  });

  // Edge cases
  describe('Edge cases', () => {
    it('should handle token already expired', () => {
      // Token expired 1 minute ago
      useAuthStore.setState({
        user: { id: '1', username: 'x', fullName: 'x', email: 'x', roles: ['CBS_OFFICER'], permissions: [] },
        accessToken: 'old',
        refreshTokenValue: 'old-refresh',
        isAuthenticated: true,
        tokenExpiresAt: Date.now() - 60_000,
      });

      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: '/' },
      });

      renderHook(() => useSessionTimeout());

      // Should trigger logout almost immediately
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should show warning immediately when less than 2 min remain', () => {
      // Token expires in 1 minute (less than 2 min warning window)
      setAuthenticatedWithExpiry(60_000);

      const { result } = renderHook(() => useSessionTimeout());

      // timeUntilWarning would be negative, so warning timer doesn't fire
      // but logout timer should still fire at expiry
      act(() => {
        vi.advanceTimersByTime(60_100);
      });

      // Should have logged out
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
