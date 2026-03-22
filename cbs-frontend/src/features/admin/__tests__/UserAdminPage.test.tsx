import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { UserAdminPage } from '../pages/UserAdminPage';

describe('UserAdminPage', () => {
  it('renders the page header "User Administration"', async () => {
    renderWithProviders(<UserAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('User Administration')).toBeInTheDocument();
    });
  });

  it('shows all tabs', async () => {
    renderWithProviders(<UserAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Roles')).toBeInTheDocument();
      expect(screen.getByText('Permission Matrix')).toBeInTheDocument();
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
      expect(screen.getByText('Login History')).toBeInTheDocument();
    });
  });

  it('shows the New User button', async () => {
    renderWithProviders(<UserAdminPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/new user/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders subtitle text about managing users', async () => {
    renderWithProviders(<UserAdminPage />);
    await waitFor(() => {
      expect(screen.getByText(/manage users, roles, permissions/i)).toBeInTheDocument();
    });
  });
});
