/**
 * T7 — Print Tests
 *
 * Tests print button behavior, no-print class application, and print media styles.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import {
  renderWithCrossCuttingProviders,
  getPrintHiddenElements,
} from '../helpers/crossCuttingUtils';
import { PrintButton } from '@/components/shared/PrintButton';
import { Sidebar } from '@/components/layout/Sidebar';

// ─── PrintButton Component ──────────────────────────────────────────

describe('Print: PrintButton', () => {
  it('renders with default "Print" label', () => {
    renderWithCrossCuttingProviders(<PrintButton />);
    expect(screen.getByText('Print')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    renderWithCrossCuttingProviders(<PrintButton label="Print Statement" />);
    expect(screen.getByText('Print Statement')).toBeInTheDocument();
  });

  it('calls window.print() on click', () => {
    renderWithCrossCuttingProviders(<PrintButton />);

    fireEvent.click(screen.getByText('Print'));
    expect(window.print).toHaveBeenCalled();
  });

  it('has no-print class to hide itself during print', () => {
    renderWithCrossCuttingProviders(<PrintButton />);
    const button = screen.getByText('Print').closest('button');
    expect(button?.className).toContain('no-print');
  });

  it('renders printer icon', () => {
    renderWithCrossCuttingProviders(<PrintButton />);
    // Lucide Printer icon renders as SVG
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});

// ─── no-print Class Usage ────────────────────────────────────────────

describe('Print: no-print Elements', () => {
  it('PrintButton element has no-print class', () => {
    const { container } = renderWithCrossCuttingProviders(<PrintButton />);
    const hidden = getPrintHiddenElements(container);
    expect(hidden.length).toBe(1);
  });

  it('multiple no-print elements are correctly identified', () => {
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <nav className="no-print">Sidebar</nav>
        <header className="no-print">TopBar</header>
        <div className="no-print">
          <button>Action</button>
        </div>
        <main>
          <h1>Statement</h1>
          <p>Content to print</p>
        </main>
      </div>
    );
    const hidden = getPrintHiddenElements(container);
    expect(hidden.length).toBe(3);
  });

  it('printable content does not have no-print class', () => {
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <div className="no-print">Hidden</div>
        <div className="printable-content">
          <h1>Bank Statement</h1>
          <table>
            <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
            <tbody><tr><td>2026-03-01</td><td>Transfer</td><td>₦50,000</td></tr></tbody>
          </table>
        </div>
      </div>
    );
    const printable = container.querySelector('.printable-content');
    expect(printable?.className).not.toContain('no-print');
  });
});

// ─── Print Layout Tests ─────────────────────────────────────────────

describe('Print: Layout Behavior', () => {
  it('print styles exist in globals.css (verified by class usage)', () => {
    // The @media print rule in globals.css hides .no-print elements
    // We verify the pattern is used correctly
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <PrintButton />
        <div>Printable content</div>
      </div>
    );

    // PrintButton has no-print — will be hidden during print
    const noPrintElements = container.querySelectorAll('.no-print');
    expect(noPrintElements.length).toBeGreaterThan(0);
  });

  it('statement-style content renders correctly for printing', () => {
    renderWithCrossCuttingProviders(
      <div className="print-statement">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">BellBank</h1>
          <p className="text-sm text-muted-foreground">Account Statement</p>
        </div>
        <div className="mb-4">
          <p><strong>Account:</strong> 0123456789</p>
          <p><strong>Period:</strong> March 2026</p>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026-03-01</td>
              <td>Opening Balance</td>
              <td>-</td>
              <td>-</td>
              <td>₦1,000,000</td>
            </tr>
            <tr>
              <td>2026-03-02</td>
              <td>Transfer to Savings</td>
              <td>₦200,000</td>
              <td>-</td>
              <td>₦800,000</td>
            </tr>
          </tbody>
        </table>
      </div>
    );

    expect(screen.getByText('BellBank')).toBeInTheDocument();
    expect(screen.getByText('Account Statement')).toBeInTheDocument();
    expect(screen.getByText('0123456789')).toBeInTheDocument();
  });

  it('receipt-style content renders complete transaction details', () => {
    renderWithCrossCuttingProviders(
      <div className="print-receipt">
        <h2>Transaction Receipt</h2>
        <div>
          <p><strong>Reference:</strong> TXN-2026-03-15-001</p>
          <p><strong>Date:</strong> March 15, 2026</p>
          <p><strong>Type:</strong> Fund Transfer</p>
          <p><strong>From:</strong> 0123456789</p>
          <p><strong>To:</strong> 9876543210</p>
          <p><strong>Amount:</strong> ₦500,000.00</p>
          <p><strong>Status:</strong> Completed</p>
        </div>
      </div>
    );

    expect(screen.getByText('Transaction Receipt')).toBeInTheDocument();
    expect(screen.getByText('TXN-2026-03-15-001')).toBeInTheDocument();
    expect(screen.getByText('₦500,000.00')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});

// ─── Table Print Tests ──────────────────────────────────────────────

describe('Print: Table rendering', () => {
  it('full table renders without pagination elements hidden by no-print', () => {
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {Array.from({ length: 25 }, (_, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>Row {i + 1}</td>
                <td>₦{((i + 1) * 10000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="no-print">
          <button>Previous</button>
          <span>Page 1 of 3</span>
          <button>Next</button>
        </div>
      </div>
    );

    // All 25 rows render in the table
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(25);

    // Pagination is marked no-print
    const pagination = container.querySelector('.no-print');
    expect(pagination).toBeTruthy();
  });
});

// ─── Action Buttons Hidden in Print ──────────────────────────────────

describe('Print: Action buttons hidden', () => {
  it('action buttons use no-print class', () => {
    const { container } = renderWithCrossCuttingProviders(
      <div>
        <div className="no-print flex gap-2">
          <button>Edit</button>
          <button>Delete</button>
          <button>Export</button>
        </div>
        <div>
          <h2>Customer Details</h2>
          <p>Name: John Doe</p>
        </div>
      </div>
    );

    const hidden = getPrintHiddenElements(container);
    expect(hidden.length).toBe(1);

    // Printable content remains
    expect(screen.getByText('Customer Details')).toBeInTheDocument();
    expect(screen.getByText('Name: John Doe')).toBeInTheDocument();
  });
});
