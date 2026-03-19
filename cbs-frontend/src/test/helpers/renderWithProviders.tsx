import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { type ReactElement } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { createMockUser } from '../factories/userFactory';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  routerProps?: Partial<MemoryRouterProps>;
  user?: ReturnType<typeof createMockUser>;
  queryClient?: QueryClient;
  authenticated?: boolean;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    routerProps,
    user = createMockUser(),
    queryClient = createTestQueryClient(),
    authenticated = true,
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  // Set auth store
  if (authenticated) {
    useAuthStore.setState({
      user,
      accessToken: 'test-token-abc123',
      isAuthenticated: true,
      isLoading: false,
    });
  } else {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]} {...routerProps}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    user,
  };
}

export { createTestQueryClient };
