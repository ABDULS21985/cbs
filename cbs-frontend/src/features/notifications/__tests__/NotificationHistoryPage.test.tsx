import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { NotificationHistoryPage } from '../pages/NotificationHistoryPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = {
  total: 140,
  sent: 140,
  delivered: 118,
  failed: 15,
  pending: 7,
  deliveryRatePct: 84.29,
  failureRatePct: 10.71,
};

const mockTrend = [
  { date: '2026-03-20T00:00:00Z', delivered: 5, failed: 1, pending: 0 },
  { date: '2026-03-21T00:00:00Z', delivered: 8, failed: 2, pending: 1 },
  { date: '2026-03-22T00:00:00Z', delivered: 6, failed: 0, pending: 0 },
];

const mockByChannel = [
  { channel: 'EMAIL', sent: 45, delivered: 38, failed: 7 },
  { channel: 'SMS', sent: 35, delivered: 29, failed: 6 },
  { channel: 'PUSH', sent: 25, delivered: 23, failed: 2 },
  { channel: 'IN_APP', sent: 20, delivered: 20, failed: 0 },
  { channel: 'WEBHOOK', sent: 15, delivered: 12, failed: 3 },
];

const mockLogs = [
  {
    id: 1, templateCode: 'TPL-WELCOME-EMAIL', channel: 'EMAIL',
    eventType: 'CUSTOMER_ONBOARDED', customerId: 101,
    recipientAddress: 'john@example.com', recipientName: 'John Doe',
    subject: 'Welcome to DigiCore CBS', body: 'Welcome email body',
    status: 'DELIVERED', provider: 'SMTP_DEFAULT', providerMessageId: 'MSG-001',
    failureReason: null, retryCount: 0, maxRetries: 3,
    scheduledAt: null, sentAt: '2026-03-22T09:00:00Z', deliveredAt: '2026-03-22T09:00:02Z',
    createdAt: '2026-03-22T09:00:00Z',
  },
  {
    id: 2, templateCode: 'TPL-TXN-SMS', channel: 'SMS',
    eventType: 'TRANSACTION_COMPLETED', customerId: 102,
    recipientAddress: '+2348001111111', recipientName: 'Jane Smith',
    subject: null, body: 'Transaction alert SMS',
    status: 'FAILED', provider: 'TWILIO', providerMessageId: null,
    failureReason: 'Invalid phone number format', retryCount: 2, maxRetries: 3,
    scheduledAt: null, sentAt: '2026-03-21T14:00:00Z', deliveredAt: null,
    createdAt: '2026-03-21T14:00:00Z',
  },
];

const mockFailures = [
  {
    id: 2, templateCode: 'TPL-TXN-SMS', channel: 'SMS',
    recipientAddress: '+2348001111111', failureReason: 'Invalid phone number format',
    createdAt: '2026-03-21T14:00:00Z', status: 'FAILED',
  },
  {
    id: 5, templateCode: 'TPL-WEBHOOK-EVT', channel: 'WEBHOOK',
    recipientAddress: 'https://partner.example.com/webhook',
    failureReason: 'HTTP 503 Service Unavailable',
    createdAt: '2026-03-20T10:00:00Z', status: 'FAILED',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/notifications/delivery-stats', () => HttpResponse.json(wrap(mockStats))),
    http.get('/api/v1/notifications/delivery-stats/trend', () => HttpResponse.json(wrap(mockTrend))),
    http.get('/api/v1/notifications/delivery-stats/by-channel', () => HttpResponse.json(wrap(mockByChannel))),
    http.get('/api/v1/notifications/delivery-stats/failures', () => HttpResponse.json(wrap(mockFailures))),
    http.get('/api/v1/notifications', () => HttpResponse.json(wrap(mockLogs))),
    http.post('/api/v1/notifications/retry', () => HttpResponse.json(wrap({ retried: 2 }))),
  );
}

describe('NotificationHistoryPage', () => {
  // ─── Dashboard Tab ──────────────────────────────────────────────────────

  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    expect(screen.getByText('Notification Delivery History')).toBeInTheDocument();
  });

  it('renders tab navigation', () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Delivery Log')).toBeInTheDocument();
    expect(screen.getByText('Failures')).toBeInTheDocument();
  });

  it('displays delivery stats in dashboard', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Sent')).toBeInTheDocument();
    });
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Delivery Rate')).toBeInTheDocument();
  });

  it('shows delivery stats values', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('140')).toBeInTheDocument();
    });
    expect(screen.getByText('118')).toBeInTheDocument();
    expect(screen.getByText('84.3%')).toBeInTheDocument();
  });

  it('renders channel health cards', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('In-App')).toBeInTheDocument();
    expect(screen.getByText('Webhook')).toBeInTheDocument();
  });

  it('shows delivery trend chart section', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Delivery Trend (30 days)')).toBeInTheDocument();
    });
  });

  it('shows delivery by channel chart section', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Delivery by Channel')).toBeInTheDocument();
    });
  });

  it('shows failure reasons chart section', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Failure Reasons')).toBeInTheDocument();
    });
  });

  // ─── Delivery Log Tab ───────────────────────────────────────────────────

  it('shows delivery log tab with data', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    fireEvent.click(screen.getByText('Delivery Log'));
    await waitFor(() => {
      expect(screen.getByText('TPL-WELCOME-EMAIL')).toBeInTheDocument();
    });
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('TPL-TXN-SMS')).toBeInTheDocument();
  });

  it('shows channel and status filter dropdowns', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    fireEvent.click(screen.getByText('Delivery Log'));
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by channel')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
  });

  it('shows retry failed button', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    fireEvent.click(screen.getByText('Delivery Log'));
    await waitFor(() => {
      expect(screen.getByText('Retry Failed')).toBeInTheDocument();
    });
  });

  it('filters by channel', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    fireEvent.click(screen.getByText('Delivery Log'));
    await waitFor(() => {
      expect(screen.getByText('TPL-WELCOME-EMAIL')).toBeInTheDocument();
    });

    const channelSelect = screen.getByLabelText('Filter by channel');
    fireEvent.change(channelSelect, { target: { value: 'SMS' } });

    await waitFor(() => {
      expect(screen.queryByText('TPL-WELCOME-EMAIL')).not.toBeInTheDocument();
      expect(screen.getByText('TPL-TXN-SMS')).toBeInTheDocument();
    });
  });

  // ─── Failures Tab ──────────────────────────────────────────────────────

  it('shows failures tab with failed notifications', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    fireEvent.click(screen.getByText('Failures'));
    await waitFor(() => {
      expect(screen.getByText('Invalid phone number format')).toBeInTheDocument();
    });
    expect(screen.getByText('HTTP 503 Service Unavailable')).toBeInTheDocument();
  });

  it('shows failure count alert banner', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    fireEvent.click(screen.getByText('Failures'));
    await waitFor(() => {
      expect(screen.getByText(/failed notifications require attention/)).toBeInTheDocument();
    });
  });

  it('shows retry all button in failures tab', async () => {
    setupHandlers();
    renderWithProviders(<NotificationHistoryPage />);
    fireEvent.click(screen.getByText('Failures'));
    await waitFor(() => {
      expect(screen.getByText('Retry All')).toBeInTheDocument();
    });
  });
});
