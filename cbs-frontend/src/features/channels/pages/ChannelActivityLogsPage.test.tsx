import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { ChannelActivityLogsPage } from './ChannelActivityLogsPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockLogs = [
  { id: 1, logId: 'LOG-001', customerId: 100, sessionId: 'sess-001', channel: 'WEB', activityType: 'LOGIN', activityDetail: {}, ipAddress: '192.168.1.1', deviceFingerprint: 'fp-1', geoLocation: 'Lagos', responseTimeMs: 120, resultStatus: 'SUCCESS', errorCode: '', createdAt: '2026-03-22T10:00:00Z' },
  { id: 2, logId: 'LOG-002', customerId: 200, sessionId: 'sess-002', channel: 'MOBILE', activityType: 'TRANSFER', activityDetail: {}, ipAddress: '10.0.0.1', deviceFingerprint: 'fp-2', geoLocation: 'Abuja', responseTimeMs: 450, resultStatus: 'FAILURE', errorCode: 'INSUFFICIENT_FUNDS', createdAt: '2026-03-22T09:30:00Z' },
  { id: 3, logId: 'LOG-003', customerId: 100, sessionId: 'sess-003', channel: 'ATM', activityType: 'BALANCE_CHECK', activityDetail: {}, ipAddress: '172.16.0.1', deviceFingerprint: 'fp-3', geoLocation: 'Kano', responseTimeMs: 80, resultStatus: 'SUCCESS', errorCode: '', createdAt: '2026-03-22T08:45:00Z' },
];

const mockCustomerLogs = [
  { id: 1, logId: 'LOG-001', customerId: 100, sessionId: 'sess-001', channel: 'WEB', activityType: 'LOGIN', activityDetail: {}, ipAddress: '192.168.1.1', deviceFingerprint: 'fp-1', geoLocation: 'Lagos', responseTimeMs: 120, resultStatus: 'SUCCESS', errorCode: '', createdAt: '2026-03-22T10:00:00Z' },
];

function setupHandlers(overrides?: {
  logs?: unknown;
  customerLogs?: unknown;
}) {
  server.use(
    http.get('/api/v1/channel-activity/log', () =>
      HttpResponse.json(wrap(overrides?.logs ?? mockLogs)),
    ),
    http.post('/api/v1/channel-activity/log', () =>
      HttpResponse.json(wrap({ id: 4, logId: 'LOG-004' })),
    ),
    http.get('/api/v1/channel-activity/customer/:id', () =>
      HttpResponse.json(wrap(overrides?.customerLogs ?? mockCustomerLogs)),
    ),
  );
}

