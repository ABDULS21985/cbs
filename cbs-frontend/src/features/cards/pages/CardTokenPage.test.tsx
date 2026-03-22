import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { CardTokenPage } from './CardTokenPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockTokens = [
  {
    id: 1, tokenRef: 'TOK-001', cardId: 10, customerId: 100,
    tokenNumberHash: 'hash1', tokenNumberSuffix: '1234',
    tokenRequestorId: 'TRI-001', walletProvider: 'APPLE_PAY',
    deviceName: 'iPhone 15 Pro', deviceId: 'DEV-001', deviceType: 'MOBILE',
    status: 'ACTIVE', activatedAt: '2026-01-01T00:00:00Z',
    suspendedAt: null, suspendReason: null,
    deactivatedAt: null, deactivationReason: null,
    tokenExpiryDate: '2028-01-01', lastUsedAt: '2026-03-20T10:00:00Z',
    transactionCount: 12, createdAt: '2026-01-01T00:00:00Z', version: 0,
  },
  {
    id: 2, tokenRef: 'TOK-002', cardId: 10, customerId: 100,
    tokenNumberHash: 'hash2', tokenNumberSuffix: '5678',
    tokenRequestorId: 'TRI-002', walletProvider: 'GOOGLE_PAY',
    deviceName: 'Pixel 8', deviceId: 'DEV-002', deviceType: 'MOBILE',
    status: 'SUSPENDED', activatedAt: '2026-01-15T00:00:00Z',
    suspendedAt: '2026-02-01T00:00:00Z', suspendReason: 'Lost device',
    deactivatedAt: null, deactivationReason: null,
    tokenExpiryDate: '2028-01-15', lastUsedAt: null,
    transactionCount: 3, createdAt: '2026-01-15T00:00:00Z', version: 1,
  },
];

