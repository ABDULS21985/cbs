import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatMoney(amount: number | string, currency = 'NGN'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const symbols: Record<string, string> = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMoneyCompact(amount: number, currency = 'NGN'): string {
  const symbols: Record<string, string> = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || '';
  if (Math.abs(amount) >= 1e9) return `${symbol}${(amount / 1e9).toFixed(1)}B`;
  if (Math.abs(amount) >= 1e6) return `${symbol}${(amount / 1e6).toFixed(1)}M`;
  if (Math.abs(amount) >= 1e3) return `${symbol}${(amount / 1e3).toFixed(1)}K`;
  return formatMoney(amount, currency);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd MMM yyyy, HH:mm');
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '--';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isNaN(d.getTime())) return '--';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatAccountNumber(num: string): string {
  return num.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3');
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function maskPan(pan: string): string {
  if (pan.length < 4) return pan;
  return `**** **** **** ${pan.slice(-4)}`;
}
