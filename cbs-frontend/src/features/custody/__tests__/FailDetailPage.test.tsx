import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { FailDetailPage } from '../pages/FailDetailPage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_FAIL = {
  data: {
    id: 1, failRef: 'SF-TEST001', failType: 'DELIVERY_FAIL',
    instrumentCode: 'BOND-001', instrumentName: 'Treasury Bond 5Y',
    isin: 'US912810TV08', counterpartyCode: 'CP-001', counterpartyName: 'Test Bank',
    originalSettlementDate: '2026-03-15', failStartDate: '2026-03-15',
    agingDays: 7, agingBucket: '4_TO_7_DAYS', quantity: 1000, amount: 500000,
    currency: 'USD', penaltyAccrued: 350, buyInEligible: false,
    escalationLevel: 'OPERATIONS', status: 'OPEN',
  },
};

const MOCK_RESOLVED_FAIL = {
  data: {
    ...MOCK_FAIL.data,
    status: 'RESOLVED',
    resolutionAction: 'RESUBMIT',
    resolvedAt: '2026-03-22T10:00:00Z',
  },
};

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers(fail = MOCK_FAIL) {
  server.use(
    http.get('/api/v1/securities-fails/SF-TEST001', () =>
      HttpResponse.json(fail),
    ),
    http.post('/api/v1/securities-fails/SF-TEST001/escalate', () =>
      HttpResponse.json({ data: { ...fail.data, escalationLevel: 'MANAGEMENT' } }),
    ),
    http.post('/api/v1/securities-fails/SF-TEST001/penalty', () =>
      HttpResponse.json({ data: { ...fail.data, penaltyAccrued: 500 } }),
    ),
    http.post('/api/v1/securities-fails/SF-TEST001/resolve', () =>
      HttpResponse.json({ data: { ...fail.data, status: 'RESOLVED' } }),
    ),
  );
}

function renderPage(fail = MOCK_FAIL) {
  setupHandlers(fail);
  return renderWithProviders(
    <Routes>
      <Route path="/custody/fails/:ref" element={<FailDetailPage />} />
    </Routes>,
    { route: '/custody/fails/SF-TEST001' },
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FailDetailPage', () => {
  it('renders fail reference as page header', async () => {
    renderPage();
    expect(screen.getByText('SF-TEST001')).toBeInTheDocument();
  });

  it('renders fail details when loaded', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Fail Details')).toBeInTheDocument();
      expect(screen.getByText('Treasury Bond 5Y')).toBeInTheDocument();
      expect(screen.getByText('US912810TV08')).toBeInTheDocument();
      expect(screen.getByText('Test Bank')).toBeInTheDocument();
      expect(screen.getByText('DELIVERY FAIL')).toBeInTheDocument();
    });
  });

  it('shows aging information', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/7d/)).toBeInTheDocument();
      expect(screen.getByText(/4 TO 7 DAYS/)).toBeInTheDocument();
    });
  });

  it('shows action buttons: Escalate, Buy-In, Penalty, Resolve', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Available Actions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /escalate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /buy-in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /calculate penalty/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
    });
  });

  it('Escalate dialog opens and shows escalation confirmation', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^escalate$/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /^escalate$/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Escalate Fail' })).toBeInTheDocument();
      expect(screen.getByText(/escalate fail.*to the next level/i)).toBeInTheDocument();
    });
  });

  it('Penalty dialog opens and accepts daily rate input', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /calculate penalty/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /calculate penalty/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Calculate Penalty' })).toBeInTheDocument();
      expect(screen.getByText(/daily rate/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.01')).toBeInTheDocument();
    });
  });

  it('Resolve dialog has backend-matching resolution options', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^resolve$/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /^resolve$/i }));
    await waitFor(() => {
      expect(screen.getByText('Resolve Fail')).toBeInTheDocument();
      const select = screen.getByDisplayValue('Resubmit');
      expect(select).toBeInTheDocument();
      // Verify all resolution options are available
      expect(screen.getByText('Resubmit')).toBeInTheDocument();
      expect(screen.getByText('Partial Settlement')).toBeInTheDocument();
      expect(screen.getByText('Counterparty Chase')).toBeInTheDocument();
      expect(screen.getByText('Buy-In')).toBeInTheDocument();
      expect(screen.getByText('Shape Instruction')).toBeInTheDocument();
      expect(screen.getByText('Cancel & Reissue')).toBeInTheDocument();
      expect(screen.getByText('Manual Override')).toBeInTheDocument();
    });
  });

  it('actions are disabled when fail is RESOLVED', async () => {
    renderPage(MOCK_RESOLVED_FAIL);
    await waitFor(() => {
      expect(screen.getByText('This fail has been resolved. No further actions available.')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /escalate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /buy-in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /calculate penalty/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^resolve$/i })).not.toBeInTheDocument();
  });

  it('shows buy-in eligibility information', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Buy-In Eligible')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });
});
