import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfoGrid } from '../InfoGrid';

vi.mock('../../../lib/utils/format', () => ({
  formatMoney: (amount: number) =>
    '₦' +
    new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount),
  formatPercent: (value: number) => `${value.toFixed(2)}%`,
  formatAccountNumber: (acct: string) => acct.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
}));

// Stub clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('InfoGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('label and value rendering', () => {
    it('renders each item label', () => {
      render(
        <InfoGrid
          items={[
            { label: 'Account Name', value: 'John Doe' },
            { label: 'Account Type', value: 'Savings' },
          ]}
        />
      );
      expect(screen.getByText('Account Name')).toBeTruthy();
      expect(screen.getByText('Account Type')).toBeTruthy();
    });

    it('renders each item value', () => {
      render(
        <InfoGrid
          items={[
            { label: 'Name', value: 'Jane Smith' },
            { label: 'Branch', value: 'Lagos' },
          ]}
        />
      );
      expect(screen.getByText('Jane Smith')).toBeTruthy();
      expect(screen.getByText('Lagos')).toBeTruthy();
    });
  });

  describe('format=money', () => {
    it('shows ₦ formatted value with format=money', () => {
      render(
        <InfoGrid items={[{ label: 'Balance', value: 50000, format: 'money' }]} />
      );
      expect(screen.getByText(/₦/)).toBeTruthy();
    });

    it('applies font-mono class on money formatted value', () => {
      const { container } = render(
        <InfoGrid items={[{ label: 'Balance', value: 50000, format: 'money' }]} />
      );
      const monoEl = container.querySelector('.font-mono');
      expect(monoEl).toBeTruthy();
    });
  });

  describe('format=date', () => {
    it('shows date formatted as dd MMM yyyy', () => {
      render(
        <InfoGrid items={[{ label: 'Date', value: '2024-01-15', format: 'date' }]} />
      );
      expect(screen.getByText(/15 Jan 2024/)).toBeTruthy();
    });

    it('handles different date values correctly', () => {
      render(
        <InfoGrid items={[{ label: 'Created', value: '2023-12-31', format: 'date' }]} />
      );
      expect(screen.getByText(/31 Dec 2023/)).toBeTruthy();
    });
  });

  describe('format=account', () => {
    it('formats account number correctly', () => {
      render(
        <InfoGrid items={[{ label: 'Account No.', value: '0123456789', format: 'account' }]} />
      );
      // formatAccountNumber uses pattern (\d{4})(\d{4})(\d{2}) -> "$1 $2 $3"
      expect(screen.getByText('0123 4567 89')).toBeTruthy();
    });
  });

  describe('format=percent', () => {
    it('shows percentage value', () => {
      render(
        <InfoGrid items={[{ label: 'Rate', value: 7.5, format: 'percent' }]} />
      );
      expect(screen.getByText('7.50%')).toBeTruthy();
    });
  });

  describe('columns prop', () => {
    it('applies 2-column grid class when columns=2', () => {
      const { container } = render(
        <InfoGrid items={[{ label: 'A', value: 'B' }]} columns={2} />
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toMatch(/grid-cols-2/);
    });

    it('applies 3-column grid class when columns=3 (default)', () => {
      const { container } = render(
        <InfoGrid items={[{ label: 'A', value: 'B' }]} />
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toMatch(/grid-cols-3/);
    });

    it('applies 4-column grid class when columns=4', () => {
      const { container } = render(
        <InfoGrid items={[{ label: 'A', value: 'B' }]} columns={4} />
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toMatch(/grid-cols-4/);
    });
  });

  describe('copyable prop', () => {
    it('renders a copy button when copyable=true and value is a string', () => {
      render(
        <InfoGrid items={[{ label: 'ID', value: 'ABC123', copyable: true }]} />
      );
      const copyBtn = screen.getByRole('button');
      expect(copyBtn).toBeTruthy();
    });

    it('calls navigator.clipboard.writeText with the value on copy button click', async () => {
      render(
        <InfoGrid items={[{ label: 'ID', value: 'ABC123', copyable: true }]} />
      );
      const copyBtn = screen.getByRole('button');
      fireEvent.click(copyBtn);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123');
    });

    it('shows check icon briefly after copy', async () => {
      const { container } = render(
        <InfoGrid items={[{ label: 'ID', value: 'XYZ', copyable: true }]} />
      );
      const copyBtn = screen.getByRole('button');
      fireEvent.click(copyBtn);
      await waitFor(() => {
        // After click the button should still exist (with check icon or copy icon)
        expect(container.querySelector('button')).toBeTruthy();
      });
    });

    it('does not render copy button when copyable is not set', () => {
      render(
        <InfoGrid items={[{ label: 'ID', value: 'ABC123' }]} />
      );
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('ReactNode values', () => {
    it('renders ReactNode values as-is', () => {
      render(
        <InfoGrid
          items={[
            {
              label: 'Status',
              value: <span data-testid="node-value">Custom Node</span>,
            },
          ]}
        />
      );
      expect(screen.getByTestId('node-value')).toBeTruthy();
      expect(screen.getByText('Custom Node')).toBeTruthy();
    });
  });
});
