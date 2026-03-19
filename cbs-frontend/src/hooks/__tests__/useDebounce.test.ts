import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Initial value
  // -------------------------------------------------------------------------
  it('returns the initial value immediately without waiting', () => {
    const { result } = renderHook(() => useDebounce('hello'));
    expect(result.current).toBe('hello');
  });

  it('returns the initial numeric value immediately', () => {
    const { result } = renderHook(() => useDebounce(42));
    expect(result.current).toBe(42);
  });

  it('returns null as initial value', () => {
    const { result } = renderHook(() => useDebounce<string | null>(null));
    expect(result.current).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Default delay (300ms)
  // -------------------------------------------------------------------------
  it('does not update value before the default 300ms delay', () => {
    let value = 'initial';
    const { result, rerender } = renderHook(() => useDebounce(value));

    act(() => {
      value = 'updated';
      rerender();
    });

    // Advance time but not past the debounce window
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('initial');
  });

  it('updates value after the default 300ms delay elapses', () => {
    let value = 'initial';
    const { result, rerender } = renderHook(() => useDebounce(value));

    act(() => {
      value = 'updated';
      rerender();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('updates value after delay for numeric inputs', () => {
    let value = 0;
    const { result, rerender } = renderHook(() => useDebounce(value));

    act(() => {
      value = 99;
      rerender();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(99);
  });

  // -------------------------------------------------------------------------
  // Rapid changes — timer resets
  // -------------------------------------------------------------------------
  it('resets the timer on rapid successive changes and only fires once', () => {
    let value = 'a';
    const { result, rerender } = renderHook(() => useDebounce(value));

    // Change rapidly — each change should reset the timer
    act(() => {
      value = 'b';
      rerender();
    });
    act(() => {
      vi.advanceTimersByTime(100); // Not yet 300ms
    });

    act(() => {
      value = 'c';
      rerender();
    });
    act(() => {
      vi.advanceTimersByTime(100); // Still not 300ms from last change
    });

    act(() => {
      value = 'final';
      rerender();
    });
    act(() => {
      vi.advanceTimersByTime(100); // Not yet
    });

    // Value has NOT been updated yet
    expect(result.current).toBe('a');

    // Now advance past the debounce delay from the last change
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Only the last value 'final' should be reflected
    expect(result.current).toBe('final');
  });

  it('fires only once after a burst of rapid changes', () => {
    const callbackSpy = vi.fn();
    let value = 0;

    const { rerender } = renderHook(() => {
      const debounced = useDebounce(value);
      if (debounced !== 0) callbackSpy(debounced);
      return debounced;
    });

    act(() => {
      for (let i = 1; i <= 10; i++) {
        value = i;
        rerender();
        vi.advanceTimersByTime(50);
      }
    });

    // All 10 changes rapid — timer has been reset 10 times
    expect(callbackSpy).not.toHaveBeenCalled();

    // Now let the last debounce settle
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callbackSpy).toHaveBeenCalledTimes(1);
    expect(callbackSpy).toHaveBeenCalledWith(10);
  });

  // -------------------------------------------------------------------------
  // Custom delay
  // -------------------------------------------------------------------------
  it('respects a custom delay of 500ms', () => {
    let value = 'start';
    const { result, rerender } = renderHook(() => useDebounce(value, 500));

    act(() => {
      value = 'changed';
      rerender();
    });

    // After 300ms — should NOT have updated yet
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('start');

    // After full 500ms — should update
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('changed');
  });

  it('respects a custom delay of 100ms', () => {
    let value = 'original';
    const { result, rerender } = renderHook(() => useDebounce(value, 100));

    act(() => {
      value = 'updated';
      rerender();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe('original');

    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current).toBe('updated');
  });

  it('uses 300ms delay when no delay argument is given', () => {
    let value = 'initial';
    const { result, rerender } = renderHook(() => useDebounce(value));

    act(() => {
      value = 'new';
      rerender();
    });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('new');
  });

  // -------------------------------------------------------------------------
  // Object / array values
  // -------------------------------------------------------------------------
  it('works with object values', () => {
    let value = { name: 'Alice' };
    const { result, rerender } = renderHook(() => useDebounce(value));

    const updated = { name: 'Bob' };
    act(() => {
      value = updated;
      rerender();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toEqual({ name: 'Bob' });
  });

  it('works with array values', () => {
    let value: number[] = [1, 2, 3];
    const { result, rerender } = renderHook(() => useDebounce(value));

    act(() => {
      value = [4, 5, 6];
      rerender();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toEqual([4, 5, 6]);
  });
});
