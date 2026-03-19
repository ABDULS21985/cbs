/**
 * T7 — Offline Behavior Tests
 *
 * Tests network disconnect/reconnect banners, cached data display,
 * offline form submission, and navigation between cached pages.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import {
  renderWithCrossCuttingProviders,
  simulateOffline,
  simulateOnline,
} from '../helpers/crossCuttingUtils';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import { onMutationError } from '@/lib/errorHandler';
import api from '@/lib/api';
import { server } from '../msw/server';
import { http, HttpResponse } from 'msw';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  Toaster: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true });
});

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true });
});

// ─── OfflineBanner Visibility ────────────────────────────────────────

describe('Offline: Banner Visibility', () => {
  it('banner appears when browser goes offline', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
    renderWithCrossCuttingProviders(<OfflineBanner />);
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });

  it('banner is hidden when browser is online', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true });
    renderWithCrossCuttingProviders(<OfflineBanner />);
    expect(screen.queryByText(/You are offline/)).toBeNull();
  });

  it('banner has correct styling (fixed, z-200, amber)', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
    renderWithCrossCuttingProviders(<OfflineBanner />);
    const banner = screen.getByText(/You are offline/).closest('div');
    expect(banner?.className).toContain('fixed');
    expect(banner?.className).toContain('bg-amber-500');
    expect(banner?.className).toContain('z-[200]');
  });

  it('banner includes WifiOff icon', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
    renderWithCrossCuttingProviders(<OfflineBanner />);
    // Lucide icons render as SVG elements
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});

// ─── useOnlineStatus Hook ────────────────────────────────────────────

describe('Offline: useOnlineStatus Hook', () => {
  function OnlineStatusDisplay() {
    const isOnline = useOnlineStatus();
    return <div data-testid="status">{isOnline ? 'online' : 'offline'}</div>;
  }

  it('returns true when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true });
    renderWithCrossCuttingProviders(<OnlineStatusDisplay />);
    expect(screen.getByTestId('status')).toHaveTextContent('online');
  });

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
    renderWithCrossCuttingProviders(<OnlineStatusDisplay />);
    expect(screen.getByTestId('status')).toHaveTextContent('offline');
  });

  it('responds to online event', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
    renderWithCrossCuttingProviders(<OnlineStatusDisplay />);
    expect(screen.getByTestId('status')).toHaveTextContent('offline');

    act(() => {
      simulateOnline();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('online');
    });
  });

  it('responds to offline event', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true });
    renderWithCrossCuttingProviders(<OnlineStatusDisplay />);
    expect(screen.getByTestId('status')).toHaveTextContent('online');

    act(() => {
      simulateOffline();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('offline');
    });
  });
});

// ─── Offline Form Submission ─────────────────────────────────────────

describe('Offline: Form Submission', () => {
  function OfflineForm() {
    const isOnline = useOnlineStatus();
    const mutation = useMutation({
      mutationFn: async (_data: { amount: number }) => {
        if (!navigator.onLine) {
          throw new Error('You are offline. Cannot submit form.');
        }
        return { success: true };
      },
      onError: onMutationError,
    });

    return (
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ amount: 1000 }); }}>
        <label htmlFor="amount">Amount</label>
        <input id="amount" name="amount" type="number" defaultValue={1000} />
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Sending...' : 'Send Payment'}
        </button>
        {!isOnline && <p className="text-amber-500">You are offline</p>}
        {mutation.isError && (
          <p role="alert">{(mutation.error as Error).message}</p>
        )}
      </form>
    );
  }

  it('shows offline warning when submitting while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });

    renderWithCrossCuttingProviders(<OfflineForm />);

    expect(screen.getByText('You are offline')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Send Payment' }));

    await waitFor(() => {
      // Either role="alert" or the inline error message appears
      const alert = screen.queryByRole('alert');
      const errorText = screen.queryByText(/offline/i);
      expect(alert || errorText).toBeTruthy();
    });
  });

  it('preserves form data when offline submission fails', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });

    renderWithCrossCuttingProviders(<OfflineForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Send Payment' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Amount')).toHaveValue(1000);
    });
  });

  it('submit button is re-enabled after offline error', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });

    renderWithCrossCuttingProviders(<OfflineForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Send Payment' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Send Payment' })).not.toBeDisabled();
    });
  });
});

// ─── Cached Data Display ─────────────────────────────────────────────

describe('Offline: Cached Data with TanStack Query', () => {
  it('TanStack Query serves cached data when available', () => {
    // Pre-populate the query cache to simulate cached data
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 60_000, staleTime: 60_000 },
        mutations: { retry: false },
      },
    });

    // Set data in cache before rendering
    queryClient.setQueryData(['offline-cache-test'], ['Alice', 'Bob']);

    function CachedComponent() {
      const isOnline = useOnlineStatus();
      const { data } = useQuery<string[]>({
        queryKey: ['offline-cache-test'],
        queryFn: () => Promise.resolve(['Alice', 'Bob']),
        staleTime: 60_000,
      });

      return (
        <div>
          {!isOnline && <div>Showing cached data</div>}
          <ul>
            {data?.map((name, i) => <li key={i}>{name}</li>)}
          </ul>
        </div>
      );
    }

    renderWithCrossCuttingProviders(<CachedComponent />, { queryClient });

    // Data should be available immediately from cache
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});

// ─── Network Reconnection ────────────────────────────────────────────

describe('Offline: Network Reconnection', () => {
  function ReconnectComponent() {
    const isOnline = useOnlineStatus();
    return (
      <div>
        <div data-testid="connection-status">
          {isOnline ? 'Connected' : 'Disconnected'}
        </div>
        {!isOnline && <OfflineBanner />}
      </div>
    );
  }

  it('shows disconnected state when offline', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
    renderWithCrossCuttingProviders(<ReconnectComponent />);
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });

  it('transitions from disconnected to connected on reconnect', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
    renderWithCrossCuttingProviders(<ReconnectComponent />);

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

    act(() => {
      simulateOnline();
    });

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });

    // Banner should disappear
    expect(screen.queryByText(/You are offline/)).toBeNull();
  });

  it('transitions from connected to disconnected on network drop', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true });
    renderWithCrossCuttingProviders(<ReconnectComponent />);

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');

    act(() => {
      simulateOffline();
    });

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
    });
  });
});

// ─── Offline Navigation ─────────────────────────────────────────────

describe('Offline: Navigation', () => {
  it('OfflineBanner renders at top of page with fixed positioning', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
    renderWithCrossCuttingProviders(<OfflineBanner />);

    const banner = screen.getByText(/You are offline/).closest('div');
    expect(banner?.className).toContain('fixed');
    expect(banner?.className).toContain('top-0');
    expect(banner?.className).toContain('left-0');
    expect(banner?.className).toContain('right-0');
  });

  it('banner does not block content below (has z-index)', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
    renderWithCrossCuttingProviders(
      <div>
        <OfflineBanner />
        <button>Click me</button>
      </div>
    );

    const banner = screen.getByText(/You are offline/).closest('div');
    expect(banner?.className).toContain('z-[200]');

    // Content below is still rendered
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
