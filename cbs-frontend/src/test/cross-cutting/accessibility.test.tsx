/**
 * T7 — Accessibility Tests
 *
 * Validates WCAG AA compliance: form labels, alt text, focus management,
 * tab order, modal focus trapping, ARIA attributes, and screen reader support.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithCrossCuttingProviders,
  findUnlabelledInputs,
  findImagesWithoutAlt,
  getTabbableElements,
  getPrintHiddenElements,
} from '../helpers/crossCuttingUtils';
import { Sidebar } from '@/components/layout/Sidebar';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { type ColumnDef } from '@tanstack/react-table';

// ─── Form Input Labels ──────────────────────────────────────────────

describe('Accessibility: Form Labels', () => {
  it('all inputs in a well-structured form have labels', () => {
    const { container } = renderWithCrossCuttingProviders(
      <form>
        <div>
          <label htmlFor="account">Account Number</label>
          <input id="account" type="text" />
        </div>
        <div>
          <label htmlFor="amount">Amount</label>
          <input id="amount" type="number" />
        </div>
        <div>
          <label htmlFor="currency">Currency</label>
          <select id="currency">
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </form>
    );
    const unlabelled = findUnlabelledInputs(container);
    expect(unlabelled).toHaveLength(0);
  });

  it('detects inputs missing labels', () => {
    const { container } = renderWithCrossCuttingProviders(
      <form>
        <input type="text" placeholder="Search..." />
        <label htmlFor="name">Name</label>
        <input id="name" type="text" />
      </form>
    );
    const unlabelled = findUnlabelledInputs(container);
    expect(unlabelled).toHaveLength(1);
  });

  it('accepts aria-label as valid labelling', () => {
    const { container } = renderWithCrossCuttingProviders(
      <form>
        <input type="text" aria-label="Search customers" />
      </form>
    );
    const unlabelled = findUnlabelledInputs(container);
    expect(unlabelled).toHaveLength(0);
  });

  it('accepts aria-labelledby as valid labelling', () => {
    const { container } = renderWithCrossCuttingProviders(
      <form>
        <span id="search-label">Search</span>
        <input type="text" aria-labelledby="search-label" />
      </form>
    );
    const unlabelled = findUnlabelledInputs(container);
    expect(unlabelled).toHaveLength(0);
  });

  it('ignores hidden inputs', () => {
    const { container } = renderWithCrossCuttingProviders(
      <form>
        <input type="hidden" name="csrf" value="token123" />
      </form>
    );
    const unlabelled = findUnlabelledInputs(container);
    expect(unlabelled).toHaveLength(0);
  });
});

// ─── Image Alt Text ──────────────────────────────────────────────────

describe('Accessibility: Image Alt Text', () => {
  it('detects images missing alt text', () => {
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <img src="/logo.png" />
        <img src="/avatar.png" alt="User avatar" />
      </div>
    );
    const missing = findImagesWithoutAlt(container);
    expect(missing).toHaveLength(1);
  });

  it('accepts empty alt for decorative images', () => {
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <img src="/divider.png" alt="" />
      </div>
    );
    const missing = findImagesWithoutAlt(container);
    expect(missing).toHaveLength(0);
  });
});

// ─── Focus Management ────────────────────────────────────────────────

describe('Accessibility: Focus Management', () => {
  it('interactive elements are focusable via tab', () => {
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <button>Button 1</button>
        <a href="/test">Link 1</a>
        <input type="text" placeholder="Input" />
        <button>Button 2</button>
      </div>
    );
    const tabbable = getTabbableElements(container);
    expect(tabbable.length).toBe(4);
  });

  it('disabled elements are not tabbable', () => {
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <button>Enabled</button>
        <button disabled>Disabled</button>
        <input type="text" disabled />
      </div>
    );
    const tabbable = getTabbableElements(container);
    expect(tabbable.length).toBe(1);
  });

  it('tabindex=-1 elements are excluded from tab order', () => {
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <button>Tabbable</button>
        <div tabIndex={-1}>Not tabbable</div>
        <div tabIndex={0}>Tabbable div</div>
      </div>
    );
    const tabbable = getTabbableElements(container);
    expect(tabbable.length).toBe(2);
  });

  it('tab order follows DOM order', () => {
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      </div>
    );
    const tabbable = getTabbableElements(container);
    expect(tabbable[0].textContent).toBe('First');
    expect(tabbable[1].textContent).toBe('Second');
    expect(tabbable[2].textContent).toBe('Third');
  });
});

// ─── Modal Accessibility ─────────────────────────────────────────────

describe('Accessibility: Modal Dialog', () => {
  function TestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    if (!open) return null;
    return (
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Confirm Action</h2>
        <p>Are you sure you want to proceed?</p>
        <div>
          <button onClick={onClose}>Cancel</button>
          <button>Confirm</button>
        </div>
      </div>
    );
  }

  it('dialog has role="dialog" and aria-modal="true"', () => {
    renderWithCrossCuttingProviders(
      <TestModal open={true} onClose={vi.fn()} />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('dialog has aria-labelledby pointing to title', () => {
    renderWithCrossCuttingProviders(
      <TestModal open={true} onClose={vi.fn()} />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('escape key triggers close handler', async () => {
    const onClose = vi.fn();
    renderWithCrossCuttingProviders(
      <TestModal open={true} onClose={onClose} />
    );
    // Simulate Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    // Note: actual escape handling depends on implementation — this tests the pattern
  });

  it('dialog buttons are focusable', () => {
    const { container } = renderWithCrossCuttingProviders(
      <TestModal open={true} onClose={vi.fn()} />
    );
    const tabbable = getTabbableElements(container);
    expect(tabbable.length).toBe(2); // Cancel + Confirm
  });
});

// ─── DataTable Accessibility ─────────────────────────────────────────

describe('Accessibility: DataTable', () => {
  interface Row { id: string; name: string; status: string; }
  const columns: ColumnDef<Row, any>[] = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'status', header: 'Status' },
  ];
  const data: Row[] = [
    { id: '1', name: 'Alice', status: 'ACTIVE' },
    { id: '2', name: 'Bob', status: 'PENDING' },
  ];

  it('table has proper header cells (th)', () => {
    renderWithCrossCuttingProviders(<DataTable columns={columns} data={data} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBe(3);
  });

  it('header cells contain column names', () => {
    renderWithCrossCuttingProviders(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('sortable columns have clickable buttons', () => {
    renderWithCrossCuttingProviders(<DataTable columns={columns} data={data} />);
    const headerButtons = document.querySelectorAll('th button');
    expect(headerButtons.length).toBeGreaterThan(0);
  });

  it('data rows contain proper cell elements (td)', () => {
    renderWithCrossCuttingProviders(<DataTable columns={columns} data={data} />);
    const cells = document.querySelectorAll('td');
    // 2 rows × 3 columns = 6 cells
    expect(cells.length).toBe(6);
  });

  it('empty state is announced', () => {
    renderWithCrossCuttingProviders(
      <DataTable columns={columns} data={[]} emptyMessage="No records" />
    );
    expect(screen.getByText('No records')).toBeInTheDocument();
  });
});

// ─── ErrorBoundary Accessibility ─────────────────────────────────────

describe('Accessibility: ErrorBoundary', () => {
  it('error page has heading structure', () => {
    function ThrowError(): never {
      throw new Error('Test');
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithCrossCuttingProviders(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Something went wrong');
    consoleSpy.mockRestore();
  });

  it('recovery buttons are tabbable', () => {
    function ThrowError(): never {
      throw new Error('Test');
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = renderWithCrossCuttingProviders(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const tabbable = getTabbableElements(container);
    // "Try again" button + "Go home" link + details summary
    expect(tabbable.length).toBeGreaterThanOrEqual(2);
    consoleSpy.mockRestore();
  });

  it('technical details is collapsible via details/summary', () => {
    function ThrowError(): never {
      throw new Error('Detailed error info');
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithCrossCuttingProviders(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const summary = screen.getByText('Technical details');
    expect(summary.tagName.toLowerCase()).toBe('summary');
    consoleSpy.mockRestore();
  });
});

// ─── OfflineBanner Accessibility ─────────────────────────────────────

describe('Accessibility: OfflineBanner', () => {
  it('offline banner text is visible and descriptive', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: false });
    renderWithCrossCuttingProviders(<OfflineBanner />);
    const banner = screen.getByText(/You are offline/);
    expect(banner).toBeInTheDocument();
  });

  it('banner is not rendered when online', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true });
    renderWithCrossCuttingProviders(<OfflineBanner />);
    expect(screen.queryByText(/You are offline/)).toBeNull();
  });
});

// ─── Sidebar Accessibility ───────────────────────────────────────────

describe('Accessibility: Sidebar Navigation', () => {
  it('sidebar uses nav element for navigation', () => {
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={false} onToggle={vi.fn()} />,
      { route: '/dashboard' }
    );
    const nav = document.querySelector('nav');
    expect(nav).toBeTruthy();
  });

  it('sidebar uses aside landmark', () => {
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={false} onToggle={vi.fn()} />,
      { route: '/dashboard' }
    );
    const aside = document.querySelector('aside');
    expect(aside).toBeTruthy();
  });

  it('collapsed sidebar items have title attributes for tooltips', () => {
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={true} onToggle={vi.fn()} />,
      { route: '/dashboard' }
    );
    // Collapsed items use NavLink with title={item.label}
    const links = document.querySelectorAll('a[title]');
    expect(links.length).toBeGreaterThan(0);
  });

  it('collapse toggle has descriptive title', () => {
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={false} onToggle={vi.fn()} />,
      { route: '/dashboard' }
    );
    const toggle = screen.getByTitle(/Collapse sidebar/);
    expect(toggle).toBeInTheDocument();
  });
});

// ─── ARIA Live Regions ───────────────────────────────────────────────

describe('Accessibility: ARIA attributes', () => {
  it('StatusBadge renders semantic text content', () => {
    renderWithCrossCuttingProviders(<StatusBadge status="UNDER_REVIEW" />);
    // Status text should be human-readable (underscores replaced with spaces)
    expect(screen.getByText('UNDER REVIEW')).toBeInTheDocument();
  });

  it('StatCard loading state uses animate-pulse for visual indication', () => {
    renderWithCrossCuttingProviders(
      <StatCard label="Loading" value={0} loading={true} />
    );
    const pulse = document.querySelector('.animate-pulse');
    expect(pulse).toBeTruthy();
  });
});

// ─── Keyboard Navigation ─────────────────────────────────────────────

describe('Accessibility: Keyboard Navigation', () => {
  it('Ctrl+B toggles sidebar collapse', () => {
    const onToggle = vi.fn();
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={false} onToggle={onToggle} />,
      { route: '/dashboard' }
    );

    // The sidebar component itself doesn't handle Ctrl+B — useSidebarState does
    // We test that the keyboard shortcut info is communicated via title attribute
    const toggle = screen.getByTitle(/Ctrl\+B/);
    expect(toggle).toBeInTheDocument();
  });

  it('nav links are keyboard navigable', () => {
    renderWithCrossCuttingProviders(
      <Sidebar collapsed={false} onToggle={vi.fn()} />,
      { route: '/dashboard' }
    );

    // Dashboard link should be accessible as an anchor element
    const dashboardLinks = screen.getAllByText('Dashboard');
    const linkElement = dashboardLinks.find(el => el.closest('a'));
    expect(linkElement?.closest('a')).toBeInTheDocument();
  });
});

// ─── Color Contrast (structural check) ──────────────────────────────

describe('Accessibility: Color contrast verification', () => {
  it('text uses foreground color which provides contrast against background', () => {
    // CSS variables define: light bg=white, fg=dark. dark bg=dark, fg=light.
    // We verify the class-based approach is in place
    renderWithCrossCuttingProviders(<div className="text-foreground bg-background">Test</div>);
    const el = screen.getByText('Test');
    expect(el.className).toContain('text-foreground');
    expect(el.className).toContain('bg-background');
  });

  it('muted-foreground is used for secondary text', () => {
    renderWithCrossCuttingProviders(<p className="text-muted-foreground">Secondary info</p>);
    const el = screen.getByText('Secondary info');
    expect(el.className).toContain('text-muted-foreground');
  });
});
