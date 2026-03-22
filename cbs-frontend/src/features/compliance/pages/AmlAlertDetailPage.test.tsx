import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { AmlAlertDetailPage } from './AmlAlertDetailPage';

const ALERT_ID = 7;

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAlert = {
  id: ALERT_ID,
  alertRef: 'AML000000000007',
  ruleId: 1,
  ruleName: 'Structuring Detection',
  ruleCategory: 'STRUCTURING',
  customerId: 42,
  customerName: 'Ngozi Adeyemi',
  accountId: 101,
  alertType: 'STRUCTURING',
  severity: 'HIGH',
  description: 'Multiple transactions just below reporting threshold detected over 3 days',
  triggerAmount: 28500,
  triggerCount: 5,
  triggerPeriod: '72h',
  triggerTransactions: ['TXN001', 'TXN002'],
  status: 'NEW',
  assignedTo: null,
  priority: 'HIGH',
  resolutionNotes: null,
  resolvedBy: null,
  resolvedAt: null,
  sarReference: null,
  sarFiledDate: null,
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date(Date.now() - 1800000).toISOString(),
};

const mockCustomerAlerts = [
  {
    id: 5,
    alertRef: 'AML000000000005',
    severity: 'MEDIUM',
    status: 'CLOSED',
    ruleCategory: 'VELOCITY',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 28).toISOString(),
  },
];

function setupHandlers(alertOverride?: Partial<typeof mockAlert>) {
  const alert = { ...mockAlert, ...alertOverride };
  server.use(
    http.get(`/api/v1/aml/alerts/${ALERT_ID}`, () => HttpResponse.json(wrap(alert))),
    http.get(`/api/v1/aml/alerts/customer/${mockAlert.customerId}`, () =>
      HttpResponse.json(wrap(mockCustomerAlerts)),
    ),
    http.post(`/api/v1/aml/alerts/${ALERT_ID}/assign`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'UNDER_REVIEW', assignedTo: 'analyst1' })),
    ),
    http.post(`/api/v1/aml/alerts/${ALERT_ID}/escalate`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'ESCALATED' })),
    ),
    http.post(`/api/v1/aml/alerts/${ALERT_ID}/resolve`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'CLOSED', resolvedBy: 'ADMIN' })),
    ),
    http.post(`/api/v1/aml/alerts/${ALERT_ID}/file-sar`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'SAR_FILED', sarReference: 'SAR-2026-001' })),
    ),
    http.post(`/api/v1/aml/alerts/${ALERT_ID}/dismiss`, () =>
      HttpResponse.json(wrap({ ...alert, status: 'FALSE_POSITIVE' })),
    ),
  );
}

const ROUTE_PATH = '/compliance/aml/alerts/:id';

function renderPage(alertOverride?: Partial<typeof mockAlert>) {
  setupHandlers(alertOverride);
  return renderWithProviders(
    <Routes>
      <Route path={ROUTE_PATH} element={<AmlAlertDetailPage />} />
    </Routes>,
    { route: `/compliance/aml/alerts/${ALERT_ID}` },
  );
}

