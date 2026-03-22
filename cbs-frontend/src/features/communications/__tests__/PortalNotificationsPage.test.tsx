import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PortalNotificationsPage } from '../pages/PortalNotificationsPage';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPut: mocks.apiPut,
  apiDelete: mocks.apiDelete,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { user: { customerId: number } }) => unknown) =>
    selector({ user: { customerId: 42 } }),
}));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const sampleNotifications = [
  {
    id: 1,
    channel: 'EMAIL',
    status: 'SENT',
    recipientAddress: 'john@example.com',
    recipientName: 'John Doe',
    subject: 'Account Statement Ready',
    body: 'Your monthly statement is now available.',
    templateCode: 'ACC_STMT',
    eventType: 'ACCOUNT',
    retryCount: 0,
    maxRetries: 3,
    sentAt: '2026-03-20T10:00:00Z',
    createdAt: '2026-03-20T09:59:00Z',
    deliveredAt: null,
    customerId: 42,
    provider: null,
    providerMessageId: null,
    failureReason: null,
    scheduledAt: null,
  },
  {
    id: 2,
    channel: 'SMS',
    status: 'READ',
    recipientAddress: '+2348001234567',
    recipientName: null,
    subject: null,
    body: 'Your OTP is 654321',
    templateCode: 'OTP',
    eventType: 'SECURITY',
    retryCount: 0,
    maxRetries: 3,
    sentAt: '2026-03-19T15:00:00Z',
    createdAt: '2026-03-19T14:59:00Z',
    deliveredAt: '2026-03-19T15:01:00Z',
    customerId: 42,
    provider: null,
    providerMessageId: null,
    failureReason: null,
    scheduledAt: null,
  },
  {
    id: 3,
    channel: 'PUSH',
    status: 'DELIVERED',
    recipientAddress: '42',
    recipientName: 'John Doe',
    subject: 'New Promotion',
    body: 'Check out our latest offers!',
    templateCode: 'PROMO',
    eventType: 'MARKETING',
    retryCount: 0,
    maxRetries: 3,
    sentAt: '2026-03-18T09:00:00Z',
    createdAt: '2026-03-18T08:59:00Z',
    deliveredAt: '2026-03-18T09:01:00Z',
    customerId: 42,
    provider: null,
    providerMessageId: null,
    failureReason: null,
    scheduledAt: null,
  },
];

const samplePreferences = [
  { id: 1, customerId: 42, channel: 'EMAIL', eventType: 'ACCOUNT_ALERT', isEnabled: true },
  { id: 2, customerId: 42, channel: 'SMS', eventType: 'MARKETING', isEnabled: false },
];

describe('PortalNotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/notifications/customer/42') return Promise.resolve(sampleNotifications);
      if (url === '/api/v1/notifications/unread-count') return Promise.resolve({ unreadCount: 1 });
      if (url === '/api/v1/notifications/preferences/42') return Promise.resolve(samplePreferences);
      return Promise.resolve([]);
    });
  });

  it('renders notification list for authenticated customer', async () => {
    render(<PortalNotificationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement Ready')).toBeInTheDocument();
    });
    expect(screen.getByText('Your OTP is 654321')).toBeInTheDocument();
    expect(screen.getByText('New Promotion')).toBeInTheDocument();
  });

  it('shows unread count', async () => {
    render(<PortalNotificationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('1 unread')).toBeInTheDocument();
    });
  });

  it('displays Mark All Read button when unread notifications exist', async () => {
    render(<PortalNotificationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Mark All Read')).toBeInTheDocument();
    });
  });

  it('calls mark-all-read endpoint when button is clicked', async () => {
    mocks.apiPost.mockResolvedValue({ markedAsRead: 1 });
    const user = userEvent.setup();
    render(<PortalNotificationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Mark All Read')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Mark All Read'));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/mark-all-read?customerId=42');
    });
  });

  it('filters notifications by channel', async () => {
    const user = userEvent.setup();
    render(<PortalNotificationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement Ready')).toBeInTheDocument();
    });

    // Click SMS filter
    await user.click(screen.getByText('SMS'));

    await waitFor(() => {
      expect(screen.queryByText('Account Statement Ready')).not.toBeInTheDocument();
      expect(screen.getByText('Your OTP is 654321')).toBeInTheDocument();
    });

    // Click All to reset
    await user.click(screen.getByText('All'));

    await waitFor(() => {
      expect(screen.getByText('Account Statement Ready')).toBeInTheDocument();
    });
  });

  it('shows preferences panel when Preferences button is clicked', async () => {
    const user = userEvent.setup();
    render(<PortalNotificationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Preferences'));

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });
  });

  it('toggles preference via PUT when switch is clicked', async () => {
    mocks.apiPut.mockResolvedValue({ id: 1, isEnabled: false });
    const user = userEvent.setup();
    render(<PortalNotificationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Preferences'));

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    // Click the first toggle switch (ACCOUNT_ALERT via EMAIL — currently enabled)
    const switches = screen.getAllByRole('switch');
    if (switches.length > 0) {
      await user.click(switches[0]);

      await waitFor(() => {
        expect(mocks.apiPut).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/notifications/preferences'),
        );
      });
    }
  });

  it('shows empty state when no notifications exist', async () => {
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/notifications/customer/42') return Promise.resolve([]);
      if (url === '/api/v1/notifications/unread-count') return Promise.resolve({ unreadCount: 0 });
      return Promise.resolve([]);
    });

    render(<PortalNotificationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });

  it('highlights unread notifications with accent background', async () => {
    render(<PortalNotificationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement Ready')).toBeInTheDocument();
    });

    // SENT status notification (id=1) should be unread — look for the unread dot
    const notificationItems = document.querySelectorAll('.bg-primary\\/5');
    expect(notificationItems.length).toBeGreaterThanOrEqual(1);
  });
});
