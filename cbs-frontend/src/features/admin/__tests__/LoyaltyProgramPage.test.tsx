import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { LoyaltyProgramPage } from '../pages/LoyaltyProgramPage';

describe('LoyaltyProgramPage', () => {
  it('renders the page header "Loyalty Programs"', async () => {
    renderWithProviders(<LoyaltyProgramPage />);
    await waitFor(() => {
      expect(screen.getByText('Loyalty Programs')).toBeInTheDocument();
    });
  });

  it('shows subtitle about loyalty management', async () => {
    renderWithProviders(<LoyaltyProgramPage />);
    await waitFor(() => {
      expect(screen.getByText(/tiers, and rewards/i)).toBeInTheDocument();
    });
  });
});
