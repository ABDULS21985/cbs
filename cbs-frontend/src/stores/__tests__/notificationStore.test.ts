import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useNotificationStore } from '@/stores/notificationStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getState() {
  return useNotificationStore.getState();
}

const BLANK_STATE = {
  notifications: [],
  unreadCount: 0,
};

function resetStore() {
  useNotificationStore.setState(BLANK_STATE);
}

function makeNotification(overrides: Record<string, unknown> = {}) {
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
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe('initial state', () => {
    it('starts with empty notifications array', () => {
      expect(getState().notifications).toHaveLength(0);
    });

    it('starts with unreadCount of 0', () => {
      expect(getState().unreadCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // addNotification()
  // -------------------------------------------------------------------------
  describe('addNotification()', () => {
    it('adds a notification to the array', () => {
      act(() => {
        getState().addNotification(makeNotification());
      });

      expect(getState().notifications).toHaveLength(1);
    });

    it('assigns a unique id to each notification', () => {
      act(() => {
        getState().addNotification(makeNotification({ title: 'First' }));
        getState().addNotification(makeNotification({ title: 'Second' }));
      });

      const { notifications } = getState();
      expect(notifications[0].id).toBeTruthy();
      expect(notifications[1].id).toBeTruthy();
      expect(notifications[0].id).not.toBe(notifications[1].id);
    });

    it('sets read=false by default', () => {
      act(() => {
        getState().addNotification(makeNotification());
      });

      expect(getState().notifications[0].read).toBe(false);
    });

    it('sets createdAt on the new notification', () => {
      act(() => {
        getState().addNotification(makeNotification());
      });

      expect(getState().notifications[0].createdAt).toBeTruthy();
    });

    it('increments unreadCount when adding a notification', () => {
      act(() => {
        getState().addNotification(makeNotification());
        getState().addNotification(makeNotification());
      });

      expect(getState().unreadCount).toBe(2);
    });

    it('preserves the notification title and message', () => {
      act(() => {
        getState().addNotification(makeNotification({ title: 'Payment Alert', message: 'Your payment was received' }));
      });

      const n = getState().notifications[0];
      expect(n.title).toBe('Payment Alert');
      expect(n.message).toBe('Your payment was received');
    });

    it('caps notifications at 100 items', () => {
      act(() => {
        for (let i = 0; i < 110; i++) {
          getState().addNotification(makeNotification({ title: `Notification ${i}` }));
        }
      });

      expect(getState().notifications.length).toBeLessThanOrEqual(100);
    });

    it('keeps the newest notifications when cap is reached', () => {
      act(() => {
        for (let i = 0; i < 105; i++) {
          getState().addNotification(makeNotification({ title: `Notification ${i}` }));
        }
      });

      const titles = getState().notifications.map((n) => n.title);
      // The oldest notifications (0-4) should have been removed
      expect(titles).not.toContain('Notification 0');
    });
  });

  // -------------------------------------------------------------------------
  // markAsRead()
  // -------------------------------------------------------------------------
  describe('markAsRead()', () => {
    it('marks a notification as read', () => {
      act(() => {
        getState().addNotification(makeNotification());
      });

      const { id } = getState().notifications[0];

      act(() => {
        getState().markAsRead(id);
      });

      expect(getState().notifications[0].read).toBe(true);
    });

    it('decrements unreadCount when marking as read', () => {
      act(() => {
        getState().addNotification(makeNotification());
        getState().addNotification(makeNotification());
      });

      const { id } = getState().notifications[0];

      act(() => {
        getState().markAsRead(id);
      });

      expect(getState().unreadCount).toBe(1);
    });

    it('does not decrement unreadCount if already read', () => {
      act(() => {
        getState().addNotification(makeNotification());
      });

      const { id } = getState().notifications[0];

      act(() => { getState().markAsRead(id); }); // first time — unread → read
      act(() => { getState().markAsRead(id); }); // second time — already read

      // Count should not go below 0
      expect(getState().unreadCount).toBeGreaterThanOrEqual(0);
      expect(getState().unreadCount).toBe(0);
    });

    it('does not affect other notifications', () => {
      act(() => {
        getState().addNotification(makeNotification({ title: 'First' }));
        getState().addNotification(makeNotification({ title: 'Second' }));
      });

      const firstId = getState().notifications[0].id;

      act(() => {
        getState().markAsRead(firstId);
      });

      expect(getState().notifications[1].read).toBe(false);
    });

    it('does nothing for a non-existent id', () => {
      act(() => {
        getState().addNotification(makeNotification());
      });

      const countBefore = getState().unreadCount;

      act(() => {
        getState().markAsRead('non-existent-id');
      });

      expect(getState().unreadCount).toBe(countBefore);
    });
  });

  // -------------------------------------------------------------------------
  // markAllAsRead()
  // -------------------------------------------------------------------------
  describe('markAllAsRead()', () => {
    it('marks all notifications as read', () => {
      act(() => {
        getState().addNotification(makeNotification({ title: 'A' }));
        getState().addNotification(makeNotification({ title: 'B' }));
        getState().addNotification(makeNotification({ title: 'C' }));
      });

      act(() => {
        getState().markAllAsRead();
      });

      getState().notifications.forEach((n) => {
        expect(n.read).toBe(true);
      });
    });

    it('sets unreadCount to 0', () => {
      act(() => {
        getState().addNotification(makeNotification());
        getState().addNotification(makeNotification());
        getState().addNotification(makeNotification());
      });

      act(() => {
        getState().markAllAsRead();
      });

      expect(getState().unreadCount).toBe(0);
    });

    it('does nothing when there are no notifications', () => {
      act(() => {
        getState().markAllAsRead();
      });

      expect(getState().unreadCount).toBe(0);
      expect(getState().notifications).toHaveLength(0);
    });

    it('handles mixed read/unread notifications correctly', () => {
      act(() => {
        getState().addNotification(makeNotification({ title: 'A' }));
        getState().addNotification(makeNotification({ title: 'B' }));
      });

      // mark one as read manually
      const firstId = getState().notifications[0].id;
      act(() => { getState().markAsRead(firstId); });
      act(() => { getState().markAllAsRead(); });

      expect(getState().unreadCount).toBe(0);
      getState().notifications.forEach((n) => expect(n.read).toBe(true));
    });
  });

  // -------------------------------------------------------------------------
  // removeNotification()
  // -------------------------------------------------------------------------
  describe('removeNotification()', () => {
    it('removes the notification from the array', () => {
      act(() => {
        getState().addNotification(makeNotification());
      });

      const { id } = getState().notifications[0];

      act(() => {
        getState().removeNotification(id);
      });

      expect(getState().notifications).toHaveLength(0);
    });

    it('decrements unreadCount if the removed notification was unread', () => {
      act(() => {
        getState().addNotification(makeNotification());
      });

      const { id } = getState().notifications[0];

      act(() => {
        getState().removeNotification(id);
      });

      expect(getState().unreadCount).toBe(0);
    });

    it('does not decrement unreadCount if removed notification was already read', () => {
      act(() => {
        getState().addNotification(makeNotification());
      });

      const { id } = getState().notifications[0];
      act(() => { getState().markAsRead(id); });

      const countAfterRead = getState().unreadCount; // should be 0

      act(() => {
        getState().removeNotification(id);
      });

      expect(getState().unreadCount).toBe(countAfterRead);
      expect(getState().unreadCount).toBe(0);
    });

    it('only removes the targeted notification', () => {
      act(() => {
        getState().addNotification(makeNotification({ title: 'Keep' }));
        getState().addNotification(makeNotification({ title: 'Remove' }));
      });

      const removeId = getState().notifications.find((n) => n.title === 'Remove')!.id;

      act(() => {
        getState().removeNotification(removeId);
      });

      expect(getState().notifications).toHaveLength(1);
      expect(getState().notifications[0].title).toBe('Keep');
    });

    it('does nothing for a non-existent id', () => {
      act(() => {
        getState().addNotification(makeNotification());
      });

      act(() => {
        getState().removeNotification('non-existent-id');
      });

      expect(getState().notifications).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // clearAll()
  // -------------------------------------------------------------------------
  describe('clearAll()', () => {
    it('empties the notifications array', () => {
      act(() => {
        getState().addNotification(makeNotification());
        getState().addNotification(makeNotification());
      });

      act(() => {
        getState().clearAll();
      });

      expect(getState().notifications).toHaveLength(0);
    });

    it('resets unreadCount to 0', () => {
      act(() => {
        getState().addNotification(makeNotification());
        getState().addNotification(makeNotification());
      });

      act(() => {
        getState().clearAll();
      });

      expect(getState().unreadCount).toBe(0);
    });

    it('works when already empty', () => {
      act(() => {
        getState().clearAll();
      });

      expect(getState().notifications).toHaveLength(0);
      expect(getState().unreadCount).toBe(0);
    });

    it('allows new notifications to be added after clearing', () => {
      act(() => {
        getState().addNotification(makeNotification());
        getState().clearAll();
        getState().addNotification(makeNotification({ title: 'New after clear' }));
      });

      expect(getState().notifications).toHaveLength(1);
      expect(getState().notifications[0].title).toBe('New after clear');
      expect(getState().unreadCount).toBe(1);
    });
  });
});
