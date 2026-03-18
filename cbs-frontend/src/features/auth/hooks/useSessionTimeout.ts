import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 minutes before expiry
const IDLE_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

export function useSessionTimeout() {
  const { isAuthenticated, tokenExpiresAt, refreshToken, logout } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const lastActivityRef = useRef(Date.now());

  const resetTimers = useCallback(() => {
    if (!tokenExpiresAt) return;

    clearTimeout(warningTimerRef.current);
    clearTimeout(logoutTimerRef.current);
    clearInterval(countdownRef.current);
    setShowWarning(false);

    const timeUntilExpiry = tokenExpiresAt - Date.now();
    const timeUntilWarning = timeUntilExpiry - WARNING_BEFORE_MS;

    if (timeUntilWarning > 0) {
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
        setRemainingSeconds(Math.floor(WARNING_BEFORE_MS / 1000));
        countdownRef.current = setInterval(() => {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, timeUntilWarning);
    }

    logoutTimerRef.current = setTimeout(() => {
      setShowWarning(false);
      logout();
      window.location.href = '/login?reason=session_expired';
    }, timeUntilExpiry);
  }, [tokenExpiresAt, logout]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => { lastActivityRef.current = Date.now(); };
    IDLE_EVENTS.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    return () => {
      IDLE_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [isAuthenticated]);

  // Set up timers when token changes
  useEffect(() => {
    if (isAuthenticated && tokenExpiresAt) {
      resetTimers();
    }
    return () => {
      clearTimeout(warningTimerRef.current);
      clearTimeout(logoutTimerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [isAuthenticated, tokenExpiresAt, resetTimers]);

  const continueSession = useCallback(async () => {
    try {
      await refreshToken();
      setShowWarning(false);
    } catch {
      logout();
      window.location.href = '/login?reason=session_expired';
    }
  }, [refreshToken, logout]);

  return { showWarning, remainingSeconds, continueSession, logout };
}
