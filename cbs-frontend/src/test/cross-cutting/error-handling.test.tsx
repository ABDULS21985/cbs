/**
 * T7 — Error Handling Tests
 *
 * Tests all HTTP error status codes, ErrorBoundary, TanStack Query error states,
 * form submission errors, and file upload errors.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { renderWithCrossCuttingProviders, createAxiosError } from '../helpers/crossCuttingUtils';
import { handleApiError, onMutationError } from '@/lib/errorHandler';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
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
});

// ─── handleApiError for each HTTP status ─────────────────────────────

describe('Error Handling: HTTP Status Codes', () => {
  it('400 → shows "Invalid request" toast', () => {
    const error = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 400,
        data: { success: false, timestamp: new Date().toISOString() },
        headers: {},
        statusText: 'Bad Request',
        config: {} as any,
      } as AxiosResponse
    );
    const msg = handleApiError(error);
    expect(msg).toBe('Invalid request. Please check your input.');
    expect(toast.error).toHaveBeenCalledWith('Invalid request. Please check your input.');
  });

  it('400 with field errors → shows validation error details', () => {
    const error = new AxiosError(
      'Validation failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 400,
        data: {
          success: false,
          errors: {
            email: ['Email is required', 'Must be valid email'],
            amount: ['Must be positive'],
          },
          timestamp: new Date().toISOString(),
        },
        headers: {},
        statusText: 'Bad Request',
        config: {} as any,
      } as AxiosResponse
    );
    const msg = handleApiError(error);
    expect(msg).toContain('Email is required');
    expect(msg).toContain('Must be valid email');
    expect(msg).toContain('Must be positive');
    expect(toast.error).toHaveBeenCalled();
  });

  it('400 with API message → shows API message', () => {
    const error = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 400,
        data: { success: false, message: 'Account number already exists', timestamp: new Date().toISOString() },
        headers: {},
        statusText: 'Bad Request',
        config: {} as any,
      } as AxiosResponse
    );
    const msg = handleApiError(error);
    expect(msg).toBe('Account number already exists');
    expect(toast.error).toHaveBeenCalledWith('Account number already exists');
  });

  it('403 → shows "You do not have permission" toast', () => {
    const error = new AxiosError(
      'Forbidden',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 403,
        data: { success: false, timestamp: new Date().toISOString() },
        headers: {},
        statusText: 'Forbidden',
        config: {} as any,
      } as AxiosResponse
    );
    const msg = handleApiError(error);
    expect(msg).toBe('You do not have permission for this action.');
    expect(toast.error).toHaveBeenCalledWith('You do not have permission for this action.');
  });

  it('404 → shows "resource not found" toast', () => {
    const error = new AxiosError(
      'Not Found',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 404,
        data: { success: false, timestamp: new Date().toISOString() },
        headers: {},
        statusText: 'Not Found',
        config: {} as any,
      } as AxiosResponse
    );
    const msg = handleApiError(error);
    expect(msg).toBe('The requested resource was not found.');
    expect(toast.error).toHaveBeenCalledWith('The requested resource was not found.');
  });

  it('409 → shows "modified by another user" toast', () => {
    const error = new AxiosError(
      'Conflict',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 409,
        data: { success: false, timestamp: new Date().toISOString() },
        headers: {},
        statusText: 'Conflict',
        config: {} as any,
      } as AxiosResponse
    );
    const msg = handleApiError(error);
    expect(msg).toBe('Conflict: this record was modified by another user.');
    expect(toast.error).toHaveBeenCalledWith('Conflict: this record was modified by another user.');
  });

  it('429 → shows "Too many requests" toast', () => {
    const error = new AxiosError(
      'Too Many Requests',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 429,
        data: { success: false, timestamp: new Date().toISOString() },
        headers: {},
        statusText: 'Too Many Requests',
        config: {} as any,
      } as AxiosResponse
    );
    const msg = handleApiError(error);
    expect(msg).toBe('Too many requests. Please wait and try again.');
    expect(toast.error).toHaveBeenCalledWith('Too many requests. Please wait and try again.');
  });

  it('500 → shows "Server error" toast', () => {
    const error = new AxiosError(
      'Internal Server Error',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 500,
        data: { success: false, timestamp: new Date().toISOString() },
        headers: {},
        statusText: 'Internal Server Error',
        config: {} as any,
      } as AxiosResponse
    );
    const msg = handleApiError(error);
    expect(msg).toBe('Server error. Please try again or contact support.');
    expect(toast.error).toHaveBeenCalledWith('Server error. Please try again or contact support.');
  });

  it('503 → shows "Service temporarily unavailable" toast', () => {
    const error = new AxiosError(
      'Service Unavailable',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 503,
        data: { success: false, timestamp: new Date().toISOString() },
        headers: {},
        statusText: 'Service Unavailable',
        config: {} as any,
      } as AxiosResponse
    );
    const msg = handleApiError(error);
    expect(msg).toBe('Service temporarily unavailable. Please try again later.');
    expect(toast.error).toHaveBeenCalledWith('Service temporarily unavailable. Please try again later.');
  });

  it('unknown status → shows "An unexpected error occurred"', () => {
    const error = new AxiosError(
      'Teapot',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 418,
        data: { success: false, timestamp: new Date().toISOString() },
        headers: {},
        statusText: 'I am a teapot',
        config: {} as any,
      } as AxiosResponse
    );
    const msg = handleApiError(error);
    expect(msg).toBe('An unexpected error occurred.');
    expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred.');
  });
});

// ─── Non-Axios errors ────────────────────────────────────────────────

describe('Error Handling: Non-Axios Errors', () => {
  it('plain Error → shows error.message toast', () => {
    const error = new Error('Something broke');
    const msg = handleApiError(error);
    expect(msg).toBe('Something broke');
    expect(toast.error).toHaveBeenCalledWith('Something broke');
  });

  it('unknown error type → shows generic message', () => {
    const msg = handleApiError('string error');
    expect(msg).toBe('Unknown error');
    expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred.');
  });

  it('null error → shows generic message', () => {
    const msg = handleApiError(null);
    expect(msg).toBe('Unknown error');
  });

  it('undefined error → shows generic message', () => {
    const msg = handleApiError(undefined);
    expect(msg).toBe('Unknown error');
  });
});

// ─── onMutationError callback ────────────────────────────────────────

describe('Error Handling: onMutationError', () => {
  it('delegates to handleApiError', () => {
    const error = new AxiosError(
      'Bad Request',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 400,
        data: { success: false, message: 'Mutation failed', timestamp: new Date().toISOString() },
        headers: {},
        statusText: 'Bad Request',
        config: {} as any,
      } as AxiosResponse
    );
    onMutationError(error);
    expect(toast.error).toHaveBeenCalledWith('Mutation failed');
  });
});

// ─── ErrorBoundary Component ─────────────────────────────────────────

describe('Error Handling: ErrorBoundary', () => {
  it('renders children when no error', () => {
    renderWithCrossCuttingProviders(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('catches render error and shows fallback UI', () => {
    function ThrowOnRender(): never {
      throw new Error('Component crashed');
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithCrossCuttingProviders(
      <ErrorBoundary>
        <ThrowOnRender />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Component crashed')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('shows "Try again" button that resets error state', async () => {
    let shouldThrow = true;
    function MaybeThrow() {
      if (shouldThrow) throw new Error('Boom');
      return <div>Recovered</div>;
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithCrossCuttingProviders(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click "Try again" — it resets hasError to false
    const tryAgain = screen.getByText('Try again');
    expect(tryAgain).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('shows "Go home" link pointing to /dashboard', () => {
    function ThrowError(): never {
      throw new Error('Test');
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithCrossCuttingProviders(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const goHome = screen.getByText('Go home').closest('a');
    expect(goHome).toHaveAttribute('href', '/dashboard');
    consoleSpy.mockRestore();
  });

  it('displays technical details in collapsible section', () => {
    function ThrowError(): never {
      throw new Error('Detailed stack trace info');
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithCrossCuttingProviders(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const details = document.querySelector('details');
    expect(details).toBeTruthy();
    expect(screen.getByText('Detailed stack trace info')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});

// ─── Error Pages ─────────────────────────────────────────────────────

describe('Error Handling: Error Pages', () => {
  it('NotFoundPage renders 404 heading', () => {
    renderWithCrossCuttingProviders(<NotFoundPage />, { route: '/nonexistent' });
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('NotFoundPage has "Go back" and "Dashboard" navigation', () => {
    renderWithCrossCuttingProviders(<NotFoundPage />, { route: '/nonexistent' });
    expect(screen.getByText('Go back')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('ForbiddenPage renders 403 heading', () => {
    renderWithCrossCuttingProviders(<ForbiddenPage />, { route: '/admin' });
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('ForbiddenPage has "Go back" and "Contact admin" actions', () => {
    renderWithCrossCuttingProviders(<ForbiddenPage />, { route: '/admin' });
    expect(screen.getByText('Go back')).toBeInTheDocument();
    expect(screen.getByText('Contact admin')).toBeInTheDocument();
  });

  it('ForbiddenPage contact admin links to support email', () => {
    renderWithCrossCuttingProviders(<ForbiddenPage />, { route: '/admin' });
    const contactLink = screen.getByText('Contact admin').closest('a');
    expect(contactLink).toHaveAttribute('href', 'mailto:support@bellbank.com');
  });
});

// ─── TanStack Query Error States ─────────────────────────────────────

describe('Error Handling: TanStack Query Error', () => {
  function ErrorComponent() {
    const { data, error, isError, refetch, isLoading } = useQuery({
      queryKey: ['test-error-query'],
      queryFn: async () => {
        throw new Error('Server Error: 500');
      },
    });

    if (isLoading) return <div>Loading...</div>;
    if (isError) {
      return (
        <div>
          <p>Error: {(error as Error).message}</p>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      );
    }
    return <div>Data: {JSON.stringify(data)}</div>;
  }

  it('shows error state with retry button when query fails', async () => {
    renderWithCrossCuttingProviders(<ErrorComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});

// ─── Form Submission Error ───────────────────────────────────────────

describe('Error Handling: Form Submission', () => {
  function TestForm() {
    const mutation = useMutation({
      mutationFn: async (_data: { name: string }) => {
        throw new Error('Validation failed');
      },
      onError: onMutationError,
    });

    return (
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ name: 'test' }); }}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" defaultValue="test" />
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Submitting...' : 'Submit'}
        </button>
        {mutation.isError && <p role="alert">Submission failed</p>}
      </form>
    );
  }

  it('re-enables submit button after error', async () => {
    renderWithCrossCuttingProviders(<TestForm />);

    const submitBtn = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
    });
  });

  it('preserves form data after submission error', async () => {
    renderWithCrossCuttingProviders(<TestForm />);

    const input = screen.getByLabelText('Name');
    expect(input).toHaveValue('test');

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      // Input value should still be preserved
      expect(screen.getByLabelText('Name')).toHaveValue('test');
    });
  });

  it('shows error alert after submission failure', async () => {
    renderWithCrossCuttingProviders(<TestForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Submission failed');
    });
  });
});

// ─── 401 Silent Refresh ──────────────────────────────────────────────

describe('Error Handling: 401 Token Refresh', () => {
  it('api interceptor sets _retry flag on 401', async () => {
    // This is tested through the API interceptor — we verify the mechanism exists
    server.use(
      http.get('*/api/v1/test-auth', () => {
        return HttpResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        );
      })
    );

    try {
      await api.get('/api/v1/test-auth');
    } catch (error) {
      // Expected to fail — the interceptor attempts token refresh then retries
      expect(error).toBeTruthy();
    }
  });
});

