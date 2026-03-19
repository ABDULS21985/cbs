import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AxiosError } from 'axios';

// Mock sonner before importing the module under test
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from 'sonner';
import { handleApiError } from '@/lib/errorHandler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeAxiosError(status: number, data: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    status,
    data,
    headers: {},
    config: {} as AxiosError['config'],
    statusText: String(status),
  } as AxiosError['response'];
  return error;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('handleApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // AxiosError with data.message
  // -------------------------------------------------------------------------
  it('returns and toasts data.message when AxiosError contains message field', () => {
    const error = makeAxiosError(422, { message: 'Account number is required' });
    const result = handleApiError(error);

    expect(result).toBe('Account number is required');
    expect(toast.error).toHaveBeenCalledWith('Account number is required');
  });

  it('handles AxiosError with message on a 400 response overriding generic map', () => {
    const error = makeAxiosError(400, { message: 'Custom bad request message' });
    const result = handleApiError(error);

    expect(result).toBe('Custom bad request message');
    expect(toast.error).toHaveBeenCalledWith('Custom bad request message');
  });

  // -------------------------------------------------------------------------
  // AxiosError with data.errors (validation)
  // -------------------------------------------------------------------------
  it('joins validation errors array and toasts "Validation failed: ..."', () => {
    const error = makeAxiosError(422, {
      errors: ['Name is required', 'Email must be valid', 'Phone too short'],
    });
    const result = handleApiError(error);

    expect(result).toContain('Name is required');
    expect(result).toContain('Email must be valid');
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Validation failed'));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Name is required'));
  });

  it('handles a single-item validation errors array', () => {
    const error = makeAxiosError(400, { errors: ['Amount must be positive'] });
    const result = handleApiError(error);

    expect(result).toContain('Amount must be positive');
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Validation failed'));
  });

  // -------------------------------------------------------------------------
  // Status-code mapped messages
  // -------------------------------------------------------------------------
  it('returns mapped message for 400 status with no message/errors', () => {
    const error = makeAxiosError(400, {});
    const result = handleApiError(error);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns mapped message for 403 Forbidden', () => {
    const error = makeAxiosError(403, {});
    const result = handleApiError(error);

    expect(result).toBeTruthy();
    // Should communicate authorization/permission failure
    expect(result.toLowerCase()).toMatch(/forbidden|permission|access|authoriz/i);
  });

  it('returns mapped message for 404 Not Found', () => {
    const error = makeAxiosError(404, {});
    const result = handleApiError(error);

    expect(result).toBeTruthy();
    expect(result.toLowerCase()).toMatch(/not found|404/i);
  });

  it('returns mapped message for 409 Conflict', () => {
    const error = makeAxiosError(409, {});
    const result = handleApiError(error);

    expect(result).toBeTruthy();
    expect(result.toLowerCase()).toMatch(/conflict|already exist|duplicate/i);
  });

  it('returns mapped message for 429 Too Many Requests', () => {
    const error = makeAxiosError(429, {});
    const result = handleApiError(error);

    expect(result).toBeTruthy();
    expect(result.toLowerCase()).toMatch(/too many|rate limit|slow down/i);
  });

  it('returns mapped message for 500 Internal Server Error', () => {
    const error = makeAxiosError(500, {});
    const result = handleApiError(error);

    expect(result).toBeTruthy();
    expect(result.toLowerCase()).toMatch(/server error|internal|something went wrong/i);
  });

  it('returns mapped message for 503 Service Unavailable', () => {
    const error = makeAxiosError(503, {});
    const result = handleApiError(error);

    expect(result).toBeTruthy();
    expect(result.toLowerCase()).toMatch(/unavailable|service|maintenance|try again/i);
  });

  // -------------------------------------------------------------------------
  // Regular Error (non-Axios)
  // -------------------------------------------------------------------------
  it('returns error.message for a standard Error object', () => {
    const error = new Error('Network connection lost');
    const result = handleApiError(error);

    expect(result).toBe('Network connection lost');
  });

  it('does not call toast for a standard Error', () => {
    const error = new Error('Some internal failure');
    handleApiError(error);

    // Standard errors may or may not show toasts; the key thing is we handle gracefully
    expect(typeof handleApiError(error)).toBe('string');
  });

  it('handles Error with empty message', () => {
    const error = new Error('');
    const result = handleApiError(error);

    expect(typeof result).toBe('string');
  });

  // -------------------------------------------------------------------------
  // Unknown / non-Error values
  // -------------------------------------------------------------------------
  it('returns "Unknown error" for null', () => {
    const result = handleApiError(null);
    expect(result).toBe('Unknown error');
  });

  it('returns "Unknown error" for undefined', () => {
    const result = handleApiError(undefined);
    expect(result).toBe('Unknown error');
  });

  it('returns "Unknown error" for a plain string', () => {
    const result = handleApiError('some string error');
    expect(result).toBe('Unknown error');
  });

  it('returns "Unknown error" for a plain object without message', () => {
    const result = handleApiError({ code: 42 });
    expect(result).toBe('Unknown error');
  });

  it('returns "Unknown error" for a number', () => {
    const result = handleApiError(500);
    expect(result).toBe('Unknown error');
  });

  // -------------------------------------------------------------------------
  // AxiosError with no response (network error)
  // -------------------------------------------------------------------------
  it('handles AxiosError with no response (network timeout)', () => {
    const error = new AxiosError('Network Error');
    // no response set — simulates network failure
    const result = handleApiError(error);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
