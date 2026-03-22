import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { BillerAdminPage } from '../pages/BillerAdminPage';

describe('BillerAdminPage', () => {
  it('renders the page header "Biller Management"', async () => {
    renderWithProviders(<BillerAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Biller Management')).toBeInTheDocument();
    });
  });

  it('shows subtitle about billers', async () => {
    renderWithProviders(<BillerAdminPage />);
    await waitFor(() => {
      expect(screen.getByText(/register and manage/i)).toBeInTheDocument();
    });
  });

  it('shows Add Biller button', async () => {
    renderWithProviders(<BillerAdminPage />);
    await waitFor(() => {
      expect(screen.getByText(/add biller/i)).toBeInTheDocument();
    });
  });
});
