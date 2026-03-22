import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { AmlDashboardPage } from './AmlDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockDashboard = {
  newAlerts: 23,
  underReview: 14,
  escalated: 7,
  sarFiled: 3,
};

const mockStats = {
  totalAlerts: 120,
  byStatus: {
    NEW: 23,
    UNDER_REVIEW: 14,
    ESCALATED: 7,
    SAR_FILED: 3,
    FALSE_POSITIVE: 11,
    CLOSED: 62,
  },
};

const mockAlerts = [
  {
    id: 1,
    alertRef: 'AML-2026-0001',
    severity: 'CRITICAL',
    customerName: 'John Doe',
    ruleName: 'Structuring Detection',
    ruleCategory: 'STRUCTURING',
    triggerAmount: 150000,
    assignedTo: 'analyst1',
    status: 'NEW',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    alertRef: 'AML-2026-0002',
    severity: 'HIGH',
    customerName: 'Jane Smith',
    ruleName: 'Large Cash Transaction',
    ruleCategory: 'LARGE_CASH',
    triggerAmount: 80000,
    assignedTo: null,
    status: 'UNDER_REVIEW',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 3,
    alertRef: 'AML-2026-0003',
    severity: 'MEDIUM',
    customerName: 'Bob Wilson',
    ruleName: 'Velocity Check',
    ruleCategory: 'VELOCITY',
    triggerAmount: 45000,
    assignedTo: 'analyst2',
    status: 'ESCALATED',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const mockRules = [
  {
    id: 1,
    ruleCode: 'AML-R001',
    ruleName: 'Structuring Detection',
    ruleCategory: 'STRUCTURING',
    severity: 'CRITICAL',
    thresholdAmount: 10000,
    thresholdCount: 5,
    thresholdPeriodHours: 24,
    isActive: true,
  },
  {
    id: 2,
    ruleCode: 'AML-R002',
    ruleName: 'Large Cash Transaction',
    ruleCategory: 'LARGE_CASH',
    severity: 'HIGH',
    thresholdAmount: 50000,
    thresholdCount: 1,
    thresholdPeriodHours: 1,
    isActive: true,
  },
];

const mockStrs = [
  {
    strNumber: 'STR-2026-001',
    customerName: 'John Doe',
    suspiciousActivity: 'Multiple structuring transactions',
    amount: 150000,
    reportingOfficer: 'Officer A',
    status: 'FILED',
  },
];

const mockCtrs = [
  {
    reportDate: '2026-03-20',
    customerName: 'Jane Smith',
    totalAmount: 120000,
    currency: 'NGN',
    transactionCount: 3,
    status: 'SUBMITTED',
  },
];

function setupHandlers(overrides?: {
  dashboard?: unknown;
  stats?: unknown;
  alerts?: unknown;
  rules?: unknown;
  strs?: unknown;
  ctrs?: unknown;
}) {
  server.use(
    http.get('/api/v1/aml/dashboard', () => HttpResponse.json(wrap(overrides?.dashboard ?? mockDashboard))),
    http.get('/api/v1/aml/stats', () => HttpResponse.json(wrap(overrides?.stats ?? mockStats))),
    http.get('/api/v1/aml/alerts', () => HttpResponse.json(wrap(overrides?.alerts ?? mockAlerts))),
    http.get('/api/v1/aml/rules', () => HttpResponse.json(wrap(overrides?.rules ?? mockRules))),
    http.get('/api/v1/aml/strs', () => HttpResponse.json(wrap(overrides?.strs ?? mockStrs))),
    http.get('/api/v1/aml/ctrs', () => HttpResponse.json(wrap(overrides?.ctrs ?? mockCtrs))),
  );
}

describe('AmlDashboardPage', () => {
  // ── 1. Page header renders ──────────────────────────────────────────────────

  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    expect(screen.getByText('AML/CFT Monitoring')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    expect(screen.getByText('Anti-Money Laundering command center')).toBeInTheDocument();
  });

  // ── 2. Stat cards render with correct values ──────────────────────────────

  it('renders 4 stat cards', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('New Alerts')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Under Review')).toBeInTheDocument();
    // "Escalated" appears in both stat card and pipeline stage
    const escalatedEls = screen.getAllByText('Escalated');
    expect(escalatedEls.length).toBeGreaterThanOrEqual(1);
    // "SAR Filed" may appear in both stat card and pipeline stage
    const sarFiledEls = screen.getAllByText('SAR Filed');
    expect(sarFiledEls.length).toBeGreaterThanOrEqual(1);
  });

  it('displays stat card values from the dashboard API', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      // Values may appear in both stat cards and pipeline stages
      const twentyThrees = screen.getAllByText('23');
      expect(twentyThrees.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
    const fourteens = screen.getAllByText('14');
    expect(fourteens.length).toBeGreaterThanOrEqual(1);
    const sevens = screen.getAllByText('7');
    expect(sevens.length).toBeGreaterThanOrEqual(1);
    const threes = screen.getAllByText('3');
    expect(threes.length).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Tab navigation works ───────────────────────────────────────────────

  it('renders all 5 tabs', () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Rules')).toBeInTheDocument();
    expect(screen.getByText('STR/SAR Filing')).toBeInTheDocument();
    expect(screen.getByText('CTR')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('can switch to Rules tab', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('Rules'));
    await waitFor(() => {
      expect(screen.getByText('Rule Name')).toBeInTheDocument();
    });
  });

  it('can switch to STR/SAR Filing tab', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('STR/SAR Filing'));
    await waitFor(() => {
      expect(screen.getByText('STR Ref')).toBeInTheDocument();
    });
  });

  it('can switch to CTR tab', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('CTR'));
    await waitFor(() => {
      expect(screen.getByText('Txn Count')).toBeInTheDocument();
    });
  });

  // ── 4. Alert table renders ────────────────────────────────────────────────

  it('renders alert table with data', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('AML-2026-0001')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('AML-2026-0002')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders alert table column headers', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Alert Ref')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Rule')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders severity badges for alerts', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  // ── 5. Rule management tab renders ────────────────────────────────────────

  it('renders rules table with rule data', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('Rules'));
    await waitFor(() => {
      expect(screen.getByText('AML-R001')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Structuring Detection')).toBeInTheDocument();
    expect(screen.getByText('AML-R002')).toBeInTheDocument();
    expect(screen.getByText('Large Cash Transaction')).toBeInTheDocument();
  });

  it('renders rule table headers', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('Rules'));
    await waitFor(() => {
      expect(screen.getByText('Code')).toBeInTheDocument();
    });
    expect(screen.getByText('Rule Name')).toBeInTheDocument();
    expect(screen.getByText('Threshold')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  // ── 6. Create rule dialog opens ───────────────────────────────────────────

  it('opens create rule dialog when clicking Create Rule button', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('Create Rule'));
    await waitFor(() => {
      expect(screen.getByText('Create AML Rule')).toBeInTheDocument();
    });
    expect(screen.getByText('Rule Name *')).toBeInTheDocument();
    expect(screen.getByText('Category *')).toBeInTheDocument();
  });

  it('closes create rule dialog when clicking Cancel', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('Create Rule'));
    await waitFor(() => {
      expect(screen.getByText('Create AML Rule')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Create AML Rule')).not.toBeInTheDocument();
    });
  });

  // ── 7. File STR dialog opens ──────────────────────────────────────────────

  it('opens File STR dialog when clicking File STR button', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('File STR'));
    await waitFor(() => {
      expect(screen.getByText('File Suspicious Transaction Report')).toBeInTheDocument();
    });
    expect(screen.getByText('Customer ID *')).toBeInTheDocument();
  });

  it('closes File STR dialog when clicking Cancel', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('File STR'));
    await waitFor(() => {
      expect(screen.getByText('File Suspicious Transaction Report')).toBeInTheDocument();
    });
    // There are two Cancel buttons visible but the STR dialog's cancel is the last one
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByText('File Suspicious Transaction Report')).not.toBeInTheDocument();
    });
  });

  // ── 8. Alert action buttons are present ───────────────────────────────────

  it('renders Create Rule and File STR action buttons in the header', () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    expect(screen.getByText('Create Rule')).toBeInTheDocument();
    expect(screen.getByText('File STR')).toBeInTheDocument();
  });

  it('renders status filter buttons on Alerts tab', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });
    expect(screen.getByText('NEW')).toBeInTheDocument();
    expect(screen.getByText('UNDER REVIEW')).toBeInTheDocument();
    expect(screen.getByText('ESCALATED')).toBeInTheDocument();
    expect(screen.getByText('SAR FILED')).toBeInTheDocument();
    expect(screen.getByText('FALSE POSITIVE')).toBeInTheDocument();
    expect(screen.getByText('CLOSED')).toBeInTheDocument();
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
  });

  // ── 9. Error handling for API failures ────────────────────────────────────

  it('displays error banner when dashboard API fails', async () => {
    server.use(
      http.get('/api/v1/aml/dashboard', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/stats', () => HttpResponse.json(wrap(mockStats))),
      http.get('/api/v1/aml/alerts', () => HttpResponse.json(wrap(mockAlerts))),
      http.get('/api/v1/aml/rules', () => HttpResponse.json(wrap(mockRules))),
      http.get('/api/v1/aml/strs', () => HttpResponse.json(wrap(mockStrs))),
      http.get('/api/v1/aml/ctrs', () => HttpResponse.json(wrap(mockCtrs))),
    );
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/One or more AML datasets could not be loaded/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays error banner when alerts API fails', async () => {
    server.use(
      http.get('/api/v1/aml/dashboard', () => HttpResponse.json(wrap(mockDashboard))),
      http.get('/api/v1/aml/stats', () => HttpResponse.json(wrap(mockStats))),
      http.get('/api/v1/aml/alerts', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/rules', () => HttpResponse.json(wrap(mockRules))),
      http.get('/api/v1/aml/strs', () => HttpResponse.json(wrap(mockStrs))),
      http.get('/api/v1/aml/ctrs', () => HttpResponse.json(wrap(mockCtrs))),
    );
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/One or more AML datasets could not be loaded/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('still renders header when APIs fail', () => {
    server.use(
      http.get('/api/v1/aml/dashboard', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/alerts', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/rules', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/strs', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/ctrs', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<AmlDashboardPage />);
    expect(screen.getByText('AML/CFT Monitoring')).toBeInTheDocument();
  });

  // ── 10. Empty state handling ──────────────────────────────────────────────

  it('shows empty state when no alerts exist', async () => {
    setupHandlers({ alerts: [] });
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('No alerts found')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows empty state when no STRs exist', async () => {
    setupHandlers({ strs: [] });
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('STR/SAR Filing'));
    await waitFor(() => {
      expect(screen.getByText('No STRs filed')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows empty state when no CTRs exist', async () => {
    setupHandlers({ ctrs: [] });
    renderWithProviders(<AmlDashboardPage />);
    fireEvent.click(screen.getByText('CTR'));
    await waitFor(() => {
      expect(screen.getByText('No CTRs')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 11. Additional tests ──────────────────────────────────────────────────

  it('renders critical alert banner when critical NEW alerts exist', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/CRITICAL AML alert/)).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText(/Regulatory obligation/)).toBeInTheDocument();
    expect(screen.getByText('View Now')).toBeInTheDocument();
  });

  it('does not render critical alert banner when no critical alerts', async () => {
    const nonCriticalAlerts = mockAlerts.map(a => ({ ...a, severity: 'LOW', status: 'CLOSED' }));
    setupHandlers({ alerts: nonCriticalAlerts });
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('AML-2026-0001')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.queryByText(/CRITICAL AML alert/)).not.toBeInTheDocument();
  });

  it('renders alert pipeline stage buttons', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('False +ve')).toBeInTheDocument();
  });

  it('renders unassigned label for alerts without an assignee', async () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('does not show stat cards when dashboard data is still loading', () => {
    server.use(
      http.get('/api/v1/aml/dashboard', () => new Promise(() => {})),
      http.get('/api/v1/aml/stats', () => HttpResponse.json(wrap(mockStats))),
      http.get('/api/v1/aml/alerts', () => HttpResponse.json(wrap(mockAlerts))),
      http.get('/api/v1/aml/rules', () => HttpResponse.json(wrap(mockRules))),
      http.get('/api/v1/aml/strs', () => HttpResponse.json(wrap(mockStrs))),
      http.get('/api/v1/aml/ctrs', () => HttpResponse.json(wrap(mockCtrs))),
    );
    renderWithProviders(<AmlDashboardPage />);
    expect(screen.queryByText('23')).not.toBeInTheDocument();
  });

  it('renders tabs as buttons', () => {
    setupHandlers();
    renderWithProviders(<AmlDashboardPage />);
    const alertsTab = screen.getByText('Alerts');
    expect(alertsTab.tagName).toBe('BUTTON');
  });
});
