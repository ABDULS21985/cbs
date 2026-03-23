import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { NpsDistributionPoint } from '../../api/marketingAnalyticsApi';

interface NpsDistributionChartProps {
  data: NpsDistributionPoint[];
}

function getBarColor(score: number): string {
  if (score <= 6) return '#ef4444';
  if (score <= 8) return '#9ca3af';
  return '#22c55e';
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = Number(label);
  const category = score <= 6 ? 'Detractor' : score <= 8 ? 'Passive' : 'Promoter';
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">Score {label}</p>
      <p className="text-muted-foreground">{category}</p>
      <p className="font-medium">{payload[0].value.toLocaleString()} responses</p>
    </div>
  );
}

export function NpsDistributionChart({ data }: NpsDistributionChartProps) {
  const totalResponses = data.reduce((sum, d) => sum + d.count, 0);
  const promoters = data.filter((d) => d.category === 'PROMOTER').reduce((s, d) => s + d.count, 0);
  const passives = data.filter((d) => d.category === 'PASSIVE').reduce((s, d) => s + d.count, 0);
  const detractors = data.filter((d) => d.category === 'DETRACTOR').reduce((s, d) => s + d.count, 0);

  const promoterPct = totalResponses > 0 ? ((promoters / totalResponses) * 100).toFixed(0) : '0';
  const passivePct = totalResponses > 0 ? ((passives / totalResponses) * 100).toFixed(0) : '0';
  const detractorPct = totalResponses > 0 ? ((detractors / totalResponses) * 100).toFixed(0) : '0';
  const npsScore = Math.round(
    ((promoters - detractors) / Math.max(totalResponses, 1)) * 100,
  );

  return (
    <div className="surface-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">NPS Score Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="score"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Responses" radius={[3, 3, 0, 0]} maxBarSize={36}>
            {data.map((entry) => (
              <Cell key={`cell-${entry.score}`} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="flex items-center justify-center gap-4 flex-wrap pt-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          <span className="text-muted-foreground">Promoters:</span>
          <span className="font-semibold text-green-600 dark:text-green-400">{promoterPct}%</span>
        </span>
        <span className="text-muted-foreground/40">|</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
          <span className="text-muted-foreground">Passives:</span>
          <span className="font-semibold">{passivePct}%</span>
        </span>
        <span className="text-muted-foreground/40">|</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span className="text-muted-foreground">Detractors:</span>
          <span className="font-semibold text-red-600 dark:text-red-400">{detractorPct}%</span>
        </span>
        <span className="text-muted-foreground/40">|</span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">NPS:</span>
          <span className={`font-bold text-sm ${npsScore >= 60 ? 'text-green-600 dark:text-green-400' : npsScore >= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            {npsScore}
          </span>
        </span>
      </div>
    </div>
  );
}
