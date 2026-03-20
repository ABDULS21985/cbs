import { Layers, TrendingUp, Star } from 'lucide-react';
import { StatCard } from '@/components/shared';

interface Props { totalAum: number; fundCount: number; bestYtd: number; shariaCount: number }

export function FundStatsRow({ totalAum, fundCount, bestYtd, shariaCount }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Funds AUM" value={totalAum} format="money" compact icon={Layers} />
      <StatCard label="Total Funds" value={fundCount} format="number" />
      <StatCard label="Best Performer (YTD)" value={bestYtd} format="percent" trend={bestYtd >= 0 ? 'up' : 'down'} icon={TrendingUp} />
      <StatCard label="Sharia-Compliant" value={shariaCount} format="number" icon={Star} />
    </div>
  );
}
