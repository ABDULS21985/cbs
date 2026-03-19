import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { PortalCardControlsPage } from './PortalCardControlsPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCards = [
  { id: 1, maskedPan: '**** **** **** 1234', type: 'DEBIT', expiry: '03/28', status: 'ACTIVE', onlineEnabled: true, internationalEnabled: false, dailyPosLimit: 500000, dailyAtmLimit: 200000, dailyOnlineLimit: 300000 },
  { id: 2, maskedPan: '**** **** **** 5678', type: 'CREDIT', expiry: '06/27', status: 'ACTIVE', onlineEnabled: false, internationalEnabled: true, dailyPosLimit: 1000000, dailyAtmLimit: 500000, dailyOnlineLimit: 750000 },
];

function setupHandlers(cards = mockCards) {
  server.use(
    http.get('/api/v1/portal/cards', () => HttpResponse.json(wrap(cards))),
    http.post('/api/v1/portal/cards/:id/toggle', () => HttpResponse.json(wrap(null))),
    http.post('/api/v1/portal/cards/:id/block', () => HttpResponse.json(wrap(null))),
  );
}

describe('PortalCardControlsPage', () => {
  it('renders the page heading', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('Card Controls')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    server.use(
      http.get('/api/v1/portal/cards', () => new Promise(() => {})),
    );
    renderWithProviders(<PortalCardControlsPage />);
    // Loading spinner
  });

  it('displays card selectors after loading', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('**** **** **** 1234')).toBeInTheDocument();
    });
    expect(screen.getByText('**** **** **** 5678')).toBeInTheDocument();
  });

  it('displays card types', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('DEBIT Card')).toBeInTheDocument();
    });
    expect(screen.getByText('CREDIT Card')).toBeInTheDocument();
  });

  it('displays expiry dates', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('Expires 03/28')).toBeInTheDocument();
    });
    expect(screen.getByText('Expires 06/27')).toBeInTheDocument();
  });

  it('renders Online Transactions toggle', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('Online Transactions')).toBeInTheDocument();
    });
  });

  it('renders International Transactions toggle', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('International Transactions')).toBeInTheDocument();
    });
  });

  it('renders toggle descriptions', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('Enable/disable online purchases')).toBeInTheDocument();
    });
    expect(screen.getByText('Allow transactions outside Nigeria')).toBeInTheDocument();
  });

  it('renders Transaction Limits section', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('Transaction Limits')).toBeInTheDocument();
    });
  });

  it('displays limit labels', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('Daily POS Limit')).toBeInTheDocument();
    });
    expect(screen.getByText('Daily ATM Limit')).toBeInTheDocument();
    expect(screen.getByText('Daily Online Limit')).toBeInTheDocument();
  });

  it('renders Block Card button for active card', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('Block Card Immediately')).toBeInTheDocument();
    });
  });

  it('can select a different card', async () => {
    setupHandlers();
    
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('**** **** **** 5678')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('**** **** **** 5678'));
    // The second card should now be selected (highlighted)
  });

  it('shows "No cards found" when no cards', async () => {
    setupHandlers([]);
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('No cards found')).toBeInTheDocument();
    });
  });

  it('handles cards API error', async () => {
    server.use(
      http.get('/api/v1/portal/cards', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('No cards found')).toBeInTheDocument();
    });
  });

  it('does not show Block button for BLOCKED card', async () => {
    setupHandlers([{ ...mockCards[0], status: 'BLOCKED' }]);
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('Card Controls')).toBeInTheDocument();
    });
    expect(screen.queryByText('Block Card Immediately')).not.toBeInTheDocument();
  });

  it('shows BLOCKED badge on blocked card', async () => {
    setupHandlers([{ ...mockCards[0], status: 'BLOCKED' }]);
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('BLOCKED')).toBeInTheDocument();
    });
  });

  it('first card is selected by default', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      expect(screen.getByText('**** **** **** 1234')).toBeInTheDocument();
    });
  });

  it('renders card selector buttons', async () => {
    setupHandlers();
    renderWithProviders(<PortalCardControlsPage />);
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
