import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { PricingManagementPage } from '../pages/PricingManagementPage';

describe('PricingManagementPage', () => {
  it('renders the page header "Pricing Management"', async () => {
    renderWithProviders(<PricingManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Pricing Management')).toBeInTheDocument();
    });
  });

  it('shows subtitle about discount schemes', async () => {
    renderWithProviders(<PricingManagementPage />);
    await waitFor(() => {
      expect(screen.getByText(/discount schemes/i)).toBeInTheDocument();
    });
  });
});
