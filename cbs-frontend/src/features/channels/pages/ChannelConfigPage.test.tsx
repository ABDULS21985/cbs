import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { ChannelConfigPage } from './ChannelConfigPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockActiveCounts = {
  WEB: 5,
  MOBILE: 12,
  ATM: 0,
  BRANCH: 3,
  USSD: 1,
  IVR: 0,
  WHATSAPP: 0,
  POS: 2,
  AGENT: 0,
  API: 0,
};

const mockSessions = [
  {
    id: 1,
    sessionId: 'sess-001',
    customerId: 100,
    channel: 'WEB',
    deviceId: 'dev-1',
    deviceType: 'DESKTOP',
    ipAddress: '192.168.1.1',
    userAgent: 'Chrome',
    geoLatitude: 0,
    geoLongitude: 0,
    startedAt: '2026-03-22T10:00:00Z',
    lastActivityAt: '2026-03-22T10:15:00Z',
    endedAt: null,
    timeoutSeconds: 300,
    parentSessionId: null,
    handoffFromChannel: null,
    contextData: {},
    status: 'ACTIVE',
    createdAt: '2026-03-22T10:00:00Z',
  },
  {
    id: 2,
    sessionId: 'sess-002',
    customerId: 200,
    channel: 'MOBILE',
    deviceId: 'dev-2',
    deviceType: 'MOBILE',
    ipAddress: '10.0.0.1',
    userAgent: 'iOS',
    geoLatitude: 0,
    geoLongitude: 0,
    startedAt: '2026-03-22T09:30:00Z',
    lastActivityAt: '2026-03-22T10:10:00Z',
    endedAt: null,
    timeoutSeconds: 300,
    parentSessionId: null,
    handoffFromChannel: null,
    contextData: {},
    status: 'ACTIVE',
    createdAt: '2026-03-22T09:30:00Z',
  },
];

const mockConfigs = [
  {
    id: 1,
    channel: 'WEB',
    displayName: 'Web Banking',
    isEnabled: true,
    featuresEnabled: ['TRANSFER', 'PAYMENT'],
    transactionTypes: ['CREDIT', 'DEBIT'],
    maxTransferAmount: 1000000,
    dailyLimit: 5000000,
    sessionTimeoutSecs: 300,
    operatingHours: '24/7',
    maintenanceWindow: '02:00-04:00',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    version: 1,
  },
  {
    id: 2,
    channel: 'MOBILE',
    displayName: 'Mobile Banking',
    isEnabled: true,
    featuresEnabled: ['TRANSFER'],
    transactionTypes: ['CREDIT'],
    maxTransferAmount: 500000,
    dailyLimit: 2000000,
    sessionTimeoutSecs: 600,
    operatingHours: '24/7',
    maintenanceWindow: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    version: 1,
  },
  {
    id: 3,
    channel: 'ATM',
    displayName: 'ATM Channel',
    isEnabled: false,
    featuresEnabled: [],
    transactionTypes: [],
    maxTransferAmount: null,
    dailyLimit: null,
    sessionTimeoutSecs: 120,
    operatingHours: '24/7',
    maintenanceWindow: null,
    isActive: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    version: 1,
  },
];

// ─── Handler Setup ───────────────────────────────────────────────────────────

