import { Briefcase, DollarSign, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import { StatCard } from '@/components/shared';
import { formatMoneyCompact } from '@/lib/formatters';
import type { CapitalMarketsDeal } from '../../api/capitalMarketsApi';

interface PipelineStatsRowProps {
  deals: CapitalMarketsDeal[];
}

export function PipelineStatsRow({ deals }: PipelineStatsRowProps) {
  const active = deals.filter((d) => d.status !== 'SETTLED' && d.status !== 'CANCELLED');
  const pipelineValue = active.reduce((s, d) => s + d.targetAmount, 0);

  const now = new Date();
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const settledThisQ = deals.filter((d) => d.status === 'SETTLED' && new Date(d.updatedAt) >= qStart);
  const feeQtd = settledThisQ.reduce((s, d) => s + (d.feesEarned ?? 0), 0);

  const marketingPlus = deals.filter((d) =>
    ['MARKETING', 'PRICING', 'ALLOTMENT'].includes(d.status) && d.coverageRatio != null,
  );
  const avgCoverage = marketingPlus.length > 0
    ? marketingPlus.reduce((s, d) => s + (d.coverageRatio ?? 0), 0) / marketingPlus.length
    : 0;

  const settled = deals.filter((d) => d.status === 'SETTLED');
  const avgDuration = settled.length > 0
    ? settled.reduce((s, d) => {
        const created = new Date(d.createdAt).getTime();
        const updated = new Date(d.updatedAt).getTime();
        return s + (updated - created) / 86400000;
      }, 0) / settled.length
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <StatCard label="Pipeline Value" value={formatMoneyCompact(pipelineValue)} icon={DollarSign} />
      <StatCard label="Quarterly Closed" value={settledThisQ.length} format="number" icon={CheckCircle2} />
      <StatCard label="Weighted Coverage" value={avgCoverage > 0 ? `${avgCoverage.toFixed(1)}x` : '--'} icon={TrendingUp} />
      <StatCard label="Fee Revenue QTD" value={formatMoneyCompact(feeQtd)} icon={Briefcase} />
      <StatCard label="Avg Deal Duration" value={avgDuration > 0 ? `${Math.round(avgDuration)}d` : '--'} icon={Clock} />
    </div>
  );
}
