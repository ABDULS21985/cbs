import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { type DealerDesk, type TraderPosition } from '../../api/tradingApi';

interface VarDashboardProps {
  desks: DealerDesk[];
  positions: TraderPosition[];
}

function volatilityFactor(position: TraderPosition) {
  const instrument = position.instrument.toUpperCase();
  const currency = position.currency.toUpperCase();

  if (instrument.includes('/') || currency !== 'NGN') return 0.07;
  if (instrument.includes('BOND') || instrument.includes('TBILL') || instrument.includes('NOTE')) return 0.03;
  if (instrument.includes('EQUITY') || instrument.includes('SHARE') || instrument.includes('STOCK')) return 0.12;
  if (instrument.includes('REPO') || instrument.includes('PLACEMENT') || instrument.includes('MM')) return 0.015;
  return 0.05;
}

export function VarDashboard({ desks, positions }: VarDashboardProps) {
  const portfolioVar95 = positions.reduce(
    (sum, position) => sum + Math.abs(position.netExposure) * volatilityFactor(position) * 1.65,
    0,
  );
  const portfolioVar99 = positions.reduce(
    (sum, position) => sum + Math.abs(position.netExposure) * volatilityFactor(position) * 2.33,
    0,
  );
  const tenDayVar95 = portfolioVar95 * Math.sqrt(10);
  const totalDeskLimit = desks.reduce((sum, desk) => sum + desk.positionLimit, 0);
  const utilizationPct = totalDeskLimit > 0 ? (portfolioVar95 / totalDeskLimit) * 100 : 0;

  const varByDesk = desks
    .map((desk) => {
      const deskPositions = positions.filter((position) => position.deskId === desk.id);
      const var95 = deskPositions.reduce(
        (sum, position) => sum + Math.abs(position.netExposure) * volatilityFactor(position) * 1.65,
        0,
      );
      return {
        id: desk.id,
        deskName: desk.name,
        var95,
        utilizationPct: desk.positionLimit > 0 ? (var95 / desk.positionLimit) * 100 : 0,
      };
    })
    .sort((left, right) => right.var95 - left.var95);

  const breaches = varByDesk.filter((desk) => desk.utilizationPct > 100);

  return (
    <div className="surface-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Parametric VaR</h3>
          <p className="text-xs text-muted-foreground">
            Derived from live desk positions and current desk exposure limits.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Utilization vs desk position limits: {utilizationPct.toFixed(1)}%
        </div>
      </div>

      {breaches.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">VaR capacity breach detected</p>
            <p className="mt-1 text-xs">
              {breaches.map((desk) => `${desk.deskName} (${desk.utilizationPct.toFixed(1)}%)`).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">1-Day VaR 95%</p>
          <p className="mt-2 font-mono text-xl font-semibold">{formatMoney(portfolioVar95)}</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">1-Day VaR 99%</p>
          <p className="mt-2 font-mono text-xl font-semibold">{formatMoney(portfolioVar99)}</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">10-Day VaR 95%</p>
          <p className="mt-2 font-mono text-xl font-semibold">{formatMoney(tenDayVar95)}</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Risk Capacity</p>
          <p className="mt-2 flex items-center gap-2 font-mono text-xl font-semibold">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            {utilizationPct.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={varByDesk} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}M`}
              tick={{ fontSize: 11 }}
            />
            <YAxis type="category" dataKey="deskName" width={120} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'utilizationPct') return [`${value.toFixed(1)}%`, 'Risk Utilization'];
                return [formatMoney(value), 'VaR 95%'];
              }}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="var95" fill="#2563eb" radius={[0, 4, 4, 0]} name="var95" />
            <Bar dataKey="utilizationPct" fill="#f59e0b" radius={[0, 4, 4, 0]} name="utilizationPct" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
