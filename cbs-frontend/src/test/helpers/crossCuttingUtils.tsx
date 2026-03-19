/**
 * Cross-cutting test utilities for responsive, dark mode, accessibility,
 * error handling, offline, and print testing.
 */
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { type ReactElement, type ReactNode, createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { createMockUser } from '../factories/userFactory';
import { vi } from 'vitest';

// ---------- Theme Provider for tests ----------

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeProviderState>({ theme: 'light', setTheme: () => null });

function TestThemeProvider({ children, defaultTheme = 'light' }: { children: ReactNode; defaultTheme?: Theme }) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      root.classList.add('light');
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// ---------- Viewport helpers ----------

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

/**
 * Sets window.innerWidth/innerHeight and fires a resize event.
 * Also updates matchMedia mock to reflect the new viewport.
 */
export function setViewport(viewport: ViewportName) {
  const { width, height } = VIEWPORTS[viewport];
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });

  // Update matchMedia mock to respond accurately
  const matchMediaMock = vi.fn().mockImplementation((query: string) => {
    let matches = false;
    // Parse common media queries
    const minWidthMatch = query.match(/\(min-width:\s*(\d+)px\)/);
    const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/);

    if (minWidthMatch && maxWidthMatch) {
      matches = width >= parseInt(minWidthMatch[1]) && width <= parseInt(maxWidthMatch[1]);
    } else if (minWidthMatch) {
      matches = width >= parseInt(minWidthMatch[1]);
    } else if (maxWidthMatch) {
      matches = width <= parseInt(maxWidthMatch[1]);
    }

    // Dark mode query
    if (query.includes('prefers-color-scheme: dark')) {
      matches = false;
    }

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });

  Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMediaMock });
  window.dispatchEvent(new Event('resize'));
}

// ---------- Online/Offline simulation ----------

export function simulateOffline() {
  Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
  window.dispatchEvent(new Event('offline'));
}

export function simulateOnline() {
  Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true });
  window.dispatchEvent(new Event('online'));
}

// ---------- Dark mode helpers ----------

export function enableDarkMode() {
  document.documentElement.classList.remove('light');
  document.documentElement.classList.add('dark');
  localStorage.setItem('cbs-theme', 'dark');
}

export function enableLightMode() {
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
  localStorage.setItem('cbs-theme', 'light');
}

export function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// ---------- Extended render with theme ----------

interface CrossCuttingRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  routerProps?: Partial<MemoryRouterProps>;
  user?: ReturnType<typeof createMockUser>;
  queryClient?: QueryClient;
  authenticated?: boolean;
  theme?: Theme;
  viewport?: ViewportName;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithCrossCuttingProviders(
  ui: ReactElement,
  {
    route = '/',
    routerProps,
    user = createMockUser(),
    queryClient = createTestQueryClient(),
    authenticated = true,
    theme = 'light',
    viewport,
    ...renderOptions
  }: CrossCuttingRenderOptions = {}
) {
  if (viewport) {
    setViewport(viewport);
  }

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
          <TestThemeProvider defaultTheme={theme}>
            {children}
          </TestThemeProvider>
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

// ---------- Accessibility helpers ----------

/**
 * Checks that all interactive elements have minimum touch target size.
 * Returns elements that are smaller than 44x44px.
 */
export function findSmallTouchTargets(container: HTMLElement): HTMLElement[] {
  const interactive = container.querySelectorAll<HTMLElement>(
    'button, a, input, select, textarea, [role="button"], [tabindex]'
  );
  const small: HTMLElement[] = [];
  interactive.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
      small.push(el);
    }
  });
  return small;
}

/**
 * Checks that all form inputs have associated labels.
 */
export function findUnlabelledInputs(container: HTMLElement): HTMLElement[] {
  const inputs = container.querySelectorAll<HTMLElement>('input, select, textarea');
  const unlabelled: HTMLElement[] = [];
  inputs.forEach((input) => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    const hasLabel = id && container.querySelector(`label[for="${id}"]`);
    const isHidden = input.getAttribute('type') === 'hidden';
    if (!isHidden && !hasLabel && !ariaLabel && !ariaLabelledBy) {
      unlabelled.push(input);
    }
  });
  return unlabelled;
}

/**
 * Checks that all images have alt text.
 */
export function findImagesWithoutAlt(container: HTMLElement): HTMLElement[] {
  const images = container.querySelectorAll<HTMLElement>('img');
  const missingAlt: HTMLElement[] = [];
  images.forEach((img) => {
    const alt = img.getAttribute('alt');
    if (alt === null) {
      missingAlt.push(img);
    }
  });
  return missingAlt;
}

/**
 * Verifies tab order follows DOM order (logical reading order).
 */
export function getTabbableElements(container: HTMLElement): HTMLElement[] {
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(focusable);
}

// ---------- Print helpers ----------

export function getPrintHiddenElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.no-print'));
}

// ---------- Error simulation helpers ----------

export function createAxiosError(status: number, data?: Record<string, unknown>) {
  const error = new Error(`Request failed with status code ${status}`) as any;
  error.isAxiosError = true;
  error.response = {
    status,
    data: data || { success: false, message: getDefaultMessage(status), timestamp: new Date().toISOString() },
    headers: {},
    statusText: getStatusText(status),
    config: {},
  };
  error.config = { url: '/api/test', method: 'GET' };
  error.toJSON = () => ({});
  // Make it look like an AxiosError
  Object.defineProperty(error, 'constructor', { value: Error });
  return error;
}

function getDefaultMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Unauthorized',
    403: 'You do not have permission for this action.',
    404: 'The requested resource was not found.',
    409: 'Conflict: this record was modified by another user.',
    429: 'Too many requests. Please wait and try again.',
    500: 'Server error. Please try again or contact support.',
    503: 'Service temporarily unavailable. Please try again later.',
  };
  return messages[status] || 'An unexpected error occurred.';
}

function getStatusText(status: number): string {
  const texts: Record<number, string> = {
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 409: 'Conflict', 429: 'Too Many Requests',
    500: 'Internal Server Error', 503: 'Service Unavailable',
  };
  return texts[status] || 'Error';
}