function setupHandlers(options?: {
  tokens?: typeof mockTokens;
  onSuspend?: (tokenId: string, params: URLSearchParams) => void;
  onDeactivate?: (tokenId: string, params: URLSearchParams) => void;
  onResume?: (tokenId: string) => void;
  onProvision?: (cardId: string, params: URLSearchParams) => void;
}) {
  const { tokens = mockTokens, onSuspend, onDeactivate, onResume, onProvision } = options ?? {};

  server.use(
    http.get('/api/v1/cards/tokens/customer/:customerId', () =>
      HttpResponse.json(wrap(tokens)),
    ),
    http.post('/api/v1/cards/tokens/:tokenId/suspend', ({ params, request }) => {
      const url = new URL(request.url);
      onSuspend?.(params.tokenId as string, url.searchParams);
      return HttpResponse.json(wrap({ ...tokens[0], status: 'SUSPENDED' }));
    }),
    http.post('/api/v1/cards/tokens/:tokenId/deactivate', ({ params, request }) => {
      const url = new URL(request.url);
      onDeactivate?.(params.tokenId as string, url.searchParams);
      return HttpResponse.json(wrap({ ...tokens[0], status: 'DEACTIVATED' }));
    }),
    http.post('/api/v1/cards/tokens/:tokenId/resume', ({ params }) => {
      onResume?.(params.tokenId as string);
      return HttpResponse.json(wrap({ ...tokens[1], status: 'ACTIVE' }));
    }),
    http.post('/api/v1/cards/tokens/provision/:cardId', ({ params, request }) => {
      const url = new URL(request.url);
      onProvision?.(params.cardId as string, url.searchParams);
      return HttpResponse.json(
        wrap({ id: 3, tokenRef: 'TOK-003', cardId: Number(params.cardId), status: 'REQUESTED' }),
        { status: 201 },
      );
    }),
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('CardTokenPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<CardTokenPage />);
    expect(screen.getByText('Card Tokens & Digital Wallets')).toBeInTheDocument();
  });

  it('renders stat cards', async () => {
    setupHandlers();
    renderWithProviders(<CardTokenPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    });
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
  });

  it('renders token list from backend', async () => {
    setupHandlers();
    renderWithProviders(<CardTokenPage />);

    await waitFor(() => {
      expect(screen.getByText('TOK-001')).toBeInTheDocument();
    });
    expect(screen.getByText('TOK-002')).toBeInTheDocument();
    expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    expect(screen.getByText('Pixel 8')).toBeInTheDocument();
  });

  it('renders Provision Token button', () => {
    setupHandlers();
    renderWithProviders(<CardTokenPage />);
    expect(screen.getByText('Provision Token')).toBeInTheDocument();
  });

  it('sends reason as query param when suspending token (NOT NULL fix)', async () => {
    const suspended: { tokenId: string; reason: string | null }[] = [];
    setupHandlers({
      onSuspend: (tokenId, params) =>
        suspended.push({ tokenId, reason: params.get('reason') }),
    });
    renderWithProviders(<CardTokenPage />);

    await waitFor(() => {
      expect(screen.getByText('TOK-001')).toBeInTheDocument();
    });

    // Click the suspend (Pause) icon for the ACTIVE token
    const pauseButtons = document.querySelectorAll('button[title="Suspend"]');
    expect(pauseButtons.length).toBeGreaterThan(0);
    fireEvent.click(pauseButtons[0]);

    await waitFor(() => {
      expect(suspended.length).toBeGreaterThan(0);
    });

    // reason must be a non-empty string (backend @RequestParam String reason is required)
    expect(suspended[0].reason).toBeTruthy();
    expect(typeof suspended[0].reason).toBe('string');
    expect((suspended[0].reason as string).length).toBeGreaterThan(0);
  });

  it('sends reason as query param when deactivating token (NOT NULL fix)', async () => {
    const deactivated: { tokenId: string; reason: string | null }[] = [];
    setupHandlers({
      onDeactivate: (tokenId, params) =>
        deactivated.push({ tokenId, reason: params.get('reason') }),
    });
    renderWithProviders(<CardTokenPage />);

    await waitFor(() => {
      expect(screen.getByText('TOK-001')).toBeInTheDocument();
    });

    // Click the deactivate (XCircle) icon for the ACTIVE token
    const deactivateButtons = document.querySelectorAll('button[title="Deactivate"]');
    expect(deactivateButtons.length).toBeGreaterThan(0);
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(deactivated.length).toBeGreaterThan(0);
    });

    // reason must be non-empty
    expect(deactivated[0].reason).toBeTruthy();
    expect(typeof deactivated[0].reason).toBe('string');
    expect((deactivated[0].reason as string).length).toBeGreaterThan(0);
  });

  it('sends walletProvider as query param (not request body) when provisioning token', async () => {
    let capturedCardId = '';
    let capturedWalletProvider: string | null = null;
    let requestBodyWasEmpty = true;

    server.use(
      http.get('/api/v1/cards/tokens/customer/:customerId', () => HttpResponse.json(wrap(mockTokens))),
      http.post('/api/v1/cards/tokens/provision/:cardId', async ({ params, request }) => {
        const url = new URL(request.url);
        capturedCardId = params.cardId as string;
        capturedWalletProvider = url.searchParams.get('walletProvider');
        // Check that walletProvider is NOT in the request body
        const contentType = request.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const body = await request.json() as Record<string, unknown>;
          requestBodyWasEmpty = !body || Object.keys(body).length === 0 || !('walletProvider' in body);
        }
        return HttpResponse.json(
          wrap({ id: 3, tokenRef: 'TOK-003', cardId: 10, status: 'REQUESTED' }),
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<CardTokenPage />);

    // Open provision dialog
    await user.click(screen.getByText('Provision Token'));
    await waitFor(() => {
      expect(screen.getByText('Provision Digital Wallet Token')).toBeInTheDocument();
    });

    // Fill card ID
    const cardIdInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    await user.clear(cardIdInput);
    await user.type(cardIdInput, '10');

    // Submit
    await user.click(screen.getByText('Provision'));

    await waitFor(() => {
      // walletProvider must be in query string, not body
      expect(capturedWalletProvider).toBeTruthy();
    });

    expect(capturedWalletProvider).toBe('APPLE_PAY'); // default value
    expect(requestBodyWasEmpty).toBe(true);
  });

  it('shows empty state when no tokens exist', async () => {
    setupHandlers({ tokens: [] });
    renderWithProviders(<CardTokenPage />);

    await waitFor(() => {
      expect(screen.getByText('No card tokens provisioned')).toBeInTheDocument();
    });
  });

  it('shows resume button for suspended tokens', async () => {
    setupHandlers();
    renderWithProviders(<CardTokenPage />);

    await waitFor(() => {
      expect(screen.getByText('TOK-002')).toBeInTheDocument();
    });

    // Play button for SUSPENDED token
    const resumeButtons = document.querySelectorAll('button[title="Resume"]');
    expect(resumeButtons.length).toBeGreaterThan(0);
  });

  it('does not show suspend button for suspended tokens', async () => {
    setupHandlers();
    renderWithProviders(<CardTokenPage />);

    await waitFor(() => {
      expect(screen.getByText('TOK-002')).toBeInTheDocument();
    });

    // TOK-001 is ACTIVE (1 suspend button), TOK-002 is SUSPENDED (0 suspend buttons for it)
    const pauseButtons = document.querySelectorAll('button[title="Suspend"]');
    expect(pauseButtons.length).toBe(1);
  });
});
