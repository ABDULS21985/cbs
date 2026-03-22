import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { ServicePointDetailPage } from './ServicePointDetailPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockServicePoint = {
  id: 1,
  servicePointCode: 'SP-001',
  servicePointName: 'Lekki Branch',
  servicePointType: 'BRANCH',
  locationId: null,
  deviceId: 'DEV-001',
  supportedServices: null,
  operatingHours: null,
  isAccessible: true,
  staffRequired: true,
  assignedStaffId: 'EMP-001',
  maxConcurrentCustomers: 5,
  avgServiceTimeMinutes: 15,
  status: 'ONLINE',
};

const mockMetrics = {
  servicePointCode: 'SP-001',
  avgDurationSeconds: 900,
  avgSatisfaction: 4.2,
  utilizationPct: 65.5,
  activeInteractions: 3,
  totalInteractions: 120,
};

function setupHandlers(spOverride?: Partial<typeof mockServicePoint> | null, metricsOverride?: Partial<typeof mockMetrics> | null) {
  const sp = spOverride === null ? null : { ...mockServicePoint, ...spOverride };
  const metrics = metricsOverride === null ? null : { ...mockMetrics, ...metricsOverride };

  server.use(
    http.get('/api/v1/service-points/1', () => {
      if (sp === null) {
        return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
      }
      return HttpResponse.json(wrap(sp));
    }),
    http.get('/api/v1/service-points/metrics', () => {
      if (metrics === null) {
        return HttpResponse.json(wrap(null));
      }
      return HttpResponse.json(wrap(metrics));
    }),
    http.post('/api/v1/service-points/1/interaction/start', () =>
      HttpResponse.json(wrap({ id: 10, servicePointId: 1, interactionType: 'WALK_IN', outcome: 'IN_PROGRESS' })),
    ),
    http.post('/api/v1/service-points/1/interaction/end', () =>
      HttpResponse.json(wrap({ id: 10, servicePointId: 1, outcome: 'COMPLETED' })),
    ),
    http.put('/api/v1/service-points/1', () =>
      HttpResponse.json(wrap({ ...mockServicePoint, ...spOverride })),
    ),
    http.delete('/api/v1/service-points/1', () =>
      HttpResponse.json(wrap(null)),
    ),
  );
}

function setupNotFoundHandlers() {
  server.use(
    http.get('/api/v1/service-points/999', () =>
      HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 }),
    ),
    http.get('/api/v1/service-points/metrics', () =>
      HttpResponse.json(wrap(null)),
    ),
  );
}

const ROUTE_PATH = '/channels/service-points/:id';

function renderPage(spOverride?: Partial<typeof mockServicePoint> | null, metricsOverride?: Partial<typeof mockMetrics> | null) {
  setupHandlers(spOverride, metricsOverride);
  return renderWithProviders(
    <Routes>
      <Route path={ROUTE_PATH} element={<ServicePointDetailPage />} />
    </Routes>,
    { route: '/channels/service-points/1' },
  );
}

function renderNotFoundPage() {
  setupNotFoundHandlers();
  return renderWithProviders(
    <Routes>
      <Route path={ROUTE_PATH} element={<ServicePointDetailPage />} />
    </Routes>,
    { route: '/channels/service-points/999' },
  );
}

