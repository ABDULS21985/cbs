import { cn } from '@/lib/utils';

interface PaymentProgressBarProps {
  paid: number;
  total: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function PaymentProgressBar({ paid, total, showLabel = true, size = 'md' }: PaymentProgressBarProps) {
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const barColor = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-primary' : 'bg-amber-500';
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className="space-y-1">
      <div className={cn('w-full rounded-full bg-muted overflow-hidden', h)}>
        <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums font-mono">{paid}/{total} installments</span>
          <span className="font-medium">{pct}%</span>
        </div>
      )}
    </div>
  );
}
