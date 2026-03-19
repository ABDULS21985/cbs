import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '@/stores/notificationStore';

const makeNotification = (overrides = {}) => ({
  type: 'info' as const,
  title: 'Test Notification',
  message: 'This is a test notification',
  ...overrides,
});

beforeEach(() => {
  useNotificationStore.setState({ notifications: [], unreadCount: 0 });
});

describe('notificationStore — addNotification', () => {
  it('adds a notification with auto-generated id and timestamp', () => {
    useNotificationStore.getState().addNotification(makeNotification());

    const { notifications, unreadCount } = useNotificationStore.getState();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBeTruthy();
    expect(notifications[0].read).toBe(false);
    expect(notifications[0].createdAt).toBeTruthy();
    expect(new Date(notifications[0].createdAt).getTime()).toBeGreaterThan(0);
    expect(unreadCount).toBe(1);
  });

  it('prepends new notifications (most recent first)', () => {
    useNotificationStore.getState().addNotification({ ...makeNotification(), title: 'First' });
    useNotificationStore.getState().addNotification({ ...makeNotification(), title: 'Second' });
    useNotificationStore.getState().addNotification({ ...makeNotification(), title: 'Third' });

    const { notifications } = useNotificationStore.getState();
    expect(notifications[0].title).toBe('Third');
    expect(notifications[1].title).toBe('Second');
    expect(notifications[2].title).toBe('First');
  });

  it('increments unreadCount for each new notification', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().addNotification(makeNotification());

    expect(useNotificationStore.getState().unreadCount).toBe(3);
  });

  it('caps at 100 notifications (oldest dropped)', () => {
    // Add 105 notifications
    for (let i = 0; i < 105; i++) {
      useNotificationStore.getState().addNotification({ ...makeNotification(), title: `Notification ${i}` });
    }

    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(100);
    // Most recent 100 should be kept (104 down to 5)
    expect(notifications[0].title).toBe('Notification 104');
    expect(notifications[99].title).toBe('Notification 5');
  });

  it('stores optional actionUrl', () => {
    useNotificationStore.getState().addNotification(makeNotification({ actionUrl: '/loans/123' }));
    expect(useNotificationStore.getState().notifications[0].actionUrl).toBe('/loans/123');
  });

  it('stores all notification types', () => {
    const types = ['info', 'success', 'warning', 'error'] as const;
    types.forEach((type) => useNotificationStore.getState().addNotification(makeNotification({ type })));

    const { notifications } = useNotificationStore.getState();
    const storedTypes = notifications.map((n) => n.type);
    expect(storedTypes).toContain('info');
    expect(storedTypes).toContain('success');
    expect(storedTypes).toContain('warning');
    expect(storedTypes).toContain('error');
  });
});

describe('notificationStore — markAsRead', () => {
  it('marks a single notification as read', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    const id = useNotificationStore.getState().notifications[0].id;

    useNotificationStore.getState().markAsRead(id);

    expect(useNotificationStore.getState().notifications[0].read).toBe(true);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('does not decrement unreadCount for already-read notification', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    const id = useNotificationStore.getState().notifications[0].id;

    // Mark read twice
    useNotificationStore.getState().markAsRead(id);
    useNotificationStore.getState().markAsRead(id);

    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('only marks the targeted notification', () => {
    useNotificationStore.getState().addNotification({ ...makeNotification(), title: 'A' });
    useNotificationStore.getState().addNotification({ ...makeNotification(), title: 'B' });
    const idA = useNotificationStore.getState().notifications[1].id; // 'A' is second (prepended order)

    useNotificationStore.getState().markAsRead(idA);

    const { notifications } = useNotificationStore.getState();
    const notifA = notifications.find((n) => n.title === 'A');
    const notifB = notifications.find((n) => n.title === 'B');
    expect(notifA?.read).toBe(true);
    expect(notifB?.read).toBe(false);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });
});

describe('notificationStore — markAllAsRead', () => {
  it('marks all notifications as read and resets unreadCount to 0', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().addNotification(makeNotification());

    useNotificationStore.getState().markAllAsRead();

    const { notifications, unreadCount } = useNotificationStore.getState();
    expect(unreadCount).toBe(0);
    expect(notifications.every((n) => n.read)).toBe(true);
  });

  it('works on empty store without error', () => {
    expect(() => useNotificationStore.getState().markAllAsRead()).not.toThrow();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});

describe('notificationStore — removeNotification', () => {
  it('removes a notification by id', () => {
    useNotificationStore.getState().addNotification({ ...makeNotification(), title: 'To Remove' });
    useNotificationStore.getState().addNotification({ ...makeNotification(), title: 'To Keep' });
    const idToRemove = useNotificationStore.getState().notifications.find((n) => n.title === 'To Remove')!.id;

    useNotificationStore.getState().removeNotification(idToRemove);

    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('To Keep');
  });

  it('decrements unreadCount when removing an unread notification', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    const id = useNotificationStore.getState().notifications[0].id;
    expect(useNotificationStore.getState().unreadCount).toBe(1);

    useNotificationStore.getState().removeNotification(id);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('does not decrement unreadCount when removing an already-read notification', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    const id = useNotificationStore.getState().notifications[0].id;
    useNotificationStore.getState().markAsRead(id);
    expect(useNotificationStore.getState().unreadCount).toBe(0);

    useNotificationStore.getState().removeNotification(id);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('does nothing when id does not exist', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().removeNotification('non-existent-id');

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });
});

describe('notificationStore — clearAll', () => {
  it('removes all notifications and resets unreadCount', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().addNotification(makeNotification());

    useNotificationStore.getState().clearAll();

    expect(useNotificationStore.getState().notifications).toHaveLength(0);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});
