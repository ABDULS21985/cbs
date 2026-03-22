import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { NostroPositionsPage } from '../pages/NostroPositionsPage';
import { CorrespondentBankPage } from '../pages/CorrespondentBankPage';
import { BreakManagementPage } from '../pages/BreakManagementPage';
import { ReconciliationReportsPage } from '../pages/ReconciliationReportsPage';
import { ReconciliationDashboardPage } from '../pages/ReconciliationDashboardPage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_POSITIONS = {
  data: [
    {
      id: 1, accountId: 10, accountNumber: '1000000010',
      correspondentBankId: 1, correspondentBankName: 'JPMorgan Chase',
      correspondentSwiftBic: 'CHASUS33', positionType: 'NOSTRO',
      currencyCode: 'USD', bookBalance: 5000000, statementBalance: 4999500,
      unreconciledAmount: 500, lastStatementDate: '2026-03-20',
      lastReconciledDate: '2026-03-19', reconciliationStatus: 'DISCREPANCY',
      outstandingItemsCount: 3, creditLimit: null, debitLimit: null,
      isActive: true, createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 2, accountId: 11, accountNumber: '1000000011',
      correspondentBankId: 2, correspondentBankName: 'Citibank',
      correspondentSwiftBic: 'CITIUS33', positionType: 'NOSTRO',
      currencyCode: 'EUR', bookBalance: 2000000, statementBalance: 2000000,
      unreconciledAmount: 0, lastStatementDate: '2026-03-21',
      lastReconciledDate: '2026-03-21', reconciliationStatus: 'RECONCILED',
      outstandingItemsCount: 0, creditLimit: null, debitLimit: null,
      isActive: true, createdAt: '2026-01-01T00:00:00Z',
    },
  ],
};

const MOCK_BANKS = {
  data: [
    {
      id: 1, bankCode: 'JPMC-US', bankName: 'JPMorgan Chase',
      swiftBic: 'CHASUS33', country: 'USA', city: 'New York',
      relationshipType: 'NOSTRO', isActive: true,
      contactName: 'John Smith', contactEmail: 'john@jpmc.com',
      contactPhone: '+1 212 555 0100', metadata: {},
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 2, bankCode: 'CITI-US', bankName: 'Citibank',
      swiftBic: 'CITIUS33', country: 'USA', city: 'New York',
      relationshipType: 'BOTH', isActive: true,
      contactName: 'Jane Doe', contactEmail: 'jane@citi.com',
      contactPhone: '', metadata: {},
      createdAt: '2026-02-01T00:00:00Z',
    },
  ],
};

const MOCK_BREAKS = {
  data: [
    {
      id: '1', positionId: 1, reconItemId: 200,
      accountNumber: '1000000010', bankName: 'JPMorgan Chase',
      currency: 'USD', amount: 500, direction: 'D',
      detectedDate: '2026-03-18', agingDays: 4,
      assignedTo: 'treasury_ops', status: 'OPEN',
      escalationLevel: 'OFFICER', slaDeadline: '2026-03-20T12:00:00Z',
      resolutionType: null, resolutionNotes: null,
      resolvedDate: null, resolvedBy: null,
      createdAt: '2026-03-18T09:00:00Z',
    },
    {
      id: '2', positionId: 1, reconItemId: 201,
      accountNumber: '1000000010', bankName: 'JPMorgan Chase',
      currency: 'USD', amount: 1200, direction: 'C',
      detectedDate: '2026-03-10', agingDays: 12,
      assignedTo: 'recon_team', status: 'ESCALATED',
      escalationLevel: 'TEAM_LEAD', slaDeadline: '2026-03-15T12:00:00Z',
      resolutionType: null, resolutionNotes: null,
      resolvedDate: null, resolvedBy: null,
      createdAt: '2026-03-10T09:00:00Z',
    },
  ],
};