describe('ChannelActivityLogsPage', () => {
  // ── 1. Page header ──────────────────────────────────────────────────────────

  it('renders page header "Channel Activity Logs"', () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    expect(screen.getByText('Channel Activity Logs')).toBeInTheDocument();
  });

  // ── 2. Stat cards ──────────────────────────────────────────────────────────

  it('shows stat card labels', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Logs')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Successful')).toBeInTheDocument();
    expect(screen.getByText('Failures')).toBeInTheDocument();
    expect(screen.getByText('Avg Response (ms)')).toBeInTheDocument();
  });

  it('shows stat card values: Total Logs 3, Successful 2, Failures 1', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Successful count = 2 (LOG-001 + LOG-003)
    expect(screen.getByText('2')).toBeInTheDocument();
    // Failures count = 1 (LOG-002)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows avg response time stat card value', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    // Avg = Math.round((120 + 450 + 80) / 3) = Math.round(216.67) = 217
    await waitFor(() => {
      expect(screen.getByText('217')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 3. Activity log table ──────────────────────────────────────────────────

  it('shows activity log table with log IDs', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('LOG-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('LOG-002')).toBeInTheDocument();
    expect(screen.getByText('LOG-003')).toBeInTheDocument();
  });

  it('shows customer IDs in the table', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('LOG-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    const hundreds = screen.getAllByText('100');
    expect(hundreds.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('shows channel labels in the table', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('LOG-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Channel badges rendered in the table rows (may also appear in filter dropdown)
    const webEls = screen.getAllByText('WEB');
    expect(webEls.length).toBeGreaterThanOrEqual(1);
    const mobileEls = screen.getAllByText('MOBILE');
    expect(mobileEls.length).toBeGreaterThanOrEqual(1);
    const atmEls = screen.getAllByText('ATM');
    expect(atmEls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows activity types in the table', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('LOGIN')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('TRANSFER')).toBeInTheDocument();
    expect(screen.getByText('BALANCE_CHECK')).toBeInTheDocument();
  });

  it('shows table column headers', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('Log ID')).toBeInTheDocument();
    }, { timeout: 3000 });
    // "Customer" and "Channel" appear both as filter labels and column headers
    const customerEls = screen.getAllByText('Customer');
    expect(customerEls.length).toBeGreaterThanOrEqual(1);
    const channelEls = screen.getAllByText('Channel');
    expect(channelEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.getByText('Response (ms)')).toBeInTheDocument();
    expect(screen.getByText('Error Code')).toBeInTheDocument();
  });

  // ── 4. SUCCESS/FAILURE result status with correct icons ────────────────────

  it('shows SUCCESS and FAILURE result statuses', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('LOG-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    const successElements = screen.getAllByText('SUCCESS');
    expect(successElements.length).toBe(2); // LOG-001 and LOG-003
    const failureElements = screen.getAllByText('FAILURE');
    expect(failureElements.length).toBe(1); // LOG-002
  });

  it('renders result status icons with correct color classes', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('LOG-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    // SUCCESS statuses should have green color class
    const successElements = screen.getAllByText('SUCCESS');
    successElements.forEach((el) => {
      expect(el.closest('span')).toHaveClass('text-green-600');
    });
    // FAILURE status should have red color class
    const failureElements = screen.getAllByText('FAILURE');
    failureElements.forEach((el) => {
      expect(el.closest('span')).toHaveClass('text-red-600');
    });
  });

  // ── 5. Customer ID filter and Search button ────────────────────────────────

  it('shows Customer ID filter input', () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    expect(screen.getByText('Customer ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter by ID')).toBeInTheDocument();
  });

  it('shows Search button', () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('filters by customer ID when Search is clicked', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('LOG-001')).toBeInTheDocument();
    }, { timeout: 3000 });

    const input = screen.getByPlaceholderText('Filter by ID');
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText('Showing logs for customer 100')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 6. Channel dropdown filter with all 10 channel options ─────────────────

  it('shows Channel dropdown filter label', () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    // "Channel" appears both as a filter label and as a table column header
    const channelLabels = screen.getAllByText('Channel');
    expect(channelLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows All Channels default option in the Channel dropdown', () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    const select = screen.getByDisplayValue('All Channels');
    expect(select).toBeInTheDocument();
  });

  it('has all 10 channel options in the dropdown', () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    const select = screen.getByDisplayValue('All Channels');
    const options = select.querySelectorAll('option');
    // 10 channels + 1 "All Channels" = 11 options
    expect(options.length).toBe(11);
    const channelValues = Array.from(options).map((o) => o.getAttribute('value'));
    expect(channelValues).toContain('WEB');
    expect(channelValues).toContain('MOBILE');
    expect(channelValues).toContain('ATM');
    expect(channelValues).toContain('BRANCH');
    expect(channelValues).toContain('USSD');
    expect(channelValues).toContain('IVR');
    expect(channelValues).toContain('WHATSAPP');
    expect(channelValues).toContain('POS');
    expect(channelValues).toContain('AGENT');
    expect(channelValues).toContain('API');
  });

  // ── 7. "Log Activity" button for admin/officer roles ──────────────────────

  it('shows "Log Activity" button for admin/officer roles', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('Log Activity')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('hides "Log Activity" button for non-admin users', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />, {
      user: {
        id: 'user-viewer',
        username: 'viewer',
        fullName: 'Viewer User',
        email: 'viewer@bellbank.com',
        roles: ['CBS_VIEWER'],
        branchId: 1,
        branchName: 'Head Office',
        permissions: ['read'],
      },
    });
    await waitFor(() => {
      expect(screen.getByText('Activity Logs')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.queryByText('Log Activity')).not.toBeInTheDocument();
  });

  // ── 8. Error code column for failed logs ───────────────────────────────────

  it('shows error code INSUFFICIENT_FUNDS for failed log entry', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('INSUFFICIENT_FUNDS')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders error code in red for failed logs', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('INSUFFICIENT_FUNDS')).toBeInTheDocument();
    }, { timeout: 3000 });
    const errorCodeEl = screen.getByText('INSUFFICIENT_FUNDS');
    expect(errorCodeEl).toHaveClass('text-red-600');
  });

  it('shows dash for logs without error codes', async () => {
    setupHandlers();
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('LOG-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Logs without error codes render a "—" dash
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  // ── 9. Empty table state ───────────────────────────────────────────────────

  it('shows empty table state when no logs exist', async () => {
    setupHandlers({ logs: [] });
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('No activity logs found')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows zero counts in stat cards when no logs exist', async () => {
    setupHandlers({ logs: [] });
    renderWithProviders(<ChannelActivityLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Logs')).toBeInTheDocument();
    }, { timeout: 3000 });
    const zeros = screen.getAllByText('0');
    // Total Logs, Successful, Failures, Avg Response all show 0
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });

  // ── 10. Loading state ──────────────────────────────────────────────────────

  it('shows loading state while data is being fetched', () => {
    server.use(
      http.get('/api/v1/channel-activity/log', () => new Promise(() => {})),
      http.get('/api/v1/channel-activity/customer/:id', () => new Promise(() => {})),
    );
    renderWithProviders(<ChannelActivityLogsPage />);
    // When loading, StatCard renders with animate-pulse skeleton
    const pulsingElements = document.querySelectorAll('.animate-pulse');
    expect(pulsingElements.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show log data while loading', () => {
    server.use(
      http.get('/api/v1/channel-activity/log', () => new Promise(() => {})),
      http.get('/api/v1/channel-activity/customer/:id', () => new Promise(() => {})),
    );
    renderWithProviders(<ChannelActivityLogsPage />);
    expect(screen.queryByText('LOG-001')).not.toBeInTheDocument();
    expect(screen.queryByText('LOG-002')).not.toBeInTheDocument();
    expect(screen.queryByText('LOG-003')).not.toBeInTheDocument();
  });

  it('still renders page header while loading', () => {
    server.use(
      http.get('/api/v1/channel-activity/log', () => new Promise(() => {})),
      http.get('/api/v1/channel-activity/customer/:id', () => new Promise(() => {})),
    );
    renderWithProviders(<ChannelActivityLogsPage />);
    expect(screen.getByText('Channel Activity Logs')).toBeInTheDocument();
  });
});
