import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { DepositMixItem } from '../../api/depositAnalyticsApi';

interface DepositMixTreemapProps {
  data: DepositMixItem[];
  isLoading?: boolean;
}

interface BlockProps {
  name: string;
  amount: number;
  pct: number;
  color: string;
  shade?: string;
  className?: string;
}

function Block({ name, amount, pct, color, shade, className }: BlockProps) {
  return (
    <div
      className={cn('flex flex-col justify-between p-4 rounded-lg min-h-[100px] transition-opacity hover:opacity-90', className)}
      style={{ backgroundColor: color }}
    >
      <div className="text-white/80 text-xs font-semibold uppercase tracking-wide">{name}</div>
      <div>
        <div className="text-white text-lg font-bold leading-tight">{formatMoneyCompact(amount)}</div>
        <div
          className="text-xs font-medium mt-0.5 px-1.5 py-0.5 rounded-full inline-block"
          style={{ backgroundColor: shade ?? 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          {pct.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

export function DepositMixTreemap({ data, isLoading }: DepositMixTreemapProps) {
  const casa = data.find((d) => d.name === 'CASA');
  const term = data.find((d) => d.name === 'Term Deposits');
  const savings = casa?.children?.find((c) => c.name === 'Savings');
  const current = casa?.children?.find((c) => c.name === 'Current');

  const totalAmount = data.reduce((s, d) => s + d.amount, 0);
  const casaPct = casa ? (casa.amount / totalAmount) * 100 : 75.3;
  const termPct = term ? (term.amount / totalAmount) * 100 : 24.7;

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg animate-pulse">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Treemap */}
      <div className="flex gap-2 h-52">
        {/* CASA block — takes casaPct width */}
        <div className="flex flex-col gap-2" style={{ flex: casaPct }}>
          {/* CASA label bar */}
          <div className="rounded-lg bg-blue-600 px-3 py-2 flex items-center justify-between text-white">
            <span className="text-xs font-semibold uppercase tracking-wide">CASA</span>
            <span className="text-xs font-bold">{formatMoneyCompact(casa?.amount ?? 0)} · {casaPct.toFixed(1)}%</span>
          </div>
          {/* Savings + Current side by side */}
          <div className="flex gap-2 flex-1">
            {savings && (
              <Block
                name="Savings"
                amount={savings.amount}
                pct={savings.pct}
                color="#2563eb"
                className="flex-1"
              />
            )}
            {current && (
              <Block
                name="Current"
                amount={current.amount}
                pct={current.pct}
                color="#3b82f6"
                className="flex-1"
              />
            )}
          </div>
        </div>

        {/* Term Deposits block */}
        {term && (
          <div className="flex flex-col gap-2" style={{ flex: termPct }}>
            <div className="rounded-lg bg-emerald-600 px-3 py-2 flex items-center justify-between text-white">
              <span className="text-xs font-semibold uppercase tracking-wide">Term</span>
              <span className="text-xs font-bold">{termPct.toFixed(1)}%</span>
            </div>
            <Block
              name="Term Deposits"
              amount={term.amount}
              pct={term.pct}
              color="#10b981"
              className="flex-1"
            />
          </div>
        )}
      </div>

      {/* Legend row */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-700" />
          Savings Deposits
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-400" />
          Current Accounts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          Term Deposits
        </span>
        <span className="ml-auto font-medium text-foreground">
          Total: {formatMoneyCompact(totalAmount)}
        </span>
      </div>
    </div>
  );
}
