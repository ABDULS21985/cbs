import { useEffect, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast, Toaster } from 'sonner';
import { AppRouter } from './router';
import { ThemeProvider } from './providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useAuthStore } from '@/stores/authStore';

let lastQueryErrorSignature = '';
let lastQueryErrorAt = 0;

function getQueryErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Failed to load data from the backend.';
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const message = getQueryErrorMessage(error);
      const signature = `${query.queryHash}:${message}`;
      const now = Date.now();
      if (signature === lastQueryErrorSignature && now - lastQueryErrorAt < 3_000) {
        return;
      }
      lastQueryErrorSignature = signature;
      lastQueryErrorAt = now;
      toast.error(message);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AuthBootstrap({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="cbs-theme">
          <BrowserRouter>
            <AuthBootstrap>
              <OfflineBanner />
              <AppRouter />
              <Toaster position="top-right" richColors closeButton />
            </AuthBootstrap>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