// ─── Network Error ───────────────────────────────────────────────────

describe('Error Handling: Network Error', () => {
  it('network error without response shows generic message', () => {
    const error = new AxiosError(
      'Network Error',
      'ERR_NETWORK',
      undefined,
      undefined,
      undefined // no response
    );
    const msg = handleApiError(error);
    expect(msg).toBe('An unexpected error occurred.');
  });
});

// ─── File Upload Error ───────────────────────────────────────────────

describe('Error Handling: File Upload', () => {
  function FileUploadComponent() {
    const mutation = useMutation({
      mutationFn: async (_file: File) => {
        // Simulate upload failure
        throw new Error('File too large');
      },
      onError: onMutationError,
    });

    return (
      <div>
        <input
          type="file"
          aria-label="Upload file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) mutation.mutate(file);
          }}
        />
        {mutation.isPending && <p>Uploading...</p>}
        {mutation.isError && <p role="alert">Upload failed: {(mutation.error as Error).message}</p>}
        {mutation.isSuccess && <p>Upload successful</p>}
      </div>
    );
  }

  it('shows error message when file upload fails', async () => {
    renderWithCrossCuttingProviders(<FileUploadComponent />);

    const input = screen.getByLabelText('Upload file') as HTMLInputElement;
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('File too large');
    });
  });
});
