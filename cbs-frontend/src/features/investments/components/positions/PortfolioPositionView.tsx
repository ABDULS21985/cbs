import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatMoney } from '@/lib/formatters';
import { PositionTable } from './PositionTable';
import type { SecPosition } from '../../api/secPositionApi';

const PIE_COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

interface AssetClassSummary {
  assetClass: string;
  marketValue: number;
  percentage: number;
  count: number;
}

interface Props {
  portfolioCode: string;
  portfolioName?: string;
  positions: SecPosition[];
  totalMarketValue: number;
  currency?: string;
  byAssetClass: AssetClassSummary[];
  isLoading?: boolean;
}

export function PortfolioPositionView({ portfolioCode, portfolioName, positions, totalMarketValue, currency = 'NGN', byAssetClass, isLoading }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{portfolioName ?? portfolioCode}</h3>
          <p className="text-sm text-muted-foreground">
            {positions.length} positions · {formatMoney(totalMarketValue, currency)} total value
          </p>
        </div>
      </div>

      {byAssetClass.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-64">
            <p className="text-sm font-medium mb-2">Asset Allocation</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byAssetClass}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="marketValue"
                  nameKey="assetClass"
                  paddingAngle={2}
                >
                  {byAssetClass.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1">
            <PositionTable positions={positions} isLoading={isLoading} />
          </div>
        </div>
      )}

      {byAssetClass.length === 0 && (
        <PositionTable positions={positions} isLoading={isLoading} />
      )}
    </div>
  );
}
