import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { CashPoolPage } from './CashPoolPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockPools = [
  {
    id: 1,
    poolCode: 'POOL-001',
    poolName: 'Corporate Treasury Pool',
    poolType: 'ZERO_BALANCE',
    headerAccountId: 100,
    customerId: 1,
    currency: 'NGN',
    sweepFrequency: 'END_OF_DAY',
    sweepTime: '16:00',
    targetBalance: null,
    thresholdAmount: null,
    minSweepAmount: 50000,
    interestReallocation: false,
    intercompanyLoan: false,
    isCrossBorder: false,
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-03-18T14:00:00Z',
  },
  {
    id: 2,
    poolCode: 'POOL-002',
    poolName: 'Regional Operations Pool',
    poolType: 'TARGET_BALANCE',
    headerAccountId: 200,
    customerId: 2,
    currency: 'NGN',
    sweepFrequency: 'REAL_TIME',
    sweepTime: null,
    targetBalance: 10000000,
    thresholdAmount: null,
    minSweepAmount: 100000,
    interestReallocation: true,
    intercompanyLoan: false,
    isCrossBorder: false,
    isActive: true,
    createdAt: '2024-06-01T08:00:00Z',
    updatedAt: '2024-06-01T08:00:00Z',
  },
];

const mockParticipants = [
  {
    id: 1,
    poolId: 1,
    accountId: 101,
    participantName: 'Subsidiary A',
    participantRole: 'PARTICIPANT',
    sweepDirection: 'BIDIRECTIONAL',
    targetBalance: 0,
    priority: 1,
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    poolId: 1,
    accountId: 102,
    participantName: 'Subsidiary B',
    participantRole: 'PARTICIPANT',
    sweepDirection: 'INWARD',
    targetBalance: 10000000,
    priority: 2,
    isActive: true,
    createdAt: '2024-02-01T10:00:00Z',
  },
];

function setupDefaultHandlers() {
  server.use(
    http.get('/api/v1/cash-pools', () =>
      HttpResponse.json(wrap(mockPools)),
    ),
    http.get('/api/v1/cash-pools/:poolCode/participants', () =>
      HttpResponse.json(wrap(mockParticipants)),
    ),
    http.get('/api/v1/cash-pools/:poolCode/sweeps', () =>
      HttpResponse.json(wrap([])),
    ),
  );
}

describe('CashPoolPage', () => {
  it('renders page header and New Pool button', async () => {
    setupDefaultHandlers();
    renderWithProviders(<CashPoolPage />);

    expect(screen.getByText('Cash Pooling')).toBeInTheDocument();
    expect(screen.getByText('New Pool')).toBeInTheDocument();
  });

  it('displays summary stat cards after pools load', async () => {
    setupDefaultHandlers();
    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Treasury Pool')).toBeInTheDocument();
    });

    // Pool-related stat labels are rendered once pool loading is done
    expect(screen.getByText('Number of Pools')).toBeInTheDocument();
    expect(screen.getByText('Pending Sweeps')).toBeInTheDocument();

    // Wait for participant counts query to settle
    await waitFor(() => {
      expect(screen.getByText('Active Participants')).toBeInTheDocument();
    });
  });

  it('renders pool cards with pool names after data loads', async () => {
    setupDefaultHandlers();
    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Treasury Pool')).toBeInTheDocument();
    });

    expect(screen.getByText('Regional Operations Pool')).toBeInTheDocument();
  });

  it('shows pool type and sweep frequency on pool cards', async () => {
    setupDefaultHandlers();
    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Treasury Pool')).toBeInTheDocument();
    });

    // Pool type labels (with underscore replaced by space)
    expect(screen.getAllByText('ZERO BALANCE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TARGET BALANCE').length).toBeGreaterThan(0);
  });

  it('shows ACTIVE badge on active pool cards', async () => {
    setupDefaultHandlers();
    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Treasury Pool')).toBeInTheDocument();
    });

    const activeBadges = screen.getAllByText('ACTIVE');
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  it('shows loading skeleton while pools are being fetched', () => {
    server.use(
      http.get('/api/v1/cash-pools', () => new Promise(() => {})),
    );

    renderWithProviders(<CashPoolPage />);

    expect(screen.getByText('Cash Pooling')).toBeInTheDocument();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no pools exist', async () => {
    server.use(
      http.get('/api/v1/cash-pools', () => HttpResponse.json(wrap([]))),
    );

    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('No cash pools configured yet.')).toBeInTheDocument();
    });

    expect(screen.getByText(/create a new pool/i)).toBeInTheDocument();
  });

  it('opens Create Pool wizard when New Pool button is clicked', async () => {
    setupDefaultHandlers();
    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Treasury Pool')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Pool'));

    await waitFor(() => {
      expect(screen.getByText('Create Cash Pool')).toBeInTheDocument();
    });

    // Wizard step 1 fields
    expect(screen.getByText('Pool Setup')).toBeInTheDocument();
  });

  it('shows wizard step 1 form fields', async () => {
    setupDefaultHandlers();
    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Treasury Pool')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Pool'));

    await waitFor(() => {
      expect(screen.getByText('Create Cash Pool')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/corporate treasury pool/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Account ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Customer ID')).toBeInTheDocument();
  });

  it('validates wizard step 1 required fields', async () => {
    setupDefaultHandlers();
    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Treasury Pool')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Pool'));

    await waitFor(() => {
      expect(screen.getByText('Create Cash Pool')).toBeInTheDocument();
    });

    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Pool name is required')).toBeInTheDocument();
    });
  });

  it('displays pool code on pool cards', async () => {
    setupDefaultHandlers();
    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Treasury Pool')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/POOL-001/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/POOL-002/).length).toBeGreaterThan(0);
  });

  it('shows empty state Create Pool button that opens wizard', async () => {
    server.use(
      http.get('/api/v1/cash-pools', () => HttpResponse.json(wrap([]))),
    );

    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('No cash pools configured yet.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Pool'));

    await waitFor(() => {
      expect(screen.getByText('Create Cash Pool')).toBeInTheDocument();
    });
  });

  it('handles server error for pool fetch gracefully', async () => {
    server.use(
      http.get('/api/v1/cash-pools', () =>
        HttpResponse.json({ success: false, message: 'Server Error' }, { status: 500 }),
      ),
    );

    renderWithProviders(<CashPoolPage />);

    // getCashPools catches errors and returns [] — shows empty state
    await waitFor(() => {
      expect(screen.getByText('No cash pools configured yet.')).toBeInTheDocument();
    });
  });

  it('shows currency on pool cards', async () => {
    setupDefaultHandlers();
    renderWithProviders(<CashPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Treasury Pool')).toBeInTheDocument();
    });

    const ngnElements = screen.getAllByText('NGN');
    expect(ngnElements.length).toBeGreaterThan(0);
  });
});
