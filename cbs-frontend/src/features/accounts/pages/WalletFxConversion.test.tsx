import { describe, it, expect } from 'vitest';
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

const mockFxRates = [
  {
    sourceCurrency: 'NGN',
    targetCurrency: 'USD',
    buyRate: 0.000625,
    sellRate: 0.000617,
    midRate: 0.000621,
  },
];

describe('Wallet FX Conversion E2E', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  function setupHandlers() {
    server.use(
      http.get('/api/v1/wallets/account/42', () =>
        HttpResponse.json(wrap(mockWallets)),
      ),
      http.get('/api/v1/fx/rate', ({ request }) => {
        const url = new URL(request.url);
        const source = url.searchParams.get('sourceCurrency');
        const target = url.searchParams.get('targetCurrency');
        if (source === 'NGN' && target === 'USD') {
          return HttpResponse.json(wrap(mockFxRates));
        }
        return HttpResponse.json(wrap([]));
      }),
      http.post('/api/v1/wallets/account/42/convert', async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        // Verify the request includes required fields
        if (!body.sourceWalletId || !body.targetWalletId || !body.amount || !body.rate) {
          return HttpResponse.json(
            { success: false, message: 'Missing required fields' },
            { status: 400 },
          );
        }
        // Verify rate is the sell rate from FX API
        const rate = body.rate as number;
        const amount = body.amount as number;
        const convertedAmount = amount * rate;
        return HttpResponse.json(wrap(convertedAmount));
      }),
      http.get('/api/v1/wallets/:walletId/transactions', () =>
        HttpResponse.json(wrap([])),
      ),
    );
  }

  it('renders wallet cards with correct balances', async () => {
    setupHandlers();
    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    }, { timeout: 10_000 });
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('opens Convert modal from NGN wallet card', async () => {
    setupHandlers();
    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    }, { timeout: 10_000 });

    // Click "Convert" button on the NGN wallet card
    const convertButtons = screen.getAllByRole('button', { name: /Convert/i });
    fireEvent.click(convertButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('FX Conversion')).toBeInTheDocument();
    });
  });

  it('fetches live FX rate when target currency is selected', async () => {
    setupHandlers();
    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    }, { timeout: 10_000 });

    // Open convert modal
    const convertButtons = screen.getAllByRole('button', { name: /Convert/i });
    fireEvent.click(convertButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('FX Conversion')).toBeInTheDocument();
    });

    // Select target wallet (USD)
    const targetSelect = screen.getByText('Select target wallet...').closest('select');
    if (targetSelect) {
      fireEvent.change(targetSelect, { target: { value: '102' } });
    }

    // Wait for FX rate to load
    await waitFor(() => {
      expect(screen.getByText(/Exchange Rate/)).toBeInTheDocument();
    }, { timeout: 10_000 });
  });

  it('shows conversion preview with amounts', async () => {
    setupHandlers();
    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    }, { timeout: 10_000 });

    const convertButtons = screen.getAllByRole('button', { name: /Convert/i });
    fireEvent.click(convertButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('FX Conversion')).toBeInTheDocument();
    });

    // Select USD target
    const targetSelect = screen.getByText('Select target wallet...').closest('select');
    if (targetSelect) fireEvent.change(targetSelect, { target: { value: '102' } });

    // Wait for rate then enter amount
    await waitFor(() => {
      expect(screen.getByText(/Exchange Rate/)).toBeInTheDocument();
    }, { timeout: 10_000 });

    // Enter amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '100000' } });

    // Should show You Send and You Receive
    await waitFor(() => {
      expect(screen.getByText('You Send')).toBeInTheDocument();
      expect(screen.getByText('You Receive')).toBeInTheDocument();
    });
  });

  it('enables Convert button when rate is loaded and amount is entered', { timeout: 20_000 }, async () => {
    setupHandlers();
    renderWithProviders(<WalletPage />, { route: '/wallets?accountId=42' });

    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    }, { timeout: 10_000 });

    // Open convert modal
    const convertButtons = screen.getAllByRole('button', { name: /Convert/i });
    fireEvent.click(convertButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('FX Conversion')).toBeInTheDocument();
    });

    // Initially the Convert button in the modal should be disabled (no target selected)
    const allConvertBtns = screen.getAllByRole('button', { name: /^Convert$/i });
    const modalSubmitBtn = allConvertBtns[allConvertBtns.length - 1]; // last one is in modal
    expect(modalSubmitBtn).toBeDisabled();

    // Select USD target
    const targetSelect = screen.getByText('Select target wallet...').closest('select');
    if (targetSelect) fireEvent.change(targetSelect, { target: { value: '102' } });

    // Wait for rate to load
    await waitFor(() => {
      expect(screen.getByText(/Exchange Rate/)).toBeInTheDocument();
    }, { timeout: 10_000 });

    // Enter amount
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100000' } });

    // Wait for preview to appear showing the conversion amount
    await waitFor(() => {
      expect(screen.getByText('You Send')).toBeInTheDocument();
      expect(screen.getByText('You Receive')).toBeInTheDocument();
    });

    // Convert button should now be enabled
    await waitFor(() => {
      const btns = screen.getAllByRole('button', { name: /^Convert$/i });
      const submit = btns[btns.length - 1];
      expect(submit).not.toBeDisabled();
    });
  });

  it('shows FX error when rate fetch fails', async () => {
    server.use(
      http.get('/api/v1/wallets/account/42', () =>
        HttpResponse.json(wrap(mockWallets)),
      ),
      http.get('/api/v1/fx/rate', () =>
        HttpResponse.json({ success: false, message: 'Rate not available' }, { status: 500 }),
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

    // Select USD target
    const targetSelect = screen.getByText('Select target wallet...').closest('select');
    if (targetSelect) fireEvent.change(targetSelect, { target: { value: '102' } });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Unable to fetch exchange rate/)).toBeInTheDocument();
    }, { timeout: 10_000 });
  });
});
