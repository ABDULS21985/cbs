import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from '@/stores/notificationStore';
import type { AppNotification } from '@/stores/notificationStore';

const makeToast = (overrides = {}) => ({
  type: 'info' as const,
  title: 'Test Notification',
  message: 'This is a test notification',
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  useNotificationStore.setState({ activeToasts: [] });
});

describe('notificationStore — addToast', () => {
  it('adds a toast with auto-generated id and timestamp', () => {
    useNotificationStore.getState().addToast(makeToast());

    const { activeToasts } = useNotificationStore.getState();
    expect(activeToasts).toHaveLength(1);
    expect(activeToasts[0].id).toBeTruthy();
    expect(activeToasts[0].read).toBe(false);
    expect(activeToasts[0].createdAt).toBeTruthy();
    expect(new Date(activeToasts[0].createdAt).getTime()).toBeGreaterThan(0);
  });

  it('appends new toasts', () => {
    useNotificationStore.getState().addToast({ ...makeToast(), title: 'First' });
    useNotificationStore.getState().addToast({ ...makeToast(), title: 'Second' });
    useNotificationStore.getState().addToast({ ...makeToast(), title: 'Third' });

    const { activeToasts } = useNotificationStore.getState();
    expect(activeToasts).toHaveLength(3);
  });

  it('caps at 5 toasts (oldest dropped)', () => {
    for (let i = 0; i < 8; i++) {
      useNotificationStore.getState().addToast({ ...makeToast(), title: `Toast ${i}` });
    }

    const { activeToasts } = useNotificationStore.getState();
    expect(activeToasts.length).toBeLessThanOrEqual(5);
  });

  it('stores optional actionUrl', () => {
    useNotificationStore.getState().addToast(makeToast({ actionUrl: '/loans/123' }));
    expect(useNotificationStore.getState().activeToasts[0].actionUrl).toBe('/loans/123');
  });

  it('stores all notification types', () => {
    const types = ['info', 'success', 'warning', 'error'] as const;
    types.forEach((type) => useNotificationStore.getState().addToast(makeToast({ type })));

    const { activeToasts } = useNotificationStore.getState();
    const storedTypes = activeToasts.map((t: AppNotification) => t.type);
    expect(storedTypes).toContain('info');
    expect(storedTypes).toContain('success');
    expect(storedTypes).toContain('warning');
    expect(storedTypes).toContain('error');
  });

  it('auto-dismisses toast after 5 seconds', () => {
    useNotificationStore.getState().addToast(makeToast());
    expect(useNotificationStore.getState().activeToasts).toHaveLength(1);

    vi.advanceTimersByTime(5000);
    expect(useNotificationStore.getState().activeToasts).toHaveLength(0);
  });
});

describe('notificationStore — dismissToast', () => {
  it('removes a toast by id', () => {
    useNotificationStore.getState().addToast({ ...makeToast(), title: 'To Remove' });
    useNotificationStore.getState().addToast({ ...makeToast(), title: 'To Keep' });
    const idToRemove = useNotificationStore.getState().activeToasts.find((t: AppNotification) => t.title === 'To Remove')!.id;

    useNotificationStore.getState().dismissToast(idToRemove);

    const { activeToasts } = useNotificationStore.getState();
    expect(activeToasts).toHaveLength(1);
    expect(activeToasts[0].title).toBe('To Keep');
  });

  it('does nothing when id does not exist', () => {
    useNotificationStore.getState().addToast(makeToast());
    useNotificationStore.getState().dismissToast('non-existent-id');

    expect(useNotificationStore.getState().activeToasts).toHaveLength(1);
  });
});
