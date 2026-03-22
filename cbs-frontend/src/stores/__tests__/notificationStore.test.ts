import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useNotificationStore } from '@/stores/notificationStore';
import type { AppNotification } from '@/stores/notificationStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getState() {
  return useNotificationStore.getState();
}

function resetStore() {
  useNotificationStore.setState({ activeToasts: [] });
}

function makeToast(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'info' as const,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('notificationStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    resetStore();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe('initial state', () => {
    it('starts with empty activeToasts array', () => {
      expect(getState().activeToasts).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // addToast()
  // -------------------------------------------------------------------------
  describe('addToast()', () => {
    it('adds a toast to the array', () => {
      act(() => {
        getState().addToast(makeToast());
      });

      expect(getState().activeToasts).toHaveLength(1);
    });

    it('assigns a unique id to each toast', () => {
      act(() => {
        getState().addToast(makeToast({ title: 'First' }));
        getState().addToast(makeToast({ title: 'Second' }));
      });

      const { activeToasts } = getState();
      expect(activeToasts[0].id).toBeTruthy();
      expect(activeToasts[1].id).toBeTruthy();
      expect(activeToasts[0].id).not.toBe(activeToasts[1].id);
    });

    it('sets read=false by default', () => {
      act(() => {
        getState().addToast(makeToast());
      });

      expect(getState().activeToasts[0].read).toBe(false);
    });

    it('sets createdAt on the new toast', () => {
      act(() => {
        getState().addToast(makeToast());
      });

      expect(getState().activeToasts[0].createdAt).toBeTruthy();
    });

    it('preserves the toast title and message', () => {
      act(() => {
        getState().addToast(makeToast({ title: 'Payment Alert', message: 'Your payment was received' }));
      });

      const t = getState().activeToasts[0];
      expect(t.title).toBe('Payment Alert');
      expect(t.message).toBe('Your payment was received');
    });

    it('caps toasts at 5 items', () => {
      act(() => {
        for (let i = 0; i < 8; i++) {
          getState().addToast(makeToast({ title: `Toast ${i}` }));
        }
      });

      expect(getState().activeToasts.length).toBeLessThanOrEqual(5);
    });

    it('auto-dismisses toast after 5 seconds', () => {
      act(() => {
        getState().addToast(makeToast());
      });

      expect(getState().activeToasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(getState().activeToasts).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // dismissToast()
  // -------------------------------------------------------------------------
  describe('dismissToast()', () => {
    it('removes the toast from the array', () => {
      act(() => {
        getState().addToast(makeToast());
      });

      const { id } = getState().activeToasts[0];

      act(() => {
        getState().dismissToast(id);
      });

      expect(getState().activeToasts).toHaveLength(0);
    });

    it('only removes the targeted toast', () => {
      act(() => {
        getState().addToast(makeToast({ title: 'Keep' }));
        getState().addToast(makeToast({ title: 'Remove' }));
      });

      const removeId = getState().activeToasts.find((t: AppNotification) => t.title === 'Remove')!.id;

      act(() => {
        getState().dismissToast(removeId);
      });

      expect(getState().activeToasts).toHaveLength(1);
      expect(getState().activeToasts[0].title).toBe('Keep');
    });

    it('does nothing for a non-existent id', () => {
      act(() => {
        getState().addToast(makeToast());
      });

      act(() => {
        getState().dismissToast('non-existent-id');
      });

      expect(getState().activeToasts).toHaveLength(1);
    });
  });
});
