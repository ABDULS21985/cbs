import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { CampaignManagementPage } from '../pages/CampaignManagementPage';

describe('CampaignManagementPage', () => {
  it('renders the page header "Campaign Management"', async () => {
    renderWithProviders(<CampaignManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Campaign Management')).toBeInTheDocument();
    });
  });

  it('shows subtitle about marketing campaigns', async () => {
    renderWithProviders(<CampaignManagementPage />);
    await waitFor(() => {
      expect(screen.getByText(/marketing campaigns/i)).toBeInTheDocument();
    });
  });
});
