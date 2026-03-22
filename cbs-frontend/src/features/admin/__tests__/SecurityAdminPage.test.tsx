import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { SecurityAdminPage } from '../pages/SecurityAdminPage';

describe('SecurityAdminPage', () => {
  it('renders the page header "Security Administration"', async () => {
    renderWithProviders(<SecurityAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Security Administration')).toBeInTheDocument();
    });
  });

  it('displays the subtitle about RBAC and ABAC', async () => {
    renderWithProviders(<SecurityAdminPage />);
    await waitFor(() => {
      expect(screen.getByText(/RBAC, ABAC/i)).toBeInTheDocument();
    });
  });

  it('shows Overview tab content with stat cards', async () => {
    renderWithProviders(<SecurityAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Roles')).toBeInTheDocument();
      expect(screen.getByText('Permissions')).toBeInTheDocument();
    });
  });
});
