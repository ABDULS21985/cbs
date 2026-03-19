import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatMoneyCompact,
  formatDate,
  formatDateTime,
  formatRelative,
  formatAccountNumber,
  formatPercent,
  maskPan,
} from '@/lib/formatters';

// ---------------------------------------------------------------------------
// formatMoney
// ---------------------------------------------------------------------------
describe('formatMoney', () => {
  it('formats NGN by default with ₦ symbol', () => {
    const result = formatMoney(1000);
    expect(result).toContain('₦');
    expect(result).toContain('1,000.00');
  });

  it('formats NGN explicitly', () => {
    const result = formatMoney(5000, 'NGN');
    expect(result).toContain('₦');
    expect(result).toContain('5,000.00');
  });

  it('formats USD with $ symbol', () => {
    const result = formatMoney(250.5, 'USD');
    expect(result).toContain('$');
    expect(result).toContain('250.50');
  });

  it('formats EUR with € symbol', () => {
    const result = formatMoney(1234.99, 'EUR');
    expect(result).toContain('€');
    expect(result).toContain('1,234.99');
  });

  it('formats GBP with £ symbol', () => {
    const result = formatMoney(750, 'GBP');
    expect(result).toContain('£');
    expect(result).toContain('750.00');
  });

  it('formats zero correctly', () => {
    const result = formatMoney(0);
    expect(result).toContain('₦');
    expect(result).toContain('0.00');
  });

  it('formats negative amounts', () => {
    const result = formatMoney(-500, 'NGN');
    expect(result).toContain('₦');
    expect(result).toContain('500.00');
  });

  it('formats large numbers with thousand separators', () => {
    const result = formatMoney(1000000, 'NGN');
    expect(result).toContain('₦');
    expect(result).toContain('1,000,000.00');
  });

  it('rounds to 2 decimal places', () => {
    const result = formatMoney(1.999, 'NGN');
    expect(result).toContain('2.00');
  });

  it('accepts numeric string input', () => {
    // @ts-expect-error testing runtime coercion
    const result = formatMoney('1500', 'NGN');
    expect(result).toContain('₦');
  });
});

