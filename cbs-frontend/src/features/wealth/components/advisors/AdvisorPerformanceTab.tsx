import { cn } from '@/lib/utils';
import { formatPercent, formatMoneyCompact } from '@/lib/formatters';
import { useAdvisorPerformance } from '../../hooks/useWealth';
import {
  ComposedChart,
  Line,
  AreaChart,
  Area,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Loader2, TrendingUp, Users, Target } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdvisorPerformanceTabProps {
  advisorId: string;
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function CircularProgress({ value, size = 100, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 90 ? '#10b981' : value >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700"
      />
    </svg>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function PerformanceSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="surface-card p-5 h-32" />
        ))}
      </div>
      <div className="surface-card p-5 h-72" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-card p-5 h-64" />
        <div className="surface-card p-5 h-64" />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdvisorPerformanceTab({ advisorId }: AdvisorPerformanceTabProps) {
  const { data: performance, isLoading } = useAdvisorPerformance(advisorId);

  if (isLoading || !performance) {
    return (
      <div className="space-y-4">
        {isLoading ? (
          <PerformanceSkeleton />
        ) : (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    );
  }

  const retentionPct = performance.clientRetentionRate;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Client Retention Rate */}
        <div className="surface-card p-5 flex items-center gap-4">
          <div className="relative shrink-0">
            <CircularProgress value={retentionPct} size={72} strokeWidth={6} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold font-mono">{retentionPct.toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Client Retention</p>
            </div>
            <p className="text-lg font-bold font-mono mt-1">
              {formatPercent(retentionPct, 1)}
            </p>
            <p className="text-xs text-muted-foreground">trailing 12 months</p>
          </div>
        </div>

        {/* Avg Portfolio Alpha */}
        <div className="surface-card p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Avg Portfolio Alpha</p>
          </div>
          <p
            className={cn(
              'text-2xl font-bold font-mono',
              performance.avgAlpha >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {performance.avgAlpha >= 0 ? '+' : ''}
            {formatPercent(performance.avgAlpha, 2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">vs benchmark</p>
        </div>

        {/* Latest Month Performance */}
        <div className="surface-card p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Latest Month Return</p>
          </div>
          {performance.monthlyReturns.length > 0 ? (
            <>
              <p className="text-2xl font-bold font-mono">
                {formatPercent(
                  performance.monthlyReturns[performance.monthlyReturns.length - 1].return,
                  2,
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Benchmark:{' '}
                {formatPercent(
                  performance.monthlyReturns[performance.monthlyReturns.length - 1].benchmark,
                  2,
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </div>
      </div>

      {/* Monthly Return vs Benchmark */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-4">Monthly Return vs Benchmark</h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={performance.monthlyReturns} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatPercent(v, 2)} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            <Line
              type="monotone"
              dataKey="return"
              name="Return"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              name="Benchmark"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: AUM by Asset Class + Satisfaction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AUM by Asset Class Stacked Area */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4">AUM by Asset Class (12 Months)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={performance.aumByAssetClass} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="altGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatMoneyCompact(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatMoneyCompact(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              <Area
                type="monotone"
                dataKey="equities"
                name="Equities"
                stackId="1"
                stroke="#3b82f6"
                fill="url(#eqGrad)"
              />
              <Area
                type="monotone"
                dataKey="fixedIncome"
                name="Fixed Income"
                stackId="1"
                stroke="#10b981"
                fill="url(#fiGrad)"
              />
              <Area
                type="monotone"
                dataKey="alternatives"
                name="Alternatives"
                stackId="1"
                stroke="#f59e0b"
                fill="url(#altGrad)"
              />
              <Area
                type="monotone"
                dataKey="cash"
                name="Cash"
                stackId="1"
                stroke="#8b5cf6"
                fill="url(#cashGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Client Satisfaction Scores */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4">Client Satisfaction Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={performance.satisfactionScores} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)} / 5.0`} />
              <Line
                type="monotone"
                dataKey="score"
                name="Satisfaction"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