const MOCK_COMPLIANCE = {
  data: [
    { id: 'CBN-RECON-001', requirement: 'Daily Nostro Reconciliation', description: 'All nostro accounts must be reconciled daily', met: true, lastChecked: '2026-03-22T10:00:00Z' },
    { id: 'CBN-RECON-002', requirement: 'Break Resolution SLA', description: 'All breaks must be resolved within SLA deadlines', met: false, lastChecked: '2026-03-22T10:00:00Z' },
    { id: 'CBN-RECON-003', requirement: 'Escalation Compliance', description: 'Breaks older than 48 hours must be escalated', met: true, lastChecked: '2026-03-22T10:00:00Z' },
    { id: 'CBN-RECON-004', requirement: 'Monthly Reconciliation Certificate', description: 'Monthly certificate must be generated', met: true, lastChecked: '2026-03-22T10:00:00Z' },
    { id: 'CBN-RECON-005', requirement: 'Audit Trail Completeness', description: 'All resolutions must have audit trail', met: true, lastChecked: '2026-03-22T10:00:00Z' },
  ],
};

const MOCK_SCORE_TREND = {
  data: Array.from({ length: 12 }, (_, i) => ({
    month: `2025-${String(i + 4).padStart(2, '0')}`,
    score: 85 + Math.floor(i * 1.2),
    target: 95,
  })),
};

const MOCK_NOSTRO_ACCOUNTS = {
  data: MOCK_POSITIONS.data,
};

const MOCK_TIMELINE = { data: [] };

// ── Handler Setup ───────────────────────────────────────────────────────────

