import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { SystemParametersPage } from '../pages/SystemParametersPage';

describe('SystemParametersPage', () => {
  it('renders the page header "System Parameters"', async () => {
    renderWithProviders(<SystemParametersPage />);
    await waitFor(() => {
      expect(screen.getByText('System Parameters')).toBeInTheDocument();
    });
  });

  it('shows all tabs', async () => {
    renderWithProviders(<SystemParametersPage />);
    await waitFor(() => {
      expect(screen.getByText('Parameters')).toBeInTheDocument();
      expect(screen.getByText('Feature Flags')).toBeInTheDocument();
      expect(screen.getByText('Rate Tables')).toBeInTheDocument();
      expect(screen.getByText('Lookup Codes')).toBeInTheDocument();
      expect(screen.getByText('System Info')).toBeInTheDocument();
    });
  });

  it('shows subtitle text about configure', async () => {
    renderWithProviders(<SystemParametersPage />);
    await waitFor(() => {
      expect(screen.getByText(/configure system-wide parameters/i)).toBeInTheDocument();
    });
  });
});
