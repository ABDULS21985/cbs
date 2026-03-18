import { cn } from '@/lib/utils';
import { formatMoney, formatDate, formatDateTime, formatAccountNumber, formatPercent } from '@/lib/formatters';
import { Copy, Check } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface InfoGridItem {
  label: string;
  value: string | number | ReactNode;
  format?: 'money' | 'date' | 'datetime' | 'percent' | 'account';
  currency?: string;
  span?: number;
  copyable?: boolean;
  mono?: boolean;
}

interface InfoGridProps {
  items: InfoGridItem[];
  columns?: 2 | 3 | 4;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function formatValue(item: InfoGridItem): ReactNode {
  if (typeof item.value !== 'string' && typeof item.value !== 'number') return item.value;
  const val = item.value;
  switch (item.format) {
    case 'money': return formatMoney(Number(val), item.currency);
    case 'date': return formatDate(String(val));
    case 'datetime': return formatDateTime(String(val));
    case 'percent': return formatPercent(Number(val));
    case 'account': return formatAccountNumber(String(val));
    default: return val;
  }
}

export function InfoGrid({ items, columns = 3 }: InfoGridProps) {
  const gridCols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' };
  return (
    <div className={cn('grid grid-cols-1 gap-x-6 gap-y-4', gridCols[columns])}>
      {items.map((item, i) => (
        <div key={i} className={item.span ? `col-span-${item.span}` : undefined}>
          <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.label}</dt>
          <dd className={cn('mt-0.5 text-sm flex items-center', item.mono && 'font-mono', (item.format === 'money' || item.format === 'account') && 'font-mono')}>
            {formatValue(item)}
            {item.copyable && typeof item.value === 'string' && <CopyButton text={item.value} />}
          </dd>
        </div>
      ))}
    </div>
  );
}
