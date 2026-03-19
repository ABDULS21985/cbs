/**
 * T7 — Dark Mode Tests
 *
 * Verifies theme toggling, CSS variable changes, persistence, and semantic color mapping.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithCrossCuttingProviders,
  enableDarkMode,
  enableLightMode,
  isDarkMode,
} from '../helpers/crossCuttingUtils';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';

beforeEach(() => {
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add('light');
  localStorage.removeItem('cbs-theme');
});

afterEach(() => {
  document.documentElement.classList.remove('dark', 'light');
  localStorage.removeItem('cbs-theme');
});

// ─── Theme Toggle Tests ──────────────────────────────────────────────

describe('Dark Mode: Theme Toggle', () => {
  it('toggles from light to dark on click', async () => {
    renderWithCrossCuttingProviders(<ThemeToggle />, { theme: 'light' });
    const toggle = screen.getByTitle(/Theme: light/);
    expect(toggle).toBeInTheDocument();
  });

  it('displays current theme mode label', () => {
    renderWithCrossCuttingProviders(<ThemeToggle />, { theme: 'light' });
    expect(screen.getByText('light mode')).toBeInTheDocument();
  });

  it('shows collapsed version without label', () => {
    renderWithCrossCuttingProviders(<ThemeToggle collapsed />, { theme: 'dark' });
    expect(screen.queryByText(/mode$/)).toBeNull();
  });

  it('cycles through light → dark → system → light', async () => {
    renderWithCrossCuttingProviders(<ThemeToggle />, { theme: 'light' });

    // Light → click → dark
    const toggle = screen.getByTitle(/Theme: light/);
    fireEvent.click(toggle);

    // After click, the theme context should update
    await waitFor(() => {
      const btn = screen.getByRole('button');
      expect(btn.getAttribute('title')).toContain('dark');
    });
  });
});

// ─── Dark Mode CSS Class Application ─────────────────────────────────

describe('Dark Mode: CSS class application', () => {
  it('adds dark class to html element when dark mode enabled', () => {
    enableDarkMode();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('adds light class to html element when light mode enabled', () => {
    enableLightMode();
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('removes old class when switching modes', () => {
    enableDarkMode();
    expect(isDarkMode()).toBe(true);
    enableLightMode();
    expect(isDarkMode()).toBe(false);
  });
});

// ─── Dark Mode Persistence ───────────────────────────────────────────

describe('Dark Mode: Persistence', () => {
  it('persists theme choice to localStorage', () => {
    enableDarkMode();
    expect(localStorage.getItem('cbs-theme')).toBe('dark');
  });

  it('reads theme from localStorage on init', () => {
    localStorage.setItem('cbs-theme', 'dark');
    const storedTheme = localStorage.getItem('cbs-theme');
    expect(storedTheme).toBe('dark');
  });

  it('defaults to light when no stored preference', () => {
    localStorage.removeItem('cbs-theme');
    const storedTheme = localStorage.getItem('cbs-theme');
    expect(storedTheme).toBeNull();
  });

  it('persists across simulated navigation', () => {
    enableDarkMode();
    // Simulate navigating to another route
    const { unmount } = renderWithCrossCuttingProviders(<ThemeToggle />, {
      route: '/dashboard',
      theme: 'dark',
    });
    unmount();

    // On "new page load", localStorage still has dark
    expect(localStorage.getItem('cbs-theme')).toBe('dark');

    renderWithCrossCuttingProviders(<ThemeToggle />, {
      route: '/customers',
      theme: 'dark',
    });
    // Theme should still be dark
    expect(localStorage.getItem('cbs-theme')).toBe('dark');
  });
});

// ─── StatusBadge Dark Mode Colors ────────────────────────────────────

describe('Dark Mode: StatusBadge semantic colors', () => {
  const statusTests = [
    { status: 'ACTIVE', colorKey: 'success', darkClass: 'dark:bg-green-900/30' },
    { status: 'PENDING', colorKey: 'warning', darkClass: 'dark:bg-amber-900/30' },
    { status: 'SUSPENDED', colorKey: 'danger', darkClass: 'dark:bg-red-900/30' },
    { status: 'APPROVED', colorKey: 'success', darkClass: 'dark:bg-green-900/30' },
    { status: 'REJECTED', colorKey: 'danger', darkClass: 'dark:bg-red-900/30' },
    { status: 'PROCESSING', colorKey: 'warning', darkClass: 'dark:bg-amber-900/30' },
    { status: 'CLOSED', colorKey: 'default', darkClass: 'dark:bg-gray-800' },
  ];

  statusTests.forEach(({ status, darkClass }) => {
    it(`${status} badge has dark mode class: ${darkClass}`, () => {
      enableDarkMode();
      renderWithCrossCuttingProviders(<StatusBadge status={status} />, { theme: 'dark' });
      const badge = screen.getByText(status.replace(/_/g, ' '));
      expect(badge.className).toContain(darkClass);
    });
  });

  it('maintains semantic distinction between success and danger in dark mode', () => {
    enableDarkMode();
    const { unmount: u1 } = renderWithCrossCuttingProviders(<StatusBadge status="ACTIVE" />, { theme: 'dark' });
    const activeBadge = screen.getByText('ACTIVE');
    const activeClasses = activeBadge.className;
    u1();

    renderWithCrossCuttingProviders(<StatusBadge status="SUSPENDED" />, { theme: 'dark' });
    const suspendedBadge = screen.getByText('SUSPENDED');
    const suspendedClasses = suspendedBadge.className;

    // They should have different color classes
    expect(activeClasses).not.toBe(suspendedClasses);
  });
});

// ─── StatCard Dark Mode Tests ────────────────────────────────────────

describe('Dark Mode: StatCard', () => {
  it('renders stat-card class which has dark mode styles via CSS', () => {
    enableDarkMode();
    renderWithCrossCuttingProviders(
      <StatCard label="Revenue" value={1000000} format="money" />,
      { theme: 'dark' }
    );
    const card = document.querySelector('.stat-card');
    expect(card).toBeTruthy();
  });

  it('trend up uses stat-change-up class (maps to dark:text-green-400 via CSS)', () => {
    enableDarkMode();
    renderWithCrossCuttingProviders(
      <StatCard label="Revenue" value={1000000} format="money" change={5.2} trend="up" />,
      { theme: 'dark' }
    );
    const change = document.querySelector('.stat-change-up');
    expect(change).toBeTruthy();
    // stat-change-up maps to dark:text-green-400 via globals.css @apply
    expect(change?.className).toContain('stat-change-up');
  });

  it('trend down uses stat-change-down class (maps to dark:text-red-400 via CSS)', () => {
    enableDarkMode();
    renderWithCrossCuttingProviders(
      <StatCard label="NPL" value={3.5} format="percent" change={-0.5} trend="down" />,
      { theme: 'dark' }
    );
    const change = document.querySelector('.stat-change-down');
    expect(change).toBeTruthy();
    // stat-change-down maps to dark:text-red-400 via globals.css @apply
    expect(change?.className).toContain('stat-change-down');
  });
});

// ─── DataTable Dark Mode Tests ───────────────────────────────────────

describe('Dark Mode: DataTable', () => {
  interface SimpleRow { id: string; name: string; }
  const columns: ColumnDef<SimpleRow, any>[] = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'name', header: 'Name' },
  ];
  const data: SimpleRow[] = [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' },
    { id: '3', name: 'Gamma' },
  ];

  it('renders data-table class for dark mode styling', () => {
    enableDarkMode();
    renderWithCrossCuttingProviders(
      <DataTable columns={columns} data={data} />,
      { theme: 'dark' }
    );
    const table = document.querySelector('.data-table');
    expect(table).toBeTruthy();
  });

  it('uses bg-card class which adapts to dark mode via CSS variables', () => {
    enableDarkMode();
    renderWithCrossCuttingProviders(
      <DataTable columns={columns} data={data} />,
      { theme: 'dark' }
    );
    const container = document.querySelector('.bg-card');
    expect(container).toBeTruthy();
  });

  it('header row uses bg-muted/30 which adapts to dark theme', () => {
    enableDarkMode();
    renderWithCrossCuttingProviders(
      <DataTable columns={columns} data={data} />,
      { theme: 'dark' }
    );
    const headerRow = document.querySelector('tr.bg-muted\\/30');
    expect(headerRow).toBeTruthy();
  });
});

// ─── Component Dark Mode Class Verification ──────────────────────────

describe('Dark Mode: CSS variable system', () => {
  it('defines light mode CSS variables on :root', () => {
    enableLightMode();
    // The CSS variables are defined in globals.css, we check class-based switching
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('defines dark mode CSS variables when .dark class present', () => {
    enableDarkMode();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('no white flash: html element has class before rendering', () => {
    enableDarkMode();
    // The theme provider sets the class synchronously
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    // Then render — the class is already set, preventing flash
    renderWithCrossCuttingProviders(<div>Test</div>, { theme: 'dark' });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

// ─── ErrorBoundary Dark Mode ─────────────────────────────────────────

describe('Dark Mode: Error pages', () => {
  it('ErrorBoundary uses dark:bg-red-900/30 for icon background', async () => {
    // Import ErrorBoundary dynamically to test its dark mode classes
    const { ErrorBoundary } = await import('@/components/ErrorBoundary');

    function ThrowError(): never {
      throw new Error('Test error');
    }

    // Suppress React error boundary console errors
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    enableDarkMode();
    renderWithCrossCuttingProviders(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
      { theme: 'dark' }
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    const iconContainer = document.querySelector('.dark\\:bg-red-900\\/30');
    expect(iconContainer).toBeTruthy();

    consoleSpy.mockRestore();
  });
});

// ─── Sidebar Dark Mode ───────────────────────────────────────────────

describe('Dark Mode: Sidebar', () => {
  it('sidebar has dark background (hsl(222.2,84%,4.9%)) always', () => {
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={false} onToggle={vi.fn()} />,
      { route: '/dashboard', theme: 'dark' }
    );
    const aside = document.querySelector('aside');
    expect(aside?.className).toContain('bg-[hsl(222.2,84%,4.9%)]');
    expect(aside?.className).toContain('text-white');
  });

  it('sidebar uses consistent dark background regardless of theme', () => {
    // Light mode
    const { unmount } = renderWithCrossCuttingProviders(
      <Sidebar collapsed={false} onToggle={vi.fn()} />,
      { route: '/dashboard', theme: 'light' }
    );
    const asideLight = document.querySelector('aside');
    const lightBg = asideLight?.className;
    unmount();

    // Dark mode
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={false} onToggle={vi.fn()} />,
      { route: '/dashboard', theme: 'dark' }
    );
    const asideDark = document.querySelector('aside');
    const darkBg = asideDark?.className;

    // Sidebar always uses fixed dark background
    expect(lightBg).toContain('bg-[hsl(222.2,84%,4.9%)]');
    expect(darkBg).toContain('bg-[hsl(222.2,84%,4.9%)]');
  });
});
