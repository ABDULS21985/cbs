import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummaryBar } from '../SummaryBar';

vi.mock('../../../lib/utils/format', () => ({
  formatMoney: (amount: number) =>
    '₦' +
    new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount),
  formatPercent: (value: number) => `${value.toFixed(2)}%`,
}));

describe('SummaryBar', () => {
  describe('label rendering', () => {
    it('renders each label with a colon', () => {
      render(
        <SummaryBar
          items={[
            { label: 'Total', value: 1000 },
            { label: 'Count', value: 5 },
          ]}
        />
      );
      expect(screen.getByText(/Total:/)).toBeTruthy();
      expect(screen.getByText(/Count:/)).toBeTruthy();
    });

    it('renders all labels from items array', () => {
      render(
        <SummaryBar
          items={[
            { label: 'Alpha', value: 1 },
            { label: 'Beta', value: 2 },
            { label: 'Gamma', value: 3 },
          ]}
        />
      );
      expect(screen.getByText(/Alpha:/)).toBeTruthy();
      expect(screen.getByText(/Beta:/)).toBeTruthy();
      expect(screen.getByText(/Gamma:/)).toBeTruthy();
    });
  });

  describe('format=money', () => {
    it('formats value with formatMoney when format=money', () => {
      render(
        <SummaryBar items={[{ label: 'Balance', value: 5000, format: 'money' }]} />
      );
      expect(screen.getByText(/₦/)).toBeTruthy();
    });
  });

  describe('format=percent', () => {
    it('formats value with formatPercent when format=percent', () => {
      render(
        <SummaryBar items={[{ label: 'Rate', value: 4.5, format: 'percent' }]} />
      );
      expect(screen.getByText('4.50%')).toBeTruthy();
    });
  });

  describe('format=number', () => {
    it('uses toLocaleString for number format', () => {
      render(
        <SummaryBar items={[{ label: 'Count', value: 12345, format: 'number' }]} />
      );
      expect(screen.getByText('12,345')).toBeTruthy();
    });
  });

  describe('no format', () => {
    it('returns String(value) when no format is given', () => {
      render(
        <SummaryBar items={[{ label: 'Qty', value: 99 }]} />
      );
      expect(screen.getByText('99')).toBeTruthy();
    });

    it('returns string value as-is when no format and value is a string', () => {
      render(
        <SummaryBar items={[{ label: 'Status', value: 'Active' as unknown as number }]} />
      );
      expect(screen.getByText('Active')).toBeTruthy();
    });
  });

  describe('color prop', () => {
    it('applies text-green-600 when color=success', () => {
      const { container } = render(
        <SummaryBar items={[{ label: 'Profit', value: 100, color: 'success' }]} />
      );
      const valueEl = container.querySelector('.text-green-600');
      expect(valueEl).toBeTruthy();
    });

    it('applies text-amber-600 when color=warning', () => {
      const { container } = render(
        <SummaryBar items={[{ label: 'Risk', value: 50, color: 'warning' }]} />
      );
      const valueEl = container.querySelector('.text-amber-600');
      expect(valueEl).toBeTruthy();
    });

    it('applies text-red-600 when color=danger', () => {
      const { container } = render(
        <SummaryBar items={[{ label: 'Loss', value: -100, color: 'danger' }]} />
      );
      const valueEl = container.querySelector('.text-red-600');
      expect(valueEl).toBeTruthy();
    });

    it('applies text-foreground when color=default', () => {
      const { container } = render(
        <SummaryBar items={[{ label: 'Neutral', value: 0, color: 'default' }]} />
      );
      const valueEl = container.querySelector('.text-foreground');
      expect(valueEl).toBeTruthy();
    });

    it('applies text-foreground when color is undefined', () => {
      const { container } = render(
        <SummaryBar items={[{ label: 'Neutral', value: 0 }]} />
      );
      const valueEl = container.querySelector('.text-foreground');
      expect(valueEl).toBeTruthy();
    });
  });
});