function setupHandlers(overrides?: {
  activeCounts?: unknown;
  sessions?: unknown;
  configs?: unknown;
}) {
  server.use(
    http.get('/api/v1/channels/sessions/active-counts', () =>
      HttpResponse.json(wrap(overrides?.activeCounts ?? mockActiveCounts)),
    ),
    http.get('/api/v1/channels/sessions', () =>
      HttpResponse.json(wrap(overrides?.sessions ?? mockSessions)),
    ),
    http.post('/api/v1/channels/sessions', () =>
      HttpResponse.json(wrap({ ...mockSessions[0], id: 99, sessionId: 'sess-new' })),
    ),
    http.post('/api/v1/channels/sessions/:sessionId/end', () =>
      HttpResponse.json(wrap(null)),
    ),
    http.post('/api/v1/channels/sessions/:sessionId/handoff', () =>
      HttpResponse.json(wrap({ ...mockSessions[0], channel: 'MOBILE', handoffFromChannel: 'WEB' })),
    ),
    http.post('/api/v1/channels/sessions/cleanup', () =>
      HttpResponse.json(wrap({ expired: 3 })),
    ),
    http.get('/api/v1/channels/config', () =>
      HttpResponse.json(wrap(overrides?.configs ?? mockConfigs)),
    ),
    http.post('/api/v1/channels/config', () =>
      HttpResponse.json(wrap(mockConfigs[0])),
    ),
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChannelConfigPage', () => {
  // ── 1. Page header ─────────────────────────────────────────────────────────

  it('renders page header "Channel Configuration"', () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    expect(screen.getByText('Channel Configuration')).toBeInTheDocument();
  });

  // ── 2. Default tab ─────────────────────────────────────────────────────────

  it('renders Live Sessions tab by default', () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    expect(screen.getByText('Live Sessions')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
  });

  // ── 3. Active session channel count cards ──────────────────────────────────

  it('shows active session channel count cards', async () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('12')).toBeInTheDocument();
    // Channel labels present on the count cards
    expect(screen.getByText('Web')).toBeInTheDocument();
    expect(screen.getByText('Mobile')).toBeInTheDocument();
    expect(screen.getByText('ATM')).toBeInTheDocument();
    expect(screen.getByText('Branch')).toBeInTheDocument();
    expect(screen.getByText('USSD')).toBeInTheDocument();
    expect(screen.getByText('IVR')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('POS')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
  });

  // ── 4. Session list table with session IDs, customers, channels ────────────

  it('shows session list table with session IDs, customers, channels', async () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    await waitFor(() => {
      expect(screen.getByText('sess-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('sess-002')).toBeInTheDocument();
    // Customer IDs
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    // Column headers
    expect(screen.getByText('Session ID')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Channel')).toBeInTheDocument();
    expect(screen.getByText('Device')).toBeInTheDocument();
    expect(screen.getByText('IP Address')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  // ── 5. Create Session and Cleanup Expired buttons ──────────────────────────

  it('shows "Create Session" and "Cleanup Expired" buttons', async () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    await waitFor(() => {
      expect(screen.getByText('Create Session')).toBeInTheDocument();
    });
    expect(screen.getByText('Cleanup Expired')).toBeInTheDocument();
  });

  // ── 6. Handoff and End buttons for active sessions ─────────────────────────

  it('shows Handoff and End buttons for active sessions', async () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    await waitFor(() => {
      expect(screen.getByText('sess-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Both sessions are ACTIVE, so each row has Handoff and End
    const handoffButtons = screen.getAllByText('Handoff');
    expect(handoffButtons.length).toBe(2);
    const endButtons = screen.getAllByText('End');
    expect(endButtons.length).toBe(2);
  });

  // ── 7. Switching to Channel Config tab shows config table ──────────────────

  it('switching to "Channel Config" tab shows channel config table', async () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    fireEvent.click(screen.getByText('Channel Config'));
    await waitFor(() => {
      expect(screen.getByText('Web Banking')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Mobile Banking')).toBeInTheDocument();
    expect(screen.getByText('ATM Channel')).toBeInTheDocument();
  });

  // ── 8. Config data: channel, display name, timeout, limits, status ─────────

  it('shows config data (channel, display name, timeout, limits, status)', async () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    fireEvent.click(screen.getByText('Channel Config'));
    await waitFor(() => {
      expect(screen.getByText('Web Banking')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Column headers
    expect(screen.getByText('Display Name')).toBeInTheDocument();
    expect(screen.getByText('Timeout (s)')).toBeInTheDocument();
    expect(screen.getByText('Max Transfer')).toBeInTheDocument();
    expect(screen.getByText('Daily Limit')).toBeInTheDocument();
    expect(screen.getByText('Operating Hours')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    // Timeout values rendered with "s" suffix
    expect(screen.getByText('300s')).toBeInTheDocument();
    expect(screen.getByText('600s')).toBeInTheDocument();
    expect(screen.getByText('120s')).toBeInTheDocument();
  });

  // ── 9. Edit button for admin users ─────────────────────────────────────────

  it('shows Edit button for admin users', async () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    fireEvent.click(screen.getByText('Channel Config'));
    await waitFor(() => {
      expect(screen.getByText('Web Banking')).toBeInTheDocument();
    }, { timeout: 3000 });
    // The default mock user has CBS_ADMIN role, so Edit buttons appear
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBe(mockConfigs.length);
  });

  // ── 10. Active/Inactive status indicators ──────────────────────────────────

  it('shows Active/Inactive status indicators', async () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    fireEvent.click(screen.getByText('Channel Config'));
    await waitFor(() => {
      expect(screen.getByText('Web Banking')).toBeInTheDocument();
    }, { timeout: 3000 });
    // WEB and MOBILE are enabled+active, ATM is disabled+inactive
    const activeIndicators = screen.getAllByText('Active');
    expect(activeIndicators.length).toBeGreaterThanOrEqual(2);
    const inactiveIndicators = screen.getAllByText('Inactive');
    expect(inactiveIndicators.length).toBeGreaterThanOrEqual(1);
  });

  // ── 11. Pagination controls for sessions ───────────────────────────────────

  it('shows pagination controls for sessions', async () => {
    setupHandlers();
    renderWithProviders(<ChannelConfigPage />);
    await waitFor(() => {
      expect(screen.getByText('sess-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText(/Page 1/)).toBeInTheDocument();
  });
});
