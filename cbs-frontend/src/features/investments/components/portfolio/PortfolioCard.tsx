import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COLORS: Record<string, string> = { EQUITY: '#6366f1', FIXED_INCOME: '#0ea5e9', CASH: '#22c55e', ALTERNATIVE: '#f59e0b', COMMODITY: '#ef4444' };

interface PortfolioCardProps {
  portfolio: {
    code: string;
    name: string;
    customerName?: string;
    type: string;
    currency: string;
    totalValue: number;
    costBasis?: number;
    returnYtd?: number;
    returnTotal?: number;
    benchmark?: string;
    manager?: string;
  };
  holdings?: { holdingType: string; currentValue?: number }[];
}

export function PortfolioCard({ portfolio, holdings = [] }: PortfolioCardProps) {
  const navigate = useNavigate();
  const pnl = (portfolio.totalValue ?? 0) - (portfolio.costBasis ?? 0);
  const pnlPct = portfolio.costBasis ? (pnl / portfolio.costBasis) * 100 : 0;
  const isPositive = pnl >= 0;

  // Allocation data from holdings
  const allocationMap: Record<string, number> = {};
  holdings.forEach((h) => { allocationMap[h.holdingType] = (allocationMap[h.holdingType] ?? 0) + (h.currentValue ?? 0); });
  const allocData = Object.entries(allocationMap).map(([type, value]) => ({ name: type, value }));

  return (
    <div onClick={() => navigate(`/investments/portfolios/${portfolio.code}`)}
      className="surface-card p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <code className="text-[10px] font-mono text-muted-foreground">{portfolio.code}</code>
          <p className="text-sm font-semibold">{portfolio.customerName ?? portfolio.name}</p>
          <p className="text-xs text-muted-foreground">{portfolio.type} · {portfolio.currency}</p>
        </div>
        {allocData.length > 0 && (
          <ResponsiveContainer width={48} height={48}>
            <PieChart><Pie data={allocData} dataKey="value" innerRadius={14} outerRadius={22} paddingAngle={1}>
              {allocData.map((d) => <Cell key={d.name} fill={COLORS[d.name] ?? '#6b7280'} />)}
            </Pie></PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Value</span>
          <span className="font-semibold tabular-nums">{formatMoney(portfolio.totalValue, portfolio.currency)}</span>
        </div>
        {portfolio.costBasis != null && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Cost Basis</span>
            <span className="tabular-nums">{formatMoney(portfolio.costBasis, portfolio.currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">P&L</span>
          <span className={cn('font-semibold tabular-nums flex items-center gap-0.5', isPositive ? 'text-green-600' : 'text-red-600')}>
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {formatMoney(Math.abs(pnl), portfolio.currency)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>Holdings: {holdings.length}</span>
        {portfolio.benchmark && <span>Bench: {portfolio.benchmark}</span>}
        {portfolio.manager && <span>RM: {portfolio.manager}</span>}
      </div>

      {portfolio.returnYtd != null && (
        <div className="text-xs text-muted-foreground">
          YTD: <span className={cn('font-medium', (portfolio.returnYtd ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
            {(portfolio.returnYtd ?? 0) >= 0 ? '+' : ''}{formatPercent(portfolio.returnYtd ?? 0)}
          </span>
          {portfolio.returnTotal != null && (
            <> · Inception: <span className={cn('font-medium', portfolio.returnTotal >= 0 ? 'text-green-600' : 'text-red-600')}>
              {portfolio.returnTotal >= 0 ? '+' : ''}{formatPercent(portfolio.returnTotal)}
            </span></>
          )}
        </div>
      )}
    </div>
  );
}
