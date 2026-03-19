import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../useOnlineStatus';

describe('useOnlineStatus', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: originalOnLine });
  });

  it('returns true when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('updates to false when offline event fires', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });

  it('updates to true when online event fires after going offline', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });

  it('removes event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());
    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('handles multiple online/offline toggles correctly', () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current).toBe(false);
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current).toBe(true);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current).toBe(false);
  });
});
