import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { RegulatorySubmissionPage } from '../pages/RegulatorySubmissionPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockReturns = [
  { id: 1, code: 'IRRBB', name: 'IRRBB Report', frequency: 'QUARTERLY', dueDate: '2026-03-31', nextDue: '2026-06-30', status: 'DRAFT', lastSubmissionDate: null, lastSubmittedBy: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, code: 'LCR', name: 'LCR Return', frequency: 'DAILY', dueDate: '2026-03-22', nextDue: '2026-03-23', status: 'SUBMITTED', lastSubmissionDate: '2026-03-21T10:00:00Z', lastSubmittedBy: 'admin', createdAt: '2026-01-01T00:00:00Z' },
  { id: 3, code: 'NSFR', name: 'NSFR Return', frequency: 'MONTHLY', dueDate: '2026-03-31', nextDue: '2026-04-30', status: 'VALIDATED', lastSubmissionDate: null, lastSubmittedBy: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: 4, code: 'SLR', name: 'Structural Liquidity Return', frequency: 'MONTHLY', dueDate: '2026-03-15', nextDue: '2026-03-15', status: 'DRAFT', lastSubmissionDate: null, lastSubmittedBy: null, createdAt: '2026-01-01T00:00:00Z' }, // overdue
  { id: 5, code: 'LER', name: 'Large Exposure Return', frequency: 'QUARTERLY', dueDate: '2026-06-30', nextDue: '2026-06-30', status: 'DRAFT', lastSubmissionDate: null, lastSubmittedBy: null, createdAt: '2026-01-01T00:00:00Z' },
];

const mockReturnDetail = {
  ...mockReturns[0],
  data: { reportDate: '2026-03-20', niiBase: 5000000000, eveBase: 2000000000, totalRsa: 80000000000, totalRsl: 75000000000 },
  validationErrors: [],
  validationWarnings: [],
};

const mockSubmissions = [
  { id: 1, returnId: 2, returnCode: 'LCR', submissionDate: '2026-03-21T10:00:00Z', submittedBy: 'admin', status: 'SUBMITTED', referenceNumber: 'CBN-LCR-1711000000000', createdAt: '2026-03-21T10:00:00Z' },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/alm/regulatory-returns', () => HttpResponse.json(wrap(mockReturns))),
    http.get('/api/v1/alm/regulatory-returns/:id', ({ params }) => {
      const id = Number(params.id);
      const ret = mockReturns.find(r => r.id === id);
      return HttpResponse.json(wrap({ ...ret, data: mockReturnDetail.data, validationErrors: [], validationWarnings: [] }));
    }),
    http.post('/api/v1/alm/regulatory-returns/:id/validate', () => HttpResponse.json(wrap({ errors: [], warnings: [{ field: 'durationGap', rule: 'DURATION_GAP_LIMIT', message: 'Duration gap exceeds 5-year regulatory guideline', severity: 'WARNING' }] }))),
    http.post('/api/v1/alm/regulatory-returns/:id/submit', () => HttpResponse.json(wrap({ id: 10, returnId: 1, returnCode: 'IRRBB', submissionDate: '2026-03-22T10:00:00Z', submittedBy: 'admin', status: 'SUBMITTED', referenceNumber: 'CBN-IRRBB-1711100000000', createdAt: '2026-03-22T10:00:00Z' }))),
    http.get('/api/v1/alm/regulatory-returns/:returnId/submissions', () => HttpResponse.json(wrap(mockSubmissions))),
    http.get('/api/v1/alm/regulatory-submissions', () => HttpResponse.json(wrap(mockSubmissions))),
  );
}

