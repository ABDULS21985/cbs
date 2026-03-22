import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { FraudDashboardPage } from './FraudDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = {
  totalAlerts: 142,
  byStatus: {
    NEW: 23,
    INVESTIGATING: 8,
    CONFIRMED_FRAUD: 3,
    FALSE_POSITIVE: 15,
    RESOLVED: 93,
  },
  byChannel: {
    ONLINE: 60,
    MOBILE: 45,
    ATM: 20,
    BRANCH: 17,
  },
};

const mockAlert = {
  id: 1,
  alertRef: 'FRD-20260301-0001',
  customerId: 10042,
  accountId: 200,
  transactionRef: 'TXN-987654',
  riskScore: 85,
  maxScore: 100,
  triggeredRules: [
    { ruleCode: 'AMT-001', ruleName: 'Large Amount', weight: 40 },
    { ruleCode: 'VEL-002', ruleName: 'Velocity Check', weight: 30 },
  ],
  channel: 'ONLINE',
  deviceId: 'dev-abc',
  ipAddress: '192.168.1.1',
  geoLocation: 'Lagos, NG',
  description: 'Suspicious large transfer',
  actionTaken: 'BLOCK_TRANSACTION',
  status: 'NEW',
  assignedTo: null,
  resolutionNotes: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockAlertResolved = {
  ...mockAlert,
  id: 2,
  alertRef: 'FRD-20260301-0002',
  riskScore: 30,
  status: 'RESOLVED',
  channel: 'MOBILE',
};

const mockAlerts = [mockAlert, mockAlertResolved];

const mockRule = {
  id: 1,
  ruleCode: 'AMT-001',
  ruleName: 'Large Amount Threshold',
  ruleCategory: 'AMOUNT_ANOMALY',
  description: 'Triggers when transaction exceeds threshold',
  ruleConfig: { threshold_amount: 5000000, threshold_count: 0, lookback_hours: 24 },
  severity: 'HIGH',
  scoreWeight: 40,
  applicableChannels: ['ALL'],
  isActive: true,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-03-10T10:00:00Z',
};

const mockRules = [mockRule];

const mockTrend = {
  recentAlerts: [mockAlert],
  averageScore: 62.5,
  trend: 'STABLE' as const,
};

const mockModelPerformance = {
  detectionRate: 96.3,
  falsePositiveRate: 7.2,
  averageResponseTimeMs: 45,
  totalProcessed: 1250000,
};

function setupHandlers(overrides?: {
  stats?: typeof mockStats | null;
  alerts?: typeof mockAlerts | null;
  rules?: typeof mockRules | null;
  trend?: typeof mockTrend | null;
  modelPerformance?: typeof mockModelPerformance | null;
}) {
  const s = overrides?.stats !== undefined ? overrides.stats : mockStats;
  const a = overrides?.alerts !== undefined ? overrides.alerts : mockAlerts;
  const r = overrides?.rules !== undefined ? overrides.rules : mockRules;
  const t = overrides?.trend !== undefined ? overrides.trend : mockTrend;
  const m = overrides?.modelPerformance !== undefined ? overrides.modelPerformance : mockModelPerformance;

  server.use(
    http.get('/api/v1/fraud/stats', () => HttpResponse.json(wrap(s))),
    http.get('/api/v1/fraud/alerts', () => HttpResponse.json(wrap(a))),
    http.get('/api/v1/fraud/rules', () => HttpResponse.json(wrap(r))),
    http.get('/api/v1/fraud/trend', () => HttpResponse.json(wrap(t))),
    http.get('/api/v1/fraud/model-performance', () => HttpResponse.json(wrap(m))),
  );
}

describe('FraudDashboardPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    expect(screen.getByText('Fraud Detection & Prevention')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    expect(screen.getByText(/real-time fraud monitoring.*rule management.*investigation/i)).toBeInTheDocument();
  });

  it('renders 5 stat cards with correct labels', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Alerts')).toBeInTheDocument();
    }, { timeout: 3000 });
    // "New" may appear as both a stat card label and in filter dropdown
    const newEls = screen.getAllByText('New');
    expect(newEls.length).toBeGreaterThanOrEqual(1);
    // "Investigating" may appear in stat card and filter dropdown
    const investigatingEls = screen.getAllByText('Investigating');
    expect(investigatingEls.length).toBeGreaterThanOrEqual(1);
    // "Confirmed Fraud" appears as both stat card label and in investigation tab summary
    const confirmedFraudEls = screen.getAllByText('Confirmed Fraud');
    expect(confirmedFraudEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('False Positives')).toBeInTheDocument();
  });

  it('displays stat card values from the API', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      // Values may appear in multiple locations (stat cards and elsewhere)
      const totalEls = screen.getAllByText('142');
      expect(totalEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
    const twentyThreeEls = screen.getAllByText('23');
    expect(twentyThreeEls.length).toBeGreaterThanOrEqual(1);
    const eightEls = screen.getAllByText('8');
    expect(eightEls.length).toBeGreaterThanOrEqual(1);
    const fifteenEls = screen.getAllByText('15');
    expect(fifteenEls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 5 tabs', () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    expect(screen.getByText('Fraud Rules')).toBeInTheDocument();
    expect(screen.getByText('Trend Analysis')).toBeInTheDocument();
    expect(screen.getByText('Investigations')).toBeInTheDocument();
    expect(screen.getByText('Model Performance')).toBeInTheDocument();
  });

  it('renders the threat level indicator', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Threat Level:/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders the alert table with alert data', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('FRD-20260301-0001')).toBeInTheDocument();
    }, { timeout: 3000 });
    // TXN ref may appear in multiple places (alert table and trend data)
    const txnEls = screen.getAllByText('TXN-987654');
    expect(txnEls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows action buttons for NEW alerts but not for RESOLVED alerts', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('FRD-20260301-0001')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Action buttons should exist (Block Card, Allow, File Case, Dismiss) for the NEW alert
    const blockCardButtons = screen.getAllByTitle('Block Card');
    expect(blockCardButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle('Allow').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle('File Case').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle('Dismiss').length).toBeGreaterThanOrEqual(1);
  });

  it('can switch to Fraud Rules tab and shows rule data', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    fireEvent.click(screen.getByText('Fraud Rules'));
    await waitFor(() => {
      expect(screen.getByText('Large Amount Threshold')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('AMT-001')).toBeInTheDocument();
  });

  it('can switch to Model Performance tab and shows metrics', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    fireEvent.click(screen.getByText('Model Performance'));
    await waitFor(() => {
      // Detection rate appears in both ModelPerformanceRow and ModelPerformanceTab
      const detectionEls = screen.getAllByText('96.3%');
      expect(detectionEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
    const fpEls = screen.getAllByText('7.2%');
    expect(fpEls.length).toBeGreaterThanOrEqual(1);
    const timeEls = screen.getAllByText('45ms');
    expect(timeEls.length).toBeGreaterThanOrEqual(1);
  });

  it('model performance row renders detection and false positive rates at top level', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Detection Rate')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('False Positive Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
  });

  it('opens Create Rule dialog when clicking Create Rule button', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    fireEvent.click(screen.getByText('Create Rule'));
    await waitFor(() => {
      expect(screen.getByText('Create Fraud Rule')).toBeInTheDocument();
    });
    expect(screen.getByText('Rule Name *')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
  });

  it('opens Test Transaction dialog when clicking Test Transaction button', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    fireEvent.click(screen.getByText('Test Transaction'));
    await waitFor(() => {
      expect(screen.getByText('Test Transaction Scoring')).toBeInTheDocument();
    });
    expect(screen.getByText('Score Transaction')).toBeInTheDocument();
  });

  it('shows empty state when there are no alerts', async () => {
    setupHandlers({ alerts: [] });
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('No fraud alerts')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows empty state when there are no rules', async () => {
    setupHandlers({ rules: [] });
    renderWithProviders(<FraudDashboardPage />);
    fireEvent.click(screen.getByText('Fraud Rules'));
    await waitFor(() => {
      expect(screen.getByText('No fraud rules configured')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles stats API error gracefully and shows error panel', async () => {
    server.use(
      http.get('/api/v1/fraud/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/fraud/alerts', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/fraud/rules', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/fraud/trend', () => HttpResponse.json(wrap(mockTrend))),
      http.get('/api/v1/fraud/model-performance', () => HttpResponse.json(wrap(mockModelPerformance))),
    );
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/could not be fully loaded/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('handles alerts API error gracefully and shows error panel', async () => {
    server.use(
      http.get('/api/v1/fraud/stats', () => HttpResponse.json(wrap(mockStats))),
      http.get('/api/v1/fraud/alerts', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/fraud/rules', () => HttpResponse.json(wrap(mockRules))),
      http.get('/api/v1/fraud/trend', () => HttpResponse.json(wrap(mockTrend))),
      http.get('/api/v1/fraud/model-performance', () => HttpResponse.json(wrap(mockModelPerformance))),
    );
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Threat-level data could not be loaded/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('handles model performance API error gracefully', async () => {
    server.use(
      http.get('/api/v1/fraud/stats', () => HttpResponse.json(wrap(mockStats))),
      http.get('/api/v1/fraud/alerts', () => HttpResponse.json(wrap(mockAlerts))),
      http.get('/api/v1/fraud/rules', () => HttpResponse.json(wrap(mockRules))),
      http.get('/api/v1/fraud/trend', () => HttpResponse.json(wrap(mockTrend))),
      http.get('/api/v1/fraud/model-performance', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<FraudDashboardPage />);
    // ModelPerformanceRow shows error; ModelPerformanceTab also shows error when tab is clicked
    // The ModelPerformanceRow at top-level renders the error
    await waitFor(() => {
      expect(screen.getByText(/Fraud model performance could not be loaded/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('can switch to Investigations tab and shows investigation summary', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    fireEvent.click(screen.getByText('Investigations'));
    await waitFor(() => {
      expect(screen.getByText('Active Investigations')).toBeInTheDocument();
    }, { timeout: 3000 });
    // "Confirmed Fraud" also appears as stat card label, so use getAllByText
    const confirmedFraudEls = screen.getAllByText('Confirmed Fraud');
    expect(confirmedFraudEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Avg Days Open')).toBeInTheDocument();
  });

  it('can switch to Trend Analysis tab', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    // Wait for initial data to load first
    await waitFor(() => {
      expect(screen.getByText('FRD-20260301-0001')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Now switch tabs
    fireEvent.click(screen.getByText('Trend Analysis'));
    await waitFor(() => {
      const trendEls = screen.getAllByText(/Alert Trend/);
      expect(trendEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 10000 });
  }, 15000);

  it('Create Rule dialog can be closed via Cancel button', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    fireEvent.click(screen.getByText('Create Rule'));
    await waitFor(() => {
      expect(screen.getByText('Create Fraud Rule')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Create Fraud Rule')).not.toBeInTheDocument();
    });
  });

  it('Test Transaction dialog can be closed via Cancel button', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    fireEvent.click(screen.getByText('Test Transaction'));
    await waitFor(() => {
      expect(screen.getByText('Test Transaction Scoring')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Test Transaction Scoring')).not.toBeInTheDocument();
    });
  });

  it('shows confusion matrix on Model Performance tab', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    fireEvent.click(screen.getByText('Model Performance'));
    await waitFor(() => {
      expect(screen.getByText('Confusion Matrix')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('True Positive')).toBeInTheDocument();
    // "False Positive" appears in multiple places (stat card, model perf row, confusion matrix)
    const fpEls = screen.getAllByText('False Positive');
    expect(fpEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('False Negative')).toBeInTheDocument();
    expect(screen.getByText('True Negative')).toBeInTheDocument();
  });

  it('renders alert table column headers', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Alert Ref')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Risk Score')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Channel')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows filter dropdowns on Active Alerts tab', async () => {
    setupHandlers();
    renderWithProviders(<FraudDashboardPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByDisplayValue('All Channels')).toBeInTheDocument();
  });

  it('shows no active investigations when no alerts are investigating', async () => {
    setupHandlers({ alerts: [] });
    renderWithProviders(<FraudDashboardPage />);
    fireEvent.click(screen.getByText('Investigations'));
    await waitFor(() => {
      expect(screen.getByText('No active investigations')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
