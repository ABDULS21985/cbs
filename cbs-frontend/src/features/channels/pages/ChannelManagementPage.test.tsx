import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { ChannelManagementPage } from './ChannelManagementPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockSessionCounts = {
  WEB: 3,
  MOBILE: 10,
  ATM: 0,
  BRANCH: 5,
  USSD: 2,
  IVR: 1,
  WHATSAPP: 0,
  POS: 0,
  AGENT: 0,
  API: 0,
};

const mockServicePoints = [
  {
    id: 1,
    servicePointCode: 'SP-001',
    servicePointName: 'Lekki Branch',
    servicePointType: 'BRANCH',
    locationId: null,
    deviceId: null,
    supportedServices: null,
    operatingHours: null,
    isAccessible: true,
    staffRequired: true,
    assignedStaffId: null,
    maxConcurrentCustomers: 5,
    avgServiceTimeMinutes: 15,
    status: 'ONLINE',
  },
  {
    id: 2,
    servicePointCode: 'SP-002',
    servicePointName: 'VI ATM',
    servicePointType: 'ATM',
    locationId: null,
    deviceId: 'ATM-001',
    supportedServices: null,
    operatingHours: null,
    isAccessible: false,
    staffRequired: false,
    assignedStaffId: null,
    maxConcurrentCustomers: 1,
    avgServiceTimeMinutes: 3,
    status: 'OFFLINE',
  },
];

const mockServicePointStatus = {
  online: 5,
  offline: 2,
  maintenance: 1,
};

function setupHandlers(overrides?: {
  sessionCounts?: unknown;
  servicePoints?: unknown;
  servicePointStatus?: unknown;
}) {
  server.use(
    http.get('/api/v1/channels/sessions/active-counts', () =>
      HttpResponse.json(wrap(overrides?.sessionCounts ?? mockSessionCounts)),
    ),
    http.post('/api/v1/channels/sessions/cleanup', () =>
      HttpResponse.json(wrap({ expired: 3 })),
    ),
    http.get('/api/v1/service-points', () =>
      HttpResponse.json(wrap(overrides?.servicePoints ?? mockServicePoints)),
    ),
    http.get('/api/v1/service-points/status', () =>
      HttpResponse.json(wrap(overrides?.servicePointStatus ?? mockServicePointStatus)),
    ),
    http.post('/api/v1/service-points', () =>
      HttpResponse.json(
        wrap({
          id: 3,
          servicePointCode: 'SP-003',
          servicePointName: 'New Point',
          servicePointType: 'BRANCH',
          status: 'ONLINE',
        }),
      ),
    ),
  );
}

