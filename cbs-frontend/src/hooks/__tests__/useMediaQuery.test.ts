import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '../useMediaQuery';

describe('useMediaQuery', () => {
  let addEventListenerSpy: ReturnType<typeof vi.fn>;
  let removeEventListenerSpy: ReturnType<typeof vi.fn>;
  let mockMql: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    addEventListenerSpy = vi.fn();
    removeEventListenerSpy = vi.fn();
    mockMql = {
      matches: false,
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
    };
    window.matchMedia = vi.fn().mockReturnValue(mockMql);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when matchMedia returns no match', () => {
    mockMql.matches = false;
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });

  it('returns true when matchMedia returns a match', () => {
    mockMql.matches = true;
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);
  });

  it('registers a change event listener on mount', () => {
    renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes the change event listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates when media query change event fires', () => {
    mockMql.matches = false;
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);

    const handler = addEventListenerSpy.mock.calls[0][1];
    act(() => {
      handler({ matches: true });
    });
    expect(result.current).toBe(true);
  });

  it('passes the query string to matchMedia', () => {
    renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
  });

  it('re-registers listener when query string changes', () => {
    const { rerender } = renderHook(({ q }: { q: string }) => useMediaQuery(q), {
      initialProps: { q: '(max-width: 767px)' },
    });
    rerender({ q: '(min-width: 1024px)' });
    expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
  });
});

describe('useIsMobile', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('calls matchMedia with mobile breakpoint', () => {
    renderHook(() => useIsMobile());
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });
});

describe('useIsTablet', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('calls matchMedia with tablet breakpoint', () => {
    renderHook(() => useIsTablet());
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px) and (max-width: 1023px)');
  });
});

describe('useIsDesktop', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('calls matchMedia with desktop breakpoint', () => {
    renderHook(() => useIsDesktop());
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
  });
});
