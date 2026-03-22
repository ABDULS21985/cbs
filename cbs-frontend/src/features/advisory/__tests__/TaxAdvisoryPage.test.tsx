import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { TaxAdvisoryPage } from '../pages/TaxAdvisoryPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockEngagements = [
  {
    id: 1, engagementCode: 'TA-001', engagementName: 'Transfer Pricing Review FY2025',
    engagementType: 'TRANSFER_PRICING', clientName: 'Acme Nigeria Ltd',
    clientCustomerId: 101, taxAuthority: 'FIRS', leadAdvisor: 'John Adeyemi',
    scopeDescription: 'Review of intercompany pricing', advisoryFee: 50000,
    feeBasis: 'FIXED', riskRating: 'MEDIUM', opinion: null,
    engagementStartDate: '2025-01-15', status: 'IN_PROGRESS',
  },
  {
    id: 2, engagementCode: 'TA-002', engagementName: 'Tax Due Diligence',
    engagementType: 'TAX_DUE_DILIGENCE', clientName: 'Global Corp',
    clientCustomerId: 102, taxAuthority: 'LIRS', leadAdvisor: 'Jane Smith',
    scopeDescription: 'Pre-acquisition tax DD', advisoryFee: 75000,
    feeBasis: 'HOURLY', riskRating: 'HIGH',
    opinion: 'Based on our analysis, the target has no material tax exposures.',
    engagementStartDate: '2024-11-01', status: 'OPINION_DELIVERED',
  },
  {
    id: 3, engagementCode: 'TA-003', engagementName: 'VAT Advisory',
    engagementType: 'VAT_ADVISORY', clientName: 'Retail Co',
    clientCustomerId: 103, taxAuthority: 'FIRS', leadAdvisor: 'John Adeyemi',
    advisoryFee: 30000, feeBasis: 'RETAINER', riskRating: 'LOW',
    opinion: null, status: 'CLOSED',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/tax-advisory', () => HttpResponse.json(wrap(mockEngagements))),
    http.get('/api/v1/tax-advisory/revenue', () => HttpResponse.json(wrap(155000))),
    http.post('/api/v1/tax-advisory', () => HttpResponse.json(wrap({
      ...mockEngagements[0], id: 4, engagementCode: 'TA-004',
    }))),
    http.post('/api/v1/tax-advisory/:code/opinion', () => HttpResponse.json(wrap({
      ...mockEngagements[0], opinion: 'Delivered', status: 'OPINION_DELIVERED',
    }))),
    http.post('/api/v1/tax-advisory/:code/close', () => HttpResponse.json(wrap({
      ...mockEngagements[0], status: 'CLOSED',
    }))),
  );
}

describe('TaxAdvisoryPage', () => {
  it('renders page header and new engagement button', () => {
    setupHandlers();
    renderWithProviders(<TaxAdvisoryPage />);
    expect(screen.getByText('Tax Advisory')).toBeInTheDocument();
    expect(screen.getByText('New Engagement')).toBeInTheDocument();
  });

  it('renders stat cards', async () => {
    setupHandlers();
    renderWithProviders(<TaxAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Active Engagements')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Advisory Fees')).toBeInTheDocument();
    expect(screen.getByText('Revenue YTD')).toBeInTheDocument();
    expect(screen.getByText('Closed Engagements')).toBeInTheDocument();
  });

  it('loads and displays engagements in table', async () => {
    setupHandlers();
    renderWithProviders(<TaxAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('TA-001')).toBeInTheDocument();
    });
    expect(screen.getByText('TA-002')).toBeInTheDocument();
    expect(screen.getByText('TA-003')).toBeInTheDocument();
    expect(screen.getByText('Acme Nigeria Ltd')).toBeInTheDocument();
  });

  it('shows opinion status in table', async () => {
    setupHandlers();
    renderWithProviders(<TaxAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('TA-002')).toBeInTheDocument();
    });
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });

  it('opens create dialog with all fields', async () => {
    setupHandlers();
    renderWithProviders(<TaxAdvisoryPage />);
    fireEvent.click(screen.getByText('New Engagement'));
    await waitFor(() => {
      expect(screen.getByText('New Tax Advisory Engagement')).toBeInTheDocument();
    });
    expect(screen.getByText('Engagement Name *')).toBeInTheDocument();
    expect(screen.getByText('Engagement Type *')).toBeInTheDocument();
    expect(screen.getByText('Client Name *')).toBeInTheDocument();
    expect(screen.getByText('Tax Authority')).toBeInTheDocument();
  });

  it('shows row actions with deliver opinion and close', async () => {
    setupHandlers();
    renderWithProviders(<TaxAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('TA-001')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByTitle('Actions');
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Deliver Opinion')).toBeInTheDocument();
    });
    expect(screen.getByText('Close Engagement')).toBeInTheDocument();
  });

  it('shows view opinion for engagement with opinion', async () => {
    setupHandlers();
    renderWithProviders(<TaxAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('TA-002')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByTitle('Actions');
    fireEvent.click(actionButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('View Opinion')).toBeInTheDocument();
    });
  });

  it('filters by status', async () => {
    setupHandlers();
    renderWithProviders(<TaxAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('TA-001')).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(statusSelect, { target: { value: 'CLOSED' } });

    await waitFor(() => {
      expect(screen.queryByText('TA-001')).not.toBeInTheDocument();
      expect(screen.getByText('TA-003')).toBeInTheDocument();
    });
  });
});
