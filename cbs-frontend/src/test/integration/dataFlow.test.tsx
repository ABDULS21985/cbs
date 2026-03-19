/**
 * Cross-component data flow integration tests
 *
 * Validates that state changes in stores (Zustand) and TanStack Query cache
 * correctly propagate through the component tree and affect rendered UI.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { useSidebarState } from '@/hooks/useSidebarState';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function AllProviders({ children, qc }: { children: ReactNode; qc: QueryClient }) {
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const mockUser = {
  id: 'usr-001',
  username: 'admin',
  fullName: 'Admin User',
  email: 'admin@digicore.bank',
  roles: ['CBS_ADMIN'],
  permissions: ['*'],
  branchId: 1,
  branchName: 'Head Office',
};

// ─── Store reset ───────────────────────────────────────────────────────────────

beforeEach(() => {
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
  useNotificationStore.setState({ notifications: [], unreadCount: 0 });
  // Bypass persist middleware by directly touching internal state
  useUiStore.setState({
    sidebarCollapsed: false,
    sidebarMobileOpen: false,
    commandPaletteOpen: false,
    activeModal: null,
  });
  localStorage.removeItem('cbs-ui');
});

// ─── NotificationBell → notificationStore data flow ──────────────────────────

describe('NotificationBell ↔ notificationStore', () => {
  it('shows no badge when there are no unread notifications', () => {
    const qc = createTestQueryClient();
    render(
      <AllProviders qc={qc}>
        <NotificationBell />
      </AllProviders>
    );

    // Badge span should not be in the DOM when unreadCount is 0
    const badge = screen.queryByText(/^\d+$/);
    expect(badge).toBeNull();
  });

  it('shows unread count badge when notifications are added', () => {
    const qc = createTestQueryClient();

    act(() => {
      useNotificationStore.getState().addNotification({
        type: 'info',
        title: 'New Transfer',
        message: 'Transfer initiated',
      });
    });

    render(
      <AllProviders qc={qc}>
        <NotificationBell />
      </AllProviders>
    );

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('updates badge count in real time as notifications are added', () => {
    const qc = createTestQueryClient();

    render(
      <AllProviders qc={qc}>
        <NotificationBell />
      </AllProviders>
    );

    // Start with no badge
    expect(screen.queryByText('1')).toBeNull();

    // Add notifications
    act(() => {
      useNotificationStore.getState().addNotification({ type: 'success', title: 'Done', message: 'OK' });
    });
    expect(screen.getByText('1')).toBeInTheDocument();

    act(() => {
      useNotificationStore.getState().addNotification({ type: 'warning', title: 'Warning', message: 'Check' });
    });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows "99+" badge when unreadCount exceeds 99', () => {
    const qc = createTestQueryClient();

    // Set unreadCount directly
    act(() => {
      for (let i = 0; i < 100; i++) {
        useNotificationStore.getState().addNotification({
          type: 'info',
          title: `Notification ${i}`,
          message: `Message ${i}`,
        });
      }
    });

    render(
      <AllProviders qc={qc}>
        <NotificationBell />
      </AllProviders>
    );

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('badge disappears after markAllAsRead', () => {
    const qc = createTestQueryClient();

    act(() => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'Test', message: 'Msg' });
    });

    render(
      <AllProviders qc={qc}>
        <NotificationBell />
      </AllProviders>
    );

    expect(screen.getByText('1')).toBeInTheDocument();

    act(() => {
      useNotificationStore.getState().markAllAsRead();
    });

    expect(screen.queryByText('1')).toBeNull();
  });
});

// ─── RoleGuard ↔ authStore data flow ─────────────────────────────────────────

describe('RoleGuard ↔ authStore', () => {
  it('renders children for user with required role', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });

    const qc = createTestQueryClient();
    render(
      <AllProviders qc={qc}>
        <RoleGuard roles="CBS_ADMIN">
          <span>Admin Panel</span>
        </RoleGuard>
      </AllProviders>
    );

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('renders fallback for user without required role', () => {
    useAuthStore.setState({
      user: { ...mockUser, roles: ['CBS_OFFICER'] },
      isAuthenticated: true,
    });

    const qc = createTestQueryClient();
    render(
      <AllProviders qc={qc}>
        <RoleGuard roles="CBS_ADMIN" fallback={<span>Access Denied</span>}>
          <span>Admin Panel</span>
        </RoleGuard>
      </AllProviders>
    );

    expect(screen.queryByText('Admin Panel')).toBeNull();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders fallback when user is not authenticated (null user)', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });

    const qc = createTestQueryClient();
    render(
      <AllProviders qc={qc}>
        <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER']} fallback={<span>Login Required</span>}>
          <span>Protected Content</span>
        </RoleGuard>
      </AllProviders>
    );

    expect(screen.queryByText('Protected Content')).toBeNull();
    expect(screen.getByText('Login Required')).toBeInTheDocument();
  });

  it('accepts an array of roles (any match grants access)', () => {
    useAuthStore.setState({
      user: { ...mockUser, roles: ['CBS_OFFICER'] },
      isAuthenticated: true,
    });

    const qc = createTestQueryClient();
    render(
      <AllProviders qc={qc}>
        <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER']}>
          <span>Allowed for Officer</span>
        </RoleGuard>
      </AllProviders>
    );

    expect(screen.getByText('Allowed for Officer')).toBeInTheDocument();
  });
});

// ─── useAuth derived state ─────────────────────────────────────────────────────

describe('useAuth — derived role flags', () => {
  it('isAdmin is true when user has CBS_ADMIN role', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AllProviders qc={qc}>{children}</AllProviders>,
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isOfficer).toBe(false);
  });

  it('isOfficer is true when user has CBS_OFFICER role', () => {
    useAuthStore.setState({
      user: { ...mockUser, roles: ['CBS_OFFICER'] },
      isAuthenticated: true,
    });

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AllProviders qc={qc}>{children}</AllProviders>,
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isOfficer).toBe(true);
  });

  it('both isAdmin and isOfficer are false when no user', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AllProviders qc={qc}>{children}</AllProviders>,
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isOfficer).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('isAdmin updates when user roles change in store', () => {
    useAuthStore.setState({ user: { ...mockUser, roles: ['CBS_OFFICER'] }, isAuthenticated: true });

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AllProviders qc={qc}>{children}</AllProviders>,
    });

    expect(result.current.isAdmin).toBe(false);

    act(() => {
      useAuthStore.setState({ user: { ...mockUser, roles: ['CBS_ADMIN'] } });
    });

    expect(result.current.isAdmin).toBe(true);
  });
});

// ─── useNotifications ↔ authStore ─────────────────────────────────────────────

describe('useNotifications — store integration', () => {
  it('exposes notifications and unreadCount from store', () => {
    act(() => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'A', message: 'B' });
      useNotificationStore.getState().addNotification({ type: 'error', title: 'C', message: 'D' });
    });

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useNotifications(), {
      wrapper: ({ children }) => <AllProviders qc={qc}>{children}</AllProviders>,
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(2);
  });

  it('notify helper adds a notification to the store', () => {
    const qc = createTestQueryClient();
    const { result } = renderHook(() => useNotifications(), {
      wrapper: ({ children }) => <AllProviders qc={qc}>{children}</AllProviders>,
    });

    act(() => {
      result.current.notify('success', 'Payment sent', 'Your payment was processed');
    });

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().notifications[0].title).toBe('Payment sent');
    expect(useNotificationStore.getState().notifications[0].type).toBe('success');
  });

  it('markAllAsRead clears the unread count in the store', () => {
    act(() => {
      useNotificationStore.getState().addNotification({ type: 'warning', title: 'W', message: 'M' });
    });

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useNotifications(), {
      wrapper: ({ children }) => <AllProviders qc={qc}>{children}</AllProviders>,
    });

    expect(result.current.unreadCount).toBe(1);

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('does not start polling interval when unauthenticated', () => {
    useAuthStore.setState({ isAuthenticated: false });

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    const qc = createTestQueryClient();
    const { unmount } = renderHook(() => useNotifications(), {
      wrapper: ({ children }) => <AllProviders qc={qc}>{children}</AllProviders>,
    });

    // The hook should call setInterval only when authenticated
    expect(setIntervalSpy).not.toHaveBeenCalled();
    unmount();
    setIntervalSpy.mockRestore();
  });

  it('starts polling interval when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true });

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const qc = createTestQueryClient();
    const { unmount } = renderHook(() => useNotifications(), {
      wrapper: ({ children }) => <AllProviders qc={qc}>{children}</AllProviders>,
    });

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});

// ─── useSidebarState — localStorage persistence ────────────────────────────────

describe('useSidebarState — localStorage persistence', () => {
  it('starts expanded when localStorage has no value', () => {
    localStorage.removeItem('cbs-sidebar-collapsed');
    // jsdom default innerWidth is 1024, so collapsed = false
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 });

    const { result } = renderHook(() => useSidebarState());
    expect(result.current.collapsed).toBe(false);
  });

  it('restores collapsed=true from localStorage', () => {
    localStorage.setItem('cbs-sidebar-collapsed', 'true');

    const { result } = renderHook(() => useSidebarState());
    expect(result.current.collapsed).toBe(true);
  });

  it('persists collapsed state to localStorage on toggle', () => {
    localStorage.removeItem('cbs-sidebar-collapsed');
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 });

    const { result } = renderHook(() => useSidebarState());
    expect(result.current.collapsed).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem('cbs-sidebar-collapsed')).toBe('true');

    act(() => {
      result.current.toggle();
    });

    expect(result.current.collapsed).toBe(false);
    expect(localStorage.getItem('cbs-sidebar-collapsed')).toBe('false');
  });
});

// ─── Multi-store interaction ────────────────────────────────────────────────────

describe('Multi-store interactions', () => {
  it('uiStore modal state is independent of auth state', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });

    useUiStore.getState().openModal('confirm-action');
    expect(useUiStore.getState().activeModal).toBe('confirm-action');

    // Auth state change should not affect modal
    useAuthStore.setState({ user: null, isAuthenticated: false });
    expect(useUiStore.getState().activeModal).toBe('confirm-action');
  });

  it('notification store is independent of uiStore', () => {
    act(() => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'Test', message: 'Msg' });
    });

    useUiStore.getState().toggleSidebar();

    // Notification should still be there
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    // Sidebar should be toggled
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('clearing notifications does not affect auth or ui state', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    useUiStore.getState().openModal('test-modal');

    act(() => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'N', message: 'M' });
      useNotificationStore.getState().clearAll();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useUiStore.getState().activeModal).toBe('test-modal');
  });
});
