import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { ProductFactoryPage } from '../pages/ProductFactoryPage';

describe('ProductFactoryPage', () => {
  it('renders the page header "Product Factory"', async () => {
    renderWithProviders(<ProductFactoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Product Factory')).toBeInTheDocument();
    });
  });

  it('shows subtitle about product definitions', async () => {
    renderWithProviders(<ProductFactoryPage />);
    await waitFor(() => {
      expect(screen.getByText(/product definitions/i)).toBeInTheDocument();
    });
  });

  it('displays a Create Product button', async () => {
    renderWithProviders(<ProductFactoryPage />);
    await waitFor(() => {
      expect(screen.getByText(/create product/i)).toBeInTheDocument();
    });
  });
});
