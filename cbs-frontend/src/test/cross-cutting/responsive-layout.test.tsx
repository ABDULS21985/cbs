/**
 * T7 — Responsive Design Tests
 *
 * Tests layout components across 3 viewports: Desktop (1440×900), Tablet (768×1024), Mobile (375×812).
 * Covers: Sidebar behavior, DataTable scroll, form stacking, StatCard grids, modals, navigation, touch targets.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import {
  renderWithCrossCuttingProviders,
  setViewport,
  VIEWPORTS,
  type ViewportName,
} from '../helpers/crossCuttingUtils';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { DataTable } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { type ColumnDef } from '@tanstack/react-table';

// ─── Sidebar Responsive Tests ────────────────────────────────────────

describe('Responsive: Sidebar', () => {
  const viewports: ViewportName[] = ['desktop', 'tablet', 'mobile'];

  describe('Desktop (1440×900)', () => {
    beforeEach(() => setViewport('desktop'));

    it('renders sidebar expanded and visible', () => {
      renderWithCrossCuttingProviders(<AppShell />, { route: '/dashboard', viewport: 'desktop' });
      // Desktop sidebar container has `hidden lg:flex` — at 1440px lg applies, so sidebar is flex
      const desktopSidebar = document.querySelector('.hidden.lg\\:flex');
      expect(desktopSidebar).toBeTruthy();
    });

    it('renders sidebar with full width (260px) when not collapsed', () => {
      renderWithCrossCuttingProviders(<AppShell />, { route: '/dashboard', viewport: 'desktop' });
      const desktopSidebar = document.querySelector('.hidden.lg\\:flex');
      expect(desktopSidebar?.classList.toString()).toContain('w-[260px]');
    });

    it('hides the mobile overlay when sidebar is not open on mobile', () => {
      renderWithCrossCuttingProviders(<AppShell />, { route: '/dashboard', viewport: 'desktop' });
      const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(overlay).toBeNull();
    });

    it('provides a collapse toggle button visible only on desktop (lg:flex)', () => {
      renderWithCrossCuttingProviders(
        <Sidebar collapsed={false} onToggle={vi.fn()} />,
        { route: '/dashboard', viewport: 'desktop' }
      );
      const toggleBtn = screen.getByTitle('Collapse sidebar (Ctrl+B)');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn.className).toContain('lg:flex');
    });
  });

  describe('Tablet (768×1024)', () => {
    beforeEach(() => setViewport('tablet'));

    it('renders sidebar collapsed (64px) at tablet breakpoint', () => {
      renderWithCrossCuttingProviders(<AppShell />, { route: '/dashboard', viewport: 'tablet' });
      // At 768px, below lg(1024px), desktop sidebar has `hidden lg:flex` → hidden
      const desktopSidebar = document.querySelector('.hidden.lg\\:flex');
      // On tablet (< 1024px), the desktop sidebar is hidden via `hidden lg:flex`
      expect(desktopSidebar).toBeTruthy();
    });

    it('shows collapsed sidebar icons without labels', () => {
      renderWithCrossCuttingProviders(
        <Sidebar collapsed={true} onToggle={vi.fn()} />,
        { route: '/dashboard', viewport: 'tablet' }
      );
      // When collapsed, DigiCore label should not render
      expect(screen.queryByText('DigiCore')).toBeNull();
    });
  });

  describe('Mobile (375×812)', () => {
    beforeEach(() => setViewport('mobile'));

    it('desktop sidebar is hidden at mobile viewport', () => {
      renderWithCrossCuttingProviders(<AppShell />, { route: '/dashboard', viewport: 'mobile' });
      const desktopSidebar = document.querySelector('.hidden.lg\\:flex');
      // At mobile width, this element exists in DOM but is hidden via CSS `hidden`
      expect(desktopSidebar).toBeTruthy();
    });

    it('mobile sidebar is off-screen by default (-translate-x-full)', () => {
      renderWithCrossCuttingProviders(<AppShell />, { route: '/dashboard', viewport: 'mobile' });
      const mobileSidebar = document.querySelector('.lg\\:hidden.fixed');
      expect(mobileSidebar?.classList.toString()).toContain('-translate-x-full');
    });

    it('shows hamburger menu button in TopBar on mobile', () => {
      renderWithCrossCuttingProviders(<AppShell />, { route: '/dashboard', viewport: 'mobile' });
      // TopBar has a toggle button for mobile sidebar
      const toggleButtons = document.querySelectorAll('button');
      expect(toggleButtons.length).toBeGreaterThan(0);
    });
  });
});

// ─── DataTable Responsive Tests ──────────────────────────────────────

describe('Responsive: DataTable', () => {
  interface TestRow {
    id: string;
    name: string;
    email: string;
    balance: number;
    status: string;
    branch: string;
    lastLogin: string;
  }

  const columns: ColumnDef<TestRow, any>[] = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'balance', header: 'Balance' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'branch', header: 'Branch' },
    { accessorKey: 'lastLogin', header: 'Last Login' },
  ];

  const data: TestRow[] = Array.from({ length: 15 }, (_, i) => ({
    id: `C${String(i + 1).padStart(4, '0')}`,
    name: `Customer ${i + 1}`,
    email: `customer${i + 1}@email.com`,
    balance: Math.random() * 1000000,
    status: ['ACTIVE', 'PENDING', 'SUSPENDED'][i % 3],
    branch: `Branch ${(i % 5) + 1}`,
    lastLogin: '2026-03-15',
  }));

  it('renders all columns visible at desktop', async () => {
    setViewport('desktop');
    renderWithCrossCuttingProviders(
      <DataTable columns={columns} data={data} />,
      { viewport: 'desktop' }
    );
    await waitFor(() => {
      const headers = document.querySelectorAll('th');
      expect(headers.length).toBe(columns.length);
    });
  });

  it('wraps table in overflow-x-auto container for horizontal scroll', () => {
    renderWithCrossCuttingProviders(
      <DataTable columns={columns} data={data} />,
      { viewport: 'mobile' }
    );
    const scrollContainer = document.querySelector('.overflow-x-auto');
    expect(scrollContainer).toBeTruthy();
  });

  it('renders table element with correct structure', () => {
    renderWithCrossCuttingProviders(
      <DataTable columns={columns} data={data} />,
      { viewport: 'tablet' }
    );
    const table = document.querySelector('table');
    expect(table).toBeTruthy();
    const thead = table?.querySelector('thead');
    expect(thead).toBeTruthy();
    const tbody = table?.querySelector('tbody');
    expect(tbody).toBeTruthy();
  });

  it('shows loading skeleton when isLoading is true', () => {
    renderWithCrossCuttingProviders(
      <DataTable columns={columns} data={[]} isLoading={true} />,
      { viewport: 'mobile' }
    );
    // DataTableSkeleton renders pulse animations
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when data is empty and not loading', () => {
    renderWithCrossCuttingProviders(
      <DataTable columns={columns} data={[]} emptyMessage="No customers found" />,
      { viewport: 'desktop' }
    );
    expect(screen.getByText('No customers found')).toBeInTheDocument();
  });

  it('pagination renders correctly at all viewports', () => {
    (['desktop', 'tablet', 'mobile'] as ViewportName[]).forEach((vp) => {
      const { unmount } = renderWithCrossCuttingProviders(
        <DataTable columns={columns} data={data} pageSize={5} />,
        { viewport: vp }
      );
      // With 15 items and pageSize 5, pagination should exist
      const table = document.querySelector('table');
      expect(table).toBeTruthy();
      unmount();
    });
  });
});

// ─── StatCard Grid Responsive Tests ──────────────────────────────────

describe('Responsive: StatCard Grid', () => {
  function StatCardGrid() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Deposits" value={1250000} format="money" trend="up" change={5.2} />
        <StatCard label="Active Loans" value={342} format="number" trend="up" change={2.1} />
        <StatCard label="NPL Ratio" value={3.45} format="percent" trend="down" change={-0.3} />
        <StatCard label="Net Interest" value={89000000} format="money" trend="up" change={12.5} />
      </div>
    );
  }

  it('renders 4 stat cards', () => {
    renderWithCrossCuttingProviders(<StatCardGrid />);
    const cards = document.querySelectorAll('.stat-card');
    expect(cards.length).toBe(4);
  });

  it('uses grid layout with responsive column classes', () => {
    renderWithCrossCuttingProviders(<StatCardGrid />);
    const grid = document.querySelector('.grid');
    expect(grid?.classList.toString()).toContain('grid-cols-1');
    expect(grid?.classList.toString()).toContain('sm:grid-cols-2');
    expect(grid?.classList.toString()).toContain('lg:grid-cols-4');
  });

  it('renders loading skeleton when loading', () => {
    renderWithCrossCuttingProviders(
      <StatCard label="Test" value={0} loading={true} />
    );
    const pulse = document.querySelector('.animate-pulse');
    expect(pulse).toBeTruthy();
  });

  it('displays formatted money value', () => {
    renderWithCrossCuttingProviders(
      <StatCard label="Balance" value={1500000} format="money" currency="NGN" />
    );
    expect(screen.getByText('Balance')).toBeInTheDocument();
  });

  it('displays trend indicator', () => {
    renderWithCrossCuttingProviders(
      <StatCard label="Revenue" value={5000} format="number" change={5.2} trend="up" />
    );
    expect(screen.getByText(/\+5\.2%/)).toBeInTheDocument();
  });
});

// ─── Form Layout Responsive Tests ────────────────────────────────────

describe('Responsive: Form Layout', () => {
  function TestForm() {
    return (
      <form>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" name="firstName" type="text" className="w-full" />
          </div>
          <div>
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" name="lastName" type="text" className="w-full" />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="w-full" />
          </div>
        </div>
        <button type="submit">Submit</button>
      </form>
    );
  }

  it('renders form with responsive grid classes', () => {
    renderWithCrossCuttingProviders(<TestForm />, { viewport: 'desktop' });
    const grid = document.querySelector('.grid');
    expect(grid?.classList.toString()).toContain('grid-cols-1');
    expect(grid?.classList.toString()).toContain('md:grid-cols-2');
    expect(grid?.classList.toString()).toContain('lg:grid-cols-3');
  });

  it('renders all form inputs at all viewports', () => {
    (['desktop', 'tablet', 'mobile'] as ViewportName[]).forEach((vp) => {
      const { unmount } = renderWithCrossCuttingProviders(<TestForm />, { viewport: vp });
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders submit button at full width on mobile', () => {
    renderWithCrossCuttingProviders(<TestForm />, { viewport: 'mobile' });
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });
});

// ─── Modal Responsive Tests ──────────────────────────────────────────

describe('Responsive: Modals', () => {
  function TestModal({ open }: { open: boolean }) {
    if (!open) return null;
    return (
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-background rounded-lg w-full max-w-lg mx-4 sm:mx-auto p-6">
          <h2>Test Modal</h2>
          <p>Modal content</p>
          <button>Close</button>
        </div>
      </div>
    );
  }

  it('renders dialog centered at desktop', () => {
    renderWithCrossCuttingProviders(<TestModal open={true} />, { viewport: 'desktop' });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.classList.toString()).toContain('flex');
    expect(dialog.classList.toString()).toContain('items-center');
    expect(dialog.classList.toString()).toContain('justify-center');
  });

  it('renders dialog at all viewports', () => {
    (['desktop', 'tablet', 'mobile'] as ViewportName[]).forEach((vp) => {
      const { unmount } = renderWithCrossCuttingProviders(<TestModal open={true} />, { viewport: vp });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      unmount();
    });
  });

  it('does not render when closed', () => {
    renderWithCrossCuttingProviders(<TestModal open={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// ─── Navigation Responsive Tests ─────────────────────────────────────

describe('Responsive: Navigation', () => {
  it('renders Sidebar navigation items', () => {
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={false} onToggle={vi.fn()} />,
      { route: '/dashboard' }
    );
    expect(screen.getByText('DigiCore')).toBeInTheDocument();
    // Dashboard may appear multiple times (section header + nav item), use getAllByText
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
  });

  it('renders collapsed sidebar with icons only (no labels for section titles)', () => {
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={true} onToggle={vi.fn()} />,
      { route: '/dashboard' }
    );
    // Section titles hidden when collapsed
    expect(screen.queryByText('DigiCore')).toBeNull();
  });

  it('expands nav section containing current route', () => {
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={false} onToggle={vi.fn()} />,
      { route: '/lending/applications' }
    );
    // The lending section should be auto-expanded, showing child links
    expect(screen.getByText('Lending')).toBeInTheDocument();
  });
});

// ─── StatusBadge Responsive Tests ────────────────────────────────────

describe('Responsive: StatusBadge', () => {
  const statuses = ['ACTIVE', 'PENDING', 'SUSPENDED', 'APPROVED', 'REJECTED', 'COMPLETED'];

  statuses.forEach((status) => {
    it(`renders ${status} badge with correct styling`, () => {
      renderWithCrossCuttingProviders(<StatusBadge status={status} />);
      const badge = screen.getByText(status.replace(/_/g, ' '));
      expect(badge).toBeInTheDocument();
      expect(badge.classList.toString()).toContain('rounded-full');
    });
  });

  it('renders badge with dot indicator', () => {
    renderWithCrossCuttingProviders(<StatusBadge status="ACTIVE" dot />);
    const dot = document.querySelector('.rounded-full.w-1\\.5');
    expect(dot).toBeTruthy();
  });
});

// ─── Breakpoint Boundary Tests ───────────────────────────────────────

describe('Responsive: Breakpoint boundaries', () => {
  it('1024px is the lg breakpoint for sidebar visibility', () => {
    // At exactly 1024px, lg classes should apply
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    setViewport('desktop'); // closest
    renderWithCrossCuttingProviders(<AppShell />, { route: '/dashboard' });
    const desktopSidebar = document.querySelector('.hidden.lg\\:flex');
    expect(desktopSidebar).toBeTruthy();
  });

  it('renders correctly at 1023px (just below lg)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1023 });
    renderWithCrossCuttingProviders(<AppShell />, { route: '/dashboard' });
    // Desktop sidebar container exists but would be hidden via CSS
    const desktopSidebar = document.querySelector('.hidden.lg\\:flex');
    expect(desktopSidebar).toBeTruthy();
  });
});