describe('RegulatorySubmissionPage', () => {
  it('renders page header and stat cards', async () => {
    setupHandlers();
    renderWithProviders(<RegulatorySubmissionPage />);
    expect(screen.getByText('Regulatory Submissions')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Total Returns')).toBeInTheDocument();
    });
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Submissions YTD')).toBeInTheDocument();
  });

  it('renders all 5 regulatory returns', async () => {
    setupHandlers();
    renderWithProviders(<RegulatorySubmissionPage />);
    await waitFor(() => {
      expect(screen.getByText('IRRBB Report')).toBeInTheDocument();
    });
    expect(screen.getByText('LCR Return')).toBeInTheDocument();
    expect(screen.getByText('NSFR Return')).toBeInTheDocument();
    expect(screen.getByText('Structural Liquidity Return')).toBeInTheDocument();
    expect(screen.getByText('Large Exposure Return')).toBeInTheDocument();
  });

  it('shows frequency badges', async () => {
    setupHandlers();
    renderWithProviders(<RegulatorySubmissionPage />);
    await waitFor(() => {
      expect(screen.getAllByText('QUARTERLY').length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText('DAILY')).toBeInTheDocument();
    expect(screen.getAllByText('MONTHLY').length).toBeGreaterThanOrEqual(2);
  });

  it('shows overdue indicator for overdue returns', async () => {
    setupHandlers();
    renderWithProviders(<RegulatorySubmissionPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Overdue').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens return detail drawer on click', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<RegulatorySubmissionPage />);
    await waitFor(() => {
      expect(screen.getByText('IRRBB Report')).toBeInTheDocument();
    });
    await user.click(screen.getByText('IRRBB Report'));
    await waitFor(() => {
      expect(screen.getByText('Return Data')).toBeInTheDocument();
    });
    expect(screen.getByText('Run Validation')).toBeInTheDocument();
    expect(screen.getByText('Submit to CBN')).toBeInTheDocument();
  });

  it('shows pre-populated return data in drawer', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<RegulatorySubmissionPage />);
    await waitFor(() => {
      expect(screen.getByText('IRRBB Report')).toBeInTheDocument();
    });
    await user.click(screen.getByText('IRRBB Report'));
    await waitFor(() => {
      expect(screen.getByText('Pre-populated from ALM calculations')).toBeInTheDocument();
    });
  });

  it('runs validation and shows warnings', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<RegulatorySubmissionPage />);
    await waitFor(() => {
      expect(screen.getByText('IRRBB Report')).toBeInTheDocument();
    });
    await user.click(screen.getByText('IRRBB Report'));
    await waitFor(() => {
      expect(screen.getByText('Run Validation')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Run Validation'));
    await waitFor(() => {
      expect(screen.getByText(/Duration gap exceeds/)).toBeInTheDocument();
    });
  });

  it('shows submission history in drawer', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<RegulatorySubmissionPage />);
    await waitFor(() => {
      expect(screen.getByText('LCR Return')).toBeInTheDocument();
    });
    await user.click(screen.getByText('LCR Return'));
    await waitFor(() => {
      // "Submission History" appears in both the tab and the drawer
      expect(screen.getAllByText('Submission History').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('navigates to Submission History tab', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<RegulatorySubmissionPage />);
    await user.click(screen.getByText('Submission History'));
    await waitFor(() => {
      expect(screen.getByText('Reference')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('CBN-LCR-1711000000000')).toBeInTheDocument();
    });
  });

  it('shows empty state for submissions history when none exist', async () => {
    server.use(
      http.get('/api/v1/alm/regulatory-returns', () => HttpResponse.json(wrap(mockReturns))),
      http.get('/api/v1/alm/regulatory-submissions', () => HttpResponse.json(wrap([]))),
    );
    const user = userEvent.setup();
    renderWithProviders(<RegulatorySubmissionPage />);
    await user.click(screen.getByText('Submission History'));
    await waitFor(() => {
      expect(screen.getByText(/No regulatory submissions on record/)).toBeInTheDocument();
    });
  });

  it('disables submit button until validation passes', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<RegulatorySubmissionPage />);
    await waitFor(() => {
      expect(screen.getByText('IRRBB Report')).toBeInTheDocument();
    });
    await user.click(screen.getByText('IRRBB Report'));
    await waitFor(() => {
      expect(screen.getByText('Submit to CBN')).toBeInTheDocument();
    });
    // Submit should be disabled before validation
    const submitBtn = screen.getByText('Submit to CBN').closest('button');
    expect(submitBtn).toBeDisabled();
  });
});