function setupAllHandlers() {
  server.use(
    http.get('/api/v1/nostro/positions', () => HttpResponse.json(MOCK_POSITIONS)),
    http.get('/api/v1/nostro/positions/:id', ({ params }) => {
      const pos = MOCK_POSITIONS.data.find((p) => p.id === Number(params.id));
      return HttpResponse.json({ data: pos ?? MOCK_POSITIONS.data[0] });
    }),
    http.post('/api/v1/nostro/positions', () =>
      HttpResponse.json({ data: MOCK_POSITIONS.data[0] }, { status: 201 }),
    ),
    http.get('/api/v1/nostro/banks', () => HttpResponse.json(MOCK_BANKS)),
    http.post('/api/v1/nostro/banks', () =>
      HttpResponse.json({ data: MOCK_BANKS.data[0] }, { status: 201 }),
    ),
    http.get('/api/v1/reconciliation/breaks', () => HttpResponse.json(MOCK_BREAKS)),
    http.get('/api/v1/reconciliation/breaks/:id/timeline', () =>
      HttpResponse.json(MOCK_TIMELINE),
    ),
    http.post('/api/v1/reconciliation/breaks/:id/resolve', () =>
      HttpResponse.json({ data: { success: true } }),
    ),
    http.post('/api/v1/reconciliation/breaks/:id/escalate', () =>
      HttpResponse.json({ data: { success: true } }),
    ),
    http.post('/api/v1/reconciliation/breaks/:id/notes', () =>
      HttpResponse.json({ data: { id: '100', timestamp: new Date().toISOString(), actor: 'test', action: 'Note', notes: 'test note', type: 'INFO' } }),
    ),
    http.post('/api/v1/reconciliation/breaks/bulk-assign', () =>
      HttpResponse.json({ data: { success: true, updated: 2 } }),
    ),
    http.post('/api/v1/reconciliation/breaks/bulk-escalate', () =>
      HttpResponse.json({ data: { success: true, escalated: 2 } }),
    ),
    http.get('/api/v1/reconciliation/nostro-accounts', () =>
      HttpResponse.json(MOCK_NOSTRO_ACCOUNTS),
    ),
    http.get('/api/v1/reconciliation/sessions', () =>
      HttpResponse.json({ data: [] }),
    ),
    http.get('/api/v1/reconciliation/compliance/checklist', () =>
      HttpResponse.json(MOCK_COMPLIANCE),
    ),
    http.get('/api/v1/reconciliation/compliance/score-trend', () =>
      HttpResponse.json(MOCK_SCORE_TREND),
    ),
    http.get('/api/v1/reconciliation/statements/history', () =>
      HttpResponse.json({ data: [] }),
    ),
    http.get('/api/v1/reconciliation/auto-fetch/configs', () =>
      HttpResponse.json({ data: [] }),
    ),
    http.get('/api/v1/reconciliation/history', () =>
      HttpResponse.json({ data: [] }),
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOSTRO POSITIONS PAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('NostroPositionsPage', () => {
  it('renders page header', () => {
    setupAllHandlers();
    renderWithProviders(<NostroPositionsPage />);
    expect(screen.getByText('Nostro / Vostro Positions')).toBeInTheDocument();
  });

  it('renders stat cards', async () => {
    setupAllHandlers();
    renderWithProviders(<NostroPositionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Book Balance')).toBeInTheDocument();
      expect(screen.getByText('Unreconciled')).toBeInTheDocument();
      expect(screen.getByText('Positions with Breaks')).toBeInTheDocument();
      expect(screen.getByText('Avg Aging')).toBeInTheDocument();
    });
  });

  it('renders position cards after data loads', async () => {
    setupAllHandlers();
    renderWithProviders(<NostroPositionsPage />);
    await waitFor(() => {
      // PositionCard renders the correspondent bank name
      expect(screen.getAllByText(/JPMorgan|Citibank/i).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });
  });

  it('has a search input for filtering positions', () => {
    setupAllHandlers();
    renderWithProviders(<NostroPositionsPage />);
    const searchInput = screen.getByPlaceholderText('Search bank, account, SWIFT...');
    expect(searchInput).toBeInTheDocument();
    // Verify filter controls exist
    expect(screen.getByDisplayValue('All Currencies')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
  });

  it('opens new position modal', async () => {
    setupAllHandlers();
    renderWithProviders(<NostroPositionsPage />);
    fireEvent.click(screen.getByText('New Position'));
    await waitFor(() => {
      expect(screen.getByText('Correspondent Bank')).toBeInTheDocument();
      expect(screen.getByText('Account ID')).toBeInTheDocument();
      expect(screen.getByText('Currency')).toBeInTheDocument();
      expect(screen.getByText('Position Type')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CORRESPONDENT BANK PAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('CorrespondentBankPage', () => {
  it('renders page header', () => {
    setupAllHandlers();
    renderWithProviders(<CorrespondentBankPage />);
    expect(screen.getByText('Correspondent Bank Registry')).toBeInTheDocument();
  });

  it('loads and displays banks in table', async () => {
    setupAllHandlers();
    renderWithProviders(<CorrespondentBankPage />);
    await waitFor(() => {
      expect(screen.getByText('JPMorgan Chase')).toBeInTheDocument();
      expect(screen.getByText('Citibank')).toBeInTheDocument();
      expect(screen.getByText('CHASUS33')).toBeInTheDocument();
    });
  });

  it('filters banks by search', async () => {
    setupAllHandlers();
    renderWithProviders(<CorrespondentBankPage />);
    await waitFor(() => {
      expect(screen.getByText('JPMorgan Chase')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search by name, SWIFT, country...');
    fireEvent.change(searchInput, { target: { value: 'Citi' } });
    expect(screen.queryByText('JPMorgan Chase')).not.toBeInTheDocument();
    expect(screen.getByText('Citibank')).toBeInTheDocument();
  });

  it('opens register bank modal', async () => {
    setupAllHandlers();
    renderWithProviders(<CorrespondentBankPage />);
    fireEvent.click(screen.getByText('Register Bank'));
    await waitFor(() => {
      expect(screen.getByText('Register Correspondent Bank')).toBeInTheDocument();
      expect(screen.getByText('Bank Code')).toBeInTheDocument();
      expect(screen.getByText('SWIFT BIC')).toBeInTheDocument();
    });
  });

  it('displays bank row with SWIFT code and country', async () => {
    setupAllHandlers();
    renderWithProviders(<CorrespondentBankPage />);
    await waitFor(() => {
      expect(screen.getByText('CHASUS33')).toBeInTheDocument();
      expect(screen.getByText('CITIUS33')).toBeInTheDocument();
    });
    // Verify the table has relationship and status columns
    expect(screen.getByText('Relationship')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BREAK MANAGEMENT PAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('BreakManagementPage', () => {
  it('renders page header and subtitle', () => {
    setupAllHandlers();
    renderWithProviders(<BreakManagementPage />);
    expect(screen.getByText('Break Management')).toBeInTheDocument();
    expect(screen.getByText(/Investigate, resolve, and escalate/)).toBeInTheDocument();
  });

  it('renders filter toggle button', () => {
    setupAllHandlers();
    renderWithProviders(<BreakManagementPage />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('toggles filter panel with status and aging selects', () => {
    setupAllHandlers();
    renderWithProviders(<BreakManagementPage />);
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Ages')).toBeInTheDocument();
  });

  it('loads break data from API', async () => {
    setupAllHandlers();
    renderWithProviders(<BreakManagementPage />);
    // Wait for the table to render (DataTable may render with search/empty states first)
    await waitFor(() => {
      // The DataTable should show the account column values
      const cells = screen.getAllByText(/1000000010/);
      expect(cells.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('ReconciliationReportsPage', () => {
  it('renders page header', () => {
    setupAllHandlers();
    renderWithProviders(<ReconciliationReportsPage />);
    expect(screen.getByText('Reconciliation Reports')).toBeInTheDocument();
  });

  it('renders all 5 report cards', () => {
    setupAllHandlers();
    renderWithProviders(<ReconciliationReportsPage />);
    expect(screen.getByText('Daily Reconciliation Status')).toBeInTheDocument();
    expect(screen.getByText('Outstanding Breaks Report')).toBeInTheDocument();
    expect(screen.getByText('Monthly Reconciliation Certificate')).toBeInTheDocument();
    expect(screen.getByText('Nostro Proof of Reconciliation')).toBeInTheDocument();
    expect(screen.getByText('Write-Off Summary')).toBeInTheDocument();
  });

  it('loads and displays compliance checklist', async () => {
    setupAllHandlers();
    renderWithProviders(<ReconciliationReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('CBN Compliance Checklist')).toBeInTheDocument();
      expect(screen.getByText('Daily Nostro Reconciliation')).toBeInTheDocument();
      expect(screen.getByText('Break Resolution SLA')).toBeInTheDocument();
    });
  });

  it('displays compliance score percentage', async () => {
    setupAllHandlers();
    renderWithProviders(<ReconciliationReportsPage />);
    await waitFor(() => {
      // 4 out of 5 met = 80%
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  it('renders compliance score trend chart section', async () => {
    setupAllHandlers();
    renderWithProviders(<ReconciliationReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Compliance Score Trend')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('ReconciliationDashboardPage', () => {
  it('renders page header and Open Workbench button', () => {
    setupAllHandlers();
    renderWithProviders(<ReconciliationDashboardPage />);
    expect(screen.getByText('Reconciliation Operations')).toBeInTheDocument();
    expect(screen.getByText('Open Workbench')).toBeInTheDocument();
  });

  it('renders dashboard tab buttons including Overview and Trends', () => {
    setupAllHandlers();
    renderWithProviders(<ReconciliationDashboardPage />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Trends')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('renders stat cards for positions and compliance', () => {
    setupAllHandlers();
    renderWithProviders(<ReconciliationDashboardPage />);
    expect(screen.getByText('Total Positions')).toBeInTheDocument();
    expect(screen.getByText('Fully Reconciled')).toBeInTheDocument();
    expect(screen.getByText('Outstanding Breaks')).toBeInTheDocument();
    expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
  });
});
