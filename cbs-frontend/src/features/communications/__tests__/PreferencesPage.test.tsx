import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PreferencesPage } from '../pages/PreferencesPage';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPut: mocks.apiPut,
  apiDelete: mocks.apiDelete,
}));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const samplePreferences = [
  { id: 1, customerId: 42, channel: 'EMAIL', eventType: 'ACCOUNT_ALERT', isEnabled: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-15T00:00:00Z' },
  { id: 2, customerId: 42, channel: 'SMS', eventType: 'MARKETING', isEnabled: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  { id: 3, customerId: 42, channel: 'PUSH', eventType: 'SECURITY', isEnabled: true, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-03-12T00:00:00Z' },
];

describe('PreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/notifications/preferences/42') return Promise.resolve(samplePreferences);
      return Promise.resolve([]);
    });
  });

  it('renders page header and customer search form', () => {
    render(<PreferencesPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Communication Preferences')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter customer ID...')).toBeInTheDocument();
    expect(screen.getByText('Load Preferences')).toBeInTheDocument();
  });

  it('shows empty state before customer is searched', () => {
    render(<PreferencesPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Enter a customer ID above to load their communication preferences.')).toBeInTheDocument();
  });

  it('loads preferences when customer ID is submitted', async () => {
    const user = userEvent.setup();
    render(<PreferencesPage />, { wrapper: createWrapper() });

    const input = screen.getByPlaceholderText('Enter customer ID...');
    await user.type(input, '42');
    await user.click(screen.getByText('Load Preferences'));

    await waitFor(() => {
      expect(screen.getByText('Customer #42')).toBeInTheDocument();
    });
  });

  it('calls GET preferences endpoint for entered customer ID', async () => {
    const user = userEvent.setup();
    render(<PreferencesPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText('Enter customer ID...'), '42');
    await user.click(screen.getByText('Load Preferences'));

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/preferences/42');
    });
  });

  it('ignores invalid (non-numeric) customer ID input', async () => {
    const user = userEvent.setup();
    render(<PreferencesPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText('Enter customer ID...'), 'abc');
    await user.click(screen.getByText('Load Preferences'));

    // Should still show empty state since 'abc' won't parse to a valid ID
    expect(screen.getByText('Enter a customer ID above to load their communication preferences.')).toBeInTheDocument();
  });

  it('submits form via Enter key', async () => {
    const user = userEvent.setup();
    render(<PreferencesPage />, { wrapper: createWrapper() });

    const input = screen.getByPlaceholderText('Enter customer ID...');
    await user.type(input, '42{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Customer #42')).toBeInTheDocument();
    });
  });
});
