import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import type { ChurnPoint, ChurnReason } from '../../api/customerAnalyticsApi';

interface ChurnAnalysisChartsProps {
  trend: ChurnPoint[];
  reasons: ChurnReason[];
  isLoading: boolean;
}

function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name === 'churnRate' ? 'Churn Rate' : 'Target'}:{' '}
          <span className="font-medium">{entry.value.toFixed(2)}%</span>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: ChurnReason = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold">{d.reason}</p>
      <p className="text-muted-foreground">
        Share: <span className="text-foreground font-medium">{d.percentage}%</span>
      </p>
    </div>
  );
}

export function ChurnAnalysisCharts({ trend, reasons, isLoading }: ChurnAnalysisChartsProps) {
  if (isLoading) {
    return (
      <div className="surface-card p-4 h-72 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="surface-card p-4 space-y-5">
      <h2 className="text-sm font-semibold text-foreground">Churn Analysis</h2>

      {/* Intervention Banner */}
      <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 space-y-0.5">
          <p className="font-semibold">Intervention Recommended</p>
          <p>
            Contact <span className="font-bold">234</span> at-risk Premium customers —
            potential revenue at risk <span className="font-bold">₦890M</span>.
            Schedule relationship manager outreach for High Net Worth segment within 48 hours.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Churn Rate Line Chart */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Monthly Churn Rate vs Target (1.5%)</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={40}
                domain={[0, 3]}
              />
              <Tooltip content={<LineTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(v) => (v === 'churnRate' ? 'Churn Rate' : 'Target (1.5%)')}
              />
              <ReferenceLine y={1.5} stroke="#f59e0b" strokeDasharray="6 3" />
              <Line
                type="monotone"
                dataKey="churnRate"
                name="churnRate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="target"
                name="target"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Churn Reasons Pie */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Churn Reasons Breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={reasons}
                cx="50%"
                cy="50%"
                outerRadius={80}
                paddingAngle={2}
                dataKey="percentage"
              >
                {reasons.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {reasons.map((r) => (
              <div key={r.reason} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: r.color }} />
                <span className="text-muted-foreground flex-1 truncate">{r.reason}</span>
                <span className="font-medium tabular-nums">{r.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
