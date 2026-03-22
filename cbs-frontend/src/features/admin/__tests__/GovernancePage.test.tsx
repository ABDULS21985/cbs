import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { GovernancePage } from '../pages/GovernancePage';

describe('GovernancePage', () => {
  it('renders the page header "Governance"', async () => {
    renderWithProviders(<GovernancePage />);
    await waitFor(() => {
      expect(screen.getByText('Governance')).toBeInTheDocument();
    });
  });

  it('shows subtitle about audit trail', async () => {
    renderWithProviders(<GovernancePage />);
    await waitFor(() => {
      expect(screen.getByText(/audit trail/i)).toBeInTheDocument();
    });
  });
});
