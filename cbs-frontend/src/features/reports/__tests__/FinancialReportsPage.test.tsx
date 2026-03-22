import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';

import { FinancialReportsPage } from '../pages/FinancialReportsPage';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FinancialReportsPage', () => {
  it('renders page title with "Financial Reports"', () => {
    renderWithProviders(<FinancialReportsPage />);
    expect(screen.getByText('Financial Reports')).toBeInTheDocument();
  });

  it('report type selector is present (Balance Sheet, Income Statement, Cash Flow, Capital Adequacy)', () => {
    renderWithProviders(<FinancialReportsPage />);
    expect(screen.getByText('Balance Sheet')).toBeInTheDocument();
    expect(screen.getByText('Income Statement')).toBeInTheDocument();
    expect(screen.getByText('Cash Flow')).toBeInTheDocument();
    expect(screen.getByText('Capital Adequacy')).toBeInTheDocument();
  });

  it('period selector input is present', () => {
    renderWithProviders(<FinancialReportsPage />);
    expect(screen.getByText('Period')).toBeInTheDocument();
  });

  it('Generate Report button is present', () => {
    renderWithProviders(<FinancialReportsPage />);
    expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
  });

  it('export buttons are present', () => {
    renderWithProviders(<FinancialReportsPage />);
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument();
  });
});