describe('ChannelManagementPage', () => {
  // ── 1. Page header ──────────────────────────────────────────────────────────

  it('renders page header "Channel Management"', () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    expect(screen.getByText('Channel Management')).toBeInTheDocument();
  });

  // ── 2. Live Sessions tab renders by default ─────────────────────────────────

  it('renders Live Sessions tab by default showing channel session count cards', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    expect(screen.getByText('Live Sessions')).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getByText('Live Channel Sessions')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  // ── 3. Shows session counts for all 10 channels ────────────────────────────

  it('shows session counts for all 10 channels', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    await waitFor(
      () => {
        expect(screen.getByText('Web')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
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

  it('shows correct session count values (WEB: 3, MOBILE: 10, etc)', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    await waitFor(
      () => {
        // WEB = 3
        const threes = screen.getAllByText('3');
        expect(threes.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 },
    );
    // MOBILE = 10
    expect(screen.getByText('10')).toBeInTheDocument();
    // BRANCH = 5
    expect(screen.getByText('5')).toBeInTheDocument();
    // USSD = 2
    expect(screen.getByText('2')).toBeInTheDocument();
    // IVR = 1
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
    // ATM, WHATSAPP, POS, AGENT, API = 0
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(5);
  });

  // ── 4. Shows "Cleanup Expired" button for admin users ──────────────────────

  it('shows "Cleanup Expired" button for admin users', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    await waitFor(
      () => {
        expect(screen.getByText('Cleanup Expired')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  // ── 5. Clicking cleanup button calls cleanup API ───────────────────────────

  it('clicking cleanup button calls cleanup API', async () => {
    let cleanupCalled = false;
    server.use(
      http.get('/api/v1/channels/sessions/active-counts', () =>
        HttpResponse.json(wrap(mockSessionCounts)),
      ),
      http.post('/api/v1/channels/sessions/cleanup', () => {
        cleanupCalled = true;
        return HttpResponse.json(wrap({ expired: 3 }));
      }),
      http.get('/api/v1/service-points', () =>
        HttpResponse.json(wrap(mockServicePoints)),
      ),
      http.get('/api/v1/service-points/status', () =>
        HttpResponse.json(wrap(mockServicePointStatus)),
      ),
    );
    renderWithProviders(<ChannelManagementPage />);
    await waitFor(
      () => {
        expect(screen.getByText('Cleanup Expired')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    fireEvent.click(screen.getByText('Cleanup Expired'));
    await waitFor(
      () => {
        expect(cleanupCalled).toBe(true);
      },
      { timeout: 3000 },
    );
  });

  // ── 6. Switching to "Service Points" tab shows service point table ─────────

  it('switching to "Service Points" tab shows service point table', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    fireEvent.click(screen.getByText('Service Points'));
    await waitFor(
      () => {
        expect(screen.getByText('Lekki Branch')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText('VI ATM')).toBeInTheDocument();
  });

  // ── 7. Shows service point stats ───────────────────────────────────────────

  it('shows service point stats (Total Points, Online, Offline, Maintenance)', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    fireEvent.click(screen.getByText('Service Points'));
    await waitFor(
      () => {
        expect(screen.getByText('Total Points')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
  });

  it('displays correct service point status counts from API', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    fireEvent.click(screen.getByText('Service Points'));
    await waitFor(
      () => {
        // online = 5
        const fives = screen.getAllByText('5');
        expect(fives.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 },
    );
    // offline = 2
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThanOrEqual(1);
    // maintenance = 1
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  // ── 8. Shows service point data in the table ───────────────────────────────

  it('shows service point data in the table (name, code, type, status)', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    fireEvent.click(screen.getByText('Service Points'));
    await waitFor(
      () => {
        expect(screen.getByText('Lekki Branch')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText('SP-001')).toBeInTheDocument();
    expect(screen.getByText('BRANCH')).toBeInTheDocument();
    expect(screen.getByText('VI ATM')).toBeInTheDocument();
    expect(screen.getByText('SP-002')).toBeInTheDocument();
  });

  it('shows table column headers on Service Points tab', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    fireEvent.click(screen.getByText('Service Points'));
    await waitFor(
      () => {
        expect(screen.getByText('Code')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
    expect(screen.getByText('Accessible')).toBeInTheDocument();
  });

  // ── 9. Shows "Register Service Point" button for admin ─────────────────────

  it('shows "Register Service Point" button for admin', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    fireEvent.click(screen.getByText('Service Points'));
    await waitFor(
      () => {
        expect(screen.getByText('Register Service Point')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  // ── 10. Shows loading spinner while data is being fetched ──────────────────

  it('shows loading state while session counts are being fetched', () => {
    server.use(
      http.get('/api/v1/channels/sessions/active-counts', () => new Promise(() => {})),
      http.get('/api/v1/service-points', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/service-points/status', () =>
        HttpResponse.json(wrap(mockServicePointStatus)),
      ),
    );
    renderWithProviders(<ChannelManagementPage />);
    // Session counts should not be visible yet
    expect(screen.queryByText('Web')).not.toBeInTheDocument();
    // Page header should still render
    expect(screen.getByText('Channel Management')).toBeInTheDocument();
  });

  it('shows loading state while service points are being fetched', () => {
    server.use(
      http.get('/api/v1/channels/sessions/active-counts', () =>
        HttpResponse.json(wrap(mockSessionCounts)),
      ),
      http.get('/api/v1/service-points', () => new Promise(() => {})),
      http.get('/api/v1/service-points/status', () =>
        HttpResponse.json(wrap(mockServicePointStatus)),
      ),
    );
    renderWithProviders(<ChannelManagementPage />);
    fireEvent.click(screen.getByText('Service Points'));
    // Service point data should not be visible yet
    expect(screen.queryByText('Lekki Branch')).not.toBeInTheDocument();
    // Page header should still render
    expect(screen.getByText('Channel Management')).toBeInTheDocument();
  });

  // ── Additional coverage ────────────────────────────────────────────────────

  it('renders both tabs as buttons', () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    const liveSessionsTab = screen.getByText('Live Sessions');
    expect(liveSessionsTab.tagName).toBe('BUTTON');
    const servicePointsTab = screen.getByText('Service Points');
    expect(servicePointsTab.tagName).toBe('BUTTON');
  });

  it('renders the page subtitle', () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    expect(
      screen.getByText(
        'Monitor active sessions across all channels and manage physical/virtual service points.',
      ),
    ).toBeInTheDocument();
  });

  it('shows total active sessions count in the subheading', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    await waitFor(
      () => {
        // total = 3 + 10 + 0 + 5 + 2 + 1 + 0 + 0 + 0 + 0 = 21
        expect(screen.getByText(/21 total active/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('shows "Active" label for channels with sessions > 0', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    await waitFor(
      () => {
        const activeLabels = screen.getAllByText('Active');
        // WEB, MOBILE, BRANCH, USSD, IVR have sessions > 0
        expect(activeLabels.length).toBeGreaterThanOrEqual(5);
      },
      { timeout: 3000 },
    );
  });

  it('shows "No sessions" label for channels with 0 sessions', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    await waitFor(
      () => {
        const noSessionLabels = screen.getAllByText('No sessions');
        // ATM, WHATSAPP, POS, AGENT, API have 0 sessions
        expect(noSessionLabels.length).toBeGreaterThanOrEqual(5);
      },
      { timeout: 3000 },
    );
  });

  it('shows Refresh button on Live Sessions tab', async () => {
    setupHandlers();
    renderWithProviders(<ChannelManagementPage />);
    await waitFor(
      () => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('shows empty state when no service points are registered', async () => {
    setupHandlers({ servicePoints: [] });
    renderWithProviders(<ChannelManagementPage />);
    fireEvent.click(screen.getByText('Service Points'));
    await waitFor(
      () => {
        expect(screen.getByText('No service points registered.')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('still renders page header when APIs fail', () => {
    server.use(
      http.get('/api/v1/channels/sessions/active-counts', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.get('/api/v1/service-points', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.get('/api/v1/service-points/status', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithProviders(<ChannelManagementPage />);
    expect(screen.getByText('Channel Management')).toBeInTheDocument();
    expect(screen.getByText('Live Sessions')).toBeInTheDocument();
    expect(screen.getByText('Service Points')).toBeInTheDocument();
  });
});
