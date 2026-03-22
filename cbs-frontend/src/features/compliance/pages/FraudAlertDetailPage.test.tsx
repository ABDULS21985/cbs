import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { FraudAlertDetailPage } from './FraudAlertDetailPage';

const ALERT_ID = 15;

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAlert = {
  id: ALERT_ID,
  alertRef: 'FRD000000000015',
  customerId: 77,
  accountId: 200,
  transactionRef: 'TXN-ABCDE12345',
  riskScore: 87,
  maxScore: 100,
  triggeredRules: [
    { ruleCode: 'FRD-R001', ruleName: 'Geo Anomaly Detection', weight: 40 },
    { ruleCode: 'FRD-R002', ruleName: 'Velocity Check', weight: 35 },
  ],
  channel: 'ONLINE',
  deviceId: 'DEV-12345',
  ipAddress: '192.168.1.1',
  geoLocation: 'Lagos, NG',
  description: 'High-risk transaction pattern detected from unusual location',
  actionTaken: 'BLOCK_TRANSACTION',
  status: 'NEW',
  assignedTo: null,
  resolutionNotes: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date(Date.now() - 1800000).toISOString(),
};

const mockTransactions: unknown[] = [];

function setupHandlers(alertOverride?: Partial<typeof mockAlert>) {
  const alert = { ...mockAlert, ...alertOverride };
  server.use(
    http.get(`/api/v1/fraud/alerts/${ALERT_ID}`, () => HttpResponse.json(wrap(alert))),
    http.get(`/api/v1/fraud/alerts/${ALERT_ID}/transactions`, () =>
      HttpResponse.json(wrap(mockTransactions)),
    ),
    http.post(`/api/v1/fraud/alerts/${ALERT_ID}/block-card`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'INVESTIGATING' })),
    ),
    http.post(`/api/v1/fraud/alerts/${ALERT_ID}/block-account`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'INVESTIGATING' })),
    ),
    http.post(`/api/v1/fraud/alerts/${ALERT_ID}/allow`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'FALSE_POSITIVE' })),
    ),
    http.post(`/api/v1/fraud/alerts/${ALERT_ID}/dismiss`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'FALSE_POSITIVE' })),
    ),
    http.post(`/api/v1/fraud/alerts/${ALERT_ID}/file-case`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'INVESTIGATING' })),
    ),
    http.post(`/api/v1/fraud/alerts/${ALERT_ID}/assign`, () =>
      HttpResponse.json(wrap({ ...alert, assignedTo: 'analyst1', status: 'INVESTIGATING' })),
    ),
    http.post(`/api/v1/fraud/alerts/${ALERT_ID}/resolve`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'RESOLVED', resolvedBy: 'OFFICER' })),
    ),
  );
}

const ROUTE_PATH = '/compliance/fraud/alerts/:id';

function renderPage(alertOverride?: Partial<typeof mockAlert>) {
  setupHandlers(alertOverride);
  return renderWithProviders(
    <Routes>
      <Route path={ROUTE_PATH} element={<FraudAlertDetailPage />} />
    </Routes>,
    { route: `/compliance/fraud/alerts/${ALERT_ID}` },
  );
}

describe('FraudAlertDetailPage', () => {
  // ── 1. Loading and initial render ────────────────────────────────────────────

  it('renders the alert ref after loading', async () => {
    renderPage();

    await waitFor(() => {
      const els = screen.getAllByText('FRD000000000015');
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  it('renders the risk score', async () => {
    renderPage();

    await waitFor(() => {
      // 87 appears in the risk score gauge and possibly subtitle
      const els = screen.getAllByText('87');
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  it('renders triggered rules', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Geo Anomaly Detection')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Velocity Check')).toBeInTheDocument();
  });

  it('shows not-found state when alert fetch returns 404', async () => {
    server.use(
      http.get(`/api/v1/fraud/alerts/${ALERT_ID}`, () =>
        HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 }),
      ),
      http.get(`/api/v1/fraud/alerts/${ALERT_ID}/transactions`, () =>
        HttpResponse.json(wrap([])),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path={ROUTE_PATH} element={<FraudAlertDetailPage />} />
      </Routes>,
      { route: `/compliance/fraud/alerts/${ALERT_ID}` },
    );

    await waitFor(() => {
      expect(screen.getByText(/No fraud alert found/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 2. Action buttons ────────────────────────────────────────────────────────

  it('renders Block Card action button for active alerts', async () => {
    renderPage();

    await waitFor(() => {
      // Block Card button uses text content, not title attribute
      expect(screen.getByText('Block Card')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders Assign button for active alerts', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Assign')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 3. Block Card action ──────────────────────────────────────────────────────

  it('calls POST /fraud/alerts/:id/block-card when Block Card is clicked', async () => {
    let blockCardCalled = false;
    renderPage();

    // Register spy AFTER renderPage so it takes priority over setupHandlers' handler
    server.use(
      http.post(`/api/v1/fraud/alerts/${ALERT_ID}/block-card`, () => {
        blockCardCalled = true;
        return HttpResponse.json(wrap({ ...mockAlert, status: 'INVESTIGATING' }));
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Block Card')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click the action button (opens ConfirmDialog)
    fireEvent.click(screen.getByText('Block Card'));

    // ConfirmDialog opens with a confirm button labeled "Block Card"
    // Now there are 2 "Block Card" buttons: action button + dialog confirm button
    await waitFor(() => {
      const blockCardBtns = screen.getAllByRole('button', { name: /Block Card/i });
      expect(blockCardBtns.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 2000 });

    // The dialog confirm button is the last "Block Card" button (action btn + dialog confirm btn)
    const blockCardBtns = screen.getAllByRole('button', { name: /Block Card/i });
    fireEvent.click(blockCardBtns[blockCardBtns.length - 1]);

    await waitFor(() => {
      expect(blockCardCalled).toBe(true);
    }, { timeout: 3000 });
  });

  // ── 4. Dismiss action ────────────────────────────────────────────────────────

  it('opens dismiss dialog when Dismiss button is clicked', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Dismiss'));

    await waitFor(() => {
      expect(screen.getByText('Dismiss Alert')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  // ── 5. Transaction ref display ────────────────────────────────────────────────

  it('renders transaction reference', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('TXN-ABCDE12345')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 6. Channel and geo display ────────────────────────────────────────────────

  it('renders channel and geo location details', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ONLINE')).toBeInTheDocument();
    }, { timeout: 3000 });

    const geoEls = screen.getAllByText('Lagos, NG');
    expect(geoEls.length).toBeGreaterThanOrEqual(1);
  });

  // ── 7. Resolved state ────────────────────────────────────────────────────────

  it('shows RESOLVED status badge for resolved alerts', async () => {
    renderPage({ status: 'RESOLVED', resolvedBy: 'analyst1', resolvedAt: new Date().toISOString() });

    await waitFor(() => {
      const alertRefs = screen.getAllByText('FRD000000000015');
      expect(alertRefs.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    const resolvedEls = screen.getAllByText('RESOLVED');
    expect(resolvedEls.length).toBeGreaterThanOrEqual(1);
  });
});
