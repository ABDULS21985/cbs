import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { ReportsHomePage } from '../pages/ReportsHomePage';

describe('ReportsHomePage', () => {
  it('renders the page title', () => {
    renderWithProviders(<ReportsHomePage />);
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
  });

  it('displays all 12 report category cards with correct labels', () => {
    renderWithProviders(<ReportsHomePage />);

    const expectedCategories = [
      'Executive Dashboard',
      'Financial Reports',
      'Loan Analytics',
      'Payment Analytics',
      'Deposit Analytics',
      'Channel Analytics',
      'Customer Analytics',
      'Treasury & ALM',
      'Marketing Analytics',
      'Operational Reports',
      'Compliance Reports',
      'Custom Reports',
    ];

    for (const label of expectedCategories) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('cards are clickable buttons with correct text', () => {
    renderWithProviders(<ReportsHomePage />);

    const buttons = screen.getAllByRole('button');
    const buttonTexts = buttons.map((b) => b.textContent);

    expect(buttonTexts.some((t) => t?.includes('Executive Dashboard'))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes('Financial Reports'))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes('Loan Analytics'))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes('Custom Reports'))).toBe(true);
  });

  it('renders the Related Tools section', () => {
    renderWithProviders(<ReportsHomePage />);
    expect(screen.getByText('Related Tools')).toBeInTheDocument();
  });

  it('renders related tool cards', () => {
    renderWithProviders(<ReportsHomePage />);
    expect(screen.getByText('Document Management')).toBeInTheDocument();
    expect(screen.getByText('Account Statements')).toBeInTheDocument();
  });

  it('renders descriptions for report categories', () => {
    renderWithProviders(<ReportsHomePage />);
    expect(
      screen.getByText('High-level KPIs and bank-wide performance metrics'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Build, save, and schedule custom report templates'),
    ).toBeInTheDocument();
  });
});
