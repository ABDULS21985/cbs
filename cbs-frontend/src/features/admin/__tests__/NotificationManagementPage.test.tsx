import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { NotificationManagementPage } from '../pages/NotificationManagementPage';

describe('NotificationManagementPage', () => {
  it('renders the page header "Notification Management"', async () => {
    renderWithProviders(<NotificationManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Notification Management')).toBeInTheDocument();
    });
  });

  it('shows all tabs', async () => {
    renderWithProviders(<NotificationManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('Channels')).toBeInTheDocument();
      expect(screen.getByText('Delivery Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Schedules')).toBeInTheDocument();
    });
  });
});
