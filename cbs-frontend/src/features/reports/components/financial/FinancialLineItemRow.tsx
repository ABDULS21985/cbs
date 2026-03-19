import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { ExternalLink } from 'lucide-react';
import { VarianceIndicator } from './VarianceIndicator';
import type { FinancialLineItem } from '../../api/financialReportApi';

interface FinancialLineItemRowProps {
  item: FinancialLineItem;
  onDrillDown?: (item: FinancialLineItem) => void;
  showVariance?: boolean;
  currency?: string;
  /** Hint for favorable variance direction */
  favorable?: 'higher' | 'lower';
}

const INDENT_CLASSES: Record<number, string> = {
  0: 'pl-0',
  1: 'pl-4',
  2: 'pl-8',
};

export function FinancialLineItemRow({
  item,
  onDrillDown,
  showVariance = true,
  currency = 'NGN',
  favorable = 'higher',
}: FinancialLineItemRowProps) {
  const indentClass = INDENT_CLASSES[item.indent] ?? 'pl-4';
  const isClickable = !!item.glAccountIds?.length && !!onDrillDown && !item.isHeader;

  if (item.isHeader) {
    return (
      <tr className="bg-muted/60">
        <td
          colSpan={showVariance ? 4 : 3}
          className="py-1.5 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          {item.label}
        </td>
      </tr>
    );
  }

  const rowClass = cn(
    'group border-b border-border/40 hover:bg-muted/30 transition-colors',
    item.isSeparator && 'border-t-2 border-t-border',
    item.isBold && 'bg-muted/20',
  );

  const labelClass = cn(
    'py-2 px-3 text-sm',
    indentClass,
    item.isBold ? 'font-semibold' : 'font-normal',
  );

  const valueClass = cn(
    'py-2 px-3 text-right text-sm font-mono tabular-nums',
    item.isBold && 'font-semibold',
  );

  const formatVal = (v: number) => {
    if (v === 0 && item.indent === 0) return '—';
    const abs = Math.abs(v);
    const formatted = formatMoney(abs, currency);
    return v < 0 ? `(${formatted})` : formatted;
  };

  return (
    <tr className={rowClass}>
      <td className={labelClass}>
        <span className="flex items-center gap-1.5">
          {item.label}
          {isClickable && (
            <button
              onClick={() => onDrillDown!(item)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-primary/10 text-primary"
              title="View GL breakdown"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </span>
      </td>
      <td className={valueClass}>{formatVal(item.current)}</td>
      <td className={valueClass}>{formatVal(item.prior)}</td>
      {showVariance && (
        <td className="py-2 px-3 text-right">
          {item.isBold ? (
            <VarianceIndicator current={item.current} prior={item.prior} favorable={favorable} />
          ) : (
            <VarianceIndicator current={item.current} prior={item.prior} favorable={favorable} />
          )}
        </td>
      )}
    </tr>
  );
}
