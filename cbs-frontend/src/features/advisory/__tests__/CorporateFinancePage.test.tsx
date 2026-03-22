import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { CorporateFinancePage } from '../pages/CorporateFinancePage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockEngagements = [
  {
    id: 1, engagementCode: 'CF-001', engagementName: 'Debt Restructuring — ABC',
    engagementType: 'DEBT_RESTRUCTURING', clientName: 'ABC Corp',
    clientSector: 'Financial Services', currency: 'USD', dealValueEstimate: 25000000,
    ourRole: 'SOLE_ADVISER', leadBanker: 'Jane Smith', totalFeesInvoiced: 150000,
    totalFeesPaid: 100000, status: 'ANALYSIS', completionDate: null,
  },
  {
    id: 2, engagementCode: 'CF-002', engagementName: 'Capital Raise — XYZ',
    engagementType: 'CAPITAL_RAISE_ADVISORY', clientName: 'XYZ Holdings',
    clientSector: 'Energy', currency: 'EUR', dealValueEstimate: 80000000,
    ourRole: 'LEAD_ADVISER', leadBanker: 'John Doe', totalFeesInvoiced: 500000,
    totalFeesPaid: 500000, status: 'COMPLETED', completionDate: '2026-01-15',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/corporate-finance', () => HttpResponse.json(wrap(mockEngagements))),
    http.post('/api/v1/corporate-finance', () => HttpResponse.json(wrap({
      ...mockEngagements[0], id: 3, engagementCode: 'CF-003',
    }))),
    http.post('/api/v1/corporate-finance/:code/draft', () => HttpResponse.json(wrap({
      ...mockEngagements[0], status: 'DRAFT_DELIVERED',
    }))),
    http.post('/api/v1/corporate-finance/:code/finalize', () => HttpResponse.json(wrap({
      ...mockEngagements[0], status: 'FINAL_DELIVERED',
    }))),
    http.post('/api/v1/corporate-finance/:code/invoice', () => HttpResponse.json(wrap({
      ...mockEngagements[0], totalFeesInvoiced: 200000,
    }))),
    http.post('/api/v1/corporate-finance/:code/payment', () => HttpResponse.json(wrap({
      ...mockEngagements[0], totalFeesPaid: 200000,
    }))),
    http.post('/api/v1/corporate-finance/:code/close', () => HttpResponse.json(wrap({
      ...mockEngagements[0], status: 'COMPLETED',
    }))),
  );
}

describe('CorporateFinancePage', () => {
  it('renders page header and new mandate button', () => {
    setupHandlers();
    renderWithProviders(<CorporateFinancePage />);
    expect(screen.getByText('Corporate Finance')).toBeInTheDocument();
    expect(screen.getByText('New Mandate')).toBeInTheDocument();
  });

  it('renders stat cards', async () => {
    setupHandlers();
    renderWithProviders(<CorporateFinancePage />);
    await waitFor(() => {
      expect(screen.getByText('Active Mandates')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Invoiced')).toBeInTheDocument();
    expect(screen.getByText('Completed This Year')).toBeInTheDocument();
    expect(screen.getByText('Avg Deal Size')).toBeInTheDocument();
  });

  it('loads and displays engagements', async () => {
    setupHandlers();
    renderWithProviders(<CorporateFinancePage />);
    await waitFor(() => {
      expect(screen.getByText('CF-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Debt Restructuring — ABC')).toBeInTheDocument();
    expect(screen.getByText('ABC Corp')).toBeInTheDocument();
    expect(screen.getByText('CF-002')).toBeInTheDocument();
  });

  it('shows row actions with deliver draft, finalize, invoice, payment, complete', async () => {
    setupHandlers();
    renderWithProviders(<CorporateFinancePage />);
    await waitFor(() => {
      expect(screen.getByText('CF-001')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByTitle('Actions');
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Deliver Draft')).toBeInTheDocument();
    });
    expect(screen.getByText('Finalize')).toBeInTheDocument();
    expect(screen.getByText('Record Invoice')).toBeInTheDocument();
    expect(screen.getByText('Record Payment')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('opens new mandate dialog', async () => {
    setupHandlers();
    renderWithProviders(<CorporateFinancePage />);
    fireEvent.click(screen.getByText('New Mandate'));
    await waitFor(() => {
      expect(screen.getByText('New Corporate Finance Mandate')).toBeInTheDocument();
    });
    expect(screen.getByText('Engagement Name *')).toBeInTheDocument();
    expect(screen.getByText('Scope of Work')).toBeInTheDocument();
  });

  it('filters by type and status', async () => {
    setupHandlers();
    renderWithProviders(<CorporateFinancePage />);
    await waitFor(() => {
      expect(screen.getByText('CF-001')).toBeInTheDocument();
    });

    const typeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(typeSelect, { target: { value: 'CAPITAL_RAISE_ADVISORY' } });

    await waitFor(() => {
      expect(screen.queryByText('CF-001')).not.toBeInTheDocument();
      expect(screen.getByText('CF-002')).toBeInTheDocument();
    });
  });

  it('disables actions for completed engagements', async () => {
    setupHandlers();
    renderWithProviders(<CorporateFinancePage />);
    await waitFor(() => {
      expect(screen.getByText('CF-002')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByTitle('Actions');
    fireEvent.click(actionButtons[1]);

    await waitFor(() => {
      const draftBtn = screen.getByText('Deliver Draft').closest('button');
      expect(draftBtn).toBeDisabled();
    });
  });
});