describe('ServicePointDetailPage', () => {
  // ── 1. Renders service point name as page title ────────────────────────────

  it('renders service point name as page title', async () => {
    renderPage();

    await waitFor(() => {
      const els = screen.getAllByText('Lekki Branch');
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  // ── 2. Shows service point code, type badge, status badge ─────────────────

  it('shows service point code, type badge, and status badge', async () => {
    renderPage();

    await waitFor(() => {
      const codeEls = screen.getAllByText('SP-001');
      expect(codeEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    const branchEls = screen.getAllByText('BRANCH');
    expect(branchEls.length).toBeGreaterThanOrEqual(1);

    const onlineEls = screen.getAllByText(/ONLINE/i);
    expect(onlineEls.length).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Shows stat cards ───────────────────────────────────────────────────

  it('shows stat cards with correct values', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Max Capacity')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Avg Service Time')).toBeInTheDocument();
    expect(screen.getByText('Active Interactions')).toBeInTheDocument();
    expect(screen.getByText('Total Interactions')).toBeInTheDocument();
    const utilizationLabels = screen.getAllByText('Utilization');
    expect(utilizationLabels.length).toBeGreaterThanOrEqual(1);
    const avgSatisfactionLabels = screen.getAllByText('Avg Satisfaction');
    expect(avgSatisfactionLabels.length).toBeGreaterThanOrEqual(1);

    // StatCard with format="number" calls value.toLocaleString()
    const fiveEls = screen.getAllByText('5');
    expect(fiveEls.length).toBeGreaterThanOrEqual(1);
    const fifteenEls = screen.getAllByText('15');
    expect(fifteenEls.length).toBeGreaterThanOrEqual(1);
  });

  // ── 4. Shows service point properties grid ────────────────────────────────

  it('shows service point properties grid', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Service Point Properties')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Property labels
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Device ID')).toBeInTheDocument();
    expect(screen.getByText('Location ID')).toBeInTheDocument();
    expect(screen.getByText('Max Concurrent Customers')).toBeInTheDocument();
    expect(screen.getByText('Avg Service Time (min)')).toBeInTheDocument();
    expect(screen.getByText('Staff Required')).toBeInTheDocument();
    expect(screen.getByText('Accessible')).toBeInTheDocument();
    expect(screen.getByText('Assigned Staff')).toBeInTheDocument();

    // Property values
    expect(screen.getByText('DEV-001')).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();

    // staffRequired=true and isAccessible=true renders "Yes"
    const yesEls = screen.getAllByText('Yes');
    expect(yesEls.length).toBeGreaterThanOrEqual(2);
  });

  // ── 5. Shows performance metrics when available ───────────────────────────

  it('shows performance metrics when available', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Avg Duration: 900 seconds = 15m
    expect(screen.getByText('Avg Duration')).toBeInTheDocument();
    const durationEls = screen.getAllByText('15m');
    expect(durationEls.length).toBeGreaterThanOrEqual(1);

    // Satisfaction: 4.2/5
    expect(screen.getByText('Satisfaction')).toBeInTheDocument();
    const satisfactionEls = screen.getAllByText('4.2/5');
    expect(satisfactionEls.length).toBeGreaterThanOrEqual(1);

    // Utilization: 65.5%
    const utilizationLabel = screen.getAllByText('Utilization');
    expect(utilizationLabel.length).toBeGreaterThanOrEqual(1);
    const utilizationEls = screen.getAllByText('65.5%');
    expect(utilizationEls.length).toBeGreaterThanOrEqual(1);

    // Active Now: 3
    expect(screen.getByText('Active Now')).toBeInTheDocument();
  });

  // ── 6. Shows "Start Interaction" button (enabled when ONLINE) ─────────────

  it('shows Start Interaction button enabled when status is ONLINE', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Start Interaction')).toBeInTheDocument();
    }, { timeout: 3000 });

    const startBtn = screen.getByText('Start Interaction').closest('button');
    expect(startBtn).not.toBeDisabled();
  });

  it('disables Start Interaction button when status is OFFLINE', async () => {
    renderPage({ status: 'OFFLINE' });

    await waitFor(() => {
      expect(screen.getByText('Start Interaction')).toBeInTheDocument();
    }, { timeout: 3000 });

    const startBtn = screen.getByText('Start Interaction').closest('button');
    expect(startBtn).toBeDisabled();
  });

  // ── 7. Shows "End Interaction" button ─────────────────────────────────────

  it('shows End Interaction button', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('End Interaction')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 8. Shows "Edit" and "Delete" buttons for admin ────────────────────────

  it('shows Edit and Delete buttons for admin users', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  // ── 9. Shows "Service Point Not Found" when service point does not exist ──

  it('shows Service Point Not Found when service point does not exist', async () => {
    renderNotFoundPage();

    await waitFor(() => {
      expect(screen.getByText('Service Point Not Found')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('The requested service point does not exist.')).toBeInTheDocument();
    expect(screen.getByText('Back to Channels')).toBeInTheDocument();
  });

  // ── 10. Shows loading state initially ─────────────────────────────────────

  it('shows loading state initially', () => {
    setupHandlers();
    renderWithProviders(
      <Routes>
        <Route path={ROUTE_PATH} element={<ServicePointDetailPage />} />
      </Routes>,
      { route: '/channels/service-points/1' },
    );

    // The loading spinner has the animate-spin class on the Loader2 icon
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
