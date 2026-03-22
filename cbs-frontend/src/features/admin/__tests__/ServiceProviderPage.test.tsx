import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { ServiceProviderPage } from '../pages/ServiceProviderPage';

describe('ServiceProviderPage', () => {
  it('renders the page header "Service Providers"', async () => {
    renderWithProviders(<ServiceProviderPage />);
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
  });

  it('shows subtitle about monitoring integrations', async () => {
    renderWithProviders(<ServiceProviderPage />);
    await waitFor(() => {
      expect(screen.getByText(/monitor and manage/i)).toBeInTheDocument();
    });
  });
});
