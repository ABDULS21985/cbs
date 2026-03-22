import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CommunicationCenterPage } from '../pages/CommunicationCenterPage';

// ── Mocks ────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
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
    status: 'DELIVERED',
    recipientAddress: 'john@example.com',
    recipientName: 'John Doe',
    subject: 'Account Statement',
    body: 'Your statement is ready.',
    templateCode: 'ACC_STMT',
    eventType: 'ACCOUNT',
    retryCount: 0,
    maxRetries: 3,
    sentAt: '2026-03-20T10:00:00Z',
    createdAt: '2026-03-20T09:59:00Z',
    deliveredAt: '2026-03-20T10:01:00Z',
  },
  {
    id: 2,
    channel: 'SMS',
    status: 'FAILED',
    recipientAddress: '+2348001234567',
    recipientName: null,
    subject: null,
    body: 'Your OTP is 123456',
    templateCode: 'OTP',
    eventType: 'SECURITY',
    failureReason: 'Provider timeout',
    retryCount: 2,
    maxRetries: 3,
    sentAt: null,
    createdAt: '2026-03-20T11:00:00Z',
    deliveredAt: null,
  },
];

const sampleStats = {
  total: 100,
  sent: 30,
  delivered: 50,
  failed: 10,
  pending: 10,
  deliveryRatePct: 80.0,
  failureRatePct: 10.0,
};

// ── Tests ────────────────────────────────────────────────────────────────

describe('CommunicationCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/notifications/delivery-stats') return Promise.resolve(sampleStats);
      if (url === '/api/v1/notifications/failures') return Promise.resolve(sampleNotifications.filter(n => n.status === 'FAILED'));
      if (url === '/api/v1/notifications/scheduled') return Promise.resolve([]);
      if (url === '/api/v1/notifications') return Promise.resolve(sampleNotifications);
      if (url === '/api/v1/notifications/templates') return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  it('renders page header with Compose, Bulk Send, and Retry Failed buttons', async () => {
    render(<CommunicationCenterPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Communication Center')).toBeInTheDocument();
    expect(screen.getByText('Compose')).toBeInTheDocument();
    expect(screen.getByText('Bulk Send')).toBeInTheDocument();
    expect(screen.getByText('Retry Failed')).toBeInTheDocument();
  });

  it('displays delivery stats cards with correct values', async () => {
    render(<CommunicationCenterPage />, { wrapper: createWrapper() });

    // Wait for async stats to render
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Delivered=50 appears in stat card AND in a select option, so use getAllByText
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total Sent')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('Delivery Rate')).toBeInTheDocument();
  });

  it('renders All Messages tab with notification list', async () => {
    render(<CommunicationCenterPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('Account Statement')).toBeInTheDocument();
  });

  it('opens compose message sheet when Compose button is clicked', async () => {
    const user = userEvent.setup();
    render(<CommunicationCenterPage />, { wrapper: createWrapper() });

    await user.click(screen.getByText('Compose'));
    await waitFor(() => {
      expect(screen.getByText('Compose Message')).toBeInTheDocument();
    });
  });

  it('opens bulk send dialog when Bulk Send button is clicked', async () => {
    const user = userEvent.setup();
    render(<CommunicationCenterPage />, { wrapper: createWrapper() });

    await user.click(screen.getByText('Bulk Send'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /bulk send/i })).toBeInTheDocument();
    });
  });

  it('calls retry failed endpoint when Retry Failed button is clicked', async () => {
    mocks.apiPost.mockResolvedValue({ retried: 5 });
    const user = userEvent.setup();
    render(<CommunicationCenterPage />, { wrapper: createWrapper() });

    // Wait for failures to load so button becomes enabled
    await waitFor(() => {
      expect(screen.getByText('Retry Failed')).not.toBeDisabled();
    });
    await user.click(screen.getByText('Retry Failed'));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/retry');
    });
  });

  it('displays error banner when backend fails', async () => {
    mocks.apiGet.mockRejectedValue(new Error('Server error'));
    render(<CommunicationCenterPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('filters messages by channel', async () => {
    const user = userEvent.setup();
    render(<CommunicationCenterPage />, { wrapper: createWrapper() });

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select SMS filter
    const channelSelect = screen.getByDisplayValue('All Channels');
    await user.selectOptions(channelSelect, 'SMS');

    // John Doe (EMAIL) should be filtered out, only SMS entry visible
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('filters messages by status', async () => {
    const user = userEvent.setup();
    render(<CommunicationCenterPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select FAILED status filter
    const statusSelect = screen.getByDisplayValue('All Statuses');
    await user.selectOptions(statusSelect, 'FAILED');

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });
});