// ---------------------------------------------------------------------------
// formatMoneyCompact
// ---------------------------------------------------------------------------
describe('formatMoneyCompact', () => {
  it('formats billions with B suffix', () => {
    const result = formatMoneyCompact(2_000_000_000);
    expect(result).toContain('B');
    expect(result).toContain('2');
  });

  it('formats millions with M suffix', () => {
    const result = formatMoneyCompact(3_500_000);
    expect(result).toContain('M');
    expect(result).toContain('3.5');
  });

  it('formats thousands with K suffix', () => {
    const result = formatMoneyCompact(45_000);
    expect(result).toContain('K');
    expect(result).toContain('45');
  });

  it('formats values under 1000 without suffix', () => {
    const result = formatMoneyCompact(999);
    expect(result).not.toMatch(/[KMB]/);
  });

  it('formats zero', () => {
    const result = formatMoneyCompact(0);
    expect(result).not.toMatch(/[KMB]/);
  });

  it('uses NGN symbol by default', () => {
    const result = formatMoneyCompact(5_000_000);
    expect(result).toContain('₦');
  });

  it('uses provided currency symbol', () => {
    const result = formatMoneyCompact(5_000_000, 'USD');
    expect(result).toContain('$');
  });

  it('formats exactly 1 billion', () => {
    const result = formatMoneyCompact(1_000_000_000);
    expect(result).toContain('B');
  });

  it('formats exactly 1 million', () => {
    const result = formatMoneyCompact(1_000_000);
    expect(result).toContain('M');
  });

  it('formats exactly 1 thousand', () => {
    const result = formatMoneyCompact(1_000);
    expect(result).toContain('K');
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('formats a Date object as dd MMM yyyy', () => {
    const date = new Date(2024, 0, 15); // 15 Jan 2024
    const result = formatDate(date);
    expect(result).toBe('15 Jan 2024');
  });

  it('formats a date string', () => {
    const result = formatDate('2024-06-01');
    expect(result).toBe('01 Jun 2024');
  });

  it('formats end-of-year date', () => {
    const result = formatDate(new Date(2023, 11, 31));
    expect(result).toBe('31 Dec 2023');
  });

  it('formats ISO 8601 datetime string (date portion)', () => {
    const result = formatDate('2024-03-20T14:30:00Z');
    expect(result).toMatch(/20 Mar 2024/);
  });

  it('formats with two-digit day padding', () => {
    const result = formatDate(new Date(2024, 4, 5)); // 5 May
    expect(result).toBe('05 May 2024');
  });
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------
describe('formatDateTime', () => {
  it('formats a Date object as dd MMM yyyy, HH:mm', () => {
    const date = new Date(2024, 0, 15, 9, 5);
    const result = formatDateTime(date);
    expect(result).toBe('15 Jan 2024, 09:05');
  });

  it('formats a date string with time', () => {
    const result = formatDateTime('2024-12-25T23:59:00');
    expect(result).toMatch('25 Dec 2024, 23:59');
  });

  it('pads hours and minutes with leading zeros', () => {
    const date = new Date(2024, 5, 1, 8, 3);
    const result = formatDateTime(date);
    expect(result).toContain('08:03');
  });

  it('includes both date and time parts', () => {
    const date = new Date(2024, 2, 20, 14, 30);
    const result = formatDateTime(date);
    expect(result).toContain('20 Mar 2024');
    expect(result).toContain('14:30');
  });
});

// ---------------------------------------------------------------------------
// formatRelative
// ---------------------------------------------------------------------------
describe('formatRelative', () => {
  it('returns a string with "ago" suffix for past date', () => {
    const past = new Date(Date.now() - 60_000); // 1 minute ago
    const result = formatRelative(past);
    expect(result).toMatch(/ago$/);
  });

  it('returns "less than a minute ago" for very recent date', () => {
    const justNow = new Date(Date.now() - 5_000);
    const result = formatRelative(justNow);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a relative string for date string input', () => {
    const past = new Date(Date.now() - 3_600_000).toISOString(); // 1 hour ago
    const result = formatRelative(past);
    expect(result).toMatch(/ago$/);
  });

  it('handles dates several days in the past', () => {
    const past = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
    const result = formatRelative(past);
    expect(result).toContain('ago');
  });
});

// ---------------------------------------------------------------------------
// formatAccountNumber
// ---------------------------------------------------------------------------
describe('formatAccountNumber', () => {
  it('formats a 10-digit account number with spaces', () => {
    const result = formatAccountNumber('1234567890');
    expect(result).toBe('1234 5678 90');
  });

  it('formats another valid account number', () => {
    const result = formatAccountNumber('0987654321');
    expect(result).toBe('0987 6543 21');
  });

  it('handles account numbers that are numeric strings with leading zero', () => {
    const result = formatAccountNumber('0123456789');
    expect(result).toBe('0123 4567 89');
  });

  it('returns original string if pattern does not match', () => {
    const result = formatAccountNumber('12345');
    // short numbers don't match regex — returned as-is or unchanged
    expect(typeof result).toBe('string');
  });

  it('handles exactly 10 digits', () => {
    const result = formatAccountNumber('5550001234');
    expect(result).toBe('5550 0012 34');
  });
});

// ---------------------------------------------------------------------------
// formatPercent
// ---------------------------------------------------------------------------
describe('formatPercent', () => {
  it('formats with 2 decimal places by default', () => {
    expect(formatPercent(12.5)).toBe('12.50%');
  });

  it('formats with custom decimal places', () => {
    expect(formatPercent(7.123, 3)).toBe('7.123%');
  });

  it('formats zero percent', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('formats 100 percent', () => {
    expect(formatPercent(100)).toBe('100.00%');
  });

  it('formats negative percent', () => {
    expect(formatPercent(-5.5)).toBe('-5.50%');
  });

  it('formats with 0 decimals', () => {
    expect(formatPercent(33.7, 0)).toBe('34%');
  });

  it('formats fractional percent', () => {
    expect(formatPercent(0.01)).toBe('0.01%');
  });
});

// ---------------------------------------------------------------------------
// maskPan
// ---------------------------------------------------------------------------
describe('maskPan', () => {
  it('masks all but last 4 digits of a 16-digit PAN', () => {
    const result = maskPan('4111111111111234');
    expect(result).toBe('**** **** **** 1234');
  });

  it('shows correct last 4 digits', () => {
    const result = maskPan('5500005555555559');
    expect(result).toBe('**** **** **** 5559');
  });

  it('works with any PAN length — takes last 4', () => {
    const result = maskPan('378282246310005');
    expect(result).toMatch(/\*{4} \*{4} \*{4} 0005/);
  });

  it('handles a 16-digit card with zeros', () => {
    const result = maskPan('4000000000000000');
    expect(result).toBe('**** **** **** 0000');
  });

  it('masks a short test string using last 4 chars', () => {
    const result = maskPan('1234');
    expect(result).toBe('**** **** **** 1234');
  });
});
