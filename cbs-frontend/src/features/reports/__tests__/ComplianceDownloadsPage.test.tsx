import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';

import { ComplianceDownloadsPage } from '../pages/ComplianceDownloadsPage';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ComplianceDownloadsPage', () => {
  it('renders page title "Compliance Downloads"', () => {
    renderWithProviders(<ComplianceDownloadsPage />);
    expect(screen.getByText('Compliance & Regulatory Downloads')).toBeInTheDocument();
  });

  it('all 5 report download cards are present (NIP, CTR, STR, FIRS, Large Value)', () => {
    renderWithProviders(<ComplianceDownloadsPage />);
    expect(screen.getByText('NIP Transaction Report')).toBeInTheDocument();
    expect(screen.getByText('Currency Transaction Report')).toBeInTheDocument();
    expect(screen.getByText('Suspicious Transaction Report')).toBeInTheDocument();
    expect(screen.getByText('FIRS Tax Report')).toBeInTheDocument();
    expect(screen.getByText('Large Value Transactions')).toBeInTheDocument();
  });

  it('each card has a Download button', () => {
    renderWithProviders(<ComplianceDownloadsPage />);
    const downloadButtons = screen.getAllByRole('button', { name: /download report/i });
    expect(downloadButtons).toHaveLength(5);
  });

  it('date inputs are present on cards', () => {
    renderWithProviders(<ComplianceDownloadsPage />);
    // NIP, CTR, STR, and Large Value cards each have Date From / Date To inputs
    const dateFromLabels = screen.getAllByText('Date From');
    expect(dateFromLabels.length).toBeGreaterThanOrEqual(4);

    const dateToLabels = screen.getAllByText('Date To');
    expect(dateToLabels.length).toBeGreaterThanOrEqual(4);
  });

  it('sets document.title correctly', () => {
    renderWithProviders(<ComplianceDownloadsPage />);
    expect(document.title).toBe('Compliance Downloads | CBS');
  });
});
