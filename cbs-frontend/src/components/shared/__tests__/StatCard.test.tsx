import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatCard } from '../StatCard';

vi.mock('../../../lib/utils/format', () => ({
  formatMoney: (amount: number) =>
    '₦' +
    new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount),
  formatMoneyCompact: (amount: number) => {
    if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(0)}B`;
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(0)}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
    return `₦${amount}`;
  },
}));

describe('StatCard', () => {
  describe('loading state', () => {
    it('renders skeleton animation when loading=true', () => {
      const { container } = render(<StatCard label="Revenue" value={1000} loading />);
      const pulseEl = container.querySelector('.animate-pulse');
      expect(pulseEl).toBeTruthy();
    });

    it('does NOT render the label when loading=true', () => {
      render(<StatCard label="Revenue" value={1000} loading />);
      expect(screen.queryByText('Revenue')).toBeNull();
    });

    it('does NOT render the value when loading=true', () => {
      render(<StatCard label="Revenue" value={1000} loading />);
      expect(screen.queryByText('1,000')).toBeNull();
    });

    it('renders label when loading is false', () => {
      render(<StatCard label="Revenue" value={1000} loading={false} />);
      expect(screen.getByText('Revenue')).toBeTruthy();
    });
  });

  describe('format=money', () => {
    it('shows ₦ prefix with money format', () => {
      render(<StatCard label="Balance" value={5000} format="money" />);
      expect(screen.getByText(/₦/)).toBeTruthy();
    });

    it('formats the number correctly with money format', () => {
      render(<StatCard label="Balance" value={1234.56} format="money" />);
      expect(screen.getByText(/₦/)).toBeTruthy();
    });
  });

  describe('format=percent', () => {
    it('shows percentage with two decimal places', () => {
      render(<StatCard label="Rate" value={5.5} format="percent" />);
      expect(screen.getByText('5.50%')).toBeTruthy();
    });

    it('formats whole number percent correctly', () => {
      render(<StatCard label="Rate" value={10} format="percent" />);
      expect(screen.getByText('10.00%')).toBeTruthy();
    });
  });

  describe('format=number', () => {
    it('uses toLocaleString for number format', () => {
      render(<StatCard label="Count" value={12345} format="number" />);
      expect(screen.getByText('12,345')).toBeTruthy();
    });
  });

  describe('no format (default)', () => {
    it('returns String(value) when no format is given', () => {
      render(<StatCard label="Misc" value={42} />);
      expect(screen.getByText('42')).toBeTruthy();
    });

    it('renders string value as-is when no format given', () => {
      render(<StatCard label="Status" value="Active" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });
  });

  describe('change prop', () => {
    it('shows positive change with + sign and %', () => {
      render(<StatCard label="Revenue" value={1000} change={5} />);
      expect(screen.getByText(/\+5\.0%/)).toBeTruthy();
    });

    it('shows negative change with - sign and %', () => {
      render(<StatCard label="Revenue" value={1000} change={-3.2} />);
      expect(screen.getByText(/-3\.2%/)).toBeTruthy();
    });

    it('does not render change section when change is not provided', () => {
      render(<StatCard label="Revenue" value={1000} />);
      expect(screen.queryByText(/%/)).toBeNull();
    });
  });

  describe('changePeriod prop', () => {
    it('shows changePeriod text alongside change', () => {
      render(<StatCard label="Revenue" value={1000} change={5} changePeriod="vs last month" />);
      expect(screen.getByText(/vs last month/)).toBeTruthy();
    });

    it('does not show changePeriod without change', () => {
      render(<StatCard label="Revenue" value={1000} changePeriod="vs last month" />);
      expect(screen.queryByText('vs last month')).toBeNull();
    });
  });

  describe('trend prop', () => {
    it('renders TrendingUp icon when trend=up', () => {
      const { container } = render(<StatCard label="Revenue" value={1000} trend="up" />);
      // TrendingUp icon should be present (lucide renders as SVG)
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('renders TrendingDown icon when trend=down', () => {
      const { container } = render(<StatCard label="Revenue" value={1000} trend="down" />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('icon prop', () => {
    it('renders a custom icon element', () => {
      const TestIcon = () => <svg data-testid="custom-icon" />;
      render(<StatCard label="Revenue" value={1000} icon={<TestIcon />} />);
      expect(screen.getByTestId('custom-icon')).toBeTruthy();
    });
  });

  describe('compact prop', () => {
    it('uses formatMoneyCompact when compact=true and format=money', () => {
      render(<StatCard label="Revenue" value={2_000_000} format="money" compact />);
      expect(screen.getByText(/₦2M/)).toBeTruthy();
    });

    it('uses formatMoneyCompact for billions', () => {
      render(<StatCard label="Revenue" value={1_500_000_000} format="money" compact />);
      expect(screen.getByText(/₦\d+B/)).toBeTruthy();
    });
  });

  describe('label rendering', () => {
    it('always renders the label when not loading', () => {
      render(<StatCard label="Total Accounts" value={99} />);
      expect(screen.getByText('Total Accounts')).toBeTruthy();
    });
  });
});
