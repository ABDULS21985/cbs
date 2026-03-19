import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface WrapperOptions extends RenderOptions {
  initialEntries?: string[];
}

function AllProviders({ children, initialEntries = ['/'] }: { children: React.ReactNode; initialEntries?: string[] }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options: WrapperOptions = {}) {
  const { initialEntries, ...renderOptions } = options;
  return render(ui, {
    wrapper: ({ children }) => <AllProviders initialEntries={initialEntries}>{children}</AllProviders>,
    ...renderOptions,
  });
}

export function createMockUser(overrides = {}) {
  return {
    id: 1,
    username: 'test.user',
    fullName: 'Test User',
    email: 'test@cbs.bank',
    roles: ['CBS_OFFICER'],
    permissions: [],
    branchId: 1,
    branchName: 'Test Branch',
    lastLogin: '2024-01-15T09:00:00Z',
    ...overrides,
  };
}

export function setAuthUser(user: ReturnType<typeof createMockUser>) {
  useAuthStore.setState({
    user: user as any,
    accessToken: 'test-token',
    isAuthenticated: true,
  });
}

export function clearAuth() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshTokenValue: null,
    isAuthenticated: false,
    mfaRequired: false,
    mfaSessionToken: null,
    tokenExpiresAt: null,
  });
}
