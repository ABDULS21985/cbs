import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoneyDisplay } from '../MoneyDisplay';

// Mock the utility functions
vi.mock('../../../lib/utils/format', () => ({
  formatMoney: (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },
  formatMoneyCompact: (amount: number) => {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(0)}B`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
    return String(amount);
  },
}));

describe('MoneyDisplay', () => {
  describe('basic rendering', () => {
    it('renders a positive amount with default NGN currency symbol', () => {
      render(<MoneyDisplay amount={1234} />);
      expect(screen.getByText(/₦/)).toBeTruthy();
    });

    it('renders a zero amount', () => {
      render(<MoneyDisplay amount={0} />);
      const el = screen.getByText(/0/);
      expect(el).toBeTruthy();
    });

    it('always applies font-mono and tabular-nums classes', () => {
      const { container } = render(<MoneyDisplay amount={100} />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('font-mono');
      expect(el.className).toContain('tabular-nums');
    });

    it('applies a custom className', () => {
      const { container } = render(<MoneyDisplay amount={100} className="my-custom-class" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('my-custom-class');
    });
  });

  describe('negative amount formatting', () => {
    it('wraps negative amounts in parentheses', () => {
      render(<MoneyDisplay amount={-50000} />);
      const text = screen.getByText(/\(₦/);
      expect(text.textContent).toMatch(/^\(₦/);
      expect(text.textContent).toMatch(/\)$/);
    });

    it('shows absolute value inside parentheses for negative amounts', () => {
      render(<MoneyDisplay amount={-50000} />);
      const text = screen.getByText(/₦/);
      expect(text.textContent).not.toContain('-');
    });
  });

  describe('showSign prop', () => {
    it('prepends + for positive amounts when showSign=true', () => {
      render(<MoneyDisplay amount={1234} showSign />);
      expect(screen.getByText(/^\+₦/)).toBeTruthy();
    });

    it('does not prepend + for positive amounts when showSign is not set', () => {
      render(<MoneyDisplay amount={1234} />);
      const el = screen.getByText(/₦/);
      expect(el.textContent).not.toMatch(/^\+/);
    });

    it('does not double-sign negative amounts with showSign=true', () => {
      render(<MoneyDisplay amount={-100} showSign />);
      // Negative amounts use parentheses convention regardless of showSign
      const el = screen.getByText(/₦/);
      expect(el.textContent).not.toContain('+-');
    });
  });

  describe('colorCode prop', () => {
    it('applies text-red-600 for negative amounts when colorCode=true', () => {
      const { container } = render(<MoneyDisplay amount={-100} colorCode />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('text-red-600');
    });

    it('applies text-green-600 for positive amounts > 0 when colorCode=true', () => {
      const { container } = render(<MoneyDisplay amount={500} colorCode />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('text-green-600');
    });

    it('does not apply color classes when colorCode is not set', () => {
      const { container } = render(<MoneyDisplay amount={500} />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).not.toContain('text-red-600');
      expect(el.className).not.toContain('text-green-600');
    });

    it('does not apply color classes for zero when colorCode=true', () => {
      const { container } = render(<MoneyDisplay amount={0} colorCode />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).not.toContain('text-green-600');
      expect(el.className).not.toContain('text-red-600');
    });
  });

  describe('compact prop', () => {
    it('uses formatMoneyCompact for billions when compact=true', () => {
      render(<MoneyDisplay amount={1_000_000_000} compact />);
      expect(screen.getByText(/1B/)).toBeTruthy();
    });

    it('uses formatMoneyCompact for millions when compact=true', () => {
      render(<MoneyDisplay amount={5_000_000} compact />);
      expect(screen.getByText(/5M/)).toBeTruthy();
    });

    it('uses formatMoneyCompact for thousands when compact=true', () => {
      render(<MoneyDisplay amount={10_000} compact />);
      expect(screen.getByText(/10K/)).toBeTruthy();
    });

    it('uses full formatMoney when compact is not set', () => {
      render(<MoneyDisplay amount={1000} />);
      // Should show full formatted number, not compact
      const el = screen.getByText(/₦/);
      expect(el.textContent).not.toMatch(/K|M|B/);
    });
  });

  describe('size classes', () => {
    it('applies text-sm for size=sm', () => {
      const { container } = render(<MoneyDisplay amount={100} size="sm" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('text-sm');
    });

    it('applies text-base for size=md (default)', () => {
      const { container } = render(<MoneyDisplay amount={100} />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('text-base');
    });

    it('applies text-lg for size=lg', () => {
      const { container } = render(<MoneyDisplay amount={100} size="lg" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('text-lg');
    });

    it('applies text-2xl for size=xl', () => {
      const { container } = render(<MoneyDisplay amount={100} size="xl" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('text-2xl');
    });
  });

  describe('string input parsing', () => {
    it('parses a valid numeric string with parseFloat', () => {
      render(<MoneyDisplay amount={'1234.56' as unknown as number} />);
      expect(screen.getByText(/₦/)).toBeTruthy();
    });

    it('handles NaN for an invalid string gracefully', () => {
      // NaN input should not crash the component
      render(<MoneyDisplay amount={NaN} />);
      // Component should render (even if output is NaN-related)
      const { container } = render(<MoneyDisplay amount={NaN} />);
      expect(container.firstChild).toBeTruthy();
    });

    it('handles an invalid string that parseFloat returns NaN for', () => {
      render(<MoneyDisplay amount={'not-a-number' as unknown as number} />);
      // Should not crash
      const { container } = render(<MoneyDisplay amount={'not-a-number' as unknown as number} />);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('currency display', () => {
    it('shows NGN currency symbol ₦ by default', () => {
      render(<MoneyDisplay amount={100} />);
      expect(screen.getByText(/₦/)).toBeTruthy();
    });
  });
});
