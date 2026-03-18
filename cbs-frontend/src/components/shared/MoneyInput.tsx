import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MoneyInputProps {
  label?: string;
  value: number | string;
  onChange: (value: number) => void;
  currency?: string;
  min?: number;
  max?: number;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

const symbols: Record<string, string> = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' };

export function MoneyInput({ label, value, onChange, currency = 'NGN', min, max, error, disabled, placeholder }: MoneyInputProps) {
  const [display, setDisplay] = useState(() => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) || num === 0 ? '' : num.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    const sanitized = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('').slice(0, 2) : '');
    const num = parseFloat(sanitized) || 0;
    setDisplay(sanitized);
    onChange(num);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    const num = parseFloat(display.replace(/,/g, '')) || 0;
    if (min !== undefined && num < min) { onChange(min); setDisplay(min.toLocaleString('en', { minimumFractionDigits: 2 })); return; }
    if (max !== undefined && num > max) { onChange(max); setDisplay(max.toLocaleString('en', { minimumFractionDigits: 2 })); return; }
    setDisplay(num > 0 ? num.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
  }, [display, min, max, onChange]);

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1.5">{label}</label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">{symbols[currency] || currency}</span>
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder || '0.00'}
          className={cn(
            'w-full pl-8 pr-3 py-2 rounded-lg border bg-background text-sm font-mono text-right',
            'focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
          )}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
