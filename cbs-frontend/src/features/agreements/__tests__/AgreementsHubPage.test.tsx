import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { AgreementsHubPage } from '../pages/AgreementsHubPage';

describe('AgreementsHubPage', () => {
  it('renders page title', () => {
    renderWithProviders(<AgreementsHubPage />);
    expect(screen.getByText('Agreements & Pricing')).toBeInTheDocument();
  });

  it('displays all navigation cards', async () => {
    renderWithProviders(<AgreementsHubPage />);
    await waitFor(() => {
      expect(screen.getByText('Customer Agreements')).toBeInTheDocument();
      expect(screen.getByText('TD Frameworks')).toBeInTheDocument();
      expect(screen.getByText('TD Portfolio Analytics')).toBeInTheDocument();
      expect(screen.getByText('Commission Management')).toBeInTheDocument();
      expect(screen.getByText('Pricing & Discounts')).toBeInTheDocument();
    });
  });

  it('displays quick stat cards', async () => {
    renderWithProviders(<AgreementsHubPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Active')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Renewals')).toBeInTheDocument();
      expect(screen.getByText('Overdue Reviews')).toBeInTheDocument();
      expect(screen.getByText('Active Discounts')).toBeInTheDocument();
    });
  });

  it('shows Open link on each card', async () => {
    renderWithProviders(<AgreementsHubPage />);
    await waitFor(() => {
      const openLinks = screen.getAllByText('Open');
      expect(openLinks.length).toBe(5);
    });
  });
});
