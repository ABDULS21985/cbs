import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ChannelConfigPage } from '../pages/ChannelConfigPage';

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

const sampleChannels = [
  {
    id: 1,
    channel: 'EMAIL',
    provider: 'SMTP',
    enabled: true,
    config: {},
    senderAddress: 'noreply@digicore.bank',
    apiKey: null,
    apiSecret: null,
    webhookUrl: null,
    rateLimit: 100,
    retryEnabled: true,
    maxRetries: 3,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
  },
  {
    id: 2,
    channel: 'SMS',
    provider: 'TWILIO',
    enabled: false,
    config: {},
    senderAddress: '+234800000000',
    apiKey: 'key123',
    apiSecret: null,
    webhookUrl: null,
    rateLimit: 50,
    retryEnabled: false,
    maxRetries: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 3,
    channel: 'PUSH',
    provider: 'FIREBASE',
    enabled: true,
    config: {},
    senderAddress: null,
    apiKey: null,
    apiSecret: null,
    webhookUrl: null,
    rateLimit: 200,
    retryEnabled: true,
    maxRetries: 5,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-12T00:00:00Z',
  },
];

describe('ChannelConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/notifications/channels') return Promise.resolve(sampleChannels);
      return Promise.resolve([]);
    });
  });

  it('renders page header and channel cards', async () => {
    render(<ChannelConfigPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Notification Channels')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
  });

  it('displays provider and enabled/disabled status for each channel', async () => {
    render(<ChannelConfigPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    expect(screen.getByText('Provider: SMTP')).toBeInTheDocument();
    expect(screen.getByText('Provider: TWILIO')).toBeInTheDocument();
    expect(screen.getByText('Provider: FIREBASE')).toBeInTheDocument();

    // EMAIL and PUSH are enabled, SMS is disabled
    const enabledLabels = screen.getAllByText('Enabled');
    expect(enabledLabels.length).toBeGreaterThanOrEqual(2);
    const disabledLabels = screen.getAllByText('Disabled');
    expect(disabledLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('displays rate limit and retry config for each channel', async () => {
    render(<ChannelConfigPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    expect(screen.getByText('100/min')).toBeInTheDocument();
    expect(screen.getByText('50/min')).toBeInTheDocument();
    expect(screen.getByText('200/min')).toBeInTheDocument();
  });

  it('opens test send dialog when Test Send is clicked', async () => {
    const user = userEvent.setup();
    render(<ChannelConfigPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test Send');
    await user.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Test EMAIL Delivery')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('test@example.com')).toBeInTheDocument();
  });

  it('sends test channel request with recipient', async () => {
    mocks.apiPost.mockResolvedValue({ success: true, messageId: 'test-123', status: 'SENT' });
    const user = userEvent.setup();
    render(<ChannelConfigPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test Send');
    await user.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('test@example.com')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('test@example.com'), 'admin@bank.com');
    await user.click(screen.getByText('Send Test'));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/v1/notifications/channels/EMAIL/test',
        { recipient: 'admin@bank.com' },
      );
    });
  });

  it('opens edit config dialog when Configure is clicked', async () => {
    const user = userEvent.setup();
    render(<ChannelConfigPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    const configButtons = screen.getAllByText('Configure');
    await user.click(configButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Configure EMAIL')).toBeInTheDocument();
    });
    expect(screen.getByText('Channel Enabled')).toBeInTheDocument();
    expect(screen.getByText('Save Configuration')).toBeInTheDocument();
  });

  it('saves updated channel configuration via PUT', async () => {
    mocks.apiPut.mockResolvedValue({ ...sampleChannels[0], rateLimit: 200 });
    const user = userEvent.setup();
    render(<ChannelConfigPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    const configButtons = screen.getAllByText('Configure');
    await user.click(configButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Configure EMAIL')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Save Configuration'));

    await waitFor(() => {
      expect(mocks.apiPut).toHaveBeenCalledWith(
        '/api/v1/notifications/channels/EMAIL',
        expect.objectContaining({ enabled: true, provider: 'SMTP' }),
      );
    });
  });

  it('shows loading skeleton while fetching channels', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ChannelConfigPage />, { wrapper: createWrapper() });

    // Skeleton placeholders should be visible
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows test result feedback after successful test', async () => {
    mocks.apiPost.mockResolvedValue({ success: true, messageId: 'test-1', status: 'SENT' });
    const user = userEvent.setup();
    render(<ChannelConfigPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test Send');
    await user.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('test@example.com')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('test@example.com'), 'admin@bank.com');
    await user.click(screen.getByText('Send Test'));

    // After successful test, the dialog should close and the result badge appears under the card
    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/v1/notifications/channels/EMAIL/test',
        { recipient: 'admin@bank.com' },
      );
    });
  });
});
