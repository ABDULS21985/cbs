import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { ComplianceReportsPage } from './ComplianceReportsPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockReports = [
  {
    id: 1,
    reportCode: 'RPT-001',
    reportName: 'Monthly BSA Report',
    reportType: 'Monthly Return',
    regulator: 'CBN',
    reportingPeriod: '2026-02',
    periodStartDate: '2026-02-01',
    periodEndDate: '2026-02-28',
    dueDate: '2026-04-15',
    preparedBy: 'john.doe',
    status: 'DRAFT',
  },
  {
    id: 2,
    reportCode: 'RPT-002',
    reportName: 'Quarterly AML Report',
    reportType: 'Quarterly Filing',
    regulator: 'CBN',
    reportingPeriod: '2026-Q1',
    periodStartDate: '2026-01-01',
    periodEndDate: '2026-03-31',
    dueDate: '2026-04-30',
    preparedBy: 'jane.smith',
    status: 'REVIEWED',
  },
  {
    id: 3,
    reportCode: 'RPT-003',
    reportName: 'Annual Compliance Report',
    reportType: 'Annual Return',
    regulator: 'CBN',
    reportingPeriod: '2025',
    periodStartDate: '2025-01-01',
    periodEndDate: '2025-12-31',
    dueDate: '2026-02-28',
    submissionDate: '2026-03-10',
    preparedBy: 'admin',
    status: 'SUBMITTED',
    submissionReference: 'CBN/2026/Q1/003',
  },
];

const mockOverdueReports = [
  {
    id: 10,
    reportCode: 'RPT-OVD-001',
    reportName: 'Overdue Prudential Report',
    reportType: 'Monthly Return',
    regulator: 'CBN',
    reportingPeriod: '2026-01',
    periodStartDate: '2026-01-01',
    periodEndDate: '2026-01-31',
    dueDate: '2026-02-15',
    preparedBy: 'officer1',
    status: 'DRAFT',
  },
  {
    id: 11,
    reportCode: 'RPT-OVD-002',
    reportName: 'Late NFIU Filing',
    reportType: 'Quarterly Filing',
    regulator: 'NFIU',
    reportingPeriod: '2025-Q4',
    periodStartDate: '2025-10-01',
    periodEndDate: '2025-12-31',
    dueDate: '2026-01-31',
    preparedBy: 'officer2',
    status: 'REVIEWED',
  },
];

function setupHandlers(reports = mockReports, overdue = mockOverdueReports) {
  server.use(
    http.get('/api/v1/compliance-reports/regulator/:regulator', () =>
      HttpResponse.json(wrap(reports)),
    ),
    http.get('/api/v1/compliance-reports/overdue', () =>
      HttpResponse.json(wrap(overdue)),
    ),
    http.get('/api/v1/compliance-reports/stats', () =>
      HttpResponse.json(wrap({ total: reports.length, overdue: overdue.length, draft: 1, submitted: 1 })),
    ),
    http.post('/api/v1/compliance-reports', () =>
      HttpResponse.json(wrap({ id: 99, reportCode: 'RPT-099', status: 'DRAFT' })),
    ),
    http.post('/api/v1/compliance-reports/:code/review', () =>
      HttpResponse.json(wrap({ status: 'REVIEWED' })),
    ),
    http.post('/api/v1/compliance-reports/:code/submit', () =>
      HttpResponse.json(wrap({ status: 'SUBMITTED' })),
    ),
  );
}

