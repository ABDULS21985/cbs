import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { WalletPage } from './WalletPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockWallets = [
  {
    id: 101,
    account: { id: 42, accountNumber: '0100000042' },
    currencyCode: 'NGN',
    bookBalance: 5000000,
    availableBalance: 4800000,
    lienAmount: 200000,
    isPrimary: true,
    status: 'ACTIVE',
    createdAt: '2024-06-01T10:00:00Z',
    version: 1,
  },
  {
    id: 102,
    account: { id: 42, accountNumber: '0100000042' },
    currencyCode: 'USD',
    bookBalance: 10000,
    availableBalance: 9500,
    lienAmount: 500,
    isPrimary: false,
    status: 'ACTIVE',
    createdAt: '2024-06-15T14:00:00Z',
    version: 1,
  },
];

const mockTransactions = [
  {
    id: 1001,
    walletId: 101,
    type: 'CREDIT' as const,
    amount: 500000,
    balanceAfter: 5000000,
    narration: 'Salary deposit',
    reference: 'TXN-REF-001',
    createdAt: '2024-07-01T09:30:00Z',
  },
  {
    id: 1002,
    walletId: 101,
    type: 'DEBIT' as const,
    amount: 100000,
    balanceAfter: 4900000,
    narration: 'Utility payment',
    reference: 'TXN-REF-002',
    createdAt: '2024-07-02T11:00:00Z',
  },
];

const mockFxRates = [
  {
    sourceCurrency: 'NGN',
    targetCurrency: 'USD',
    buyRate: 0.00065,
    sellRate: 0.00062,
    midRate: 0.000635,
  },
];

function setupDefaultHandlers() {
  server.use(
    http.get('/api/v1/wallets/account/42', () =>
      HttpResponse.json(wrap(mockWallets)),
    ),
    http.get('/api/v1/wallets/101/transactions', () =>
      HttpResponse.json(wrap(mockTransactions)),
    ),
    http.get('/api/v1/wallets/102/transactions', () =>
      HttpResponse.json(wrap([])),
    ),
    http.get('/api/v1/fx/rate', () =>
      HttpResponse.json(wrap(mockFxRates)),
    ),
    http.post('/api/v1/wallets/account/42', () =>
      HttpResponse.json(
        wrap({
          id: 103,
          account: { id: 42, accountNumber: '0100000042' },
          currencyCode: 'EUR',
          bookBalance: 0,
          availableBalance: 0,
          lienAmount: 0,
          isPrimary: false,
          status: 'ACTIVE',
          createdAt: '2024-08-01T10:00:00Z',
          version: 1,
        }),
      ),
    ),
    http.post('/api/v1/wallets/account/42/credit', () =>
      HttpResponse.json(wrap(mockWallets[0])),
    ),
    http.post('/api/v1/wallets/account/42/debit', () =>
      HttpResponse.json(wrap(mockWallets[0])),
    ),
    http.post('/api/v1/wallets/account/42/convert', () =>
      HttpResponse.json(wrap(1)),
    ),
  );
}

