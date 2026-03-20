import { Briefcase, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { StatCard } from '@/components/shared';

interface Props {
  totalAum: number;
  portfolioCount: number;
  avgReturnYtd: number;
  todayReturn: number;
  currency?: string;
}

export function PortfolioStatsRow({ totalAum, portfolioCount, avgReturnYtd, todayReturn, currency = 'NGN' }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total AUM" value={totalAum} format="money" currency={currency} compact icon={Briefcase} />
      <StatCard label="Number of Portfolios" value={portfolioCount} format="number" icon={BarChart3} />
      <StatCard label="Today's Return" value={todayReturn} format="percent" trend={todayReturn >= 0 ? 'up' : 'down'} icon={DollarSign} />
      <StatCard label="YTD Return (Avg)" value={avgReturnYtd} format="percent" trend={avgReturnYtd >= 0 ? 'up' : 'down'} icon={TrendingUp} />
    </div>
  );
}
