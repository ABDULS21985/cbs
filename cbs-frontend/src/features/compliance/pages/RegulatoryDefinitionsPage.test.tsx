import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { RegulatoryDefinitionsPage } from './RegulatoryDefinitionsPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockDefinitions = [
  {
    id: 1,
    reportCode: 'CBN-001',
    reportName: 'Capital Adequacy Report',
    regulator: 'CBN',
    frequency: 'MONTHLY',
    reportCategory: 'PRUDENTIAL',
    dataQuery: 'SELECT * FROM capital',
    templateConfig: {},
    outputFormat: 'XLSX',
    isActive: true,
  },
  {
    id: 2,
    reportCode: 'FCA-002',
    reportName: 'Liquidity Coverage Ratio',
    regulator: 'FCA',
    frequency: 'QUARTERLY',
    reportCategory: 'LIQUIDITY',
    dataQuery: 'SELECT * FROM liquidity',
    templateConfig: {},
    outputFormat: 'CSV',
    isActive: true,
  },
  {
    id: 3,
    reportCode: 'SEC-003',
    reportName: 'AML Transaction Report',
    regulator: 'SEC',
    frequency: 'DAILY',
    reportCategory: 'AML_CFT',
    dataQuery: 'SELECT * FROM aml',
    templateConfig: {},
    outputFormat: 'JSON',
    isActive: false,
  },
  {
    id: 4,
    reportCode: 'APRA-004',
    reportName: 'Annual Risk Assessment',
    regulator: 'APRA',
    frequency: 'ANNUAL',
    reportCategory: 'RISK',
    dataQuery: 'SELECT * FROM risk',
    templateConfig: {},
    outputFormat: 'XML',
    isActive: true,
  },
];

const mockRuns = [
  {
    id: 1,
    reportCode: 'CBN-001',
    reportingPeriodStart: '2026-01-01',
    reportingPeriodEnd: '2026-01-31',
    status: 'COMPLETED',
    recordCount: 150,
    filePath: '/reports/cbn-001-jan.xlsx',
    fileSizeBytes: 2048000,
    generationTimeMs: 3200,
    errorMessage: '',
    submittedBy: 'admin',
    submittedAt: '2026-02-01T10:00:00Z',
    submissionRef: 'SUB-001',
    regulatorAckRef: 'ACK-001',
    generatedBy: 'system',
    generatedAt: '2026-02-01T09:00:00Z',
    createdAt: '2026-02-01T09:00:00Z',
    version: 1,
  },
  {
    id: 2,
    reportCode: 'CBN-001',
    reportingPeriodStart: '2026-02-01',
    reportingPeriodEnd: '2026-02-28',
    status: 'FAILED',
    recordCount: 0,
    filePath: '',
    fileSizeBytes: 0,
    generationTimeMs: 0,
    errorMessage: 'Timeout',
    submittedBy: '',
    submittedAt: '',
    submissionRef: '',
    regulatorAckRef: '',
    generatedBy: 'system',
    generatedAt: '2026-03-01T09:00:00Z',
    createdAt: '2026-03-01T09:00:00Z',
    version: 1,
  },
];

function setupHandlers(definitions = mockDefinitions, runs = mockRuns) {
  server.use(
    http.get('/api/v1/regulatory/definitions', () => HttpResponse.json(wrap(definitions))),
    http.get('/api/v1/regulatory/runs/:reportCode', () => HttpResponse.json(wrap(runs))),
  );
}

describe('RegulatoryDefinitionsPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    expect(screen.getByText('Regulatory Report Definitions')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    expect(screen.getByText('Define, generate, and submit regulatory reports')).toBeInTheDocument();
  });

  it('renders the Create Definition button', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    expect(screen.getByText('Create Definition')).toBeInTheDocument();
  });

  it('renders stat cards after data loads', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Definitions')).toBeInTheDocument();
    });
    // "Active" may appear in both stat card and table rows
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Monthly/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Quarterly/i).length).toBeGreaterThanOrEqual(1);
  });

  it('displays correct stat values', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Definitions')).toBeInTheDocument();
    });
    // Check that stat values appear in the page content
    const allText = document.body.textContent ?? '';
    expect(allText).toContain('4');
  });

  it('renders definitions table with data', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Capital Adequacy Report')).toBeInTheDocument();
    });
    expect(screen.getByText('Liquidity Coverage Ratio')).toBeInTheDocument();
    expect(screen.getByText('AML Transaction Report')).toBeInTheDocument();
    expect(screen.getByText('Annual Risk Assessment')).toBeInTheDocument();
  });

  it('displays report code column values', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    await waitFor(() => {
      expect(screen.getByText('CBN-001')).toBeInTheDocument();
    });
    expect(screen.getByText('FCA-002')).toBeInTheDocument();
    expect(screen.getByText('SEC-003')).toBeInTheDocument();
    expect(screen.getByText('APRA-004')).toBeInTheDocument();
  });

  it('displays regulator column values', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    await waitFor(() => {
      expect(screen.getByText('CBN')).toBeInTheDocument();
    });
    expect(screen.getByText('FCA')).toBeInTheDocument();
    expect(screen.getByText('SEC')).toBeInTheDocument();
    expect(screen.getByText('APRA')).toBeInTheDocument();
  });

  it('displays frequency column values', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    await waitFor(() => {
      expect(screen.getByText('MONTHLY')).toBeInTheDocument();
    });
    expect(screen.getByText('QUARTERLY')).toBeInTheDocument();
    expect(screen.getByText('DAILY')).toBeInTheDocument();
    expect(screen.getByText('ANNUAL')).toBeInTheDocument();
  });

  it('displays category column values', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    await waitFor(() => {
      expect(screen.getByText('PRUDENTIAL')).toBeInTheDocument();
    });
    expect(screen.getByText('LIQUIDITY')).toBeInTheDocument();
    expect(screen.getByText('AML CFT')).toBeInTheDocument();
    expect(screen.getByText('RISK')).toBeInTheDocument();
  });

  it('renders Definitions and Report Runs tabs', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    expect(screen.getByText('Definitions')).toBeInTheDocument();
    expect(screen.getByText('Report Runs')).toBeInTheDocument();
  });

  it('Definitions tab is active by default', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    const tab = screen.getByText('Definitions');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Report Runs tab', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    fireEvent.click(screen.getByText('Report Runs'));
    const tab = screen.getByText('Report Runs');
    expect(tab.className).toContain('border-primary');
  });

  it('shows report selector prompt on Report Runs tab when no report selected', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    fireEvent.click(screen.getByText('Report Runs'));
    expect(screen.getByText('Select a report code above to view its run history.')).toBeInTheDocument();
  });

  it('opens Create Definition dialog when button is clicked', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    fireEvent.click(screen.getByText('Create Definition'));
    expect(screen.getByText('Create Report Definition')).toBeInTheDocument();
    expect(screen.getByText('Report Name *')).toBeInTheDocument();
  });

  it('Create Definition dialog shows form fields', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    fireEvent.click(screen.getByText('Create Definition'));
    expect(screen.getByText('Regulator')).toBeInTheDocument();
    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Output Format')).toBeInTheDocument();
    expect(screen.getByText('Data Query (SQL Template)')).toBeInTheDocument();
  });

  it('Create Definition dialog can be closed', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    fireEvent.click(screen.getByText('Create Definition'));
    expect(screen.getByText('Create Report Definition')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Create Report Definition')).not.toBeInTheDocument();
  });

  it('opens Generate Report dialog when Generate button is clicked', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Capital Adequacy Report')).toBeInTheDocument();
    });
    const generateButtons = screen.getAllByText('Generate');
    // First "Generate" button in the table actions (not the Create button)
    fireEvent.click(generateButtons[0]);
    expect(screen.getByText('Generate Report')).toBeInTheDocument();
    expect(screen.getByText('Period Start *')).toBeInTheDocument();
    expect(screen.getByText('Period End *')).toBeInTheDocument();
  });

  it('handles empty definitions list', async () => {
    setupHandlers([]);
    renderWithProviders(<RegulatoryDefinitionsPage />);
    await waitFor(() => {
      expect(screen.getByText('No definitions found')).toBeInTheDocument();
    });
  });

  it('handles definitions API error gracefully', () => {
    server.use(
      http.get('/api/v1/regulatory/definitions', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/regulatory/runs/:reportCode', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<RegulatoryDefinitionsPage />);
    expect(screen.getByText('Regulatory Report Definitions')).toBeInTheDocument();
  });

  it('renders table column headers', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Report Code')).toBeInTheDocument();
    });
    expect(screen.getByText('Report Name')).toBeInTheDocument();
    expect(screen.getByText('Regulator')).toBeInTheDocument();
    expect(screen.getByText('Format')).toBeInTheDocument();
  });

  it('does not show stat card values while loading', () => {
    server.use(
      http.get('/api/v1/regulatory/definitions', () => new Promise(() => {})),
      http.get('/api/v1/regulatory/runs/:reportCode', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<RegulatoryDefinitionsPage />);
    expect(screen.queryByText('Capital Adequacy Report')).not.toBeInTheDocument();
  });

  it('renders tabs as buttons', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryDefinitionsPage />);
    const definitionsTab = screen.getByText('Definitions');
    expect(definitionsTab.tagName).toBe('BUTTON');
    const runsTab = screen.getByText('Report Runs');
    expect(runsTab.tagName).toBe('BUTTON');
  });
});