describe('WalletPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('renders page title and subtitle with account id', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    expect(screen.getByText('Multi-Currency Wallets')).toBeInTheDocument();
    expect(screen.getByText('Account #42')).toBeInTheDocument();
  });

  it('shows empty state when no accountId is provided', () => {
    renderWithProviders(<WalletPage />, { route: '/wallets' });

    expect(screen.getByText('Multi-Currency Wallets')).toBeInTheDocument();
    expect(screen.getByText('No account selected.')).toBeInTheDocument();
  });

  it('displays currency wallet cards after data loads', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('Nigerian Naira')).toBeInTheDocument();
    expect(screen.getByText('US Dollar')).toBeInTheDocument();
  });

  it('shows PRIMARY badge on primary wallet', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('PRIMARY')).toBeInTheDocument();
    });
  });

  it('displays wallet balances', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    // Check the stat labels exist
    const bookLabels = screen.getAllByText('Book Balance');
    expect(bookLabels.length).toBeGreaterThan(0);
    const availLabels = screen.getAllByText('Available');
    expect(availLabels.length).toBeGreaterThan(0);
    const lienLabels = screen.getAllByText('Lien');
    expect(lienLabels.length).toBeGreaterThan(0);
  });

  it('renders summary stat cards', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    }, { timeout: 10_000 });

    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.getByText('Currencies')).toBeInTheDocument();
    expect(screen.getByText('Largest Position')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows loading skeleton state', () => {
    server.use(
      http.get('/api/v1/wallets/account/42', () => new Promise(() => {})),
    );

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    expect(screen.getByText('Multi-Currency Wallets')).toBeInTheDocument();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty wallets message when account has no wallets', async () => {
    server.use(
      http.get('/api/v1/wallets/account/42', () =>
        HttpResponse.json(wrap([])),
      ),
    );

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('No currency wallets yet.')).toBeInTheDocument();
    });
  });

  it('opens create wallet modal when New Wallet button is clicked', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    // Click the "New Wallet" button in the page header
    const newWalletButtons = screen.getAllByText('New Wallet');
    fireEvent.click(newWalletButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('New Currency Wallet')).toBeInTheDocument();
    });

    // Currency select should be present
    expect(screen.getByText('Select currency...')).toBeInTheDocument();
    expect(screen.getByText('Create Wallet')).toBeInTheDocument();
  });

  it('create wallet modal filters out existing currencies', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    const newWalletButtons = screen.getAllByText('New Wallet');
    fireEvent.click(newWalletButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('New Currency Wallet')).toBeInTheDocument();
    });

    // The select should not contain NGN or USD since they already exist
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options).map(o => o.value);
    expect(options).not.toContain('NGN');
    expect(options).not.toContain('USD');
    // But should contain other currencies
    expect(options).toContain('EUR');
    expect(options).toContain('GBP');
  });

  it('closes create wallet modal on Cancel click', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    const newWalletButtons = screen.getAllByText('New Wallet');
    fireEvent.click(newWalletButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('New Currency Wallet')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('New Currency Wallet')).not.toBeInTheDocument();
    });
  });

  it('opens fund wallet modal when Fund button is clicked', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    const fundButtons = screen.getAllByText('Fund');
    fireEvent.click(fundButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Fund NGN Wallet')).toBeInTheDocument();
    });

    expect(screen.getByText('Available Balance')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument();
    expect(screen.getByText('Fund Wallet')).toBeInTheDocument();
  });

  it('fund wallet form submits with amount and narration', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.get('/api/v1/wallets/account/42', () =>
        HttpResponse.json(wrap(mockWallets)),
      ),
      http.post('/api/v1/wallets/account/42/credit', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(wrap(mockWallets[0]));
      }),
    );

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    const fundButtons = screen.getAllByText('Fund');
    fireEvent.click(fundButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Fund NGN Wallet')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '250000' },
    });
    fireEvent.change(screen.getByPlaceholderText('Optional description'), {
      target: { value: 'Test funding' },
    });

    fireEvent.click(screen.getByText('Fund Wallet'));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        walletId: 101,
        amount: 250000,
        narration: 'Test funding',
      });
    });
  });

  it('opens withdraw modal when Withdraw button is clicked', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    const withdrawButtons = screen.getAllByText('Withdraw');
    fireEvent.click(withdrawButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText('Withdraw from NGN Wallet'),
      ).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    expect(screen.getByText('Available Balance')).toBeInTheDocument();
  });

  it('debit wallet form submits with amount', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.get('/api/v1/wallets/account/42', () =>
        HttpResponse.json(wrap(mockWallets)),
      ),
      http.post('/api/v1/wallets/account/42/debit', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(wrap(mockWallets[0]));
      }),
    );

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    const withdrawButtons = screen.getAllByText('Withdraw');
    fireEvent.click(withdrawButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText('Withdraw from NGN Wallet'),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '100000' },
    });

    // Click the Withdraw button inside the modal
    const modalWithdrawBtn = screen.getAllByText('Withdraw').find(
      (el) => el.closest('.fixed') !== null,
    );
    if (modalWithdrawBtn) fireEvent.click(modalWithdrawBtn);

    await waitFor(() => {
      expect(capturedBody).toEqual({
        walletId: 101,
        amount: 100000,
        narration: undefined,
      });
    });
  });

  it('opens FX conversion modal when Convert button is clicked', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    const convertButtons = screen.getAllByText('Convert');
    fireEvent.click(convertButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('FX Conversion')).toBeInTheDocument();
    });

    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('Select target wallet...')).toBeInTheDocument();
  });

  it('FX conversion modal shows exchange rate after selecting target wallet', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    }, { timeout: 10_000 });

    const convertButtons = screen.getAllByRole('button', { name: /Convert/i });
    fireEvent.click(convertButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('FX Conversion')).toBeInTheDocument();
    });

    // Select target currency (USD wallet, id=102)
    const targetSelect = screen.getByText('Select target wallet...').closest('select');
    if (targetSelect) fireEvent.change(targetSelect, { target: { value: '102' } });

    await waitFor(() => {
      expect(screen.getByText(/Exchange Rate/)).toBeInTheDocument();
    }, { timeout: 10_000 });
  });

  it('FX conversion form submits with correct payload', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.get('/api/v1/wallets/account/42', () =>
        HttpResponse.json(wrap(mockWallets)),
      ),
      http.get('/api/v1/fx/rate', () =>
        HttpResponse.json(wrap(mockFxRates)),
      ),
      http.post('/api/v1/wallets/account/42/convert', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(wrap(1));
      }),
    );

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    const convertButtons = screen.getAllByText('Convert');
    fireEvent.click(convertButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('FX Conversion')).toBeInTheDocument();
    });

    // Select target wallet
    const selects = screen.getAllByRole('combobox');
    const targetSelect = selects[selects.length - 1];
    fireEvent.change(targetSelect, { target: { value: '102' } });

    // Wait for exchange rate to load
    await waitFor(() => {
      expect(screen.getByText('Exchange Rate')).toBeInTheDocument();
    });

    // Enter amount
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '1000000' },
    });

    // Wait for conversion preview
    await waitFor(() => {
      expect(screen.getByText('You Send')).toBeInTheDocument();
      expect(screen.getByText('You Receive')).toBeInTheDocument();
    });

    // Find and click the Convert button inside the modal
    const modalConvertBtn = screen.getAllByText('Convert').find(
      (el) => el.closest('.fixed') !== null,
    );
    if (modalConvertBtn) fireEvent.click(modalConvertBtn);

    await waitFor(() => {
      expect(capturedBody).toEqual({
        sourceWalletId: 101,
        targetWalletId: 102,
        amount: 1000000,
        rate: 0.00062,
      });
    });
  });

  it('shows transaction history when Transactions toggle is clicked', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    // Click the Transactions toggle on the NGN wallet
    const txnButtons = screen.getAllByText('Transactions');
    fireEvent.click(txnButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Salary deposit')).toBeInTheDocument();
    });

    expect(screen.getByText('Utility payment')).toBeInTheDocument();
    expect(screen.getByText(/TXN-REF-001/)).toBeInTheDocument();
    expect(screen.getByText(/TXN-REF-002/)).toBeInTheDocument();
  });

  it('shows no transactions message for wallet with no history', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('USD')).toBeInTheDocument();
    });

    // Click Transactions toggle on the USD wallet (second one)
    const txnButtons = screen.getAllByText('Transactions');
    fireEvent.click(txnButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('No transactions yet.')).toBeInTheDocument();
    });
  });

  it('shows ACTIVE status badges on wallet cards', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    const activeBadges = screen.getAllByText('ACTIVE');
    expect(activeBadges.length).toBe(2);
  });

  it('shows action buttons on each wallet card', async () => {
    setupDefaultHandlers();

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });

    const fundButtons = screen.getAllByText('Fund');
    expect(fundButtons.length).toBe(2);

    const withdrawButtons = screen.getAllByText('Withdraw');
    expect(withdrawButtons.length).toBe(2);

    // Convert buttons should exist because each wallet has at least one other active wallet
    const convertButtons = screen.getAllByText('Convert');
    expect(convertButtons.length).toBe(2);
  });

  it('handles server error gracefully', async () => {
    server.use(
      http.get('/api/v1/wallets/account/42', () =>
        HttpResponse.json(
          { success: false, message: 'Internal error' },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    // Page structure should still render
    await waitFor(() => {
      expect(screen.getByText('Multi-Currency Wallets')).toBeInTheDocument();
    });
  });

  it('shows empty wallet prompt with create button when no wallets exist', async () => {
    server.use(
      http.get('/api/v1/wallets/account/42', () =>
        HttpResponse.json(wrap([])),
      ),
    );

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('No currency wallets yet.')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Create a wallet in any supported currency to get started.',
      ),
    ).toBeInTheDocument();

    // The inline "New Wallet" button in the empty state
    const newWalletButtons = screen.getAllByText('New Wallet');
    expect(newWalletButtons.length).toBeGreaterThan(0);

    fireEvent.click(newWalletButtons[newWalletButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('New Currency Wallet')).toBeInTheDocument();
    });
  });

  it('shows FX error message when rate fetch fails', async () => {
    server.use(
      http.get('/api/v1/wallets/account/42', () =>
        HttpResponse.json(wrap(mockWallets)),
      ),
      http.get('/api/v1/fx/rate', () =>
        HttpResponse.json(
          { success: false, message: 'Rate unavailable' },
          { status: 500 },
        ),
      ),
      http.get('/api/v1/wallets/:walletId/transactions', () =>
        HttpResponse.json(wrap([])),
      ),
    );

    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    }, { timeout: 10_000 });

    const convertButtons = screen.getAllByRole('button', { name: /Convert/i });
    fireEvent.click(convertButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('FX Conversion')).toBeInTheDocument();
    });

    // Select target wallet to trigger FX rate fetch
    const targetSelect = screen.getByText('Select target wallet...').closest('select');
    if (targetSelect) fireEvent.change(targetSelect, { target: { value: '102' } });

    await waitFor(() => {
      expect(screen.getByText(/Unable to fetch exchange rate/)).toBeInTheDocument();
    }, { timeout: 10_000 });
  });
});
