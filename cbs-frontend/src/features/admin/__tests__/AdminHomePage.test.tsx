import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { AdminHomePage } from '../pages/AdminHomePage';

describe('AdminHomePage', () => {
  it('renders the page header "Administration"', async () => {
    renderWithProviders(<AdminHomePage />);
    await waitFor(() => {
      expect(screen.getByText('Administration')).toBeInTheDocument();
    });
  });

  it('displays administration module cards', async () => {
    renderWithProviders(<AdminHomePage />);
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('System Parameters')).toBeInTheDocument();
      expect(screen.getByText('Product Factory')).toBeInTheDocument();
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Governance')).toBeInTheDocument();
      expect(screen.getByText('Billers')).toBeInTheDocument();
    });
  });

  it('shows summary statistics section', async () => {
    renderWithProviders(<AdminHomePage />);
    await waitFor(() => {
      expect(screen.getByText(/total users/i)).toBeInTheDocument();
    });
  });

  it('shows the subtitle text', async () => {
    renderWithProviders(<AdminHomePage />);
    await waitFor(() => {
      expect(screen.getByText(/system configuration/i)).toBeInTheDocument();
    });
  });
});