describe('AmlAlertDetailPage', () => {
  // ── 1. Loading and initial render ────────────────────────────────────────────

  it('renders the alert ref in the page header after loading', async () => {
    renderPage();

    await waitFor(() => {
      const els = screen.getAllByText('AML000000000007');
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  it('renders alert details fields', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alert Details')).toBeInTheDocument();
    }, { timeout: 3000 });

    const customerNameEls = screen.getAllByText('Ngozi Adeyemi');
    expect(customerNameEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Structuring Detection')).toBeInTheDocument();
    const highEls = screen.getAllByText('HIGH');
    expect(highEls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows not-found state when alert fetch returns 404', async () => {
    server.use(
      http.get(`/api/v1/aml/alerts/${ALERT_ID}`, () =>
        HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 }),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path={ROUTE_PATH} element={<AmlAlertDetailPage />} />
      </Routes>,
      { route: `/compliance/aml/alerts/${ALERT_ID}` },
    );

    await waitFor(() => {
      expect(screen.getByText(/AML alert not found/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 2. Action buttons render ─────────────────────────────────────────────────

  it('renders Assign to Me, Escalate, and Dismiss buttons for NEW alerts', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Assign to Me')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Escalate')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('renders Resolve and File SAR buttons for UNDER_REVIEW alerts', async () => {
    renderPage({ status: 'UNDER_REVIEW', assignedTo: 'analyst1' });

    await waitFor(() => {
      expect(screen.getByText('Resolve')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('File SAR')).toBeInTheDocument();
  });

  it('does not render action buttons for CLOSED (terminal) alerts', async () => {
    renderPage({ status: 'CLOSED', resolvedBy: 'ADMIN', resolvedAt: new Date().toISOString() });

    await waitFor(() => {
      const alertRefs = screen.getAllByText('AML000000000007');
      expect(alertRefs.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    expect(screen.queryByText('Escalate')).not.toBeInTheDocument();
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
  });

  // ── 3. Action: Assign to Me ──────────────────────────────────────────────────

  it('calls POST /alerts/:id/assign when clicking Assign to Me', async () => {
    let assignCalled = false;
    renderPage();

    // Register spy AFTER renderPage so it takes priority over setupHandlers' handler
    server.use(
      http.post(`/api/v1/aml/alerts/${ALERT_ID}/assign`, () => {
        assignCalled = true;
        return HttpResponse.json(wrap({ ...mockAlert, status: 'UNDER_REVIEW', assignedTo: 'ADMIN' }));
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Assign to Me')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Assign to Me'));

    await waitFor(() => {
      expect(assignCalled).toBe(true);
    }, { timeout: 3000 });
  });

  // ── 4. Action: Escalate ──────────────────────────────────────────────────────

  it('calls POST /alerts/:id/escalate when clicking Escalate', async () => {
    let escalateCalled = false;
    renderPage();

    server.use(
      http.post(`/api/v1/aml/alerts/${ALERT_ID}/escalate`, () => {
        escalateCalled = true;
        return HttpResponse.json(wrap({ ...mockAlert, status: 'ESCALATED' }));
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Escalate')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Escalate'));

    await waitFor(() => {
      expect(escalateCalled).toBe(true);
    }, { timeout: 3000 });
  });

  // ── 5. Action: Dismiss ───────────────────────────────────────────────────────

  it('calls POST /alerts/:id/dismiss when clicking Dismiss', async () => {
    let dismissCalled = false;
    renderPage();

    server.use(
      http.post(`/api/v1/aml/alerts/${ALERT_ID}/dismiss`, () => {
        dismissCalled = true;
        return HttpResponse.json(wrap({ ...mockAlert, status: 'FALSE_POSITIVE' }));
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Dismiss'));

    await waitFor(() => {
      expect(dismissCalled).toBe(true);
    }, { timeout: 3000 });
  });

  // ── 6. SAR filing dialog ─────────────────────────────────────────────────────

  it('opens File SAR dialog when clicking File SAR on UNDER_REVIEW alert', async () => {
    renderPage({ status: 'UNDER_REVIEW', assignedTo: 'analyst1' });

    await waitFor(() => {
      expect(screen.getByText('File SAR')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('File SAR'));

    // Dialog has an input for SAR reference
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/SAR Reference/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  // ── 7. Severity badge render ─────────────────────────────────────────────────

  it('renders severity badge in the page header actions', async () => {
    renderPage();

    await waitFor(() => {
      const highEls = screen.getAllByText('HIGH');
      expect(highEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  // ── 8. SAR reference display ─────────────────────────────────────────────────

  it('shows SAR reference when alert has sarReference', async () => {
    renderPage({ status: 'SAR_FILED', sarReference: 'SAR-2026-007', sarFiledDate: '2026-03-20' });

    await waitFor(() => {
      expect(screen.getByText('SAR-2026-007')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
