import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebarState } from '../useSidebarState';

const STORAGE_KEY = 'cbs-sidebar-collapsed';

describe('useSidebarState', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('defaults to collapsed=false on wide screens when no storage value', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
    const { result } = renderHook(() => useSidebarState());
    expect(result.current.collapsed).toBe(false);
  });

  it('defaults to collapsed=true on narrow screens when no storage value', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, writable: true, configurable: true });
    const { result } = renderHook(() => useSidebarState());
    expect(result.current.collapsed).toBe(true);
  });

  it('reads collapsed state from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSidebarState());
    expect(result.current.collapsed).toBe(true);
  });

  it('reads expanded state from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const { result } = renderHook(() => useSidebarState());
    expect(result.current.collapsed).toBe(false);
  });

  it('toggle changes collapsed from false to true', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const { result } = renderHook(() => useSidebarState());
    act(() => { result.current.toggle(); });
    expect(result.current.collapsed).toBe(true);
  });

  it('toggle changes collapsed from true to false', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSidebarState());
    act(() => { result.current.toggle(); });
    expect(result.current.collapsed).toBe(false);
  });

  it('toggle persists new state to localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const { result } = renderHook(() => useSidebarState());
    act(() => { result.current.toggle(); });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('mobileOpen defaults to false', () => {
    const { result } = renderHook(() => useSidebarState());
    expect(result.current.mobileOpen).toBe(false);
  });

  it('setMobileOpen changes mobileOpen to true', () => {
    const { result } = renderHook(() => useSidebarState());
    act(() => { result.current.setMobileOpen(true); });
    expect(result.current.mobileOpen).toBe(true);
  });

  it('setMobileOpen changes mobileOpen to false', () => {
    const { result } = renderHook(() => useSidebarState());
    act(() => { result.current.setMobileOpen(true); });
    act(() => { result.current.setMobileOpen(false); });
    expect(result.current.mobileOpen).toBe(false);
  });

  it('Ctrl+B keyboard shortcut toggles sidebar', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const { result } = renderHook(() => useSidebarState());
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
    });
    expect(result.current.collapsed).toBe(true);
  });

  it('Meta+B keyboard shortcut toggles sidebar (macOS)', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const { result } = renderHook(() => useSidebarState());
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true }));
    });
    expect(result.current.collapsed).toBe(true);
  });

  it('unrelated keyboard shortcuts do not toggle sidebar', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const { result } = renderHook(() => useSidebarState());
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    });
    expect(result.current.collapsed).toBe(false);
  });

  it('removes keyboard listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useSidebarState());
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