describe('ComplianceReportsPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    expect(screen.getByText('Regulatory Reports')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    expect(screen.getByText(/manage.*track.*submit.*regulatory/i)).toBeInTheDocument();
  });

  it('renders 4 stat cards with values', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Reports')).toBeInTheDocument();
    });
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Due This Week')).toBeInTheDocument();
    expect(screen.getByText('Submitted This Month')).toBeInTheDocument();
  });

  it('displays stat card values after data loads', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Reports')).toBeInTheDocument();
    });
    // Total reports = 3
    expect(screen.getByText('3')).toBeInTheDocument();
    // Overdue = 2
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders the report list table with column headers', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Code')).toBeInTheDocument();
    });
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Regulator')).toBeInTheDocument();
    expect(screen.getByText('Report Type')).toBeInTheDocument();
    expect(screen.getByText('Period')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Prepared By')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders report rows in the table', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Monthly BSA Report')).toBeInTheDocument();
    });
    expect(screen.getByText('Quarterly AML Report')).toBeInTheDocument();
    expect(screen.getByText('Annual Compliance Report')).toBeInTheDocument();
  });

  it('renders report codes in the table', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('RPT-001')).toBeInTheDocument();
    });
    expect(screen.getByText('RPT-002')).toBeInTheDocument();
    expect(screen.getByText('RPT-003')).toBeInTheDocument();
  });

  it('renders overdue reports section when overdue reports exist', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText(/overdue report.*require urgent attention/i)).toBeInTheDocument();
    });
  });

  it('displays overdue report names in the overdue section', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Overdue Prudential Report')).toBeInTheDocument();
    });
    expect(screen.getByText('Late NFIU Filing')).toBeInTheDocument();
  });

  it('does not render overdue section when no overdue reports', async () => {
    setupHandlers(mockReports, []);
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Monthly BSA Report')).toBeInTheDocument();
    });
    expect(screen.queryByText(/overdue report.*require urgent attention/i)).not.toBeInTheDocument();
  });

  it('opens New Report dialog when clicking New Report button', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    fireEvent.click(screen.getByText('New Report'));
    await waitFor(() => {
      expect(screen.getByText('New Regulatory Report')).toBeInTheDocument();
    });
    expect(screen.getByText('Report Name')).toBeInTheDocument();
    expect(screen.getByText('Create Report')).toBeInTheDocument();
  });

  it('closes New Report dialog when clicking Cancel', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    fireEvent.click(screen.getByText('New Report'));
    await waitFor(() => {
      expect(screen.getByText('New Regulatory Report')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New Regulatory Report')).not.toBeInTheDocument();
  });

  it('shows Submit for Review action on DRAFT reports', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Submit for Review')).toBeInTheDocument();
    });
  });

  it('opens Review dialog when clicking Submit for Review', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Submit for Review')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Submit for Review'));
    await waitFor(() => {
      // Dialog heading is "Submit for Review" and body contains "for compliance review?"
      expect(screen.getByText(/compliance review/i)).toBeInTheDocument();
    });
  });

  it('shows Submit to Regulator action on REVIEWED reports', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Submit to Regulator')).toBeInTheDocument();
    });
  });

  it('opens Submit to Regulator dialog when clicking Submit to Regulator', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Submit to Regulator')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Submit to Regulator'));
    await waitFor(() => {
      expect(screen.getByText('Submission Reference')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('e.g. CBN/2026/Q1/001')).toBeInTheDocument();
  });

  it('renders regulator filter buttons', () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    expect(screen.getByText('All Regulators')).toBeInTheDocument();
    expect(screen.getByText('CBN')).toBeInTheDocument();
    expect(screen.getByText('NFIU')).toBeInTheDocument();
    expect(screen.getByText('SEC')).toBeInTheDocument();
    expect(screen.getByText('NDIC')).toBeInTheDocument();
    expect(screen.getByText('FATF')).toBeInTheDocument();
  });

  it('renders status filter dropdown', () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    expect(screen.getByText('All Statuses')).toBeInTheDocument();
  });

  it('shows empty state when no reports match filters', async () => {
    setupHandlers([], []);
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('No reports found for the selected filters')).toBeInTheDocument();
    });
  });

  it('handles reports API error gracefully', async () => {
    server.use(
      http.get('/api/v1/compliance-reports/regulator/:regulator', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.get('/api/v1/compliance-reports/overdue', () =>
        HttpResponse.json(wrap([])),
      ),
    );
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/regulatory-report data could not be fully loaded/i),
      ).toBeInTheDocument();
    });
  });

  it('shows table error message when reports fail to load', async () => {
    server.use(
      http.get('/api/v1/compliance-reports/regulator/:regulator', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.get('/api/v1/compliance-reports/overdue', () =>
        HttpResponse.json(wrap([])),
      ),
    );
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/regulatory reports could not be loaded from the backend/i),
      ).toBeInTheDocument();
    });
  });

  it('displays stat cards with -- when reports error occurs', async () => {
    server.use(
      http.get('/api/v1/compliance-reports/regulator/:regulator', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.get('/api/v1/compliance-reports/overdue', () =>
        HttpResponse.json(wrap([])),
      ),
    );
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Reports')).toBeInTheDocument();
    });
    const dashes = screen.getAllByText('--');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders status badges for reports', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
    });
    expect(screen.getByText('REVIEWED')).toBeInTheDocument();
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
  });

  it('renders the New Report button', () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    expect(screen.getByText('New Report')).toBeInTheDocument();
  });

  it('shows regulator badges in the report table', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Monthly BSA Report')).toBeInTheDocument();
    });
    // CBN regulator badges appear for all 3 reports
    const cbnBadges = screen.getAllByText('CBN');
    // Filter button + table badges
    expect(cbnBadges.length).toBeGreaterThanOrEqual(3);
  });

  it('renders prepared-by values in the table', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('john.doe')).toBeInTheDocument();
    });
    expect(screen.getByText('jane.smith')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});
